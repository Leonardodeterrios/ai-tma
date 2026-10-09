'use client';
import { useState } from 'react';
import Image from 'next/image';
import BrainTab from './components/BrainTab';

type Engine = 'flux' | 'seedream' | 'seedance' | 'nanobanana';

export default function Home() {
  const [activeTab, setActiveTab] = useState('explore');

  // Состояния для Студии
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<Engine>('seedream');

  const handleGenerate = async () => {
    if (!imagePrompt.trim()) return;
    
    setIsGenerating(true);
    setGeneratedResult(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: imagePrompt,
          engine: selectedEngine
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка генерации');
      }

      setGeneratedResult({ url: data.url, type: data.type });

    } catch (error: any) {
      console.error(error);
      alert("Ошибка: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#D4FF00] selection:text-black">
      <div className="flex-1 overflow-y-auto pb-24">
        
        {/* === ВКЛАДКА EXPLORE (ГЛАВНАЯ) === */}
        {activeTab === 'explore' && (
          <div className="p-4 space-y-6 max-w-md mx-auto">
            
            {/* ШАПКА (Исправленная) */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[22px] leading-tight font-black tracking-tight whitespace-nowrap">
                ACCESS<br />
                <span className="text-[#D4FF00]">GRANTED</span>
              </div>
              
              <a 
                href="https://твой-сайт.ru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-[#D4FF00] to-[#a8cc00] text-black px-4 py-3 rounded-2xl text-[12px] font-bold flex flex-col items-center justify-center leading-tight shadow-lg shadow-[#D4FF00]/10 hover:scale-95 transition-transform max-w-[140px] text-center"
              >
                <span>🚀 Обучение</span>
                <span className="text-[10px] font-medium opacity-80 mt-0.5">AI Influencer</span>
              </a>
            </div>

            {/* ПОИСК */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-white/40 text-lg group-focus-within:text-[#D4FF00] transition-colors">🔍</span>
              </div>
              <input 
                type="text" 
                placeholder="Поиск нейросетей, стилей..." 
                className="w-full bg-[#161618] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#D4FF00]/50 focus:bg-[#1A1A1D] transition-all placeholder-white/30"
              />
            </div>

            {/* ТЕГИ */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
              {['Все', 'Без цензуры 🔞', 'Шаблоны', 'Видео', 'Промпты'].map((tag, i) => (
                <button 
                  key={tag} 
                  className={`px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
                    i === 0 
                      ? 'bg-white text-black' 
                      : i === 1 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : 'bg-[#161618] text-white/70 hover:bg-[#2A2B2E] border border-white/5'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* ГЛАВНЫЙ БАННЕР (Теперь сочный и красивый) */}
            <div 
              onClick={() => setActiveTab('studio')}
              className="relative w-full aspect-[4/3] sm:aspect-[16/9] rounded-[24px] overflow-hidden group cursor-pointer border border-white/10 shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-[#D4FF00]/10 z-10"></div>
              
              {/* Фоновая картинка. Если не грузится, будет красивый градиент выше */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-60 mix-blend-overlay"></div>
              
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">Seedream 5.0</span>
                  <span className="text-[#D4FF00] text-[9px] font-black uppercase tracking-widest border border-[#D4FF00]/40 px-2.5 py-1 rounded-md bg-[#D4FF00]/5">Без цензуры</span>
                </div>
                <h3 className="text-3xl font-black mb-1.5 text-white tracking-tight">Создать с нуля</h3>
                <p className="text-sm text-white/60 font-medium">Генерация реалистичных AI-моделей</p>
              </div>
            </div>

            {/* ПОПУЛЯРНЫЕ НЕЙРОСЕТИ (С иконками и градиентами) */}
            <div>
              <div className="flex justify-between items-end mb-5">
                <h3 className="text-[19px] font-bold tracking-tight">Нейросети</h3>
                <span className="text-[13px] font-medium text-white/40 mb-1">Смотреть все</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: 'Flux', icon: '⚡️', grad: 'from-blue-500/20 to-blue-900/20', border: 'border-blue-500/20' },
                  { name: 'Nano', icon: '🍌', grad: 'from-yellow-500/20 to-yellow-900/20', border: 'border-yellow-500/20' },
                  { name: 'Dance', icon: '🎬', grad: 'from-purple-500/20 to-purple-900/20', border: 'border-purple-500/20' },
                  { name: 'Dream', icon: '🔥', grad: 'from-red-500/20 to-red-900/20', border: 'border-red-500/20' },
                ].map((tool) => (
                  <div key={tool.name} className="flex flex-col gap-2 cursor-pointer group" onClick={() => setActiveTab('studio')}>
                    <div className={`aspect-square rounded-2xl bg-gradient-to-br ${tool.grad} border ${tool.border} flex items-center justify-center p-2 group-hover:scale-105 transition-transform relative overflow-hidden`}>
                      <span className="text-2xl drop-shadow-lg">{tool.icon}</span>
                    </div>
                    <span className="text-[11px] font-bold text-center text-white/70">{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        )}

        {/* === ВКЛАДКА BRAIN === */}
        {activeTab === 'brain' && (
          <div className="h-full flex flex-col max-w-md mx-auto">
            <div className="p-4 border-b border-white/5 bg-[#0A0A0A] sticky top-0 z-10">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                🧠 Мозг Виральности
                <span className="bg-[#D4FF00]/10 text-[#D4FF00] text-[10px] font-bold uppercase px-2.5 py-1 rounded-md">Стратегия</span>
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <BrainTab /> 
            </div>
          </div>
        )}

        {/* === ВКЛАДКА STUDIO (ГЕНЕРАЦИЯ) === */}
        {activeTab === 'studio' && (
          <div className="p-4 flex flex-col h-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-5 pt-2">
              <h2 className="text-2xl font-black tracking-tight">Студия</h2>
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-md uppercase font-black tracking-widest">
                Без цензуры 🔞
              </span>
            </div>

            {/* ВЫБОР ДВИЖКА */}
            <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
              <button 
                onClick={() => setSelectedEngine('seedream')}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                  selectedEngine === 'seedream' 
                    ? 'bg-[#D4FF00] text-black border-[#D4FF00] shadow-lg shadow-[#D4FF00]/10' 
                    : 'bg-[#161618] text-white/70 border-white/5 hover:bg-[#1A1A1D]'
                }`}
              >
                🔥 Seedream
              </button>
              
              <button 
                onClick={() => setSelectedEngine('nanobanana')}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                  selectedEngine === 'nanobanana' 
                    ? 'bg-[#D4FF00] text-black border-[#D4FF00] shadow-lg shadow-[#D4FF00]/10' 
                    : 'bg-[#161618] text-white/70 border-white/5 hover:bg-[#1A1A1D]'
                }`}
              >
                🍌 Nano
              </button>

              <button 
                onClick={() => setSelectedEngine('flux')}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                  selectedEngine === 'flux' 
                    ? 'bg-[#D4FF00] text-black border-[#D4FF00] shadow-lg shadow-[#D4FF00]/10' 
                    : 'bg-[#161618] text-white/70 border-white/5 hover:bg-[#1A1A1D]'
                }`}
              >
                ⚡️ Flux
              </button>
              <button 
                onClick={() => setSelectedEngine('seedance')}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                  selectedEngine === 'seedance' 
                    ? 'bg-[#D4FF00] text-black border-[#D4FF00] shadow-lg shadow-[#D4FF00]/10' 
                    : 'bg-[#161618] text-white/70 border-white/5 hover:bg-[#1A1A1D]'
                }`}
              >
                🎬 Seedance
              </button>
            </div>
            
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder={selectedEngine === 'seedance' ? "Опишите сценарий видео..." : "Опишите внешность модели... (например: реалистичный портрет девушки, кинематографичный свет)"}
              className="w-full bg-[#161618] border border-white/5 rounded-3xl p-5 mb-5 h-32 focus:outline-none focus:border-[#D4FF00]/50 focus:bg-[#1A1A1D] text-white resize-none text-[15px] leading-relaxed transition-all placeholder-white/30"
            />
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !imagePrompt.trim()}
              className="w-full bg-[#D4FF00] hover:bg-[#bce600] disabled:bg-[#161618] disabled:text-white/30 text-black font-black py-4 rounded-2xl mb-6 transition-all text-[15px] shadow-lg shadow-[#D4FF00]/10 disabled:shadow-none"
            >
              {isGenerating ? `Генерация...` : 'Сгенерировать шедевр'}
            </button>

            {/* Зона результата */}
            <div className="w-full aspect-[4/5] bg-[#161618] rounded-3xl border border-white/5 overflow-hidden relative flex items-center justify-center shadow-2xl">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-white/10 border-t-[#D4FF00] rounded-full animate-spin"></div>
                  <div className="text-white/50 text-sm font-medium">
                    {selectedEngine === 'seedance' ? "Создаем видео (около 2 мин)..." : "Отрисовываем детали..."}
                  </div>
                </div>
              ) : generatedResult ? (
                generatedResult.type === 'image' ? (
                  <img 
                    src={generatedResult.url} 
                    alt="Сгенерированная модель" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video 
                    src={generatedResult.url} 
                    controls 
                    autoPlay 
                    loop 
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="text-white/20 text-center px-4 flex flex-col items-center">
                  <span className="text-4xl mb-3 opacity-50">✨</span>
                  <p className="text-[13px] font-bold tracking-wide uppercase">Студия готова</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* === НИЖНЯЯ НАВИГАЦИЯ === */}
      <div className="fixed bottom-0 w-full bg-[#0A0A0A]/80 backdrop-blur-2xl border-t border-white/5 pb-8 pt-4 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto px-8">
          <button 
            onClick={() => setActiveTab('explore')} 
            className={`flex flex-col items-center transition-all ${activeTab === 'explore' ? 'text-white scale-110' : 'text-white/30 hover:text-white/50'}`}
          >
            <span className="text-2xl">◫</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('studio')} 
            className={`flex flex-col items-center transition-all ${activeTab === 'studio' ? 'scale-110' : 'hover:scale-105'}`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${activeTab === 'studio' ? 'bg-[#D4FF00] text-black shadow-[#D4FF00]/20' : 'bg-[#161618] text-white border border-white/5'}`}>
              <span className="text-3xl font-light mb-1">+</span>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveTab('brain')} 
            className={`flex flex-col items-center transition-all ${activeTab === 'brain' ? 'text-white scale-110' : 'text-white/30 hover:text-white/50'}`}
          >
            <span className="text-2xl">🧠</span>
          </button>
        </div>
      </div>
    </main>
  );
}
