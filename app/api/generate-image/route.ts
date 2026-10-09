import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, engine } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт не может быть пустым' }, { status: 400 });
    }

    // ==========================================
    // 1. FAL.AI (FLUX) - БЫСТРЫЕ ФОТО
    // ==========================================
    if (engine === 'flux') {
      const falKey = process.env.FAL_KEY;
      if (!falKey) return NextResponse.json({ error: 'FAL_KEY не настроен' }, { status: 500 });

      const res = await fetch("https://queue.fal.run/fal-ai/flux/dev", {
        method: "POST",
        headers: {
          "Authorization": `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          image_size: "landscape_4_3",
          enable_safety_checker: false // Убрали цензуру
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      
      const imageUrl = data.images?.[0]?.url;
      return NextResponse.json({ url: imageUrl, type: 'image' });
    }

    // ==========================================
    // 2. WAVESPEED (SEEDREAM) - ФОТО (UNCENSORED)
    // ==========================================
    if (engine === 'seedream') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) return NextResponse.json({ error: 'WAVESPEED_KEY не настроен' }, { status: 500 });

      const res = await fetch('https://api.wavespeed.ai/v1/models/bytedance/seedream-v5.0-pro', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waveKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          aspect_ratio: "3:4"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));

      const imageUrl = data.url || data.output?.url || data.images?.[0]?.url;
      return NextResponse.json({ url: imageUrl, type: 'image' });
    }

    // ==========================================
    // 3. WAVESPEED (SEEDANCE) - ВИДЕО
    // ==========================================
    if (engine === 'seedance') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) return NextResponse.json({ error: 'WAVESPEED_KEY не настроен' }, { status: 500 });

      const res = await fetch('https://api.wavespeed.ai/v1/models/bytedance/seedance-2.0/text-to-video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waveKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));

      const videoUrl = data.url || data.video_url || data.output?.url;
      return NextResponse.json({ url: videoUrl, type: 'video' });
    }

    return NextResponse.json({ error: 'Неизвестный движок' }, { status: 400 });

  } catch (error: any) {
    console.error('Ошибка сервера:', error);
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
