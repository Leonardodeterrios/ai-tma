import { NextResponse } from 'next/server';

export const maxDuration = 60;

const ARCHETYPES: Record<string, { name: string; voice: string }> = {
  siren:    { name: 'Сирена',        voice: 'соблазн и власть взгляда. Говорит намёками, дразнит, оставляет недосказанность. Короткие фразы, много подтекста.' },
  mystery:  { name: 'Загадка',       voice: 'холодная недосказанность. Не отвечает прямо, задаёт вопросы, исчезает. Минимум эмодзи, максимум пауз.' },
  girl:     { name: 'Своя девчонка', voice: 'тёплая, простая, как подруга. Пишет как в мессенджере: сбивчиво, искренне, с «блин» и «ой».' },
  queen:    { name: 'Королева',      voice: 'статус и дистанция. Говорит коротко, спокойно, без нужды нравиться. Дорогие детали, высокие требования.' },
  rebel:    { name: 'Бунтарка',      voice: 'дерзко и наперекор. Не извиняется, делает что хочет, провоцирует. Живой сленг.' },
  muse:     { name: 'Муза',          voice: 'эстетика и атмосфера. Сенсорные детали: свет, запах, музыка. Немного мечтательности.' },
  huntress: { name: 'Охотница',      voice: 'энергия и соревнование. Спорт, движение, азарт. Она выбирает сама.' },
  joker:    { name: 'Комедиантка',   voice: 'юмор и самоирония. Не боится быть смешной, шутит над собой, подкалывает его.' },
};

export async function POST(req: Request) {
  try {
    const { archetype, storyMode, storyText, readyMessages, references } = await req.json();

    const key = process.env.OPENAI_KEY;
    if (!key) return NextResponse.json({ error: 'OPENAI_KEY не настроен' }, { status: 500 });

    const arch = ARCHETYPES[archetype] || ARCHETYPES.siren;

    const storyBlock =
      storyMode === 'none'
        ? 'Истории нет. Контент — лайфстайл без сюжета.'
        : storyMode === 'have'
        ? `У персонажа уже есть история: ${storyText || '(не расписана, придумай логичный сюжет на её основе)'}`
        : `Историю надо создать на основе этого запроса: ${storyText || 'переезд в новый город, поиск себя'}`;

    const styleBlock = readyMessages && String(readyMessages).trim().length > 20
      ? `Вот реальные сообщения персонажа. Скопируй манеру: длину фраз, строчные буквы, эмодзи, сленг, пунктуацию:\n${String(readyMessages).slice(0, 1500)}`
      : 'Манера речи: как в живом мессенджере, строчными буквами, без официальщины.';

    const sys = `Ты — SMM-редактор канала с вымышленным персонажем. Составь контент-план на неделю: 7 постов, дни Пн–Вс.

АРХЕТИП: ${arch.name} — ${arch.voice}

ИСТОРИЯ: ${storyBlock}

${styleBlock}

ЕСЛИ К ПОСТУ ПРИЛОЖЕНЫ ФОТО: внимательно посмотри на внешность персонажа (волосы, лицо, фигуру, стиль) и описывай именно её в imagePrompt. Если фото нет — опиши внешность, подходящую архетипу и истории.

ПРАВИЛА ДЛЯ ТЕКСТА:
- От первого лица, голосом персонажа. 40-80 слов.
- Конкретные детали вместо общих слов. Никаких «в современном мире» и «девочки, привет».
- Форматы разные: личное фото с подписью, заметка-размышление, закулисье, сторис-описание, вопрос подписчикам, шутка, мягкий PPV-тизер.
- Соблазнительно и с намёком, но без графической откровенности — интрига работает лучше.
- Хэштеги: 2-3 на пост, по-русски, с решёткой.
- goal: одно из значений — Прогрев, Вовлечение, Доверие, Продажа.

ПРАВИЛА ДЛЯ imagePrompt:
- Полностью на АНГЛИЙСКОМ.
- Детальная сцена: локация, свет, одежда, поза, объектив.
- Обязательно внешность персонажа.
- В конце: "photorealistic, 8k, highly detailed, natural skin texture".

Ответь ТОЛЬКО валидным JSON, без markdown:
{"posts":[{"day":"Пн","format":"Фото","goal":"Доверие","title":"...","text":"...","hashtags":"#тег1 #тег2","imagePrompt":"..."}]}`;

    const userContent: any[] = [{ type: 'text', text: 'Составь контент-план на неделю по правилам.' }];
    const imgs: string[] = Array.isArray(references)
      ? references.filter((r: any) => typeof r === 'string' && r.startsWith('data:image')).slice(0, 3)
      : [];
    imgs.forEach((url) => userContent.push({ type: 'image_url', image_url: { url } }));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userContent },
        ],
        temperature: 0.9,
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

    const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    if (!posts.length) throw new Error('Модель не вернула постов');

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('Контент-план:', error);
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
