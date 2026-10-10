import { NextResponse } from 'next/server';

// Функция для обращения к OpenAI (для перевода и создания серий)
async function callOpenAI(systemPrompt: string, userPrompt: string, apiKey: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Быстрый и дешевый
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

export async function POST(req: Request) {
  try {
    const { prompt, engine, count = 1, references = [], autoTranslate = false } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт не может быть пустым' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_KEY;
    let finalPrompts: string[] = [prompt]; // По умолчанию 1 промпт

    // ==========================================
    // ЛОГИКА ПЕРЕВОДА И СЕРИЙ (Через OpenAI)
    // ==========================================
    if (openAiKey && (autoTranslate || count > 1)) {
      if (count > 1) {
        // Если просят серию (воронку раздевания/кокетства)
        const sysPrompt = `Ты - AI-ассистент режиссера для OF моделей. 
Пользователь дает описание. Твоя задача - создать серию из ${count} последовательных кадров на АНГЛИЙСКОМ языке, которые показывают развитие событий (например, легкое раздевание или изменение позы/эмоции). 
Ответ должен быть СТРОГО в формате JSON - массив строк. Пример: ["prompt 1", "prompt 2", "prompt 3", "prompt 4"]. Без лишнего текста. В каждом промпте сохраняй описание внешности из оригинала.`;
        
        try {
          const aiResponse = await callOpenAI(sysPrompt, prompt, openAiKey);
          finalPrompts = JSON.parse(aiResponse);
        } catch (e) {
          console.error("Ошибка генерации серии через AI", e);
          // Фолбэк: если AI сломался, просто дублируем промпт
          finalPrompts = Array(count).fill(prompt);
        }
      } else if (autoTranslate) {
        // Если 1 фото, но нужен перевод
        const sysPrompt = `Translate the user's prompt to English. Make it optimized for Stable Diffusion/Midjourney. Add terms like "masterpiece, 8k, hyperrealistic" if it's a photo. Reply ONLY with the translated English prompt, no other text.`;
        try {
          const translated = await callOpenAI(sysPrompt, prompt, openAiKey);
          finalPrompts = [translated];
        } catch (e) {
          console.error("Ошибка перевода", e);
          // Оставляем как есть, если ошибка
        }
      }
    }

    // Подготавливаем референс (берем первую картинку, если есть)
    const primaryReference = references.length > 0 ? references[0] : null;
    const resultUrls: string[] = [];

    // ==========================================
    // ФУНКЦИИ ГЕНЕРАЦИИ ДЛЯ КАЖДОГО ДВИЖКА
    // ==========================================

    const generateWithFlux = async (currentPrompt: string) => {
      const falKey = process.env.FAL_KEY;
      if (!falKey) throw new Error('FAL_KEY не настроен');

      const body: any = {
        prompt: currentPrompt,
        image_size: "portrait_4_3",
        enable_safety_checker: false
      };
      
      // Если есть референс, шлем в image-to-image эндпоинт
      let endpoint = "https://queue.fal.run/fal-ai/flux/dev";
      if (primaryReference) {
        endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
        body.image_url = primaryReference; // fal принимает base64 data url
        body.strength = 0.85; // Насколько сильно менять фото
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Ошибка Fal: ${text}`); }
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
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

      // Seedream поддерживает image2image через поле image_url
      if (primaryReference) {
        body.image_url = primaryReference;
        body.image_weight = 0.5; // Баланс между текстом и референсом
      }

      const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Ошибка WaveSpeed: ${text}`); }
      if (!res.ok) throw new Error(data.message || JSON.stringify(data));
      return data.data?.outputs?.[0] || data.url || data.output?.url;
    };


    // ==========================================
    // ЗАПУСК ГЕНЕРАЦИЙ
    // ==========================================

    // Мы запускаем генерацию параллельно (Promise.all), чтобы 4 фото генерились одновременно, а не по очереди!
    const generatePromises = finalPrompts.map(async (p) => {
      if (engine === 'flux') return await generateWithFlux(p);
      if (engine === 'seedream') return await generateWithSeedream(p);
      
      // Seedance (Видео)
      if (engine === 'seedance') {
        const waveKey = process.env.WAVESPEED_KEY;
        const body: any = { prompt: p, enable_sync_mode: true };
        
        let endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video';
        if (primaryReference) {
          endpoint = 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video';
          body.image_url = primaryReference;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data.data?.outputs?.[0] || data.url || data.video_url;
      }

      // Nano Banana
      if (engine === 'nanobanana') {
         // Для Nano пока оставляем базовую логику без референсов, т.к. Google strict
         const geminiKey = process.env.GEMINI_KEY;
         const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: [{ prompt: p }], parameters: { sampleCount: 1, aspectRatio: "3:4" } })
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error?.message);
         return `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
      }
    });

    // Дожидаемся всех картинок
    const results = await Promise.all(generatePromises);

    // Возвращаем массив url-ов
    return NextResponse.json({ urls: results, type: engine === 'seedance' ? 'video' : 'image' });

  } catch (error: any) {
    console.error('Ошибка сервера:', error);
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
