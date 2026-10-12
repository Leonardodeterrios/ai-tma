import { NextResponse } from 'next/server';

async function uploadToImgBB(base64Data: string): Promise<string> {
  const apiKey = process.env.IMGBB_KEY;
  if (!apiKey) throw new Error('Не настроен IMGBB_KEY');

  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('image', cleanBase64);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
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

    if (engine === 'seedream') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = { prompt, aspect_ratio: "3:4", enable_sync_mode: true };
      if (imageUrl) {
        body.image_url = imageUrl;
        body.image_weight = 0.75;
      }

      const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка генерации');
      outputUrl = data.data?.outputs?.[0] || data.url || data.output?.url;
    } 
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
      if (!res.ok) throw new Error(data.message || 'Ошибка видео');
      outputUrl = data.data?.outputs?.[0] || data.url || data.video_url;
      mediaType = 'video';
    } 
    else {
      const falKey = process.env.FAL_KEY;
      if (!falKey) throw new Error('FAL_KEY не настроен');

      const res = await fetch("https://queue.fal.run/fal-ai/flux/dev", {
        method: 'POST',
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_size: "portrait_4_3" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка генерации');
      outputUrl = data.images?.[0]?.url;
    }

    if (!outputUrl) throw new Error('Пустой ответ от нейросети');

    return NextResponse.json({ urls: [outputUrl], type: mediaType });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
