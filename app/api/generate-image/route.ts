import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, engine, references = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт пустой' }, { status: 400 });
    }

    const waveKey = process.env.WAVESPEED_KEY;
    if (!waveKey) {
      throw new Error('Не настроен WAVESPEED_KEY в Vercel');
    }

    const isVideo = engine === 'seedance';
    let referenceImage = references.length > 0 ? references[0] : null;

    let endpoint = '';
    const body: any = { 
      prompt, 
      enable_sync_mode: true 
    };

    if (isVideo) {
      // Видеогенерация (Seedance)
      endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video';
      // Если у вас видеомодель тоже поддерживает референс, передайте его здесь (зависит от API)
      if (referenceImage) {
        body.image_url = referenceImage;
      }
    } else {
      // Генерация изображений (Seedream)
      if (referenceImage) {
        // Если есть референс, используем эндпоинт редактирования/img2img
        endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro/edit';
        body.image_url = referenceImage;
        body.image_weight = 0.8;
      } else {
        // Если референса нет — стандартный text-to-image
        endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro';
        body.aspect_ratio = "3:4";
      }
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

    const outputUrl = data.data?.outputs?.[0] || data.url || data.output?.url || data.video_url;
    const mediaType = isVideo ? 'video' : 'image';

    if (!outputUrl) {
      throw new Error('Нейросеть не смогла вернуть ссылку на результат');
    }

    return NextResponse.json({ urls: [outputUrl], type: mediaType });

  } catch (error: any) {
    console.error('Ошибка бэкенда:', error.message);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
