import { NextResponse } from 'next/server';

// Функция для обращения к OpenAI (с защитой от кривых ответов)
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

// Функция для очистки ответа OpenAI, чтобы точно достать массив JSON
function extractJsonArray(text: string): string[] | null {
  try {
    // Ищем квадратные скобки
    const match = text.match(/\[.*\]/s);
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
    // ЛОГИКА ПЕРЕВОДА И СЕРИЙ (Через OpenAI)
    // ==========================================
    if (openAiKey && (autoTranslate || count > 1)) {
      if (count > 1) {
        const sysPrompt = `Ты - AI-ассистент режиссера. Пользователь дает описание. Твоя задача - создать серию из ${count} последовательных кадров на АНГЛИЙСКОМ языке, которые показывают развитие событий. Ответь ТОЛЬКО валидным JSON массивом строк. Пример: ["prompt 1", "prompt 2", "prompt 3", "prompt 4"]. Никакого лишнего текста.`;
        
        try {
          const aiResponse = await callOpenAI(sysPrompt, prompt, openAiKey);
          const parsedArray = extractJsonArray(aiResponse);
          if (parsedArray) {
            finalPrompts = parsedArray;
          } else {
            // Если ИИ не смог дать массив, дублируем промпт
            finalPrompts = Array(count).fill(prompt);
          }
        } catch (e) {
          console.error("Ошибка генерации серии через AI", e);
          finalPrompts = Array(count).fill(prompt);
        }
      } else if (autoTranslate) {
        const sysPrompt = `Translate the user's prompt to English. Make it optimized for image generation. Reply ONLY with the translated English prompt, no other text.`;
        try {
          const translated = await callOpenAI(sysPrompt, prompt, openAiKey);
          // Очищаем от возможных кавычек
          finalPrompts = [translated.replace(/^"|"$/g, '').trim()];
        } catch (e) {
          console.error("Ошибка перевода", e);
        }
      }
    }

    // Подготавливаем референс
    const primaryReference = references.length > 0 ? references[0] : null;

    // ==========================================
    // ФУНКЦИИ ГЕНЕРАЦИИ ДЛЯ КАЖДОГО ДВИЖКА
    // ==========================================

    const generateWithFlux = async (currentPrompt: string) => {
      const falKey = process.env.FAL_KEY;
      if (!falKey) throw new Error('FAL_KEY не настроен');

      let endpoint = "https://queue.fal.run/fal-ai/flux/dev";
      let body: any = {
        prompt: currentPrompt,
        image_size: "portrait_4_3",
        enable_safety_checker: false
      };
      
      if (primaryReference) {
        endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
        // Fal ожидает image_url. Base64 с префиксом должен работать.
        body.image_url = primaryReference; 
        body.strength = 0.85;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Ошибка Fal: ${text}`); }
      
      // Если FAL ругается на формат картинки, перехватываем ошибку
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

      if (primaryReference) {
        body.image_url = primaryReference;
        body.image_weight = 0.5; 
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

    // Ограничиваем количество до 4 на всякий случай
    const promptsToRun = finalPrompts.slice(0, 4);

    const generatePromises = promptsToRun.map(async (p) => {
      if (engine === 'flux') return await generateWithFlux(p);
      if (engine === 'seedream') return await generateWithSeedream(p);
      
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

      if (engine === 'nanobanana') {
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

    const results = await Promise.all(generatePromises);

    // Фильтруем пустые результаты (если какой-то промис упал)
    const validResults = results.filter(url => url);

    if (validResults.length === 0) {
      throw new Error("Не удалось сгенерировать ни одного изображения. Возможно, референс слишком большой или движок не поддерживает формат.");
    }

    return NextResponse.json({ urls: validResults, type: engine === 'seedance' ? 'video' : 'image' });

  } catch (error: any) {
    console.error('Ошибка сервера:', error);
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
