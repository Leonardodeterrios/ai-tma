'use client';
import { useState } from 'react';

const QUESTIONS = [
  { key: 'name',        section: 'Персонаж', q: 'Как зовут персонажа?',                          ph: 'Алиса',                          req: true },
  { key: 'age',         section: 'Персонаж', q: 'Сколько ей лет?',                                ph: '23–25',                          req: true },
  { key: 'city',        section: 'Персонаж', q: 'Где она живёт?',                                 ph: 'Москва, периодически Дубай',      req: true },
  { key: 'looks',       section: 'Персонаж', q: 'Как она выглядит?',                              ph: 'Длинные тёмные волосы, спортивная', req: true },
  { key: 'character',   section: 'Персонаж', q: 'Опиши характер тремя словами',                   ph: 'дерзкая, ироничная, тёплая',      req: true },
  { key: 'job',         section: 'Персонаж', q: 'Чем она занимается?',                            ph: 'фотограф, снимает моду',          req: true },
  { key: 'hobby',       section: 'Персонаж', q: 'Хобби и увлечения?',                             ph: 'теннис, вино, старые фильмы',     req: true },
  { key: 'speech',      section: 'Персонаж', q: 'Как она говорит?',                               ph: 'короткими фразами, с сарказмом',  req: false },
  { key: 'loves',       section: 'Персонаж', q: 'Что она любит?',                                 ph: 'кофе без сахара, джаз, Бали',     req: false },
  { key: 'hates',       section: 'Персонаж', q: 'Что её раздражает?',                             ph: 'пафос, очереди, фальшь',          req: false },
  { key: 'dream',       section: 'Персонаж', q: 'О чём она мечтает?',                             ph: 'своя студия в Лиссабоне',         req: true },
  { key: 'weakness',    section: 'Персонаж', q: 'В чём её слабость?',                             ph: 'боится одиночества',              req: false },
  { key: 'secret',      section: 'Персонаж', q: 'Есть секрет, о котором она молчит?',             ph: 'уволилась с престижной работы',   req: false },
  { key: 'theme',       section: 'Канал',    q: 'О чём канал?',                                   ph: 'жизнь девушки в большом городе',  req: true },
  { key: 'audience',    section: 'Канал',    q: 'Кто её смотрит?',                                 ph: 'девушки 20–30, про эстетику', req: true },
  { key: 'tone',        section: 'Канал',    q: 'Какой тон у постов?',                             ph: 'иронично-тёплый',                 req: true },
  { key: 'formats',     section: 'Канал',    q: 'Какие форматы постов?',                          ph: 'фото, сторис, короткие заметки',  req: false },
  { key: 'forbidden',   section: 'Канал',    q: 'Чего категорически нельзя?',                     ph: 'политика, жалобы, реклама',       req: false },
  { key: 'frequency',   section: 'Канал',    q: 'Как часто посты?',                               ph: '4 раза в неделю',                 req: false },
  { key: 'cta',         section: 'Канал',    q: 'Куда вести подписчика?',                         ph: 'писать в личку, подписаться',     req: false },
];

type Post = { day: string; format: string; title: string; text: string; hashtags: string; imagePrompt: string };

export default function BrainTab() {
  const [subTab, setSubTab] = useState<'dialog' | 'plan' | 'chatter'>('plan');
  
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const current = QUESTIONS[step];
  const value = answers[current?.key] ?? '';
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100);
  const canNext = !current?.req || value.trim().length > 0;
  const isLast = step === QUESTIONS.length - 1;

  const setValue = (v: string) => setAnswers((prev) => ({ ...prev, [current.key]: v }));

  const next = () => {
    if (!canNext) return;
    if (isLast) { generate(); return; }
    setStep((s) => s + 1);
  };

  const back = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
  };

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/brain-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка генерации');
      setPosts(data.posts);
    } catch (e: any) {
      setError(e.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch { alert('Не удалось скопировать'); }
  };

  const renderPlan = () => {
    if (posts) {
      return (
        <div className="space-y-4 pb-10">
          <div className="flex justify-between items-center">
            <h2 className="text-[22px] font-black tracking-tight">Готовый план</h2>
            <button onClick={() => { setPosts(null); setStep(0); }} className="text-[11px] font-bold text-white/50 border border-white/10 px-3 py-2 rounded-lg">Заново</button>
          </div>
          {posts.map((p, i) => (
            <div key={i} className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] bg-[#D4FF00] text-black font-black px-2 py-1 rounded-md uppercase">{p.day}</span>
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{p.format}</span>
                </div>
              </div>
              <div className="text-[15px] font-bold leading-snug">{p.title}</div>
              <div className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap">{p.text}</div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Промпт для Студии</div>
                <div className="text-[11px] text-white/60 leading-relaxed">{p.imagePrompt}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 bg-[#161618] rounded-[24px] border border-white/5">
          <div className="w-10 h-10 border-4 border-white/10 border-t-[#D4FF00] rounded-full animate-spin"></div>
          <div className="text-white/50 text-sm font-medium">Придумываем контент...</div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <div className="text-[14px] font-bold">Сборка персонажа</div>
          <span className="text-[11px] font-bold text-white/40">{step + 1} / {QUESTIONS.length}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-[#D4FF00] transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="bg-[#161618] border border-white/5 rounded-2xl p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#D4FF00]/70 mb-2">{current.section}</div>
          <div className="text-[17px] font-bold leading-snug mb-4">{current.q}</div>
          <textarea
            value={value} onChange={(e) => setValue(e.target.value)} placeholder={current.ph} rows={3}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[15px] text-white placeholder-white/25 focus:outline-none focus:border-[#D4FF00]/40 resize-none"
          />
        </div>
        {error && <div className="text-red-300 text-[12px]">{error}</div>}
        <div className="flex gap-2">
          <button onClick={back} disabled={step === 0} className="px-5 py-4 rounded-2xl text-[14px] font-bold bg-[#161618] text-white/60 border border-white/5 disabled:opacity-30">Назад</button>
          <button onClick={next} disabled={!canNext} className="flex-1 bg-[#D4FF00] disabled:bg-[#161618] disabled:text-white/30 text-black font-black py-4 rounded-2xl text-[15px]">{isLast ? 'Собрать план' : 'Далее'}</button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto pt-4 space-y-5">
      <h2 className="text-[28px] font-black tracking-tight px-1">Мозг</h2>
      
      {/* Твои Вкладки */}
      <div className="bg-[#161618] p-1.5 rounded-[16px] flex gap-1 border border-white/5">
        <button onClick={() => setSubTab('dialog')} className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${subTab === 'dialog' ? 'bg-[#2A2B2E] text-white shadow-sm' : 'text-white/50'}`}>Диалог</button>
        <button onClick={() => setSubTab('plan')} className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${subTab === 'plan' ? 'bg-[#2A2B2E] text-white shadow-sm' : 'text-white/50'}`}>План</button>
        <button onClick={() => setSubTab('chatter')} className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${subTab === 'chatter' ? 'bg-[#2A2B2E] text-white shadow-sm' : 'text-white/50'}`}>Чаттер</button>
      </div>

      {subTab === 'plan' && renderPlan()}
      
      {subTab === 'dialog' && (
        <div className="bg-[#161618] rounded-[24px] border border-white/5 text-center px-4 py-20 flex flex-col items-center">
          <span className="text-4xl mb-3 opacity-50">💭</span>
          <p className="text-[13px] font-bold tracking-wide text-white/30 uppercase">Свободный диалог<br/>в разработке</p>
        </div>
      )}

      {subTab === 'chatter' && (
        <div className="bg-[#161618] rounded-[24px] border border-white/5 text-center px-4 py-20 flex flex-col items-center">
          <span className="text-4xl mb-3 opacity-50">🤖</span>
          <p className="text-[13px] font-bold tracking-wide text-white/30 uppercase">Чаттер<br/>в разработке</p>
        </div>
      )}
    </div>
  );
}
