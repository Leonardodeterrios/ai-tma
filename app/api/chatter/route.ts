// Чаттер: 3 варианта ответа фанату голосом персонажа.
import { askJSON, clip, errorResponse, HttpError } from '../../lib/server/openai';
import { personaBlock, readPersona } from '../../lib/server/prompts';
import type { LanguageMode } from '../../lib/persona';

export const maxDuration = 60;

const STAGE_GUIDE: Record<number, string> = {
  1: 'ЭТАП 1 — ЗНАКОМСТВО. Никаких продаж, намёков на платное и прайсов. Просто общаешься: встречные вопросы, шутки.',
  2: 'ЭТАП 2 — ФЛИРТ. Лёгкая интрига, двусмысленные шутки. Продажи запрещены.',
  3: 'ЭТАП 3 — ПРОГРЕВ. Создавай интерес к закрытой части, намекай, но прямо купить не предлагай.',
  4: 'ЭТАП 4 — ПЕРВОЕ ПРЕДЛОЖЕНИЕ. Мягко предложи платный контент: «если хочешь, могу показать…».',
  5: 'ЭТАП 5 — ПРОДАЖА. Можно предлагать прямо и создавать дефицит, но вперемешку с обычным общением.',
};

const SLANG = `Английский — супер-разговорный, как в iMessage или Snapchat: u, ur, wanna, gonna, rn, tbh, idk, lol, wbu.
Всё строчными буквами, без книжных слов (никаких however, perhaps, conversations).
Пример: "hey bb just chilling in bed rn. u miss me? 🥺"`;

function langRule(mode: LanguageMode) {
  if (mode === 'en') return `Поле text — СТРОГО на английском. ${SLANG}\nПоле translation — перевод text на русский (для автора, фанат его не увидит).`;
  if (mode === 'en_ru') return `Поле text — СТРОГО на английском, это уйдёт фанату. ${SLANG}\nПоле translation — тот же смысл по-русски, в манере персонажа (для автора).`;
  return 'Поле text — на русском. Поле translation — пустая строка.';
}

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['replies'],
  properties: {
    replies: {
      type: 'array',
      description: 'ровно 3 варианта',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'translation'],
        properties: { text: { type: 'string' }, translation: { type: 'string' } },
      },
    },
  },
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const persona = readPersona(body.persona);
    const fan = (body.fan && typeof body.fan === 'object' ? body.fan : {}) as Record<string, unknown>;
    const stage = Math.min(5, Math.max(1, Number(fan.stage) || 1));

    const history = (Array.isArray(fan.history) ? fan.history : [])
      .slice(-20)
      .map((m) => {
        const msg = (m || {}) as { role?: string; text?: unknown };
        return `${msg.role === 'fan' ? 'ОН' : 'ТЫ'}: ${clip(msg.text, 600)}`;
      });
    if (!history.length) throw new HttpError('Сначала добавь его сообщение', 400);

    const recentPosts = (Array.isArray(body.recentPosts) ? body.recentPosts : [])
      .filter((x): x is string => typeof x === 'string')
      .slice(0, 6)
      .map((x) => `• ${x.slice(0, 300)}`);

    const sys = `Ты — ${persona.name}, живая девушка, ведёшь переписку с фанатом в личке. Никогда не выходи из роли и не упоминай ИИ.

${personaBlock(persona)}

${STAGE_GUIDE[stage]}
Что ты о нём знаешь: ${clip(fan.notes, 1000) || 'пока ничего'}
${recentPosts.length ? `\nТвои последние посты в канале (можно на них сослаться, если к месту):\n${recentPosts.join('\n')}` : ''}

ПРАВИЛА:
- Ответь на суть его последнего сообщения.
- Коротко, как в мессенджере: 1–2 предложения. Никакой официальщины.
- Без длинных тире.
- Ровно 3 варианта: №1 тёплый, №2 игривый и дерзкий, №3 с шагом вперёд по этапу.
- ${langRule(persona.languageMode)}`;

    const out = await askJSON<{ replies: { text: string; translation: string }[] }>({
      name: 'chatter_replies',
      schema,
      temperature: 0.95,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: `Переписка:\n${history.join('\n')}\n\nНапиши 3 варианта твоего следующего сообщения.` },
      ],
    });

    const replies = (out.replies || []).filter((r) => r.text?.trim()).slice(0, 3);
    if (!replies.length) throw new HttpError('ИИ не вернул вариантов. Попробуй ещё раз', 502);
    return Response.json({ replies });
  } catch (e) {
    return errorResponse(e, 'Чаттер:');
  }
}
