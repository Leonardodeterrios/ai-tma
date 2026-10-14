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
    throw new Error('Ошибка загрузки референса на ImgBB');
  }
  return data.data.url;
}

export async function POST(req: Request) {
  try {
    const { prompt, engine, references = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт пустой' }, { status: 400 });
    }

    // Загружаем референсы на ImgBB
    const uploadedUrls: string[] = [];
    for (const ref of references) {
      if (ref && typeof ref === 'string') {
        const url = ref.startsWith('http') ? ref : await uploadToImgBB(ref);
        uploadedUrls.push(url);
      }
    }

    const waveKey = process.env.WAVESPEED_KEY;
    if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

    // Для начала тестируем ТОЛЬКО генерацию фото, чтобы не было таймаутов
    const endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro';

    const body: any = { 
      prompt, 
      enable_sync_mode: true,
      aspect_ratio: "3:4"
    };

    // ВАЖНО: Добавляем референс. Для SeeDream часто используется поле init_image
    if (uploadedUrls.length > 0) {
      body.init_image = uploadedUrls[0]; 
      // Если WaveSpeed требует другое название, поменяем потом. 
      // Пока пробуем init_image
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Ошибка генерации в WaveSpeed');

    const outputUrl = data.data?.outputs?.[0] || data.url || data.output?.url;

    if (!outputUrl) throw new Error('Нейросеть вернула пустой результат');

    return NextResponse.json({ urls: [outputUrl], type: 'image' });

  } catch (error: any) {
    console.error('Ошибка бэкенда:', error.message);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
