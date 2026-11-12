// Стратегия на следующую неделю.
// Все цифры (темп, разрыв с целью, конверсии) считает код — ИИ их не пересчитывает, а только объясняет
// и даёт 4–6 конкретных шагов с готовыми примерами.
import { askJSON, clip, errorResponse, HttpError } from '../../lib/server/openai';
import { goalsLine, LIVE_TEXT_RULES, NO_INVENT_RULES, personaBlock, readPersona } from '../../lib/server/prompts';
import { MODEL_PLATFORM_RULES, PLATFORM_RULES, type Persona } from '../../lib/persona';

export const maxDuration = 60;

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'verdict', 'focus', 'recommendations', 'scenario'],
  properties: {
    summary: { type: 'string', description: 'что произошло за неделю, опираясь на РАСЧЁТ, 2–3 предложения' },
    verdict: { type: 'string', description: 'честно: успеваем ли к цели, где самый большой разрыв, какой промежуточный ориентир реален на ближайший месяц' },
    focus: { type: 'string', description: 'главный фокус недели — работа над самым большим разрывом, одна фраза' },
    recommendations: {
      type: 'array',
      description: '4–6 конкретных шагов',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['platform', 'text', 'example', 'why'],
        properties: {
          platform: { type: 'string', description: 'площадка или «Продукт» / «Воронка»' },
          text: { type: 'string', description: 'что сделать: глагол + сколько + где + к какому дню' },
          example: { type: 'string', description: 'готовый кусок: хук рилса, первая строка поста, текст сторис, оффер. Пишется голосом автора.' },
          why: { type: 'string', description: 'какую цифру из РАСЧЁТА это двигает, одно предложение' },
        },
      },
    },
    scenario: { type: 'string', description: 'сценарий для контент-плана следующей недели: темы и события, 2–4 предложения' },
  },
};

type M = { followers: number; reach: number; comments: number; leads: number; sales: number; revenue: number; best: string };
const KEYS = ['followers', 'reach', 'comments', 'leads', 'sales', 'revenue'] as const;
const n = (v: unknown) => {
  const x = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(x) ? x : 0;
};
const fmt = (x: number) => Math.round(x).toLocaleString('ru-RU');
/** «в 11 раз», «в 2,5 раза» */
const times = (x: number) => {
  const r = x >= 10 ? Math.round(x) : Math.round(x * 10) / 10;
  const t = String(r).replace('.', ',');
  const few = !Number.isInteger(r) || ([2, 3, 4].includes(r % 10) && ![12, 13, 14].includes(r % 100));
  return `в ${t} ${few ? 'раза' : 'раз'}`;
};
const pct = (a: number, b: number) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : '');

/** Считает всё, что можно посчитать, и возвращает строки «РАСЧЁТ» */
function calculate(p: Persona, weeks: { week: string; m: M }[]): string[] {
  const now = weeks[weeks.length - 1].m;
  const prev = weeks.length > 1 ? weeks[weeks.length - 2].m : null;
  const lines: string[] = [];

  // динамика неделя к неделе
  if (prev) {
    const diffs = KEYS.filter((k) => now[k] && prev[k] && k !== 'followers').map((k) => `${k === 'reach' ? 'охваты' : k === 'comments' ? 'комментарии' : k === 'leads' ? 'заявки' : k === 'sales' ? 'продажи' : 'выручка'} ${pct(now[k], prev[k])}`);
    if (diffs.length) lines.push(`К прошлой неделе: ${diffs.join(', ')}.`);
  }

  // сроки
  const deadline = p.goalDeadline ? new Date(p.goalDeadline) : null;
  const weeksLeft = deadline && !Number.isNaN(deadline.getTime()) ? Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / (7 * 86_400_000))) : 0;
  if (weeksLeft) lines.push(`До срока ${p.goalDeadline}: ${weeksLeft} нед.`);

  // подписчики
  const goalF = n(p.goalFollowers);
  if (now.followers) {
    const growth = prev?.followers ? now.followers - prev.followers : null;
    lines.push(`Подписчиков сейчас: ${fmt(now.followers)}${growth !== null ? ` (за неделю ${growth >= 0 ? '+' : ''}${fmt(growth)})` : ''}.`);
    if (goalF > now.followers && weeksLeft) {
      const need = Math.ceil((goalF - now.followers) / weeksLeft);
      lines.push(`Чтобы прийти к ${fmt(goalF)}, нужно +${fmt(need)} в неделю${growth !== null ? `, сейчас ${growth >= 0 ? '+' : ''}${fmt(growth)}: это ${growth > 0 ? `${times(need / growth)} медленнее нужного` : 'роста нет'}` : ''}.`);
    } else if (goalF && now.followers >= goalF) lines.push('Цель по подписчикам уже достигнута.');
  }

  // деньги
  const goalR = n(p.goalRevenue);
  if (now.revenue) {
    const monthPace = now.revenue * 4.33;
    lines.push(`Выручка за неделю ${fmt(now.revenue)} ₽ → темп ≈ ${fmt(monthPace)} ₽ в месяц.`);
    if (goalR > monthPace) lines.push(`Цель ${fmt(goalR)} ₽ в месяц больше текущего темпа ${times(goalR / monthPace)}.`);
    if (now.sales) {
      const check = now.revenue / now.sales;
      lines.push(`Средний чек ${fmt(check)} ₽ (продаж за неделю: ${now.sales}).`);
      if (goalR) lines.push(`При таком чеке для ${fmt(goalR)} ₽ в месяц нужно ≈ ${fmt(goalR / check)} продаж в месяц (≈ ${fmt(goalR / check / 4.33)} в неделю).`);
    }
  }

  // конверсии воронки
  if (now.reach && now.leads) lines.push(`Охваты → заявки: ${((now.leads / now.reach) * 100).toFixed(2)}%.`);
  if (now.leads && now.sales) lines.push(`Заявки → продажи: ${Math.round((now.sales / now.leads) * 100)}%.`);
  if (now.reach && now.comments) lines.push(`Комментарии на 1000 охвата: ${((now.comments / now.reach) * 1000).toFixed(1)}.`);
  if (now.best) lines.push(`Лучше всего зашло: ${now.best}.`);
  return lines;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const persona = readPersona(body.persona);

    // показатели по неделям (старые → новые)
    const weeks = (Array.isArray(body.history) ? body.history : []).slice(-8).map((h) => {
      const x = (h || {}) as { week?: unknown; metrics?: Record<string, unknown> };
      const m = x.metrics || {};
      return {
        week: clip(x.week, 10),
        m: { followers: n(m.followers), reach: n(m.reach), comments: n(m.comments), leads: n(m.leads), sales: n(m.sales), revenue: n(m.revenue), best: clip(m.best, 300) },
      };
    });
    if (!weeks.length) throw new HttpError('Заполни показатели недели', 400);
    const math = calculate(persona, weeks);

    const review = (Array.isArray(body.review) ? body.review : []).slice(0, 8).map((r) => {
      const x = (r || {}) as { text?: unknown; done?: unknown; reason?: unknown };
      return x.done ? `✓ ${clip(x.text, 300)}` : `✗ ${clip(x.text, 300)} — не сделано, причина: ${clip(x.reason, 400) || 'не указана'}`;
    });
    const liked = (Array.isArray(body.liked) ? body.liked : []).filter((x): x is string => typeof x === 'string').slice(0, 4).map((x) => `• ${x.slice(0, 300)}`);

    const self = persona.kind === 'self';
    const out = await askJSON<Record<string, unknown>>({
      name: 'weekly_strategy',
      schema,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content: `Ты — сильный продюсер ${self ? 'личного бренда' : 'ИИ-моделей'}, который смотрит на цифры, а не на вдохновение. Раз в неделю разбираешь показатели и даёшь стратегию на следующую неделю.

${personaBlock(persona)}
${goalsLine(persona) || 'Цели в цифрах не заданы: предложи реальный ориентир на месяц.'}

КАК ДУМАТЬ:
- Все цифры уже посчитаны в блоке РАСЧЁТ. Не пересчитывай и не придумывай другие — бери оттуда.
- Найди самый большой разрыв с целью и работай в первую очередь над ним. Если выручку нужно увеличить в десятки раз, честно скажи, что одним контентом это не закрыть, и предложи рычаги: оффер, цена и тарифы, прогрев в Telegram, лид-магнит, продажи в личке, запуск с дедлайном.
- Если цель нереальна к сроку — так и скажи спокойно и дай промежуточный ориентир на месяц.
- Опирайся на то, как работают алгоритмы её площадок (блок АЛГОРИТМЫ): советуй форматы и действия, которые двигают именно эти сигналы.
- Рекомендации только для площадок автора (${persona.platforms.join(', ') || 'любые'}) и её продукта.
- ЗАПРЕЩЕНЫ общие советы: «сделай опрос», «проведи эфир», «будь активнее», «публикуй регулярно», «повысь вовлечённость». Если совет про эфир или опрос — только с конкретной темой, днём и готовым текстом в example.
- В example — готовый кусок, который можно сразу взять: хук рилса, первая строка поста, текст сторис, оффер. Голосом автора, по правилам ниже.
- Учитывай отчёт: что сработало — усиль; не выполненный пункт не повторяй один в один, а упрости или разбей на шаги с учётом причины.
${self ? NO_INVENT_RULES : ''}

АЛГОРИТМЫ ПЛОЩАДОК:
${persona.platforms.map((x) => (self ? PLATFORM_RULES : MODEL_PLATFORM_RULES)[x]).filter(Boolean).join('\n') || 'площадки не выбраны'}

${LIVE_TEXT_RULES}`,
        },
        {
          role: 'user',
          content: `РАСЧЁТ:
${math.join('\n')}

${review.length ? `Отчёт по рекомендациям прошлой недели:\n${review.join('\n')}` : 'Это первая неделя, отчёта нет.'}
${liked.length ? `\nПосты, которые автору понравились:\n${liked.join('\n')}` : ''}

Дай стратегию на следующую неделю.`,
        },
      ],
    });
    return Response.json({ ...out, math });
  } catch (e) {
    return errorResponse(e, 'Стратегия:');
  }
}
