import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    // Проверяем, вставила ли ты ключ в .env.local
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'сюда_ты_потом_вставишь_свой_ключ') {
      return NextResponse.json({ 
        reply: "⚠️ Системное сообщение: API ключ OpenAI не найден. Пожалуйста, добавь его в файл .env.local" 
      });
    }

    // Отправляем запрос к настоящему ChatGPT (модель gpt-4o-mini - она быстрая и дешевая)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7, // Насколько креативным будет ответ
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    // Возвращаем ответ обратно в наше приложение
    return NextResponse.json({ reply: data.choices[0].message.content });

  } catch (error: any) {
    console.error('Ошибка API:', error);
    return NextResponse.json(
      { reply: `❌ Ошибка сервера: ${error.message}` },
      { status: 500 }
    );
  }
}