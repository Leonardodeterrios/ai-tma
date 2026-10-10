'use client';
import { useState, useRef } from 'react';
import BrainTab from './components/BrainTab';

type Engine = 'flux' | 'seedream' | 'seedance' | 'nanobanana';

export default function Home() {
  const [activeTab, setActiveTab] = useState('studio');
  const [prompt, setPrompt] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<Engine>('seedream');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'image' | 'video'>('image');
  
  const [reference, setReference] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Конвертируем картинку в обычный текст (base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setReference(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Пожалуйста, введите описание для генерации!");
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
          engine: selectedEngine,
          references: reference ? [reference] : []
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка генерации');

      setResultUrl(data.urls[0]);
      setResultType(data.type || 'image');

    } catch (error: any) {
      alert("Ошибка: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-32 pt-safe px-4">
        {activeTab === 'studio' && (
          <div className="max-w-md mx-auto pt-8 space-y-6">
            
            <div className="flex justify-between items-center">
              <h2 className="text-[28px] font-black tracking-tight">Студия</h2>
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-md uppercase font-black">
                Без цензуры 🔞
              </span>
            </div>

            {/* Выбор движка */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setSelectedEngine('seedream')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border ${selectedEngine === 'seedream' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🔥 Seedream</button>
              <button onClick={() => setSelectedEngine('nanobanana')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border ${selectedEngine === 'nanobanana' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🍌 Nano</button>
              <button onClick={() => setSelectedEngine('flux')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border ${selectedEngine === 'flux' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>⚡️ Flux</button>
              <button onClick={() => setSelectedEngine('seedance')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border ${selectedEngine === 'seedance' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🎬 Seedance</button>
            </div>

            {/* Загрузка референса */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[13px] font-bold text-white">Референс (фото)</div>
                  <div className="text-[10px] text-white/50">Необязательно</div>
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="bg-[#D4FF00]/10 text-[#D4FF00] px-3 py-1.5 rounded-lg text-xs font-bold border border-[#D4FF00]/20">
                  {reference ? 'Заменить' : '+ Загрузить'}
                </button>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              </div>
              
              {reference && (
                <div className="mt-3 relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden">
                  <img src={reference} alt="ref" className="w-full h-full object-cover" />
                  <button onClick={() => setReference(null)} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-[10px]">✕</button>
                </div>
              )}
            </div>

            {/* Поле ввода промпта */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">Описание (промпт)</div>
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="Опишите, что нужно нарисовать..." 
                className="w-full bg-transparent border-none p-0 h-28 focus:outline-none text-white resize-none text-[15px] placeholder-white/30" 
              />
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#D4FF00] disabled:bg-[#161618] disabled:text-white/30 text-black font-black py-4 rounded-2xl text-[15px]"
            >
              {isGenerating ? 'Генерируем шедевр...' : 'Сгенерировать'}
            </button>

            {/* Результат */}
            <div className="w-full min-h-[250px] mb-8">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 bg-[#161618] rounded-[24px] border border-white/5">
                  <div className="w-10 h-10 border-4 border-white/10 border-t-[#D4FF00] rounded-full animate-spin"></div>
                  <div className="text-white/50 text-sm font-medium">Нейросеть рисует...</div>
                </div>
              ) : resultUrl ? (
                <div className="rounded-[24px] overflow-hidden border border-white/5 bg-[#161618]">
                  {resultType === 'image' ? (
                    <img src={resultUrl} alt="Result" className="w-full h-auto object-cover" />
                  ) : (
                    <video src={resultUrl} controls autoPlay loop muted playsInline className="w-full h-auto" />
                  )}
                </div>
              ) : (
                <div className="bg-[#161618] rounded-[24px] border border-white/5 text-center px-4 py-16">
                  <span className="text-3xl opacity-40">✨</span>
                  <p className="text-[12px] font-bold text-white/30 uppercase mt-2">Здесь появится результат</p>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'explore' && (<div className="pt-8 text-center">Главная</div>)}
        {activeTab === 'brain' && (<div className="pt-8"><BrainTab /></div>)}
      </div>

      <div className="fixed bottom-0 w-full bg-[#0A0A0A]/90 backdrop-blur-2xl border-t border-white/5 pb-8 pt-4 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto px-8">
          <button onClick={() => setActiveTab('explore')} className="text-white/30 text-2xl">◫</button>
          <button onClick={() => setActiveTab('studio')} className="w-14 h-14 rounded-full bg-[#D4FF00] text-black flex items-center justify-center font-bold text-3xl">+</button>
          <button onClick={() => setActiveTab('brain')} className="text-white/30 text-2xl">🧠</button>
        </div>
      </div>
    </main>
  );
} 
