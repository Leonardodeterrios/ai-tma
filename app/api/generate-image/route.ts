import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, engine, count = 1, references = [], autoTranslate = false } = await req.json();

    if (!prompt) return NextResponse.json({ error: 'Промпт пуст' }, { status: 400 });

    const openAiKey = process.env.OPENAI_KEY;
    const IMGBB_KEY = process.env.IMGBB_KEY;
    let finalPrompts = [prompt];

    // --- Логика перевода и серий ---
    if (openAiKey && (autoTranslate || count > 1)) {
      try {
        const sysPrompt = count > 1 
          ? `Создай серию из ${count} последовательных промптов на АНГЛИЙСКОМ. Ответь ТОЛЬКО валидным JSON массивом строк. Пример: ["prompt 1", "prompt 2"]`
          : `Translate to English. Make it optimized for image generation. Add "masterpiece, 8k, hyperrealistic". Reply ONLY with the prompt.`;
        
        const resAI = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: prompt }] })
        });
        const aiData = await resAI.json();
        const text = aiData.choices[0].message.content;
        
        if (count > 1) {
          const match = text.match(/\[[\s\S]*\]/);
          finalPrompts = match ? JSON.parse(match[0]) : Array(count).fill(prompt);
        } else {
          finalPrompts = [text.replace(/^"|"$/g, '').trim()];
        }
      } catch (e) { console.error(e); }
    }

    // --- Безопасная загрузка референса (обходим ошибку atob) ---
    let referenceUrl = null;
    if (references.length > 0 && references[0]) {
      if (references[0].startsWith('http')) {
        referenceUrl = references[0];
      } else if (IMGBB_KEY) {
        // Очищаем base64 от префиксов вроде data:image/jpeg;base64,
        const base64Data = references[0].includes(',') ? references[0].split(',')[1] : references[0];
        const formData = new URLSearchParams();
        formData.append('key', IMGBB_KEY);
        formData.append('image', base64Data);

        const imgRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const imgData = await imgRes.json();
        if (imgData.success) {
          referenceUrl = imgData.data.url;
        } else {
          throw new Error('Ошибка загрузки фото: ' + JSON.stringify(imgData));
        }
      } else {
        throw new Error('Для референсов нужен ключ IMGBB_KEY в настройках Vercel');
      }
    }

    const promptsToRun = finalPrompts.slice(0, 4);
    
    // --- Вызовы Движков ---
    const generatePromises = promptsToRun.map(async (p) => {
      try {
        if (engine === 'flux') {
          const falKey = process.env.FAL_KEY;
          let endpoint = "https://queue.fal.run/fal-ai/flux/dev";
          const body: any = { prompt: p, image_size: "portrait_4_3" };
          
          if (referenceUrl) {
            endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
            body.image_url = referenceUrl;
            body.strength = 0.85;
          }

          const r = await fetch(endpoint, {
            method: "POST", headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body)
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Fal Error');
          return d.images?.[0]?.url || d.images?.[0]?.url;
        }

        if (engine === 'seedream' || engine === 'seedance') {
          const waveKey = process.env.WAVESPEED_KEY;
          let endpoint = engine === 'seedream' 
            ? 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro'
            : (referenceUrl ? 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video' : 'https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video');
          
          const body: any = { prompt: p, enable_sync_mode: true };
          if (engine === 'seedream') body.aspect_ratio = "3:4";
          
          if (referenceUrl) {
            body.image_url = referenceUrl;
            if (engine === 'seedream') body.image_weight = 0.5;
          }

          const r = await fetch(endpoint, {
            method: 'POST', headers: { 'Authorization': `Bearer ${waveKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.message || 'Wave Error');
          return d.data?.outputs?.[0] || d.url || d.video_url;
        }

        if (engine === 'nanobanana') {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_KEY}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: [{ prompt: p }], parameters: { sampleCount: 1, aspectRatio: "3:4" } })
          });
          const d = await r.json();
          const b64 = d.predictions?.[0]?.bytesBase64Encoded;
          return b64 ? `data:image/jpeg;base64,${b64}` : null;
        }
      } catch (e: any) {
        console.error(e); return null;
      }
    });

    const results = await Promise.all(generatePromises);
    const validResults = results.filter((url): url is string => Boolean(url));

    if (validResults.length === 0) throw new Error("Не удалось сгенерировать. Проверьте ключи и лимиты.");

    return NextResponse.json({ urls: validResults, type: engine === 'seedance' ? 'video' : 'image' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
