'use client';

import { useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Жду фото...');
  const [resultImage, setResultImage] = useState('');

  const handleUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus('Читаю файл...');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      const base64 = reader.result;
      setStatus('Отправляю нейросети...');

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'красивое реалистичное фото, естественный свет, мобильная фотография',
            engine: 'seedream',
            references: [base64]
          })
        });

        const data = await res.json();
        if (data.urls) {
          setResultImage(data.urls[0]);
          setStatus('Готово!');
        } else {
          setStatus('Ошибка: ' + (data.error || 'Что-то пошло не так'));
        }
      } catch (error) {
        setStatus('Ошибка связи с сервером');
      }
    };
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'black', background: 'white', minHeight: '100vh' }}>
      <h2>Генератор (Тест)</h2>
      <input type="file" accept="image/*" onChange={handleUpload} style={{ marginBottom: '20px' }} />
      <p><strong>Статус:</strong> {status}</p>
      {resultImage && <img src={resultImage} alt="Результат" style={{ maxWidth: '100%', marginTop: '20px', borderRadius: '10px' }} />}
    </div>
  );
}
