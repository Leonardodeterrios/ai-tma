// Разбор аккаунта по скриншотам статистики (Instagram, Threads, Telegram…).
// ИИ читает цифры с картинок, находит, что заходит и что нет, и даёт идеи.
// Напрямую к Instagram приложение не подключается — данные приходят только из скриншотов и текста автора.
import { askJSON, cleanImages, clip, errorResponse, HttpError, type ChatMessage } from '../../lib/server/openai';
import { NO_INVENT_RULES, personaBlock, readPersona } from '../../lib/server/prompts';
import { MODEL_PLATFORM_RULES, PLATFORM_RULES } from '../../lib/persona';

export const maxDuration = 60;

const str = { type: 'string' } as const;
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['seen', 'metrics', 'works', 'weak', 'ideas', 'insights'],
  properties: {
    seen: { type: 'string', description: 'что на скриншотах: какая площадка и какой экран, одной фразой' },
    metrics: {
      type: 'object',
      additionalProperties: false,
      description: 'только цифры, которые реально видны; если не видно — пустая строка. Только цифры, без пробелов и букв (12,4 тыс. → 12400)',
      required: ['followers', 'reach', 'comments', 'leads', 'sales', 'revenue'],
      properties: { followers: str, reach: str, comments: str, leads: str, sales: str, revenue: str },
    },
    works: { type: 'array', items: str, description: '2–4 пункта: что заходит и почему, с цифрами со скриншотов' },
    weak: { type: 'array', items: str, description: '1–3 пункта: что проседает и что с этим делать по алгоритмам площадки' },
    ideas: {
      type: 'array',
      description: '3 идеи постов, которые повторяют то, что уже сработало',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['platform', 'text'],
        properties: { platform: str, text: { type: 'string', description: 'идея + готовый хук или первая строка' } },
      },
    },
    insights: { type: 'string', description: 'сжатая память для будущих планов: 3–5 коротких строк «что работает у этого автора»' },
  },
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const persona = readPersona(body.persona);
    const images = cleanImages(body.images, 4);
    const notes = clip(body.notes, 4000);
    if (!images.length && !notes.trim()) throw new HttpError('Добавь скриншоты статистики или вставь текст лучших постов', 400);

    const self = persona.kind === 'self';
    const rules = self ? PLATFORM_RULES : MODEL_PLATFORM_RULES;
    const content: ChatMessage['content'] = [
      {
        type: 'text',
        text: `${images.length ? 'Вот скриншоты статистики и постов автора.' : ''}${notes ? `\nАвтор добавила текстом (лучшие посты, цифры, заметки):\n${notes}` : ''}\n\nРазбери аккаунт.`,
      },
      ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
    ];

    const out = await askJSON<Record<string, unknown>>({
      name: 'account_analysis',
      schema,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `Ты — аналитик соцсетей и продюсер. Разбираешь аккаунт автора по скриншотам статистики и текстам постов.

${personaBlock(persona)}

АЛГОРИТМЫ ПЛОЩАДОК:
${persona.platforms.map((x) => rules[x]).filter(Boolean).join('\n') || Object.values(rules).slice(0, 3).join('\n')}

КАК РАЗБИРАТЬ:
- Читай цифры со скриншотов точно. Не видно цифру — не выдумывай, оставь пусто.
- Сравнивай посты между собой: что набрало больше охвата, пересылок, сохранений, комментариев и чем эти посты отличаются (тема, крючок, формат, длина).
- Считай доли, где можно: пересылки на охват, лайки на охват, комментарии на охват.
- Выводы привязывай к алгоритмам площадки: какой сигнал сильный, какой слабый.
- Простым языком, коротко, без длинных тире и общих слов вроде «повышайте вовлечённость».
${self ? NO_INVENT_RULES : ''}`,
        },
        { role: 'user', content },
      ],
    });
    return Response.json(out);
  } catch (e) {
    return errorResponse(e, 'Разбор аккаунта:');
  }
}
