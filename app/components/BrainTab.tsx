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

    // Загружаем все переданные референсы на хостинг, чтобы получить публичные URL
    const uploadedUrls: string[] = [];
    for (const ref of references) {
      if (ref && typeof ref === 'string') {
        const url = await ref.startsWith('http') ? ref : await uploadToImgBB(ref);
        uploadedUrls.push(url);
      }
    }

    let outputUrl = '';
    let mediaType: 'image' | 'video' = 'image';

    // 1. SEEDREAM (WaveSpeed)
    if (engine === 'seedream') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = { 
        prompt, 
        aspect_ratio: "3:4", 
        enable_sync_mode: true 
      };

      // Если есть референсы, передаем их массивом или главной ссылкой согласно API WaveSpeed
      if (uploadedUrls.length > 0) {
        body.image_url = uploadedUrls[0]; // Основной референс
        body.image_urls = uploadedUrls;   // Массив всех референсов, если поддерживается
        body.image_weight = 0.8;
      }

      const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка WaveSpeed Seedream');
      outputUrl = data.data?.outputs?.[0] || data.url || data.output?.url;
    } 
    // 2. SEEDANCE (Видео)
    else if (engine === 'seedance') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = { prompt, enable_sync_mode: true };
      let endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video';

      if (uploadedUrls.length > 0) {
        endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video';
        body.image_url = uploadedUrls[0];
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка WaveSpeed Seedance');
      outputUrl = data.data?.outputs?.[0] || data.url || data.video_url;
      mediaType = 'video';
    } 
    // 3. FLUX / NANO
    else {
      const falKey = process.env.FAL_KEY;
      if (!falKey) throw new Error('FAL_KEY не настроен');

      let endpoint = "https://queue.fal.run/fal-ai/flux/dev";
      const body: any = { prompt, image_size: "portrait_4_3" };

      if (uploadedUrls.length > 0) {
        endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
        body.image_url = uploadedUrls[0];
        body.strength = 0.8;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка Fal.ai Flux');
      outputUrl = data.images?.[0]?.url;
    }

    if (!outputUrl) throw new Error('Нейросеть вернула пустой результат');

    return NextResponse.json({ urls: [outputUrl], type: mediaType });

  } catch (error: any) {
    console.error('Ошибка бэкенда:', error.message);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
