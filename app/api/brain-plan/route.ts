// Контент-план. Три действия:
//  outline — сюжет недели + тема каждого дня (быстро, ~5 сек)
//  day     — посты одного дня (экран вызывает 7 штук параллельно, поэтому укладываемся в лимит Vercel)
//  post    — переписать один пост или добавить новый
import { askJSON, cleanImages, clip, errorResponse, HttpError, type ChatMessage } from '../../lib/server/openai';
import { LIVE_TEXT_RULES, NO_INVENT_RULES, personaBlock, readPersona } from '../../lib/server/prompts';
import { DAYS, GOALS, MEDIA_TYPES, MODEL_PLATFORM_RULES, MODEL_PLATFORMS, PLATFORM_RULES, SALES_LEVELS, SELF_PLATFORMS, type Persona } from '../../lib/persona';

export const maxDuration = 60;

// Порядок воронки: сначала охватные площадки, Telegram — после них
const FUNNEL_ORDER = ['Threads', 'Instagram', 'TikTok', 'YouTube', 'VK', 'Telegram', 'Fanvue', 'OnlyFans'];
const ALL_PLATFORMS = [...new Set([...SELF_PLATFORMS, ...MODEL_PLATFORMS]), ''];

/** Для каких площадок пишем посты */
function activePlatforms(p: Persona): string[] {
  if (!p.platforms.length) return [];
  if (p.focus !== 'all' && p.platforms.includes(p.focus)) return [p.focus];
  return [...p.platforms].sort((a, b) => FUNNEL_ORDER.indexOf(a) - FUNNEL_ORDER.indexOf(b)).slice(0, 4);
}

// ---------- воронка недели ----------
const FUNNEL_MODEL = `НЕДЕЛЯ МОДЕЛИ — это маленький сериал про её жизнь, а не витрина:
- У недели есть сюжет: конкретные события её жизни, которые развиваются день за днём (сломался кондиционер → мастер пришёл через 3 дня → она переехала спать на балкон).
- Пн–Чт: Доверие и Вовлечение — быт, характер, мнения, смешные случаи, вопросы подписчикам. Про закрытый контент ни слова.
- Пт: Продажа — один мягкий тизер, связанный с сюжетом недели.
- Сб: Вовлечение — лёгкое и смешное.
- Вс: Доверие или Продажа — итог недели, тёплый финал.`;

/** Как сделать модель живой личностью */
const MODEL_PERSONALITY = `МОДЕЛЬ — ЖИВОЙ ЧЕЛОВЕК, А НЕ РЕКЛАМА:
- Канал интересен личностью: характер, мнения, привычки, быт, страхи, слабости, смешные случаи, отношения с питомцем, подругой, соседом, хобби. Бери из анкеты и сюжета недели, придумывай детали в её характере.
- Рубрики (format), чередуй, в один день не повторяй: Утро, Быт, Смешной случай, Мнение, История из прошлого, Хобби, Вопрос подписчикам, Мысли вслух, Закулисье съёмки, Тизер.
- Тизеры и намёки на закрытый контент — только в дни с целью «Продажа», максимум один пост в день. В остальные дни ни слова о сюрпризах и закрытом.
- В каждом посте конкретная деталь: название еды, места, сериала, что сломалось, что сказала соседка, сколько градусов.
- Посты дня разные по длине и настроению: один короткий в 1 строку, другой подлиннее.
- СТОП-ФРАЗЫ модели: «сюрприз», «что-то особенное», «оставайтесь на связи», «не пропустите», «готовьтесь», «горячий», «пульс», «сердце забьётся», «феерия», «вау», «для самых смелых», «веселье», «кайфовали», «неделя пролетела».`;

/** На каком языке пишет модель */
function languageRule(p: Persona) {
  if (p.kind === 'self' || p.languageMode === 'ru') return '- Язык: русский. translation — пустая строка.';
  return `- Язык: text, hook и hashtags — на разговорном английском (как пишет живая девушка в соцсетях: просто, коротко, строчными буквами можно). translation — перевод text на русский для автора.`;
}

const MEDIA_RULES = (p: Persona) => `ТИП КОНТЕНТА (поле media): ${MEDIA_TYPES.join(', ')}.
- За день минимум 2 разных типа: хотя бы один пост только Текст или Голосовое и хотя бы один визуальный.
- imagePrompt — для всего, кроме «Текст»: что именно в контенте. ${
  p.kind === 'self'
    ? 'По-русски: что снять, кадр, ракурс; для видео и рилс — раскадровка; для голосового — о чём говорить.'
    : 'Для Фото и Карусели — промпт на английском: сцена, свет, одежда, поза, объектив, внешность, в конце "photorealistic, natural skin texture, candid". Для Видео, Кружка, Сторис — по-русски, что происходит в кадре. Для Голосового — по-русски, о чём она говорит.'
}
- hook и sound — только для Видео, Рилс, Кружок, Сторис, иначе пустые строки.
- format — рубрика по-русски, одним-двумя словами.`;


function funnelSelf(p: Persona) {
  const platforms = activePlatforms(p);
  const route = platforms.length > 1
    ? `Путь читателя: ${platforms.filter((x) => x !== 'Telegram').join(' и ')} дают охват → ${platforms.includes('Telegram') ? 'Telegram прогревает экспертностью → ' : ''}${p.offer ? 'продукт' : 'личка и подписка'}.`
    : '';
  return `ВОРОНКА НЕДЕЛИ (неделя — цепочка, а не набор случайных постов):
${route}
- Пн–Вт: Доверие и Вовлечение — личная история из анкеты, закулисье, мнение, вопрос аудитории.
- Ср–Чт: Прогрев — разбор боли аудитории, кейс с цифрами из анкеты, «как я это делаю», ошибки.
- Пт: Продажа — ${p.offer ? `предложение: ${p.offer}` : 'призыв написать в личку, подписаться, переслать другу'}.
- Сб: Вовлечение — лёгкое, провокационное, опрос, жизнь.
- Вс: Доверие или Продажа — итог недели, выводы.
${p.offer ? SALES_LEVELS[p.salesLevel]?.rule || '' : ''}
${p.goal ? `Всё работает на цель: ${p.goal}.` : ''}`;
}

const intro = (p: Persona) =>
  p.kind === 'self'
    ? 'Ты — сильный продюсер личного бренда, который знает алгоритмы соцсетей. Пишешь посты для блога автора от её лица. Твои посты цепляют с первой строки и ведут читателя по воронке.'
    : 'Ты — сильный SMM-редактор канала с вымышленным персонажем. Пишешь посты для канала персонажа.';

function postRules(p: Persona) {
  const platforms = activePlatforms(p);
  const rules = p.kind === 'self' ? PLATFORM_RULES : MODEL_PLATFORM_RULES;
  const platformBlock = platforms.length
    ? `ПРАВИЛА ПЛОЩАДОК (поле platform — одна из них):\n${platforms.map((x) => `- ${rules[x] || x}`).join('\n')}`
    : '- platform: пустая строка.';
  if (p.kind === 'self') {
    return `ПРАВИЛА ПОСТА:
- От первого лица, голосом автора, в женском роде. Без поучительного тона.
- Время ЧЧ:ММ, у каждого поста своё и не круглое: охватные площадки днём и вечером (12:10–13:30, 18:40–21:30), Telegram утром или после 20:00.
- hashtags — только если площадка их требует, иначе пустая строка.
${languageRule(p)}

${MEDIA_RULES(p)}

${platformBlock}`;
  }
  return `ПРАВИЛА ПОСТА:
- От первого лица, голосом персонажа. От одной строки до 70 слов. Строчные буквы, если так пишет персонаж.
- Время ЧЧ:ММ, реалистичное и не круглое (08:40, 13:20, 17:50, 23:10).
- Хэштеги только если площадка их требует (Instagram), иначе пустая строка.
- Соблазнительно и с намёком можно только в тизерах, без графической откровенности.
${languageRule(p)}

${MODEL_PERSONALITY}

${MEDIA_RULES(p)}

${platformBlock}`;
}

/** Что именно написать на день */
function dayTask(p: Persona) {
  const platforms = activePlatforms(p);
  if (platforms.length > 1) {
    if (p.kind === 'model') {
      return `Сделай ровно по одному посту для каждой площадки: ${platforms.join(', ')}. Это одна связка дня вокруг события дня:
охватные площадки знакомят с ней без откровенного, Telegram показывает её жизнь ближе, платная площадка — самое личное.
Каждый пост написан под правила своей площадки, разные рубрики и типы контента.`;
    }
    return `Сделай ровно по одному посту для каждой площадки: ${platforms.join(', ')}. Это одна связка дня на одну тему:
охватные площадки цепляют темой и провоцируют${platforms.includes('Telegram') ? ', а в конце ведут в Telegram («подробнее у меня в телеге, ссылка в шапке»)' : ''}; ${platforms.includes('Telegram') ? 'Telegram раскрывает тему глубже и экспертнее, с конкретикой.' : ''}
Каждый пост написан под правила своей площадки, а не один текст на всех.`;
  }
  if (platforms.length === 1) return `Сделай 3 поста для ${platforms[0]} в разное время (утро, день, вечер): разные рубрики и разные типы контента, строго по правилам площадки.`;
  return 'Сделай 3 поста в разное время (утро, день, вечер): разные рубрики и разные типы контента.';
}

// ---------- схемы ответов ----------
const postSchema = {
  type: 'object',
  additionalProperties: false,
  // draft и problems — черновик и самопроверка: модель сначала пишет, потом ищет ошибки, и только потом даёт чистовик (text)
  required: ['platform', 'time', 'format', 'goal', 'media', 'hook', 'draft', 'problems', 'text', 'translation', 'hashtags', 'imagePrompt', 'sound'],
  properties: {
    platform: { type: 'string', enum: ALL_PLATFORMS },
    time: { type: 'string', description: 'время публикации ЧЧ:ММ' },
    format: { type: 'string', description: 'рубрика по-русски, одним-двумя словами' },
    goal: { type: 'string', enum: GOALS },
    media: { type: 'string', enum: [...MEDIA_TYPES] },
    hook: { type: 'string', description: 'хук для видео: текст на экране в первые 1–2 секунды, или пусто' },
    draft: { type: 'string', description: 'быстрый черновик поста' },
    problems: { type: 'string', description: 'что в черновике плохо: стоп-фразы, вялый крючок, нет конкретики, выдуманные факты, лишние ! и эмодзи, не по правилам площадки. Коротко.' },
    text: { type: 'string', description: 'ОБЯЗАТЕЛЬНО, не пустой: полный готовый текст поста (чистовик), в котором исправлено всё из problems' },
    translation: { type: 'string', description: 'русский перевод text, если text не на русском, иначе пусто' },
    hashtags: { type: 'string', description: 'хэштеги через пробел или пустая строка' },
    imagePrompt: { type: 'string', description: 'что снять / раскадровка / промпт фото, или пусто' },
    sound: { type: 'string', description: 'звук для видео или пусто' },
  },
};

const outlineSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['storyline', 'appearance', 'days'],
  properties: {
    storyline: { type: 'string', description: 'тема недели, до 8 слов, строчными буквами' },
    appearance: { type: 'string', description: 'внешность на английском, 1–2 предложения, или пустая строка' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'beat', 'goal'],
        properties: {
          day: { type: 'string', enum: [...DAYS] },
          beat: { type: 'string', description: 'тема дня: конкретная мысль, история или польза, 1 предложение' },
          goal: { type: 'string', enum: GOALS },
        },
      },
    },
  },
};

const daySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['posts'],
  properties: { posts: { type: 'array', items: postSchema } },
};

const onePostSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['post'],
  properties: { post: postSchema },
};

/**
 * Проверяем пост от ИИ: у поста обязан быть текст.
 * Слабые модели иногда оставляют чистовик пустым — тогда берём черновик.
 * Служебные поля (черновик, самопроверка) на экран не отдаём.
 */
function cleanPost(raw: unknown): Record<string, unknown> | null {
  const { draft, problems, ...post } = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  void problems;
  const text = String(post.text || '').trim() || String(draft || '').trim();
  return text ? { ...post, text } : null;
}

// ---------- куски промпта ----------
function textList(v: unknown, maxItems: number, maxLen: number) {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, maxItems).map((x) => x.slice(0, maxLen)) : [];
}

function tasteBlock(liked: string[], disliked: string[]) {
  const parts: string[] = [];
  if (liked.length) parts.push(`ЭТИ ПОСТЫ АВТОРУ ПОНРАВИЛИСЬ — держи такой же уровень и манеру:\n${liked.map((t) => `• ${t}`).join('\n')}`);
  if (disliked.length) parts.push(`ЭТИ ПОСТЫ НЕ ПОНРАВИЛИСЬ — не пиши похоже:\n${disliked.map((t) => `• ${t}`).join('\n')}`);
  return parts.join('\n\n');
}

function weekRules(intent: string, scenario: string, bans: string) {
  return [
    intent && `ГЛАВНОЕ НА ЭТОЙ НЕДЕЛЕ (слова автора, это важнее всего остального): ${intent}
Вся неделя работает на это: тема недели вырастает отсюда, минимум 4 дня из 7 напрямую про это с разных сторон (история, доказательство, возражение, ошибка, результат), остальные дни подводят к этому.`,
    scenario && `СОБЫТИЯ НЕДЕЛИ ОТ АВТОРА (обязательно вплети): ${scenario}`,
    bans && `ЗАПРЕТЫ НЕДЕЛИ (этого не должно быть нигде): ${bans}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;
    const persona = readPersona(body.persona);
    const self = persona.kind === 'self';
    const scenario = clip(body.scenario, 3000);
    const bans = clip(body.bans, 3000);
    const storyline = clip(body.storyline, 300);
    const taste = tasteBlock(textList(body.liked, 5, 600), textList(body.disliked, 3, 400));

    const base = [
      intro(persona),
      personaBlock(persona),
      !self && persona.appearance && `Внешность (для промптов фото): ${persona.appearance}`,
      weekRules(clip(body.intent, 1000), scenario, bans),
      taste,
      self && NO_INVENT_RULES,
      LIVE_TEXT_RULES,
    ]
      .filter(Boolean)
      .join('\n\n');

    // ---------- 1. Сюжет недели ----------
    if (action === 'outline') {
      const images = self || persona.appearance ? [] : cleanImages(body.references);
      const user: ChatMessage['content'] = [
        {
          type: 'text',
          text: `Придумай ${self ? 'тему недели и тему каждого дня' : 'сюжет этой недели и задачу на каждый день'} (Пн–Вс, ровно 7).
${self ? funnelSelf(persona) : FUNNEL_MODEL}
${!self ? 'beat каждого дня — конкретное событие её жизни, а не «тизер» и не «сюрприз». storyline — сюжет недели до 8 слов.' : ''}
${self ? 'Темы дней конкретные и разные: не «мой путь», а «3 ошибки, из-за которых ИИ-модель выглядит пластиковой». Опирайся на боли аудитории, кейсы и цифры из анкеты.' : ''}
${storyline ? `Сюжет уже задан автором: «${storyline}». Оставь его.` : ''}
${self ? 'appearance: пустая строка.' : `appearance: ${images.length ? 'опиши внешность по приложенным фото' : persona.appearance ? 'повтори данную внешность' : 'придумай внешность под архетип и историю'}.`}`,
        },
        ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
      ];
      const out = await askJSON<{ storyline: string; appearance: string; days: { day: string; beat: string; goal: string }[] }>({
        name: 'week_outline',
        schema: outlineSchema,
        messages: [
          { role: 'system', content: base },
          { role: 'user', content: user },
        ],
      });
      if (!Array.isArray(out.days) || out.days.length < 7) throw new HttpError('ИИ не расписал все 7 дней. Попробуй ещё раз', 502);
      return Response.json({ ...out, days: out.days.slice(0, 7) });
    }

    // ---------- 2. Посты одного дня ----------
    if (action === 'day') {
      const day = clip(body.day, 4);
      const beat = clip(body.beat, 400);
      const goal = clip(body.goal, 20);
      const week = textList(body.weekBeats, 7, 300);
      const out = await askJSON<{ posts: unknown[] }>({
        name: 'day_posts',
        schema: daySchema,
        messages: [
          { role: 'system', content: `${base}\n\n${postRules(persona)}` },
          {
            role: 'user',
            content: `Тема недели: ${storyline}
План недели по дням:
${week.join('\n')}

Напиши посты на ${day}. Тема дня: ${beat}. Главная цель дня: ${goal}.
${dayTask(persona)}`,
          },
        ],
      });
      const posts = (out.posts || []).map(cleanPost).filter(Boolean);
      if (!posts.length) throw new HttpError('ИИ вернул пустые посты. Попробуй ещё раз', 502);
      return Response.json({ posts });
    }

    // ---------- 3. Переписать или добавить один пост ----------
    if (action === 'post') {
      const day = clip(body.day, 4);
      const beat = clip(body.beat, 400);
      const current = clip(body.current, 2000);
      const platform = clip(body.platform, 30);
      const others = textList(body.others, 4, 400);
      const idea = clip(body.idea, 4000);
      const light = body.editMode === 'light';
      const task = idea
        ? `Автор описала своими словами, о чём хочет пост${platform ? ` для ${platform}` : ''}:
«${idea}»

${light
  ? 'Только причеши: сохрани её слова, порядок и интонацию, убери повторы и воду, поправь ошибки, добавь цепляющую первую строку и призыв в конце, если уместно.'
  : 'Сделай из этого сильный пост под правила площадки: цепляющий крючок, хребет (мысль → доказательство → вывод), призыв. Опирайся на её факты.'}
Все факты, цифры и события бери только из её текста и анкеты, ничего не добавляй от себя.`
        : current
        ? `Перепиши этот пост совсем по-другому (другой крючок, другая деталь), сохранив тему дня${platform ? ` и площадку ${platform}` : ''}:\n«${current}»`
        : `Добавь ещё один пост в этот день, не похожий на остальные${platform ? `, для ${platform}` : ''}.`;
      const out = await askJSON<{ post: unknown }>({
        name: 'one_post',
        schema: onePostSchema,
        messages: [
          { role: 'system', content: `${base}\n\n${postRules(persona)}` },
          {
            role: 'user',
            content: `Тема недели: ${storyline}\nДень: ${day}. Тема дня: ${beat}.\n${
              others.length ? `Другие посты этого дня (не повторяй их):\n${others.map((t) => `• ${t}`).join('\n')}\n` : ''
            }\n${task}`,
          },
        ],
      });
      const post = cleanPost(out.post);
      if (!post) throw new HttpError('ИИ вернул пустой пост. Попробуй ещё раз', 502);
      return Response.json({ post });
    }

    throw new HttpError('Неизвестное действие', 400);
  } catch (e) {
    return errorResponse(e, 'Контент-план:');
  }
}
