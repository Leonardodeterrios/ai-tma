'use client';
import { useState, useRef } from 'react';
import BrainTab from './components/BrainTab';

type Tab = 'home' | 'ideas' | 'studio' | 'history' | 'profile';
type CreateMode = 'image' | 'nano' | 'video' | 'animate';

const TRENDS = [
  { id: 1, title: 'ТРЕНД ПОД "ЧАСТУШКИ" В МАШИНЕ', category: 'Видео', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop', type: 'video' },
  { id: 2, title: 'ЭПИЧНЫЙ ВЫЛЕТ ЗВЕРЯ', category: 'Популярное', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop', type: 'image' },
  { id: 3, title: 'ОСЕННИЙ ВАЙБ В ПАРКЕ', category: 'Осень', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop', type: 'image' },
  { id: 4, title: 'КИНОШНОЕ СЕΛФИ', category: 'Селфи', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop', type: 'image' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [createMode, setCreateMode] = useState<CreateMode>('image');
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'image' | 'video'>('image');

  // Референс
  const [faceRef, setFaceRef] = useState<string | null>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File, setter: (val: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setter(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Введите промпт или описание!");
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
        setResultType(data.type || 'image');
      }
    } catch (error: any) {
      alert("Ошибка: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      
      {/* Шапка с нашими цветами и названием */}
      <div className="flex justify-between items-center px-4 py-3 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 z-40">
        <div>
          <div className="text-[14px] font-black tracking-wider text-white">ACCESS</div>
          <div className="text-[14px] font-black tracking-wider text-[#D4FF00]">GRANTED 🔞</div>
        </div>
        <div className="bg-[#D4FF00] text-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-[#D4FF00]/10">
          <span className="text-[11px] font-black">🚀 Зарабатывай на AI</span>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 overflow-y-auto pb-32 pt-4 px-4">
        
        {/* ВКЛАДКА: ГЛАВНАЯ */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            {/* Поиск */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-white/40">🔍</span>
              <input type="text" placeholder="Поиск нейросетей, шаблонов, инструментов..." className="w-full bg-transparent border-none focus:outline-none text-xs text-white placeholder-white/30" />
            </div>

            {/* Фильтры */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap">Все</button>
              <button className="bg-[#161618] text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap">Без цензуры 🔞</button>
              <button className="bg-[#161618] text-white/70 border border-white/5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap">Шаблоны</button>
              <button className="bg-[#161618] text-white/70 border border-white/5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap">Видео</button>
            </div>

            {/* Баннер создания */}
            <div onClick={() => setActiveTab('studio')} className="relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#161618] to-[#1A1A1D] p-5 cursor-pointer group">
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">Seedream 5.0</span>
                <span className="bg-[#D4FF00] text-black text-[9px] font-black px-2 py-0.5 rounded uppercase">Без цензуры</span>
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-black tracking-tight">Создать с нуля</h3>
                <p className="text-xs text-white/50 mt-1">Генерация реалистичных фото без ограничений</p>
              </div>
            </div>

            {/* Популярные нейросети */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white tracking-wide">Популярные нейросети</h3>
                <span className="text-xs text-[#D4FF00] font-bold">Смотреть все &gt;</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => { setActiveTab('studio'); setCreateMode('image'); }} className="bg-[#161618] border border-white/5 p-3 rounded-2xl text-center flex flex-col items-center justify-center gap-2 hover:border-[#D4FF00]/50 transition-all">
                  <span className="text-xl">⚡️</span>
                  <span className="text-[11px] font-bold">Flux</span>
                </button>
                <button onClick={() => { setActiveTab('studio'); setCreateMode('nano'); }} className="bg-[#161618] border border-white/5 p-3 rounded-2xl text-center flex flex-col items-center justify-center gap-2 hover:border-[#D4FF00]/50 transition-all">
                  <span className="text-xl">🍌</span>
                  <span className="text-[11px] font-bold">Nano</span>
                </button>
                <button onClick={() => { setActiveTab('studio'); setCreateMode('video'); }} className="bg-[#161618] border border-white/5 p-3 rounded-2xl text-center flex flex-col items-center justify-center gap-2 hover:border-[#D4FF00]/50 transition-all">
                  <span className="text-xl">🎬</span>
                  <span className="text-[11px] font-bold">Video</span>
                </button>
                <button onClick={() => { setActiveTab('studio'); setCreateMode('image'); }} className="bg-[#161618] border border-white/5 p-3 rounded-2xl text-center flex flex-col items-center justify-center gap-2 hover:border-[#D4FF00]/50 transition-all">
                  <span className="text-xl">🔥</span>
                  <span className="text-[11px] font-bold">Seedream</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ВКЛАДКА: ИДЕИ */}
        {activeTab === 'ideas' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Идеи и тренды</h2>
            <div className="grid grid-cols-2 gap-3">
              {TRENDS.map(t => (
                <div key={t.id} onClick={() => { setActiveTab('studio'); setPrompt(t.title); }} className="relative rounded-2xl overflow-hidden border border-white/5 h-48 cursor-pointer">
                  <img src={t.image} alt={t.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs font-bold">{t.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА: СТУДИЯ (СОЗДАТЬ) */}
        {activeTab === 'studio' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Студия генерации</h2>
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-md uppercase font-black">
                Без цензуры 🔞
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setCreateMode('image')} className={`px-4 py-2 rounded-xl text-xs font-bold border ${createMode === 'image' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🔥 Seedream</button>
              <button onClick={() => setCreateMode('nano')} className={`px-4 py-2 rounded-xl text-xs font-bold border ${createMode === 'nano' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🍌 Nano Pro</button>
              <button onClick={() => setCreateMode('video')} className={`px-4 py-2 rounded-xl text-xs font-bold border ${createMode === 'video' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🎬 Видео</button>
            </div>

            {/* Загрузка референса лица */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="text-sm font-bold">Референс персонажа</div>
                <div className="text-[10px] text-white/50">Сохранение лица и стиля</div>
              </div>
              <button onClick={() => faceInputRef.current?.click()} className="bg-[#D4FF00]/10 text-[#D4FF00] px-3 py-1.5 rounded-lg text-xs font-bold border border-[#D4FF00]/20">
                {faceRef ? 'Заменить' : '+ Загрузить'}
              </button>
              <input type="file" accept="image/*" className="hidden" ref={faceInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], setFaceRef)} />
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
                placeholder="Опишите сцену, позу, одежду на русском..." 
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

            {/* Результат */}
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-16 bg-[#161618] rounded-2xl border border-white/5">
                <div className="w-8 h-8 border-4 border-white/10 border-t-[#D4FF00] rounded-full animate-spin mb-2"></div>
                <span className="text-xs text-white/50">Нейросеть творит...</span>
              </div>
            ) : resultUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/5 bg-[#161618]">
                {resultType === 'image' ? (
                  <img src={resultUrl} alt="Result" className="w-full h-auto object-cover" />
                ) : (
                  <video src={resultUrl} controls autoPlay loop muted playsInline className="w-full h-auto" />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (<div className="pt-8 text-center text-white/50">История пуста</div>)}
        {activeTab === 'profile' && (<div className="pt-8"><BrainTab /></div>)}

      </div>

      {/* Нижняя навигация в наших фирменных цветах */}
      <div className="fixed bottom-0 w-full bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5 pb-8 pt-3 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#D4FF00]' : 'text-white/40'}`}>
            <span className="text-lg">◫</span>
            <span className="text-[10px] font-bold">Главная</span>
          </button>
          <button onClick={() => setActiveTab('ideas')} className={`flex flex-col items-center gap-1 ${activeTab === 'ideas' ? 'text-[#D4FF00]' : 'text-white/40'}`}>
            <span className="text-lg">🧭</span>
            <span className="text-[10px] font-bold">Идеи</span>
          </button>
          <button onClick={() => setActiveTab('studio')} className="flex flex-col items-center -mt-5">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform ${activeTab === 'studio' ? 'bg-[#D4FF00] text-black shadow-[#D4FF00]/25 scale-105' : 'bg-[#161618] text-white border border-white/10'}`}>
              <span className="text-2xl font-light">+</span>
            </div>
            <span className="text-[10px] font-bold mt-1 text-white">Создать</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-[#D4FF00]' : 'text-white/40'}`}>
            <span className="text-lg">⏳</span>
            <span className="text-[10px] font-bold">История</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-[#D4FF00]' : 'text-white/40'}`}>
            <span className="text-lg">🧠</span>
            <span className="text-[10px] font-bold">AI Сценарист</span>
          </button>
        </div>
      </div>
    </main>
  );
}
