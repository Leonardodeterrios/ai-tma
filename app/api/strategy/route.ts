// Стратегия на следующую неделю: разбор цифр, честный вердикт и 4–6 конкретных шагов.
import { askJSON, clip, errorResponse, HttpError } from '../../lib/server/openai';
import { goalsLine, NO_INVENT_RULES, personaBlock, readPersona } from '../../lib/server/prompts';

export const maxDuration = 60;

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'verdict', 'focus', 'recommendations', 'scenario'],
  properties: {
    summary: { type: 'string', description: 'что изменилось за неделю: цифры, рост или падение в %, что сработало, 2–4 предложения' },
    verdict: { type: 'string', description: 'одна фраза: успеваем ли к цели и какой нужен темп в неделю' },
    focus: { type: 'string', description: 'главный фокус следующей недели, одна фраза' },
    recommendations: {
      type: 'array',
      description: '4–6 конкретных выполнимых шагов на неделю',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'why'],
        properties: {
          text: { type: 'string', description: 'что сделать, проверяемо: глагол + сколько + где' },
          why: { type: 'string', description: 'зачем, одним предложением' },
        },
      },
    },
    scenario: { type: 'string', description: 'сценарий для контент-плана следующей недели: темы и события, 2–4 предложения' },
  },
};

const NUM_KEYS = ['followers', 'reach', 'comments', 'leads', 'sales', 'revenue'] as const;
const LABELS: Record<(typeof NUM_KEYS)[number], string> = {
  followers: 'подписчики', reach: 'охваты', comments: 'комментарии', leads: 'заявки', sales: 'продажи', revenue: 'выручка ₽',
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const persona = readPersona(body.persona);

    // история показателей по неделям (старые → новые)
    const history = (Array.isArray(body.history) ? body.history : []).slice(-8).map((h) => {
      const x = (h || {}) as { week?: unknown; metrics?: Record<string, unknown> };
      const m = x.metrics || {};
      const nums = NUM_KEYS.map((k) => (clip(m[k], 15) ? `${LABELS[k]}: ${clip(m[k], 15)}` : '')).filter(Boolean).join(', ');
      const best = clip(m.best, 300);
      return `Неделя с ${clip(x.week, 10)}: ${nums || 'нет цифр'}${best ? `. Что зашло: ${best}` : ''}`;
    });
    if (!history.length) throw new HttpError('Заполни показатели недели', 400);

    const review = (Array.isArray(body.review) ? body.review : []).slice(0, 8).map((r) => {
      const x = (r || {}) as { text?: unknown; done?: unknown; reason?: unknown };
      return x.done ? `✓ ${clip(x.text, 300)}` : `✗ ${clip(x.text, 300)} — не сделано, причина: ${clip(x.reason, 400) || 'не указана'}`;
    });
    const liked = (Array.isArray(body.liked) ? body.liked : []).filter((x): x is string => typeof x === 'string').slice(0, 4).map((x) => `• ${x.slice(0, 300)}`);

    const self = persona.kind === 'self';
    const out = await askJSON({
      name: 'weekly_strategy',
      schema,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content: `Ты — опытный продюсер ${self ? 'личного бренда' : 'ИИ-моделей'}. Раз в неделю разбираешь цифры автора и даёшь стратегию на следующую неделю.

${personaBlock(persona)}
${goalsLine(persona) || 'Цели в цифрах не заданы: предложи ориентир в summary.'}

КАК ОТВЕЧАТЬ:
- Простым языком, как подруга-практик. Честно: если цифры падают — так и скажи, но без упрёков, и сразу что делать.
- Считай динамику по сравнению с прошлой неделей в процентах, если есть данные.
- Если есть цель и срок — посчитай, какой нужен прирост в неделю, и сравни с текущим.
- Рекомендации — конкретные и проверяемые: «3 рилса с хуком-вопросом», «ответить на все комментарии в течение часа», а не «быть активнее».
- Учитывай отчёт по прошлым рекомендациям: что сработало — усиль; если пункт не выполнен — учти причину (нет времени → упрости, не получилось → дай пошаговую подсказку), не повторяй его один в один.
- Без длинных тире.
${self ? NO_INVENT_RULES : ''}`,
        },
        {
          role: 'user',
          content: `Показатели по неделям:
${history.join('\n')}

${review.length ? `Отчёт по рекомендациям прошлой недели:\n${review.join('\n')}` : 'Это первая неделя, отчёта по рекомендациям нет.'}
${liked.length ? `\nПосты, которые автору понравились:\n${liked.join('\n')}` : ''}

Дай стратегию на следующую неделю.`,
        },
      ],
    });
    return Response.json(out);
  } catch (e) {
    return errorResponse(e, 'Стратегия:');
  }
}
