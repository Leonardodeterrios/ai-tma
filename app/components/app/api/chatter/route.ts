import { NextResponse } from 'next/server';

export const maxDuration = 60;

const STAGE_NAMES: Record<number, string> = {
  1: 'Знакомство — только познакомились, лёгкая болтовня',
  2: 'Флирт — он нравится, можно дразнить и намекать',
  3: 'Прогрев — доверие есть, можно намекать на закрытый контент',
  4: 'Первое PPV — предлагаем первый платный контент, мягко',
  5: 'Продажа — он уже покупал, можно предлагать прямее',
};

export async function POST(req: Request) {
  try {
    const { persona, fan, fanMessage } = await req.json();

    const key = process.env.OPENAI_KEY;
    if (!key) return NextResponse.json({ error: 'OPENAI_KEY не настроен' }, { status: 500 });
    if (!persona || !fan) return NextResponse.json({ error: 'Нет персоны или фаната' }, { status: 400 });

    const langRule =
      persona.languageMode === 'en'
        ? 'Отвечай ТОЛЬКО на английском, разговорным языком.'
        : persona.languageMode === 'ru'
        ? 'Отвечай ТОЛЬКО на русском.'
        : 'Отвечай на русском, но если уместно — вставляй английские слова/фразы в квадратных скобках, как в примерах.';

    const historyText = (fan.history || [])
      .slice(-14)
      .map((m: any) => `${m.role === 'fan' ? 'ОН' : 'ТЫ'}: ${m.text}`)
      .join('\n');

    const sys = `Ты — ${persona.name}, ${persona.age} лет. Живой человек, ведёшь переписку в личке.

Твой характер: ${persona.character}
Факты о тебе: ${persona.lifeFacts}

Как ты пишешь (копируй регистр, сленг, длину фраз, эмодзи):
${persona.examples}

Этап общения с этим парнем: ${STAGE_NAMES[fan.stage] || STAGE_NAMES[1]}
Что ты о нём знаешь: ${fan.notes || 'ничего'}

История переписки:
${historyText || '(пока пусто)'}

Его последнее сообщение: ${fanMessage}

ПРАВИЛА:
- Никогда не выходи из роли. Не упоминай, что ты ИИ или ассистент.
- Пиши коротко, как в мессенджере: 1-3 предложения.
- Никакой вежливой официальщины, никаких длинных абзацев.
- ${langRule}
- Предложи 3 разных варианта ответа: №1 — тёплый, №2 — дерзкий/игривый, №3 — с намёком на следующий шаг по этапу.

Ответь ТОЛЬКО валидным JSON: {"replies":["...","...","..."]}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: fanMessage || '...' }],
        temperature: 0.95,
        response_format: { type: 'json_object' },
      }),
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error(`OpenAI вернул не JSON: ${text.slice(0, 150)}`); }
    if (!res.ok) throw new Error(data.error?.message || 'Ошибка OpenAI');

    const content = data.choices?.[0]?.message?.content || '';
    let parsed: any;
    try { parsed = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Модель ответила без JSON');
      parsed = JSON.parse(m[0]);
    }

    const replies = Array.isArray(parsed.replies) ? parsed.replies.filter((r: any) => typeof r === 'string' && r.trim()) : [];
    if (!replies.length) throw new Error('Модель не вернула вариантов');

    return NextResponse.json({ replies });
  } catch (error: any) {
    console.error('Чаттер:', error);
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
