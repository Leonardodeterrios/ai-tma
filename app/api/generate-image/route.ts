import { NextResponse } from 'next/server';

async function callOpenAI(systemPrompt: string, userPrompt: string, apiKey: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Ошибка OpenAI');
  return data.choices[0].message.content;
}

function extractJsonArray(text: string): string[] | null {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function uploadBase64ToUrl(base64DataUrl: string): Promise<string> {
  const IMGBB_KEY = process.env.IMGBB_KEY;
  if (!IMGBB_KEY) throw new Error('Не настроен IMGBB_KEY на Vercel');

  const base64Data = base64DataUrl.includes(',') ? base64DataUrl.split(',')[1] : base64DataUrl;

  const params = new URLSearchParams();
  params.append('key', IMGBB_KEY);
  params.append('image', base64Data);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = await res.json();
  if (!res.ok || !data || !data.success) {
    throw new Error(data?.error?.message || 'Ошибка загрузки в ImgBB');
  }

  return data.data.url;
}

export async function POST(req: Request) {
  try {
    const { prompt, engine, count = 1, references = [], autoTranslate = false } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт не может быть пустым' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    let finalPrompts: string[] = [prompt];

    if (openAiKey && (autoTranslate || count > 1)) {
      if (count > 1) {
        const sysPrompt = `Ты - AI-ассистент режиссера. Твоя задача - создать серию из ${count} кадров на АНГЛИЙСКОМ. Ответь ТОЛЬКО JSON массивом строк: ["prompt 1", "prompt 2"]`;
        try {
          const aiResponse = await callOpenAI(sysPrompt, prompt, openAiKey);
          const parsedArray = extractJsonArray(aiResponse);
          finalPrompts = parsedArray && parsedArray.length > 0 ? parsedArray : Array(count).fill(prompt);
        } catch (e) {
          finalPrompts = Array(count).fill(prompt);
        }
      } else if (autoTranslate) {
        const sysPrompt = `Translate prompt to English for image generation. Reply ONLY with translated text.`;
        try {
          const translated = await callOpenAI(sysPrompt, prompt, openAiKey);
          finalPrompts = [translated.replace(/^"|"$/g, '').trim()];
        } catch (e) {}
      }
    }

    let referenceUrl: string | null = null;
    if (references.length > 0 && references[0]) {
      try {
        referenceUrl = await uploadBase64ToUrl(references[0]);
      } catch (err: any) {
        throw new Error('Ошибка референса: ' + err.message);
      }
    }

    const generateWithFlux = async (currentPrompt: string) => {
      const falKey = process.env.FAL_KEY;
      if (!falKey) throw new Error('FAL_KEY не настроен');

      let endpoint = "https://queue.fal.run/fal-ai/flux/dev";
      const body: any = { prompt: currentPrompt, image_size: "portrait_4_3", enable_safety_checker: false };

      if (referenceUrl) {
        endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
        body.image_url = referenceUrl;
        body.strength = 0.85;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка Fal');
      return data.images?.[0]?.url;
    };

    const generateWithSeedream = async (currentPrompt: string) => {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = { prompt: currentPrompt, aspect_ratio: "3:4", enable_sync_mode: true };
      if (referenceUrl) {
        body.image_url = referenceUrl;
        body.image_weight = 0.5;
      }

      const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка WaveSpeed');
      return data.data?.outputs?.[0] || data.url || data.output?.url;
    };

    const generateWithSeedance = async (currentPrompt: string) => {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = { prompt: currentPrompt, enable_sync_mode: true };
      let endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video';

      if (referenceUrl) {
        endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video';
        body.image_url = referenceUrl;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка WaveSpeed Video');
      return data.data?.outputs?.[0] || data.url || data.video_url;
    };

    const generateWithNano = async (currentPrompt: string) => {
      const geminiKey = process.env.GEMINI_KEY;
      if (!geminiKey) throw new Error('GEMINI_KEY не настроен');

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: currentPrompt }],
          parameters: { sampleCount: 1, aspectRatio: "3:4" }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Ошибка Google Gemini');

      const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
      if (!base64Image) throw new Error('Google не вернул картинку');

      return `data:image/jpeg;base64,${base64Image}`;
    };

    const promptsToRun = finalPrompts.slice(0, 4);

    const generatePromises = promptsToRun.map(async (p) => {
      try {
        if (engine === 'flux') return await generateWithFlux(p);
        if (engine === 'seedream') return await generateWithSeedream(p);
        if (engine === 'seedance') return await generateWithSeedance(p);
        if (engine === 'nanobanana') return await generateWithNano(p);
        throw new Error('Неизвестный движок');
      } catch (err: any) {
        console.error(err);
        return null;
      }
    });

    const results = await Promise.all(generatePromises);
    const validResults = results.filter((url): url is string => Boolean(url));

    if (validResults.length === 0) {
      throw new Error("Не удалось сгенерировать. Проверьте баланс на сервисах и ключи.");
    }

    return NextResponse.json({
      urls: validResults,
      type: engine === 'seedance' ? 'video' : 'image'
    });

  } catch (error: any) {
    console.error('Ошибка сервера:', error);
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
