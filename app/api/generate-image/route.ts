import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const key = process.env.FAL_KEY;
    if (!key || key === 'сюда_ты_потом_вставишь_ключ_от_fal_ai') {
      return NextResponse.json({ error: 'FAL_KEY не настроен в Vercel' }, { status: 500 });
    }

    const res = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        Authorization: `Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'portrait_4_3',
        num_images: 1,
        enable_safety_checker: false,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Fal ответил ошибкой:', JSON.stringify(data));
      return NextResponse.json(
        { error: data?.detail || data?.message || 'Ошибка Fal.ai' },
        { status: 500 }
      );
    }

    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: 'Fal не вернул картинку' }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Ошибка генерации:', error);
    return NextResponse.json({ error: `Ошибка сервера: ${error.message}` }, { status: 500 });
  }
}