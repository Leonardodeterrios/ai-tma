import { NextResponse } from 'next/server';

async function uploadToImgBB(base64Data: string): Promise<string> {
  const apiKey = process.env.IMGBB_KEY;
  if (!apiKey) throw new Error('Не настроен IMGBB_KEY');

  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  const params = new URLSearchParams();
  params.append('key', apiKey);
  params.append('image', cleanBase64);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error('Ошибка загрузки референса на хостинг');
  }

  return data.data.url;
}

export async function POST(req: Request) {
  try {
    const { prompt, engine, references = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт пустой' }, { status: 400 });
    }

    let imageUrl: string | null = null;
    if (references.length > 0 && references[0]) {
      imageUrl = await uploadToImgBB(references[0]);
    }

    let outputUrl = '';
    let mediaType: 'image' | 'video' = 'image';

    // 1. FLUX (Image-to-Image)
    if (engine === 'flux') {
      const falKey = process.env.FAL_KEY;
      if (!falKey) throw new Error('FAL_KEY не настроен');

      let endpoint = "https://queue.fal.run/fal-ai/flux/dev";
      const body: any = { prompt, image_size: "portrait_4_3" };

      if (imageUrl) {
        endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
        body.image_url = imageUrl;
        body.strength = 0.75; // Сила изменения референса
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка Fal.ai');
      outputUrl = data.images?.[0]?.url;
    }

    // 2. SEEDREAM (Image-to-Image / Multi-modal)
    else if (engine === 'seedream') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = { prompt, aspect_ratio: "3:4", enable_sync_mode: true };
      if (imageUrl) {
        body.image_url = imageUrl;
        body.image_weight = 0.8; // Увеличили вес референса, чтобы нейросеть учитывала его сильнее
      }

      const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка WaveSpeed');
      outputUrl = data.data?.outputs?.[0] || data.url || data.output?.url;
    }

    // 3. SEEDANCE (Видео из фото или текста)
    else if (engine === 'seedance') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = { prompt, enable_sync_mode: true };
      let endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video';

      if (imageUrl) {
        endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video';
        body.image_url = imageUrl;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка Seedance');
      outputUrl = data.data?.outputs?.[0] || data.url || data.video_url;
      mediaType = 'video';
    }

    // 4. NANO (Gemini / Imagen 3 с поддержкой референса)
    else if (engine === 'nanobanana') {
      const geminiKey = process.env.GEMINI_KEY;
      if (!geminiKey) throw new Error('GEMINI_KEY не настроен');

      // Передаем картинку и промпт в گوگل Gemini, если есть референс
      const parts: any[] = [{ text: prompt }];
      if (imageUrl) {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: references[0].includes(',') ? references[0].split(',')[1] : references[0]
          }
        });
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Ошибка Google Gemini');

      // Если используется текстовая модель с генерацией, либо если это Imagen:
      // Для Imagen оставляем старый метод, но с поддержкой текста:
      const imagenRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: imageUrl ? `${prompt} (based on reference image)` : prompt }],
          parameters: { sampleCount: 1, aspectRatio: "3:4" }
        })
      });

      const imagenData = await imagenRes.json();
      const base64Image = imagenData.predictions?.[0]?.bytesBase64Encoded;
      if (!base64Image) throw new Error('Google не вернул картинку');

      outputUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    if (!outputUrl) {
      throw new Error('Не удалось получить результат от нейросети');
    }

    return NextResponse.json({
      urls: [outputUrl],
      type: mediaType
    });

  } catch (error: any) {
    console.error('Ошибка:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
