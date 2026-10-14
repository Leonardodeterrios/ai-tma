'use client';
import { useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Жду фото...');
  const [resultImage, setResultImage] = useState('');

  const handleUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus('Сжимаю фото...');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = async () => {
        // Сжимаем картинку до 800 пикселей, чтобы пролезть в лимиты Vercel
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Превращаем в легкий JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

        setStatus('Отправляю нейросети...');
        try {
          // Обрати внимание, тут должен быть правильный путь к твоему API
          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: 'красивое реалистичное фото, естественный свет, мобильная фотография',
              engine: 'seedream',
              references: [compressedBase64]
            })
          });

          // Если сервер вернул ошибку, теперь мы увидим её текст!
          if (!res.ok) {
             const errText = await res.text();
             setStatus(`Ошибка сервера: ${errText}`);
             return;
          }

          const data = await res.json();
          if (data.urls) {
            setResultImage(data.urls[0]);
            setStatus('Готово!');
          } else {
            setStatus('Ошибка: ' + (data.error || 'Что-то пошло не так'));
          }
        } catch (error: any) {
          setStatus(`Ошибка связи: ${error.message}`);
        }
      };
    };
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#1c1c1e', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>AI Генератор</h2>
      
      <label style={{ padding: '14px 28px', backgroundColor: '#0A84FF', borderRadius: '12px', cursor: 'pointer', marginBottom: '20px', fontWeight: '600', fontSize: '16px' }}>
        Загрузить фото
        <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      </label>
      
      <p style={{ fontSize: '15px', color: '#8e8e93', marginTop: '10px' }}>{status}</p>
      
      {resultImage && (
        <img src={resultImage} alt="Результат" style={{ maxWidth: '100%', marginTop: '20px', borderRadius: '16px', border: '1px solid #333' }} />
      )}
    </div>
  );
}
