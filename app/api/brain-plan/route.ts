// Контент-план. Три действия:
//  outline — сюжет недели + задача на каждый день (быстро, ~5 сек)
//  day     — посты одного дня (экран вызывает 7 штук параллельно, поэтому укладываемся в лимит Vercel)
//  post    — переписать один пост или добавить новый
import { askJSON, cleanImages, clip, errorResponse, HttpError, type ChatMessage } from '../../lib/server/openai';
import { LIVE_TEXT_RULES, personaBlock, readPersona } from '../../lib/server/prompts';
import { DAYS, GOALS } from '../../lib/persona';

export const maxDuration = 60;

const FUNNEL = `ВОРОНКА НЕДЕЛИ (неделя — цепочка к продаже, а не набор случайных постов):
- Пн–Вт: Доверие и Вовлечение — кто она, что у неё происходит, вопросы подписчикам.
- Ср–Чт: Прогрев — интрига, намёки на закрытое, «вчера сняла кое-что».
- Пт: мягкая Продажа — тизер закрытого контента.
- Сб: Вовлечение — лёгкое, смешное, близкое.
- Вс: Продажа или Доверие — итог недели, тёплый финал с намёком.`;

const SAFETY = 'Соблазнительно и с намёком, но без графической откровенности: интрига продаёт лучше.';

// ---------- схемы ответов ----------
const postSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['time', 'format', 'goal', 'text', 'hashtags', 'needsMedia', 'imagePrompt'],
  properties: {
    time: { type: 'string', description: 'время публикации ЧЧ:ММ' },
    format: { type: 'string', description: 'Фото, Заметка, Закулисье, Вопрос, Шутка, Тизер, Сторис' },
    goal: { type: 'string', enum: GOALS },
    text: { type: 'string' },
    hashtags: { type: 'string', description: '0–3 хэштега через пробел или пустая строка' },
    needsMedia: { type: 'boolean' },
    imagePrompt: { type: 'string', description: 'промпт фото на английском или пустая строка, если фото не нужно' },
  },
};

const outlineSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['storyline', 'appearance', 'days'],
  properties: {
    storyline: { type: 'string', description: 'сюжет недели одной короткой строкой, строчными буквами' },
    appearance: { type: 'string', description: 'внешность персонажа на английском, 1–2 предложения' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'beat', 'goal'],
        properties: {
          day: { type: 'string', enum: [...DAYS] },
          beat: { type: 'string', description: 'что происходит у персонажа в этот день, 1 предложение' },
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

const POST_RULES = `ПРАВИЛА ПОСТА:
- От первого лица, голосом персонажа. 15–60 слов. Строчные буквы, если так пишет персонаж.
- Время ЧЧ:ММ, реалистичное и не круглое (09:00, 13:20, 17:40, 22:10).
- needsMedia = true, если к посту нужно фото. Тогда imagePrompt: полностью на английском, сцена (локация, свет, одежда, поза, объектив), внешность персонажа, в конце "photorealistic, natural skin texture, candid". Если фото не нужно — imagePrompt пустой.
- ${SAFETY}`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;
    const persona = readPersona(body.persona);
    const scenario = clip(body.scenario, 3000);
    const bans = clip(body.bans, 3000);
    const storyline = clip(body.storyline, 300);
    const taste = tasteBlock(textList(body.liked, 5, 400), textList(body.disliked, 3, 400));

    const base = [
      'Ты — сильный SMM-редактор канала с вымышленным персонажем. Пишешь посты для Telegram-канала персонажа.',
      personaBlock(persona),
      persona.appearance && `Внешность (для промптов фото): ${persona.appearance}`,
      weekRules(scenario, bans),
      taste,
      LIVE_TEXT_RULES,
    ]
      .filter(Boolean)
      .join('\n\n');

    // ---------- 1. Сюжет недели ----------
    if (action === 'outline') {
      const images = persona.appearance ? [] : cleanImages(body.references);
      const user: ChatMessage['content'] = [
        {
          type: 'text',
          text: `Придумай сюжет этой недели и задачу на каждый день (Пн–Вс, ровно 7).
${FUNNEL}
${storyline ? `Сюжет уже задан автором: «${storyline}». Оставь его.` : ''}
appearance: ${images.length ? 'опиши внешность по приложенным фото' : persona.appearance ? 'повтори данную внешность' : 'придумай внешность под архетип и историю'}.`,
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
          { role: 'system', content: `${base}\n\n${POST_RULES}` },
          {
            role: 'user',
            content: `Сюжет недели: ${storyline}
План недели по дням:
${week.join('\n')}

Напиши посты на ${day}. Что происходит: ${beat}. Главная цель дня: ${goal}.
Сделай 2–3 поста в разное время, с разными форматами. Хотя бы один пост с фото, хотя бы один без. Посты связаны с сюжетом, но не пересказывают его.`,
          },
        ],
      });
      return Response.json({ posts: out.posts || [] });
    }

    // ---------- 3. Переписать или добавить один пост ----------
    if (action === 'post') {
      const day = clip(body.day, 4);
      const beat = clip(body.beat, 400);
      const current = clip(body.current, 1500);
      const others = textList(body.others, 4, 400);
      const task = current
        ? `Перепиши этот пост совсем по-другому (другой заход, другая деталь), сохранив смысл дня:\n«${current}»`
        : 'Добавь ещё один пост в этот день, не похожий на остальные.';
      const out = await askJSON<{ post: unknown }>({
        name: 'one_post',
        schema: onePostSchema,
        messages: [
          { role: 'system', content: `${base}\n\n${POST_RULES}` },
          {
            role: 'user',
            content: `Сюжет недели: ${storyline}\nДень: ${day}. Что происходит: ${beat}.\n${
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
