// Помощник (вкладка «Диалог»): обычный разговор с ИИ-продюсером, который знает персонажа.
import { askText, clip, errorResponse, HttpError, type ChatMessage } from '../../lib/server/openai';
import { LIVE_TEXT_RULES, NO_INVENT_RULES, personaBlock, readPersona } from '../../lib/server/prompts';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const persona = readPersona(body.persona);
    const storyline = clip(body.storyline, 300);

    const messages: ChatMessage[] = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-16)
      .map((m) => {
        const msg = (m || {}) as { role?: string; text?: unknown };
        return { role: msg.role === 'assistant' ? 'assistant' : 'user', content: clip(msg.text, 3000) } as ChatMessage;
      })
      .filter((m) => typeof m.content === 'string' && m.content.trim());
    if (!messages.length || messages[messages.length - 1].role !== 'user') throw new HttpError('Напиши вопрос', 400);

    const sys = `${
      persona.kind === 'self'
        ? 'Ты — опытный продюсер личного бренда и SMM-помощник автора. Помогаешь с идеями постов, сюжетами недели, продажами, ответами подписчикам и правкой текстов.'
        : 'Ты — опытный продюсер и SMM-помощник автора, который ведёт вымышленного персонажа (ИИ-модель). Помогаешь с идеями постов, сюжетами, ответами фанатам, правкой текстов.'
    }

${personaBlock(persona)}
${storyline ? `\nСюжет этой недели: ${storyline}` : ''}

КАК ОТВЕЧАТЬ АВТОРУ:
- Простым языком, коротко и по делу, как подруга-практик. Без терминов и лекций.
- Если просят текст для поста или ответа — пиши голосом ${persona.kind === 'self' ? 'автора' : 'персонажа'} и по правилам ниже.
- Предлагай 2–3 варианта, когда это уместно.${persona.kind === 'model' ? '\n- Соблазнительно и с намёком можно, графическую откровенность не пиши.' : ''}

${persona.kind === 'self' ? `${NO_INVENT_RULES}\n\n` : ''}${LIVE_TEXT_RULES}`;

    const reply = await askText({ messages: [{ role: 'system', content: sys }, ...messages] });
    return Response.json({ reply });
  } catch (e) {
    return errorResponse(e, 'Помощник:');
  }
}
