// Изучение сайта автора: скачиваем страницу, вытаскиваем текст и просим ИИ
// коротко описать продукт, аудиторию и цифры — чтобы заполнить анкету блога.
import { askJSON, clip, errorResponse, HttpError } from '../../lib/server/openai';

export const maxDuration = 30;

const PRIVATE_HOST = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1\]?$)|\.(local|internal)$/i;

function checkUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new HttpError('Не похоже на адрес сайта', 400);
  }
  if (!/^https?:$/.test(url.protocol) || PRIVATE_HOST.test(url.hostname) || !url.hostname.includes('.')) {
    throw new HttpError('Этот адрес открыть нельзя', 400);
  }
  return url;
}

/** Грубо превращаем HTML в текст: убираем скрипты, стили и теги */
function htmlToText(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || '';
  const body = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|section|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;|&ndash;/g, '-')
    .replace(/&#?\w+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n');
  return `${title}\n${desc}\n${body}`.trim().slice(0, 12000);
}

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['niche', 'audience', 'offer', 'proof', 'about'],
  properties: {
    niche: { type: 'string', description: 'о чём проект, 1 предложение' },
    audience: { type: 'string', description: 'для кого и какие у них боли, 1–2 предложения' },
    offer: { type: 'string', description: 'что продаётся: продукты, тарифы, цены — только то, что есть на сайте' },
    proof: { type: 'string', description: 'цифры, результаты, кейсы, отзывы с сайта, каждый с новой строки; пусто, если нет' },
    about: { type: 'string', description: 'кто автор, 1 предложение; пусто, если не сказано' },
  },
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const url = checkUrl(clip(body.url, 300).trim());

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ViralBrainBot/1.0)', Accept: 'text/html' },
        signal: AbortSignal.timeout(10_000),
        redirect: 'follow',
      });
    } catch {
      throw new HttpError('Сайт не открылся. Проверь адрес или заполни руками', 422);
    }
    if (PRIVATE_HOST.test(new URL(res.url || url.href).hostname)) throw new HttpError('Этот адрес открыть нельзя', 400);
    if (!res.ok) throw new HttpError(`Сайт ответил ошибкой (${res.status}). Заполни руками`, 422);

    const html = (await res.text()).slice(0, 600_000);
    const text = htmlToText(html);
    if (text.length < 80) throw new HttpError('На сайте почти нет текста, который можно прочитать. Заполни руками', 422);

    const out = await askJSON<Record<string, string>>({
      name: 'brand_scan',
      schema,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'Ты читаешь текст сайта и коротко, простым языком выписываешь факты для анкеты блогера. Ничего не выдумывай: только то, что прямо есть в тексте. Пиши по-русски, без длинных тире.',
        },
        { role: 'user', content: `Текст сайта ${url.hostname}:\n\n${text}` },
      ],
    });
    return Response.json(out);
  } catch (e) {
    return errorResponse(e, 'Изучение сайта:');
  }
}
