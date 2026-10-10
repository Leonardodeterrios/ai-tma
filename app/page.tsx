'use client';
import { useState, useRef } from 'react';
import BrainTab from './components/BrainTab';

type Engine = 'flux' | 'seedream' | 'seedance' | 'nanobanana';
type StudioMode = 'freestyle' | 'templates';

const TEMPLATES = [
  { id: 'selfie', icon: '📱', title: 'iPhone Селфи', desc: 'Реалистичное фото в зеркало', basePrompt: 'iphone mirror selfie, flash photography, raw candid photo, 8k resolution, highly detailed, realistic skin texture, casual lighting --ar 3:4' },
  { id: 'golden', icon: '🌅', title: 'Golden Hour', desc: 'Проф. фото на закате', basePrompt: 'professional portrait photography, golden hour lighting, cinematic rim light, bokeh, 85mm lens, highly detailed, photorealistic --ar 4:5' },
  { id: 'glamour', icon: '🔥', title: 'Студия (18+)', desc: 'Идеальная кожа, свет', basePrompt: 'fashion magazine cover, studio lighting, hyper detailed, soft skin, volumetric lighting, provocative model pose, masterpiece, 8k uhd --ar 4:5' },
  { id: 'lifestyle', icon: '☕️', title: 'Кафе Lifestyle', desc: 'Живое фото за столиком', basePrompt: 'candid shot, sitting in a cozy coffee shop, natural daylight, blurred background, f/1.8, realistic analog photography, 35mm --ar 4:5' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('studio');
  const [studioMode, setStudioMode] = useState<StudioMode>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [modelDescription, setModelDescription] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'image' | 'video'>('image');
  const [selectedEngine, setSelectedEngine] = useState<Engine>('seedream');

  const [faceRef, setFaceRef] = useState<string | null>(null);
  const [clothesRef, setClothesRef] = useState<string | null>(null);
  const [locationRef, setLocationRef] = useState<string | null>(null);

  const faceInputRef = useRef<HTMLInputElement>(null);
  const clothesInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File, setter: (val: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setter(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    const finalPrompt = studioMode === 'templates' 
      ? `${modelDescription}, ${selectedTemplate.basePrompt}`
      : imagePrompt;

    if (!finalPrompt.trim()) {
      alert("Заполните описание!");
      return;
    }

    setIsGenerating(true);
    setResultUrl(null);

    try {
      const references = [faceRef, clothesRef, locationRef].filter((r): r is string => Boolean(r));

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          engine: selectedEngine,
          references
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка при генерации');

      if (data.urls && data.urls[0]) {
        setResultUrl(data.urls[0]);
        setResultType(data.type || 'image');
      } else {
        throw new Error('Пустой ответ от нейросети');
      }

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
                PRO Конструктор 🔞
              </span>
            </div>

            {/* Движки */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setSelectedEngine('seedream')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border ${selectedEngine === 'seedream' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🔥 Seedream</button>
              <button onClick={() => setSelectedEngine('nanobanana')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border ${selectedEngine === 'nanobanana' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🍌 Nano</button>
              <button onClick={() => setSelectedEngine('flux')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border ${selectedEngine === 'flux' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>⚡️ Flux</button>
              <button onClick={() => setSelectedEngine('seedance')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border ${selectedEngine === 'seedance' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🎬 Seedance</button>
            </div>

            {/* Мульти-референсы */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="text-[13px] font-bold text-white mb-1">Мульти-референсы модели</div>
              
              <div className="grid grid-cols-3 gap-2">
                <div onClick={() => faceInputRef.current?.click()} className="cursor-pointer border border-dashed border-white/10 hover:border-[#D4FF00]/50 rounded-xl p-2.5 text-center flex flex-col items-center justify-center bg-black/30 relative overflow-hidden h-24">
                  {faceRef ? (
                    <>
                      <img src={faceRef} alt="Face" className="absolute inset-0 w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setFaceRef(null); }} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-[10px]">✕</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xl mb-1">👤</span>
                      <span className="text-[11px] font-bold text-white/70">Лицо</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={faceInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], setFaceRef)} />
                </div>

                <div onClick={() => clothesInputRef.current?.click()} className="cursor-pointer border border-dashed border-white/10 hover:border-[#D4FF00]/50 rounded-xl p-2.5 text-center flex flex-col items-center justify-center bg-black/30 relative overflow-hidden h-24">
                  {clothesRef ? (
                    <>
                      <img src={clothesRef} alt="Clothes" className="absolute inset-0 w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setClothesRef(null); }} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-[10px]">✕</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xl mb-1">👗</span>
                      <span className="text-[11px] font-bold text-white/70">Одежда</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={clothesInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], setClothesRef)} />
                </div>

                <div onClick={() => locationInputRef.current?.click()} className="cursor-pointer border border-dashed border-white/10 hover:border-[#D4FF00]/50 rounded-xl p-2.5 text-center flex flex-col items-center justify-center bg-black/30 relative overflow-hidden h-24">
                  {locationRef ? (
                    <>
                      <img src={locationRef} alt="Location" className="absolute inset-0 w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setLocationRef(null); }} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-[10px]">✕</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xl mb-1">🌇</span>
                      <span className="text-[11px] font-bold text-white/70">Локация</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={locationInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], setLocationRef)} />
                </div>
              </div>
            </div>

            <div className="bg-[#161618] p-1.5 rounded-[16px] flex gap-1 border border-white/5">
              <button onClick={() => setStudioMode('templates')} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${studioMode === 'templates' ? 'bg-[#2A2B2E] text-white shadow-sm' : 'text-white/50'}`}>Готовые стили</button>
              <button onClick={() => setStudioMode('freestyle')} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${studioMode === 'freestyle' ? 'bg-[#2A2B2E] text-white shadow-sm' : 'text-white/50'}`}>Свой промпт</button>
            </div>

            {studioMode === 'templates' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map(tpl => (
                    <div key={tpl.id} onClick={() => setSelectedTemplate(tpl)} className={`cursor-pointer p-4 rounded-2xl border transition-all ${selectedTemplate.id === tpl.id ? 'bg-[#D4FF00]/10 border-[#D4FF00]' : 'bg-[#1A1A1D] border-white/5'}`}>
                      <div className="text-3xl mb-2">{tpl.icon}</div>
                      <div className={`text-[13px] font-bold ${selectedTemplate.id === tpl.id ? 'text-[#D4FF00]' : 'text-white'}`}>{tpl.title}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="text-lg">🇷🇺</span> Описание внешности / акценты
                  </div>
                  <textarea value={modelDescription} onChange={(e) => setModelDescription(e.target.value)} placeholder="Девушка блондинка, выразительные глаза, стройная..." className="w-full bg-transparent border-none p-0 h-20 focus:outline-none text-white resize-none text-[15px] placeholder-white/30" />
                </div>
              </div>
            ) : (
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="text-lg">🇷🇺</span> Свободный промпт
                </div>
                <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Подробное описание сцены..." className="w-full bg-transparent border-none p-0 h-32 focus:outline-none text-white resize-none text-[15px] placeholder-white/30" />
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#D4FF00] disabled:bg-[#161618] disabled:text-white/30 text-black font-black py-4 rounded-2xl text-[15px]"
            >
              {isGenerating ? 'Создаем шедевр...' : 'Сгенерировать по референсам'}
            </button>

            {/* Результат */}
            <div className="w-full min-h-[250px] mb-8">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 bg-[#161618] rounded-[24px] border border-white/5">
                  <div className="w-10 h-10 border-4 border-white/10 border-t-[#D4FF00] rounded-full animate-spin"></div>
                  <div className="text-white/50 text-sm font-medium">Нейросеть творит...</div>
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
