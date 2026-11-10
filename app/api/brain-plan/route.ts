// Контент-план. Три действия:
//  outline — сюжет недели + тема каждого дня (быстро, ~5 сек)
//  day     — посты одного дня (экран вызывает 7 штук параллельно, поэтому укладываемся в лимит Vercel)
//  post    — переписать один пост или добавить новый
import { askJSON, cleanImages, clip, errorResponse, HttpError, type ChatMessage } from '../../lib/server/openai';
import { LIVE_TEXT_RULES, NO_INVENT_RULES, personaBlock, readPersona } from '../../lib/server/prompts';
import { DAYS, GOALS, MODEL_PLATFORMS, PLATFORM_RULES, SALES_LEVELS, SELF_PLATFORMS, type Persona } from '../../lib/persona';

export const maxDuration = 60;

// Порядок воронки: сначала охватные площадки, Telegram — после них
const FUNNEL_ORDER = ['Threads', 'Instagram', 'TikTok', 'YouTube', 'VK', 'Telegram'];
const ALL_PLATFORMS = [...new Set([...SELF_PLATFORMS, ...MODEL_PLATFORMS]), ''];

/** Для каких площадок пишем посты */
function activePlatforms(p: Persona): string[] {
  if (p.kind !== 'self' || !p.platforms.length) return [];
  if (p.focus !== 'all' && p.platforms.includes(p.focus)) return [p.focus];
  return [...p.platforms].sort((a, b) => FUNNEL_ORDER.indexOf(a) - FUNNEL_ORDER.indexOf(b)).slice(0, 4);
}

// ---------- воронка недели ----------
const FUNNEL_MODEL = `ВОРОНКА НЕДЕЛИ (неделя — цепочка к продаже, а не набор случайных постов):
- Пн–Вт: Доверие и Вовлечение — кто она, что у неё происходит, вопросы подписчикам.
- Ср–Чт: Прогрев — интрига, намёки на закрытое, «вчера сняла кое-что».
- Пт: мягкая Продажа — тизер закрытого контента.
- Сб: Вовлечение — лёгкое, смешное, близкое.
- Вс: Продажа или Доверие — итог недели, тёплый финал с намёком.`;

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
  if (p.kind === 'self') {
    const platforms = activePlatforms(p);
    return `ПРАВИЛА ПОСТА:
- От первого лица, голосом автора, в женском роде. Без поучительного тона.
- Время ЧЧ:ММ, реалистичное и не круглое (09:10, 13:20, 19:40).
- format: Личное, Польза, Кейс, Закулисье, Мнение, Провокация, Вопрос, Опрос, Рилс, Продажа.
- needsMedia = true, если нужно фото или видео. Тогда imagePrompt — ПО-РУССКИ, что снять: кадр, ракурс, что в руках, что на фоне. Для рилс — раскадровка. Иначе imagePrompt пустой.
- hook и sound заполняй только для видео (Reels, TikTok, YouTube), иначе пустые строки.
- hashtags — только если площадка их требует, иначе пустая строка.
${platforms.length ? `\nПРАВИЛА ПЛОЩАДОК (поле platform — одна из них):\n${platforms.map((x) => `- ${PLATFORM_RULES[x] || x}`).join('\n')}` : '- platform: пустая строка.'}`;
  }
  return `ПРАВИЛА ПОСТА:
- От первого лица, голосом персонажа. 15–60 слов. Строчные буквы, если так пишет персонаж.
- Время ЧЧ:ММ, реалистичное и не круглое (09:00, 13:20, 17:40, 22:10).
- needsMedia = true, если к посту нужно фото. Тогда imagePrompt: полностью на английском, сцена (локация, свет, одежда, поза, объектив), внешность персонажа, в конце "photorealistic, natural skin texture, candid". Если фото не нужно — imagePrompt пустой.
- platform, hook, sound: пустые строки.
- Соблазнительно и с намёком, но без графической откровенности: интрига продаёт лучше.`;
}

/** Что именно написать на день */
function dayTask(p: Persona) {
  const platforms = activePlatforms(p);
  if (platforms.length > 1) {
    return `Сделай ровно по одному посту для каждой площадки: ${platforms.join(', ')}. Это одна связка дня на одну тему:
охватные площадки цепляют темой и провоцируют${platforms.includes('Telegram') ? ', а в конце ведут в Telegram («подробнее у меня в телеге, ссылка в шапке»)' : ''}; ${platforms.includes('Telegram') ? 'Telegram раскрывает тему глубже и экспертнее, с конкретикой.' : ''}
Каждый пост написан под правила своей площадки, а не один текст на всех.`;
  }
  if (platforms.length === 1) return `Сделай 2–3 поста для ${platforms[0]} в разное время, с разными форматами, строго по правилам площадки.`;
  return 'Сделай 2–3 поста в разное время, с разными форматами. Хотя бы один пост с медиа, хотя бы один без.';
}

// ---------- схемы ответов ----------
const postSchema = {
  type: 'object',
  additionalProperties: false,
  // draft и problems — черновик и самопроверка: модель сначала пишет, потом ищет ошибки, и только потом даёт чистовик (text)
  required: ['platform', 'time', 'format', 'goal', 'hook', 'draft', 'problems', 'text', 'hashtags', 'needsMedia', 'imagePrompt', 'sound'],
  properties: {
    platform: { type: 'string', enum: ALL_PLATFORMS },
    time: { type: 'string', description: 'время публикации ЧЧ:ММ' },
    format: { type: 'string', description: 'формат поста одним-двумя словами' },
    goal: { type: 'string', enum: GOALS },
    hook: { type: 'string', description: 'хук для видео: текст на экране в первые 1–2 секунды, или пусто' },
    draft: { type: 'string', description: 'быстрый черновик поста' },
    problems: { type: 'string', description: 'что в черновике плохо: стоп-фразы, вялый крючок, нет конкретики, выдуманные факты, лишние ! и эмодзи, не по правилам площадки. Коротко.' },
    text: { type: 'string', description: 'чистовик: черновик, в котором исправлено всё из problems' },
    hashtags: { type: 'string', description: 'хэштеги через пробел или пустая строка' },
    needsMedia: { type: 'boolean' },
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

function weekRules(scenario: string, bans: string) {
  return [
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
      weekRules(scenario, bans),
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
      return Response.json({ posts: out.posts || [] });
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
      return Response.json({ post: out.post });
    }

    throw new HttpError('Неизвестное действие', 400);
  } catch (e) {
    return errorResponse(e, 'Контент-план:');
  }
}
