'use client';
import { useState, useRef } from 'react';
import BrainTab from './components/BrainTab';

type Tab = 'home' | 'ideas' | 'studio' | 'history' | 'profile';
type CreateMode = 'image' | 'nano' | 'video';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [createMode, setCreateMode] = useState<CreateMode>('image');
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [faceRef, setFaceRef] = useState<string | null>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  // Жестко сжимаем картинку, чтобы не было ошибки 413
  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; // Уменьшаем до легкого размера
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Сжимаем в JPEG с качеством 70%
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setFaceRef(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Введите описание!");
      return;
    }

    setIsGenerating(true);
    setResultUrl(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          engine: createMode === 'nano' ? 'nanobanana' : createMode === 'video' ? 'seedance' : 'seedream',
          references: faceRef ? [faceRef] : []
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка генерации');

      if (data.urls?.[0]) {
        setResultUrl(data.urls[0]);
      }
    } catch (error: any) {
      alert("Ошибка: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      
      <div className="flex justify-between items-center px-4 py-3 bg-[#0A0A0A]/90 border-b border-white/5 z-40">
        <div>
          <div className="text-[14px] font-black tracking-wider text-white">ACCESS</div>
          <div className="text-[14px] font-black tracking-wider text-[#D4FF00]">GRANTED 🔞</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 pt-4 px-4">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div onClick={() => setActiveTab('studio')} className="bg-[#161618] border border-white/5 p-5 rounded-2xl cursor-pointer">
              <h3 className="text-xl font-black text-[#D4FF00]">Создать с нуля 🚀</h3>
              <p className="text-xs text-white/50 mt-1">Кликни сюда, чтобы перейти в студию генерации</p>
            </div>
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="space-y-5">
            <h2 className="text-2xl font-black">Студия генерации</h2>

            <div className="flex gap-2">
              <button onClick={() => setCreateMode('image')} className={`px-3 py-2 rounded-xl text-xs font-bold border ${createMode === 'image' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>Seedream</button>
              <button onClick={() => setCreateMode('nano')} className={`px-3 py-2 rounded-xl text-xs font-bold border ${createMode === 'nano' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>Nano</button>
              <button onClick={() => setCreateMode('video')} className={`px-3 py-2 rounded-xl text-xs font-bold border ${createMode === 'video' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>Видео</button>
            </div>

            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="text-sm font-bold">Референс персонажа</div>
                <div className="text-[10px] text-white/50">Авто-сжатие от ошибки 413</div>
              </div>
              <button onClick={() => faceInputRef.current?.click()} className="bg-[#D4FF00]/10 text-[#D4FF00] px-3 py-1.5 rounded-lg text-xs font-bold border border-[#D4FF00]/20">
                {faceRef ? 'Заменить' : '+ Загрузить'}
              </button>
              <input type="file" accept="image/*" className="hidden" ref={faceInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </div>

            {faceRef && (
              <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden">
                <img src={faceRef} alt="Face" className="w-full h-full object-cover" />
                <button onClick={() => setFaceRef(null)} className="absolute top-1 right-1 w-4 h-4 bg-black/70 rounded-full text-[9px]">✕</button>
              </div>
            )}

            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="Опиши сцену..." 
                className="w-full bg-transparent border-none p-0 h-28 focus:outline-none text-white resize-none text-sm placeholder-white/30" 
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#D4FF00] disabled:bg-[#161618] text-black font-black py-4 rounded-2xl text-sm"
            >
              {isGenerating ? 'Создаем...' : 'Сгенерировать'}
            </button>

            {isGenerating ? (
              <div className="text-center py-10 text-white/50 text-sm">Нейросеть творит...</div>
            ) : resultUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/5">
                <img src={resultUrl} alt="Result" className="w-full h-auto object-cover" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (<div className="pt-8"><BrainTab /></div>)}
      </div>

      <div className="fixed bottom-0 w-full bg-[#0A0A0A] border-t border-white/5 pb-8 pt-3 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setActiveTab('home')} className={`text-xs font-bold ${activeTab === 'home' ? 'text-[#D4FF00]' : 'text-white/40'}`}>Главная</button>
          <button onClick={() => setActiveTab('studio')} className={`text-xs font-bold ${activeTab === 'studio' ? 'text-[#D4FF00]' : 'text-white/40'}`}>Студия</button>
          <button onClick={() => setActiveTab('profile')} className={`text-xs font-bold ${activeTab === 'profile' ? 'text-[#D4FF00]' : 'text-white/40'}`}>AI Сценарист</button>
        </div>
      </div>
    </main>
  );
}
