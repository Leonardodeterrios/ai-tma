import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, engine } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт не может быть пустым' }, { status: 400 });
    }

    // ==========================================
    // 1. FAL.AI (FLUX) - БЫСТРЫЕ ФОТО
    // ==========================================
    if (engine === 'flux') {
      const falKey = process.env.FAL_KEY;
      if (!falKey) return NextResponse.json({ error: 'FAL_KEY не настроен' }, { status: 500 });

      const res = await fetch("https://queue.fal.run/fal-ai/flux/dev", {
        method: "POST",
        headers: {
          "Authorization": `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          image_size: "landscape_4_3",
          enable_safety_checker: false
        }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { return NextResponse.json({ error: `Ошибка Fal: ${text}` }, { status: 500 }); }
      
      if (!res.ok) return NextResponse.json({ error: data.error || JSON.stringify(data) }, { status: 500 });
      return NextResponse.json({ url: data.images?.[0]?.url, type: 'image' });
    }

    // ==========================================
    // 2. WAVESPEED (SEEDREAM) - ФОТО (UNCENSORED)
    // ==========================================
    if (engine === 'seedream') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) return NextResponse.json({ error: 'WAVESPEED_KEY не настроен' }, { status: 500 });

      const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waveKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          aspect_ratio: "3:4",
          enable_sync_mode: true
        })
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { return NextResponse.json({ error: `Ошибка WaveSpeed: ${text}` }, { status: 500 }); }
      
      if (!res.ok) return NextResponse.json({ error: data.message || JSON.stringify(data) }, { status: 500 });

      const imageUrl = data.data?.outputs?.[0] || data.url || data.output?.url;
      if (!imageUrl) return NextResponse.json({ error: 'Нет картинки в ответе' }, { status: 500 });

      return NextResponse.json({ url: imageUrl, type: 'image' });
    }

    // ==========================================
    // 3. WAVESPEED (SEEDANCE) - ВИДЕО
    // ==========================================
    if (engine === 'seedance') {
      const waveKey = process.env.WAVESPEED_KEY;
      if (!waveKey) return NextResponse.json({ error: 'WAVESPEED_KEY не настроен' }, { status: 500 });

      const res = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waveKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          prompt: prompt,
          enable_sync_mode: true
        })
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { return NextResponse.json({ error: `Ошибка WaveSpeed: ${text}` }, { status: 500 }); }
      
      if (!res.ok) return NextResponse.json({ error: data.message || JSON.stringify(data) }, { status: 500 });

      const videoUrl = data.data?.outputs?.[0] || data.url || data.video_url;
      return NextResponse.json({ url: videoUrl, type: 'video' });
    }

    // ==========================================
    // 4. GOOGLE (NANO BANANA / GEMINI) - ФОТО
    // ==========================================
    if (engine === 'nanobanana') {
      const geminiKey = process.env.GEMINI_KEY;
      if (!geminiKey) return NextResponse.json({ error: 'GEMINI_KEY не настроен' }, { status: 500 });

      // Самый свежий способ обращения к Google Imagen 3 (Nano Banana)
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instances: [
            { prompt: prompt }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4"
          }
        })
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { return NextResponse.json({ error: `Ошибка Google: ${text}` }, { status: 500 }); }
      
      // Если старый predict не работает (ошибка 404), используем новый generateContent
      if (!res.ok && data.error?.message?.includes("not found")) {
        const resNew = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseMimeType: "image/jpeg"
            }
          })
        });
        
        const textNew = await resNew.text();
        let dataNew;
        try { dataNew = JSON.parse(textNew); } catch { return NextResponse.json({ error: `Ошибка Google V2: ${textNew}` }, { status: 500 }); }
        
        if (!resNew.ok) return NextResponse.json({ error: dataNew.error?.message || JSON.stringify(dataNew) }, { status: 500 });
        
        // В новом API картинка может прийти в candidates
        const base64V2 = dataNew.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64V2) return NextResponse.json({ error: 'Google не вернул картинку (новый API)' }, { status: 500 });
        
        return NextResponse.json({ url: `data:image/jpeg;base64,${base64V2}`, type: 'image' });
      }

      if (!res.ok) return NextResponse.json({ error: data.error?.message || JSON.stringify(data) }, { status: 500 });

      // Для старого API predict
      const base64Image = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0]?.bytesBase64;
      if (!base64Image) return NextResponse.json({ error: 'Google не вернул картинку (цензура?)' }, { status: 500 });

      const imageUrl = `data:image/jpeg;base64,${base64Image}`;
      return NextResponse.json({ url: imageUrl, type: 'image' });
    }

    return NextResponse.json({ error: 'Неизвестный движок' }, { status: 400 });

  } catch (error: any) {
    console.error('Ошибка сервера:', error);
    return NextResponse.json({ error: error.message || 'Ошибка API' }, { status: 500 });
  }
}
