import { NextResponse } from 'next/server';

// Функция для обращения к OpenAI
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

// Достаем чистый JSON-массив из ответа OpenAI.
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

// Превращаем data URL референса в публичную ссылку через ImgBB
async function uploadBase64ToUrl(base64DataUrl: string): Promise<string> {
  const IMGBB_KEY = process.env.IMGBB_KEY;
  if (!IMGBB_KEY) throw new Error('Не настроен ключ IMGBB_KEY в настройках Vercel');

  const cleanBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '').trim();

  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', cleanBase64);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok || !data || !data.success) {
      throw new Error(data?.error?.message || 'Не удалось загрузить картинку-референс на ImgBB');
    }
    
    return data.data.url;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Превышено время ожидания загрузки картинки (ImgBB timeout)');
    }
    throw new Error(err.message || 'Ошибка сети при загрузке референса');
  }
}

// Если референс уже ссылка — вернуть её; иначе загрузить через ImgBB
async function toPublicUrl(ref: string): Promise<string> {
  if (/^https?:\/\//.test(ref)) return ref;
  return await uploadBase64ToUrl(ref);
}

export async function POST(req: Request) {
  try {
    const { prompt, engine, count = 1, references = [], autoTranslate = false } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт не может быть пустым' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    let finalPrompts: string[] = [prompt];

    // Логика перевода и серия промптов
    if (openAiKey && (autoTranslate || count > 1)) {
      if (count > 1) {
        const sysPrompt = `Ты - AI-ассистент режиссера. Пользователь дает описание. Твоя задача - создать серию из ${count} последовательных кадров на АНГЛИЙСКОМ языке, которые показывают развитие событий. Ответь ТОЛЬКО валидным JSON массивом строк. Пример: ["prompt 1", "prompt 2", "prompt 3", "prompt 4"]. Никакого лишнего текста.`;

        try {
          const aiResponse = await callOpenAI(sysPrompt, prompt, openAiKey);
          const parsedArray = extractJsonArray(aiResponse);
          finalPrompts = parsedArray && parsedArray.length > 0 ? parsedArray : Array(count).fill(prompt);
        } catch (e) {
          console.error("Ошибка генерации серии через AI", e);
          finalPrompts = Array(count).fill(prompt);
        }
      } else if (autoTranslate) {
        const sysPrompt = `Translate the user's prompt to English. Make it optimized for image generation. Add terms like "masterpiece, 8k, hyperrealistic, highly detailed" if it's a photo. Reply ONLY with the translated English prompt, no other text.`;
        try {
          const translated = await callOpenAI(sysPrompt, prompt, openAiKey);
          finalPrompts = [translated.replace(/^"|"$/g, '').trim()];
        } catch (e) {
          console.error("Ошибка перевода", e);
        }
      }
    }

    // Референсы: превратить в публичную ссылку
    const primaryReference = references.length > 0 ? references[0] : null;
    const referenceUrl = primaryReference ? await toPublicUrl(primaryReference) : null;

    // Функции-генераторы для движков
    const generateWithFlux = async (currentPrompt: string) => {
      if (!process.env.FAL_KEY) throw new Error('FAL_KEY не настроен');
      const falKey = process.env.FAL_KEY;

      let endpoint = "https://queue.fal.run/fal-ai/flux/dev";
      const body: any = {
        prompt: currentPrompt,
        image_size: "portrait_4_3",
        enable_safety_checker: false
      };

      if (referenceUrl) {
        endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
        body.image_url = referenceUrl;
        body.strength = 0.85;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          "Authorization": `Key ${falKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Ошибка Fal: ${text}`); }
      if (!res.ok) throw new Error(data.detail || data.error || JSON.stringify(data));
      return data.images?.[0]?.url;
    };

    const generateWithSeedream = async (currentPrompt: string) => {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = {
        prompt: currentPrompt,
        aspect_ratio: "3:4",
        enable_sync_mode: true
      };

      if (referenceUrl) {
        body.image_url = referenceUrl;
        body.image_weight = 0.5;
      }

      const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waveKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Ошибка WaveSpeed: ${text}`); }
      if (!res.ok) throw new Error(data.message || JSON.stringify(data));
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
        headers: {
          'Authorization': `Bearer ${waveKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Ошибка WaveSpeed: ${text}`); }
      if (!res.ok) throw new Error(data.message || JSON.stringify(data));
      return data.data?.outputs?.[0] || data.url || data.video_url;
    };

    const generateWithNano = async (currentPrompt: string) => {
      const geminiKey = process.env.GEMINI_KEY;
      if (!geminiKey) throw new Error('GEMINI_KEY не настроен');

      const askGoogle = async (modelName: string) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: currentPrompt }],
            parameters: { sampleCount: 1, aspectRatio: "3:4" }
          })
        });
        const text = await res.text();
        try {
          return { ok: res.ok, data: JSON.parse(text) };
        } catch {
          return { ok: false, data: { error: { message: text } } };
        }
      };

      let result = await askGoogle('imagen-3.0-generate-002');
      if (!result.ok && result.data?.error?.message?.includes('not found')) {
        result = await askGoogle('imagen-3.0-generate-001');
      }
      if (!result.ok) {
        throw new Error(result.data?.error?.message || JSON.stringify(result.data));
      }

      const base64Image = result.data.predictions?.[0]?.bytesBase64Encoded || result.data.predictions?.[0]?.bytesBase64;
      if (!base64Image) {
        throw new Error('Google не вернул картинку (возможно, сработал фильтр безопасности)');
      }

      return `data:image/jpeg;base64,${base64Image}`;
    };

    // Запуск параллельно по 4 промпта
    const promptsToRun = finalPrompts.slice(0, 4);

    const generatePromises = promptsToRun.map(async (p) => {
      try {
        if (engine === 'flux') return await generateWithFlux(p);
        if (engine === 'seedream') return await generateWithSeedream(p);
        if (engine === 'seedance') return await generateWithSeedance(p);
        if (engine === 'nanobanana') return await generateWithNano(p);
        throw new Error('Неизвестный движок: ' + engine);
      } catch (err: any) {
        console.error(`Ошибка генерации для промпта "${p}":`, err.message);
        return null;
      }
    });

    const results = await Promise.all(generatePromises);
    const validResults = results.filter((url): url is string => Boolean(url));

    if (validResults.length === 0) {
      throw new Error("Не удалось сгенерировать ни одного изображения. Проверьте ключи, референс и лимиты движка.");
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
