// Общее подключение к OpenAI для всех серверных запросов.
// Ключ берётся только из переменных Vercel (OPENAI_KEY) и никогда не попадает в браузер.

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
};

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

async function callOpenAI(body: Record<string, unknown>) {
  // Подходит любое из двух имён — раньше в проекте использовались оба
  const key = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new HttpError('Ключ OpenAI не настроен в Vercel (OPENAI_KEY)', 500);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, ...body }),
  });

  const raw = await res.text();
  let data: {
    error?: { message?: string };
    choices?: { message?: { content?: string | null; refusal?: string | null } }[];
  };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new HttpError(`OpenAI ответил не JSON: ${raw.slice(0, 150)}`, 502);
  }
  if (!res.ok) {
    const status = res.status === 429 ? 429 : 502;
    throw new HttpError(data.error?.message || 'Ошибка OpenAI', status);
  }

  const msg = data.choices?.[0]?.message;
  if (msg?.refusal) throw new HttpError('ИИ отказался писать это. Попробуй смягчить формулировки', 422);
  // длинные тире выдают текст от ИИ — меняем на обычный дефис
  return (msg?.content || '').replace(/[ \u00a0]*—[ \u00a0]*/g, ' - ');
}

/**
 * Ответ строго по схеме (Structured Outputs).
 * Модель обязана вернуть ровно те поля, что описаны в schema, — никаких «кривых» ответов.
 */
export async function askJSON<T>(opts: {
  name: string;
  schema: Record<string, unknown>;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<T> {
  const content = await callOpenAI({
    messages: opts.messages,
    temperature: opts.temperature ?? 0.9,
    response_format: {
      type: 'json_schema',
      json_schema: { name: opts.name, strict: true, schema: opts.schema },
    },
  });
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new HttpError('ИИ вернул неполный ответ. Попробуй ещё раз', 502);
  }
}

/** Обычный текстовый ответ (для помощника) */
export async function askText(opts: { messages: ChatMessage[]; temperature?: number }) {
  const content = await callOpenAI({ messages: opts.messages, temperature: opts.temperature ?? 0.8 });
  if (!content.trim()) throw new HttpError('ИИ вернул пустой ответ', 502);
  return content.trim();
}

/** Единый формат ошибки для всех route.ts */
export function errorResponse(e: unknown, where: string) {
  console.error(where, e);
  const status = e instanceof HttpError ? e.status : 500;
  const message = e instanceof Error ? e.message : 'Ошибка сервера';
  return Response.json({ error: message }, { status });
}

/** Обрезает строку, чтобы никто не прислал огромный текст за наш счёт */
export function clip(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

/** Оставляет только нормальные картинки (по умолчанию до 3) */
export function cleanImages(v: unknown, max = 3): string[] {
  return Array.isArray(v)
    ? v.filter((r): r is string => typeof r === 'string' && r.startsWith('data:image') && r.length < 1_500_000).slice(0, max)
    : [];
}
