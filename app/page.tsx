'use client';
import { useState } from 'react';
import Image from 'next/image';
import BrainTab from './components/BrainTab';

// Добавили nanobanana в список движков
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
      {/* Контентная часть */}
      <div className="flex-1 overflow-y-auto pb-24">
        
        {/* === ВКЛАДКА EXPLORE === */}
        {activeTab === 'explore' && (
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between pt-2">
              <div className="text-xl font-bold tracking-tight">
                ACCESS <span className="text-[#D4FF00]">GRANTED</span>
              </div>
              <button className="bg-[#D4FF00] text-black px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 hover:bg-[#bce600] transition-colors">
                <span>✦</span> Monetize AI
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-white/40 text-lg">🔍</span>
              </div>
              <input 
                type="text" 
                placeholder="Search models, templates, tools..." 
                className="w-full bg-[#1A1B1E] border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#D4FF00]/50"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {['All', 'Uncensored', 'Templates', 'Video', 'Motion Control'].map((tag, i) => (
                <button 
                  key={tag} 
                  className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    i === 0 
                      ? 'bg-white text-black' 
                      : i === 1 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-[#1A1B1E] text-white/80 hover:bg-[#2A2B2E]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div 
              onClick={() => setActiveTab('studio')}
              className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden bg-gradient-to-br from-[#1a1b1e] to-black border border-white/10 group cursor-pointer"
            >
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-10"></div>
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-50"></div>
              
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">Seedream 4.5</span>
                  <span className="text-[#D4FF00] text-[10px] font-bold uppercase tracking-wider border border-[#D4FF00]/30 px-2 py-0.5 rounded">Uncensored</span>
                </div>
                <h3 className="text-2xl font-bold mb-1 text-white">Create From Scratch</h3>
                <p className="text-sm text-white/70">Build highly realistic uncensored AI models</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Top Engines</h3>
                <span className="text-sm text-white/50">Explore {'>'}</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: 'Flux', color: 'bg-[#1A1B1E]', label: 'Image' },
                  { name: 'Nano Banana', color: 'bg-[#1A1B1E]', label: 'Style' },
                  { name: 'Genjutsu', color: 'bg-[#1A1B1E]', label: 'Video' },
                  { name: 'GPT Image', color: 'bg-[#1A1B1E]', label: 'Fast' },
                ].map((tool) => (
                  <div key={tool.name} className="flex flex-col gap-2 cursor-pointer group">
                    <div className="aspect-square rounded-2xl bg-[#1A1B1E] border border-white/5 flex items-center justify-center p-2 group-hover:border-white/20 transition-colors relative overflow-hidden">
                      <div className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/80 text-white">
                        {tool.label}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-center text-white/80">{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === ВКЛАДКА BRAIN === */}
        {activeTab === 'brain' && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/5 bg-[#0A0A0A] sticky top-0 z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                🧠 Viral Brain
                <span className="bg-[#D4FF00]/10 text-[#D4FF00] text-[10px] uppercase px-2 py-1 rounded-full">Strategy</span>
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
            <div className="flex justify-between items-center mb-4 pt-2">
              <h2 className="text-2xl font-bold">Studio</h2>
              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
                Uncensored Mode
              </span>
            </div>

            {/* ВЫБОР ДВИЖКА (Engine Selector) */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setSelectedEngine('seedream')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border whitespace-nowrap ${
                  selectedEngine === 'seedream' 
                    ? 'bg-[#D4FF00] text-black border-[#D4FF00]' 
                    : 'bg-[#1A1B1E] text-white/70 border-white/10 hover:border-white/30'
                }`}
              >
                Seedream (Photo)
              </button>
              
              <button 
                onClick={() => setSelectedEngine('nanobanana')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border whitespace-nowrap flex items-center gap-1 ${
                  selectedEngine === 'nanobanana' 
                    ? 'bg-[#D4FF00] text-black border-[#D4FF00]' 
                    : 'bg-[#1A1B1E] text-white/70 border-white/10 hover:border-white/30'
                }`}
              >
                🍌 Nano Banana (Google)
              </button>

              <button 
                onClick={() => setSelectedEngine('flux')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border whitespace-nowrap ${
                  selectedEngine === 'flux' 
                    ? 'bg-[#D4FF00] text-black border-[#D4FF00]' 
                    : 'bg-[#1A1B1E] text-white/70 border-white/10 hover:border-white/30'
                }`}
              >
                Flux (Fast Photo)
              </button>
              <button 
                onClick={() => setSelectedEngine('seedance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border whitespace-nowrap ${
                  selectedEngine === 'seedance' 
                    ? 'bg-[#D4FF00] text-black border-[#D4FF00]' 
                    : 'bg-[#1A1B1E] text-white/70 border-white/10 hover:border-white/30'
                }`}
              >
                Seedance (Video)
              </button>
            </div>
            
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder={selectedEngine === 'seedance' ? "Describe your cinematic video..." : "Describe your model... (e.g. realistic cinematic portrait of a girl)"}
              className="w-full bg-[#1A1B1E] border border-white/10 rounded-3xl p-5 mb-4 h-32 focus:outline-none focus:border-[#D4FF00] text-white resize-none text-sm leading-relaxed"
            />
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !imagePrompt.trim()}
              className="w-full bg-[#D4FF00] hover:bg-[#bce600] disabled:bg-[#1A1B1E] disabled:text-white/30 text-black font-bold py-4 rounded-3xl mb-6 transition-all"
            >
              {isGenerating ? `Rendering ${selectedEngine}...` : 'Generate AI Model'}
            </button>

            {/* Зона результата (Картинка или Видео) */}
            <div className="w-full aspect-[4/5] bg-[#1A1B1E] rounded-3xl border border-white/5 overflow-hidden relative flex items-center justify-center">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-white/50 text-sm font-medium">
                    {selectedEngine === 'seedance' ? "Rendering video (takes a few mins)..." : "Processing image..."}
                  </div>
                </div>
              ) : generatedResult ? (
                generatedResult.type === 'image' ? (
                  <img 
                    src={generatedResult.url} 
                    alt="Generated AI Model" 
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
                <div className="text-white/30 text-center px-4 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <span className="text-2xl">⚡️</span>
                  </div>
                  <p className="text-sm font-medium">Ready for generation</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* === НИЖНЯЯ НАВИГАЦИЯ === */}
      <div className="fixed bottom-0 w-full bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/5 pb-8 pt-4 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto px-6">
          <button 
            onClick={() => setActiveTab('explore')} 
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'explore' ? 'text-white' : 'text-white/40'}`}
          >
            <span className="text-xl">◫</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('studio')} 
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'studio' ? 'text-[#D4FF00]' : 'text-white/40'}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTab === 'studio' ? 'bg-[#D4FF00] text-black' : 'bg-white/10'}`}>
              <span className="text-xl">+</span>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveTab('brain')} 
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'brain' ? 'text-white' : 'text-white/40'}`}
          >
            <span className="text-xl">🧠</span>
          </button>
        </div>
      </div>
    </main>
  );
}
