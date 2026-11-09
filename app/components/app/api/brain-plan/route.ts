import { NextResponse } from 'next/server';

export const maxDuration = 60;

const POST_COUNT = 8;

export async function POST(req: Request) {
  try {
    const { answers } = await req.json();

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Анкета пустая' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_KEY;
    if (!openAiKey) {
      return NextResponse.json({ error: 'OPENAI_KEY не настроен' }, { status: 500 });
    }

    // Собираем анкету в читаемый текст
    const profile = Object.entries(answers)
      .filter(([, v]) => String(v || '').trim().length > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const sysPrompt = `Ты - опытный SMM-редактор, который ведёт телеграм-канал от лица вымышленного персонажа.

Тебе дают анкету персонажа. Придумай ${POST_COUNT} постов — контент-план на неделю.

ПРАВИЛА:
- Каждый пост написан от первого лица, голосом персонажа, с учётом его характера, речи и привычек.
- Никакой воды, никаких "в современном мире". Живые, конкретные детали.
- Разные форматы: личная заметка, фото с подписью, размышление, история, вопрос подписчикам, закулисье, рекомендация.
- Длина текста поста: 40-80 слов.
- Хэштеги: 2-3 штуки на пост, по-русски, с решёткой.
- imagePrompt: на АНГЛИЙСКОМ языке, детальное описание кадра для нейросети-генератора. Внешность персонажа из анкеты обязательна. В конце добавь "photorealistic, 8k, highly detailed".
- Учитывай стоп-темы из анкеты, никогда их не касайся.

Ответь ТОЛЬКО валидным JSON без markdown-обёрток и без пояснений, строго в формате:
{"posts":[{"day":"Пн","format":"Фото","title":"Заголовок","text":"Текст поста","hashtags":"#тег1 #тег2","imagePrompt":"english prompt"}]}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: profile },
        ],
        temperature: 0.9,
        response_format: { type: 'json_object' },
      }),
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error(`OpenAI вернул не JSON: ${text.slice(0, 200)}`); }
    if (!res.ok) throw new Error(data.error?.message || 'Ошибка OpenAI');

    const content = data.choices?.[0]?.message?.content || '';

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // На случай, если модель обернула JSON в текст
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Модель вернула ответ без JSON');
      parsed = JSON.parse(match[0]);
    }

    const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    if (posts.length === 0) throw new Error('Модель не вернула ни одного поста');

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('Ошибка контент-плана:', error);
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
