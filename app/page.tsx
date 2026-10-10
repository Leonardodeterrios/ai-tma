'use client';
import { useState, useRef } from 'react';
import BrainTab from './components/BrainTab';

type Engine = 'flux' | 'seedream' | 'seedance' | 'nanobanana';
type StudioMode = 'freestyle' | 'templates';

// Шаблоны
const TEMPLATES = [
  { id: 'selfie', icon: '📱', title: 'iPhone Селфи', desc: 'Реалистичное фото в зеркало', basePrompt: 'iphone mirror selfie, flash photography, raw candid photo, 8k resolution, highly detailed, realistic skin texture, casual lighting --ar 3:4' },
  { id: 'golden', icon: '🌅', title: 'Golden Hour', desc: 'Проф. фото на закате', basePrompt: 'professional portrait photography, golden hour lighting, cinematic rim light, bokeh, 85mm lens, highly detailed, photorealistic --ar 4:5' },
  { id: 'glamour', icon: '🔥', title: 'Студия (18+)', desc: 'Идеальная кожа, свет', basePrompt: 'fashion magazine cover, studio lighting, hyper detailed, soft skin, volumetric lighting, provocative model pose, masterpiece, 8k uhd --ar 4:5' },
  { id: 'lifestyle', icon: '☕️', title: 'Кафе Lifestyle', desc: 'Живое фото за столиком', basePrompt: 'candid shot, sitting in a cozy coffee shop, natural daylight, blurred background, f/1.8, realistic analog photography, 35mm --ar 4:5' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('studio');

  // Состояния Студии
  const [studioMode, setStudioMode] = useState<StudioMode>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [modelDescription, setModelDescription] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<{ url: string, type: 'image' | 'video' }[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<Engine>('seedream');
  
  // Новые фичи: Серия фото и Мульти-референсы
  const [generateCount, setGenerateCount] = useState<1 | 4>(1);
  const [references, setReferences] = useState<{ id: string, file: File, preview: string, base64: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedBase64);
      };
      img.onerror = (error) => reject(error);
    });
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (references.length + files.length > 5) {
      alert("Максимум 5 референсов!");
      return;
    }

    const newRefs = await Promise.all(files.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        base64
      };
    }));

    setReferences([...references, ...newRefs]);
  };

  const removeReference = (id: string) => {
    setReferences(references.filter(r => r.id !== id));
  };

  const handleGenerate = async () => {
    const finalPrompt = studioMode === 'templates' 
      ? `${modelDescription}, ${selectedTemplate.basePrompt}`
      : imagePrompt;

    if (!finalPrompt.trim()) {
      alert("Напишите описание!");
      return;
    }
    
    setIsGenerating(true);
    setGeneratedResults([]);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    try {
      const requestData = {
        prompt: finalPrompt,
        engine: selectedEngine,
        count: generateCount,
        references: references.map(r => r.base64),
        autoTranslate: true
      };

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Ошибка генерации');

      const results = Array.isArray(data.urls) 
        ? data.urls.map((url: string) => ({ url, type: data.type || 'image' }))
        : [{ url: data.url, type: data.type }];
        
      setGeneratedResults(results);

    } catch (error: any) {
      console.error(error);
      alert("Ошибка: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai_model_${Date.now()}.${url.includes('.mp4') ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (err) {
      alert("Зажмите фото пальцем, чтобы сохранить его в галерею.");
    }
  };

  return (
    <main className="flex flex-col h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      
      {fullscreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-center items-center">
          <div className="absolute top-4 right-4 flex gap-4 z-[101]">
            <button onClick={() => handleDownload(fullscreenImage)} className="bg-white/20 p-3 rounded-full text-xl backdrop-blur-md">⬇️</button>
            <button onClick={() => setFullscreenImage(null)} className="bg-white/20 p-3 rounded-full text-xl backdrop-blur-md">❌</button>
          </div>
          <img src={fullscreenImage} alt="Full" className="w-full h-auto max-h-screen object-contain" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-32 pt-safe px-4">
        
        {activeTab === 'studio' && (
          <div className="max-w-md mx-auto pt-8 space-y-6">
            
            <div className="flex justify-between items-center">
              <h2 className="text-[28px] font-black tracking-tight">Студия</h2>
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-md uppercase font-black tracking-widest">
                Без цензуры 🔞
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
              <button onClick={() => setSelectedEngine('seedream')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 shrink-0 ${selectedEngine === 'seedream' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🔥 Seedream</button>
              <button onClick={() => setSelectedEngine('nanobanana')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 shrink-0 ${selectedEngine === 'nanobanana' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🍌 Nano</button>
              <button onClick={() => setSelectedEngine('flux')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 shrink-0 ${selectedEngine === 'flux' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>⚡️ Flux</button>
              <button onClick={() => setSelectedEngine('seedance')} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 shrink-0 ${selectedEngine === 'seedance' ? 'bg-[#D4FF00] text-black border-[#D4FF00]' : 'bg-[#161618] text-white/70 border-white/5'}`}>🎬 Seedance</button>
            </div>

            <div className="bg-[#161618] p-1.5 rounded-[16px] flex gap-1 border border-white/5">
              <button onClick={() => setStudioMode('templates')} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${studioMode === 'templates' ? 'bg-[#2A2B2E] text-white shadow-sm' : 'text-white/50'}`}>Готовые стили</button>
              <button onClick={() => setStudioMode('freestyle')} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${studioMode === 'freestyle' ? 'bg-[#2A2B2E] text-white shadow-sm' : 'text-white/50'}`}>Свой промпт</button>
            </div>
            
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-[13px] font-bold text-white mb-0.5">Референсы (до 5 шт)</div>
                  <div className="text-[10px] text-white/50">Загрузите лицо, позу, одежду или локацию</div>
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="bg-[#D4FF00]/10 text-[#D4FF00] px-3 py-1.5 rounded-lg text-xs font-bold border border-[#D4FF00]/20">
                  + Добавить
                </button>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleReferenceUpload} />
              </div>
              
              {references.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {references.map(ref => (
                    <div key={ref.id} className="relative shrink-0 w-16 h-16 rounded-xl border border-white/10 overflow-hidden group">
                      <img src={ref.preview} alt="ref" className="w-full h-full object-cover" />
                      <button onClick={() => removeReference(ref.id)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full text-white text-[10px] flex items-center justify-center backdrop-blur-sm">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div className="text-[13px] font-bold text-white">Количество генераций</div>
              <div className="flex gap-1 bg-black/50 p-1 rounded-lg">
                <button onClick={() => setGenerateCount(1)} className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${generateCount === 1 ? 'bg-white text-black' : 'text-white/50'}`}>1 фото</button>
                <button onClick={() => setGenerateCount(4)} className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${generateCount === 4 ? 'bg-[#D4FF00] text-black' : 'text-white/50'}`}>Серия (4)</button>
              </div>
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
                    <span className="text-lg">🇷🇺</span> Пишите на русском
                  </div>
                  <textarea value={modelDescription} onChange={(e) => setModelDescription(e.target.value)} placeholder="Пример: девушка блондинка, зеленые глаза, стройная, в красном платье..." className="w-full bg-transparent border-none p-0 h-20 focus:outline-none text-white resize-none text-[15px] placeholder-white/30" />
                </div>
              </div>
            ) : (
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="text-lg">🇷🇺</span> Пишите на русском
                </div>
                <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Подробное описание сцены..." className="w-full bg-transparent border-none p-0 h-32 focus:outline-none text-white resize-none text-[15px] placeholder-white/30" />
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#D4FF00] disabled:bg-[#161618] disabled:text-white/30 text-black font-black py-4 rounded-2xl text-[15px] shadow-lg shadow-[#D4FF00]/10"
            >
              {isGenerating ? `Генерируем ${generateCount > 1 ? 'серию...' : '...'}` : 'Сгенерировать шедевр'}
            </button>

            <div className="w-full min-h-[300px] mb-8">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 bg-[#161618] rounded-[24px] border border-white/5">
                  <div className="w-10 h-10 border-4 border-white/10 border-t-[#D4FF00] rounded-full animate-spin"></div>
                  <div className="text-white/50 text-sm font-medium">Нейросеть рисует...</div>
                </div>
              ) : generatedResults.length > 0 ? (
                <div className={`grid gap-3 ${generatedResults.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {generatedResults.map((res, idx) => (
                    <div key={idx} className="relative group rounded-[24px] overflow-hidden border border-white/5 bg-[#161618]">
                      {res.type === 'image' ? (
                        <img 
                          src={res.url} 
                          alt="Result" 
                          className="w-full h-auto object-cover cursor-pointer"
                          onClick={() => setFullscreenImage(res.url)} 
                        />
                      ) : (
                        <video src={res.url} controls autoPlay loop muted playsInline className="w-full h-auto" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#161618] rounded-[24px] border border-white/5 text-center px-4 py-20 flex flex-col items-center">
                  <span className="text-4xl mb-3 opacity-50">✨</span>
                  <p className="text-[13px] font-bold tracking-wide text-white/30 uppercase">Студия готова</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (<div className="pt-8 text-center">Главная в разработке</div>)}
        {activeTab === 'brain' && (<div className="pt-8"><BrainTab /></div>)}
      </div>

      <div className="fixed bottom-0 w-full bg-[#0A0A0A]/90 backdrop-blur-2xl border-t border-white/5 pb-8 pt-4 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto px-8">
          <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center transition-all ${activeTab === 'explore' ? 'text-white scale-110' : 'text-white/30 hover:text-white/50'}`}><span className="text-2xl">◫</span></button>
          <button onClick={() => setActiveTab('studio')} className={`flex flex-col items-center transition-all ${activeTab === 'studio' ? 'scale-110' : 'hover:scale-105'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${activeTab === 'studio' ? 'bg-[#D4FF00] text-black shadow-[#D4FF00]/20' : 'bg-[#161618] text-white border border-white/5'}`}>
              <span className="text-3xl font-light mb-1">+</span>
            </div>
          </button>
          <button onClick={() => setActiveTab('brain')} className={`flex flex-col items-center transition-all ${activeTab === 'brain' ? 'text-white scale-110' : 'text-white/30 hover:text-white/50'}`}><span className="text-2xl">🧠</span></button>
        </div>
      </div>
    </main>
  );
}
