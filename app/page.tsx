'use client';
import { useState, useRef } from 'react';
import BrainTab from './components/BrainTab';

type Tab = 'home' | 'studio' | 'brain';
type CreateMode = 'image' | 'nano' | 'video';

const TRENDS = [
  { id: 1, title: 'ТРЕНД ПОД "ЧАСТУШКИ" В МАШИНЕ', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop' },
  { id: 2, title: 'ЭПИЧНЫЙ ВЫЛЕТ ЗВЕРЯ', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop' },
  { id: 3, title: 'ОСЕННИЙ ВАЙБ В ПАРКЕ', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop' },
  { id: 4, title: 'КИНОШНОЕ СЕΛФИ', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [createMode, setCreateMode] = useState<CreateMode>('image');
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [faceRef, setFaceRef] = useState<string | null>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setFaceRef(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Введите описание для генерации!");
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
      
      {/* Шапка */}
      <div className="flex justify-between items-center px-4 py-3 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 z-40">
        <div>
          <div className="text-[14px] font-black tracking-wider text-white">ACCESS</div>
          <div className="text-[14px] font-black tracking-wider text-[#D4FF00]">GRANTED 🔞</div>
        </div>
        <div className="bg-[#D4FF00] text-black px-3 py-1 rounded-full text-[10px] font-black">
          PRO 🚀
        </div>
      </div>

      {/* Контент в зависимости от вкладки */}
      <div className="flex-1 overflow-y-auto pb-32 pt-4 px-4">
        
        {/* 1. ГЛАВНАЯ */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-[#161618] border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-white/40">🔍</span>
              <input type="text" placeholder="Поиск нейросетей, шаблонов..." className="w-full bg-transparent border-none focus:outline-none text-xs text-white placeholder-white/30" />
            </div>

            <div onClick={() => setActiveTab('studio')} className="relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#161618] to-[#1A1A1D] p-5 cursor-pointer">
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">Seedream 5.0</span>
                <span className="bg-[#D4FF00] text-black text-[9px] font-black px-2 py-0.5 rounded uppercase">Без цензуры</span>
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-black tracking-tight">Создать с нуля</h3>
                <p className="text-xs text-white/50 mt-1">Генерация фото и видео без ограничений</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white tracking-wide">🔥 Тренды и идеи</h3>
              <div className="grid grid-cols-2 gap-3">
                {TRENDS.map(t => (
                  <div key={t.id} onClick={() => { setActiveTab('studio'); setPrompt(t.title); }} className="relative rounded-2xl overflow-hidden border border-white/5 h-44 cursor-pointer">
                    <img src={t.image} alt={t.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                      <span className="text-[11px] font-bold">{t.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. СТУДИЯ */}
        {activeTab === 'studio' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Студия генерации</h2>
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-md uppercase font-black">
                Без цензуры 🔞
              </span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setCreateMode('image')} className={`px-4 py-2 rounded-xl text-xs font-bold border ${createMode === 'image' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🔥 Seedream</button>
              <button onClick={() => setCreateMode('nano')} className={`px-4 py-2 rounded-xl text-xs font-bold border ${createMode === 'nano' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🍌 Nano</button>
              <button onClick={() => setCreateMode('video')} className={`px-4 py-2 rounded-xl text-xs font-bold border ${createMode === 'video' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🎬 Видео</button>
            </div>

            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="text-sm font-bold">Референс персонажа</div>
                <div className="text-[10px] text-white/50">Для сохранения лица</div>
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
                placeholder="Опиши сцену, позу, одежду..." 
                className="w-full bg-transparent border-none p-0 h-28 focus:outline-none text-white resize-none text-sm placeholder-white/30" 
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#D4FF00] disabled:bg-[#161618] text-black font-black py-4 rounded-2xl text-sm shadow-lg shadow-[#D4FF00]/10"
            >
              {isGenerating ? 'Создаем шедевр...' : 'Сгенерировать'}
            </button>

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-16 bg-[#161618] rounded-2xl border border-white/5">
                <div className="w-8 h-8 border-4 border-white/10 border-t-[#D4FF00] rounded-full animate-spin mb-2"></div>
                <span className="text-xs text-white/50">Нейросеть творит...</span>
              </div>
            ) : resultUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/5 bg-[#161618]">
                <img src={resultUrl} alt="Result" className="w-full h-auto object-cover" />
              </div>
            )}
          </div>
        )}

        {/* 3. BRAIN (Мозг проекта) */}
        {activeTab === 'brain' && (
          <div className="pt-2">
            <BrainTab />
          </div>
        )}

      </div>

      {/* Наша аккуратная нижняя панель с тремя разделами */}
      <div className="fixed bottom-0 w-full bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5 pb-8 pt-3 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#D4FF00]' : 'text-white/40'}`}>
            <span className="text-xl">◫</span>
            <span className="text-[11px] font-bold">Главная</span>
          </button>
          <button onClick={() => setActiveTab('studio')} className={`flex flex-col items-center gap-1 ${activeTab === 'studio' ? 'text-[#D4FF00]' : 'text-white/40'}`}>
            <span className="text-xl">✨</span>
            <span className="text-[11px] font-bold">Студия</span>
          </button>
          <button onClick={() => setActiveTab('brain')} className={`flex flex-col items-center gap-1 ${activeTab === 'brain' ? 'text-[#D4FF00]' : 'text-white/40'}`}>
            <span className="text-xl">🧠</span>
            <span className="text-[11px] font-bold">Brain</span>
          </button>
        </div>
      </div>
    </main>
  );
}
