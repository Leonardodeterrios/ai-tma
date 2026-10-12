import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, engine, references = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт пустой' }, { status: 400 });
    }

    // Берем первый референс (если есть) как есть (base64)
    const referenceImage = references.length > 0 ? references[0] : null;

    let outputUrl = '';
    let mediaType: 'image' | 'video' = 'image';

    const waveKey = process.env.WAVESPEED_KEY;
    if (!waveKey) {
      throw new Error('Не настроен WAVESPEED_KEY в Vercel');
    }

    // Формируем запрос напрямую в WaveSpeed, передавая base64 или пустой запрос
    const isVideo = engine === 'seedance';
    const endpoint = isVideo 
      ? 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video'
      : 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro';

    const body: any = { 
      prompt, 
      enable_sync_mode: true 
    };

    if (!isVideo) {
      body.aspect_ratio = "3:4";
    }

    // Если есть референс, передаем его
    if (referenceImage) {
      body.image_url = referenceImage;
      body.image_weight = 0.8;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${waveKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Ошибка со стороны WaveSpeed API');
    }

    outputUrl = data.data?.outputs?.[0] || data.url || data.output?.url || data.video_url;
    if (isVideo) mediaType = 'video';

    if (!outputUrl) {
      throw new Error('Нейросеть не смогла вернуть ссылку на результат');
    }

    return NextResponse.json({ urls: [outputUrl], type: mediaType });

  } catch (error: any) {
    console.error('Ошибка бэкенда:', error.message);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
