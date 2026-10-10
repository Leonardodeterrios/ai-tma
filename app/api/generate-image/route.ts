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

// Достаем чистый JSON-массив из ответа OpenAI. Без флага /s для поддержки старых стандартов TS.
function extractJsonArray(text: string): string[] | null {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, engine, count = 1, references = [], autoTranslate = false } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт не может быть пустым' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_KEY;
    let finalPrompts: string[] = [prompt];

    // ==========================================
    // ЛОГИКА ПЕРЕВОДА И СЕРИЙ (через OpenAI)
    // ==========================================
    if (openAiKey && (autoTranslate || count > 1)) {
      if (count > 1) {
        const sysPrompt = `Ты - AI-ассистент режиссера. Пользователь дает описание. Твоя задача - создать серию из ${count} последовательных кадров на АНГЛИЙСКОМ языке, которые показывают развитие событий. Ответь ТОЛЬКО валидным JSON массивом строк. Пример: ["prompt 1", "prompt 2", "prompt 3", "prompt 4"]. Никакого лишнего текста.`;

        try {
          const aiResponse = await callOpenAI(sysPrompt, prompt, openAiKey);
          const parsedArray = extractJsonArray(aiResponse);
          if (parsedArray && parsedArray.length > 0) {
            finalPrompts = parsedArray;
          } else {
            finalPrompts = Array(count).fill(prompt);
          }
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

    // Берем первый референс (Flux/Seedream принимают одну картинку для img2img)
    const primaryReference = references.length > 0 ? references[0] : null;

    // ОЧИЩАЕМ BASE64 ДЛЯ FAL.AI (чиним ошибку "did not match the expected pattern")
    let cleanReference = primaryReference;
    if (cleanReference && cleanReference.startsWith('data:')) {
      const base64Data = cleanReference.split(',')[1];
      if (base64Data) {
        cleanReference = `data:image/jpeg;base64,${base64Data}`;
      }
    }

    // ==========================================
    // 1. FAL.AI (FLUX)
    // ==========================================
    const generateWithFlux = async (currentPrompt: string) => {
      const falKey = process.env.FAL_KEY;
      if (!falKey) throw new Error('FAL_KEY не настроен');

      let endpoint = "https://queue.fal.run/fal-ai/flux/dev";
      const body: any = {
        prompt: currentPrompt,
        image_size: "portrait_4_3",
        enable_safety_checker: false
      };

      if (cleanReference) {
        endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
        body.image_url = cleanReference;
        body.strength = 0.85;
      }

      const res = await fetch(endpoint, {
        method: "POST",
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

    // ==========================================
    // 2. WAVESPEED (SEEDREAM)
    // ==========================================
    const generateWithSeedream = async (currentPrompt: string) => {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = {
        prompt: currentPrompt,
        aspect_ratio: "3:4",
        enable_sync_mode: true
      };

      if (cleanReference) {
        body.image_url = cleanReference;
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

    // ==========================================
    // 3. WAVESPEED (SEEDANCE - видео)
    // ==========================================
    const generateWithSeedance = async (currentPrompt: string) => {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) throw new Error('WAVESPEED_KEY не настроен');

      const body: any = { prompt: currentPrompt, enable_sync_mode: true };
      let endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video';

      if (cleanReference) {
        endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video';
        body.image_url = cleanReference;
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

    // ==========================================
    // 4. GOOGLE (NANO BANANA / IMAGEN)
    // ==========================================
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

    // ==========================================
    // ЗАПУСК (все кадры параллельно)
    // ==========================================
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
        return null; // не валим всю серию из-за одного кадра
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
