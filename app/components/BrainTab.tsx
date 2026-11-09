'use client';
import { useState } from 'react';

// 20 вопросов про персонажа и канал — разбиты на два блока
const QUESTIONS = [
  { key: 'name',        section: 'Персонаж', q: 'Как зовут персонажа?',                          hint: 'Имя или ник, под которым она существует',              ph: 'Алиса',                          req: true },
  { key: 'age',         section: 'Персонаж', q: 'Сколько ей лет?',                                hint: 'Можно диапазон',                                       ph: '23–25',                          req: true },
  { key: 'city',        section: 'Персонаж', q: 'Где она живёт?',                                 hint: 'Город, страна, или «везде понемногу»',                  ph: 'Москва, периодически Дубай',      req: true },
  { key: 'looks',       section: 'Персонаж', q: 'Как она выглядит?',                              hint: 'Волосы, фигура, стиль одежды — коротко',                ph: 'Длинные тёмные волосы, спортивная, любит oversize', req: true },
  { key: 'character',   section: 'Персонаж', q: 'Опиши характер тремя словами',                   hint: 'Именно три прилагательных',                             ph: 'дерзкая, ироничная, тёплая',      req: true },
  { key: 'job',         section: 'Персонаж', q: 'Чем она занимается?',                            hint: 'Профессия, дело, образ жизни',                          ph: 'фотограф, снимает моду',          req: true },
  { key: 'hobby',       section: 'Персонаж', q: 'Хобби и увлечения?',                             hint: 'Чем занята вне работы',                                 ph: 'теннис, вино, старые фильмы',     req: true },
  { key: 'speech',      section: 'Персонаж', q: 'Как она говорит?',                               hint: 'Стиль речи, любимые словечки, манера',                  ph: 'короткими фразами, с сарказмом',  req: false },
  { key: 'loves',       section: 'Персонаж', q: 'Что она любит?',                                 hint: 'Еда, музыка, места, вещи',                              ph: 'кофе без сахара, джаз, Бали',     req: false },
  { key: 'hates',       section: 'Персонаж', q: 'Что её раздражает?',                             hint: 'Это даёт живые, цепляющие посты',                        ph: 'пафос, очереди, фальшь',          req: false },
  { key: 'dream',       section: 'Персонаж', q: 'О чём она мечтает?',                             hint: 'Большая цель',                                          ph: 'своя студия в Лиссабоне',         req: true },
  { key: 'weakness',    section: 'Персонаж', q: 'В чём её слабость?',                             hint: 'Уязвимость делает персонажа настоящим',                 ph: 'боится одиночества',              req: false },
  { key: 'secret',      section: 'Персонаж', q: 'Есть секрет, о котором она молчит?',             hint: 'Можно пропустить',                                      ph: 'уволилась с престижной работы',   req: false },
  { key: 'theme',       section: 'Канал',    q: 'О чём канал?',                                   hint: 'Главная тема блога',                                    ph: 'жизнь девушки в большом городе',  req: true },
  { key: 'audience',    section: 'Канал',    q: 'Кто её смотрит?',                                 hint: 'Возраст, интересы, зачем пришли',                        ph: 'девушки 20–30, про эстетику и свободу', req: true },
  { key: 'tone',        section: 'Канал',    q: 'Какой тон у постов?',                             hint: 'Тёплый, дерзкий, загадочный, ироничный',                ph: 'иронично-тёплый',                 req: true },
  { key: 'formats',     section: 'Канал',    q: 'Какие форматы постов?',                          hint: 'Что вообще бывает в канале',                            ph: 'фото, сторис, короткие заметки',  req: false },
  { key: 'forbidden',   section: 'Канал',    q: 'Чего категорически нельзя?',                     hint: 'Стоп-слова, темы, которые не трогаем',                  ph: 'политика, жалобы, реклама',       req: false },
  { key: 'frequency',   section: 'Канал',    q: 'Как часто посты?',                               hint: 'Сколько в неделю',                                      ph: '4 раза в неделю',                 req: false },
  { key: 'cta',         section: 'Канал',    q: 'Куда вести подписчика?',                         hint: 'Призыв к действию или ссылка',                          ph: 'писать в личку, подписаться',     req: false },
];

type Post = { day: string; format: string; title: string; text: string; hashtags: string; imagePrompt: string };

export default function BrainTab() {
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brain-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const raw = await res.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { throw new Error(`Сервер ответил не JSON (код ${res.status})`); }
      if (!res.ok) throw new Error(data.error || 'Ошибка генерации');
      setPosts(data.posts);
    } catch (e: any) {
      setError(e.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPosts(null);
    setStep(0);
    setAnswers({});
    setError(null);
  };

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      alert('Не удалось скопировать, выделите текст вручную');
    }
  };

  const postToText = (p: Post) =>
    `${p.day} · ${p.format}\n\n${p.title}\n\n${p.text}\n\n${p.hashtags}\n\nПромпт для картинки: ${p.imagePrompt}`;

  // ---------- ЭКРАН РЕЗУЛЬТАТА ----------
  if (posts) {
    return (
      <div className="max-w-md mx-auto pt-8 space-y-4 pb-10">
        <div className="flex justify-between items-center">
          <h2 className="text-[26px] font-black tracking-tight">Контент-план</h2>
          <button onClick={reset} className="text-[11px] font-bold text-white/50 border border-white/10 px-3 py-2 rounded-lg">Заново</button>
        </div>
        <p className="text-[12px] text-white/40 -mt-2">{posts.length} постов. Промпты можно сразу нести в Студию.</p>

        {posts.map((p, i) => (
          <div key={i} className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-[#D4FF00] text-black font-black px-2 py-1 rounded-md uppercase">{p.day}</span>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{p.format}</span>
              </div>
              <button onClick={() => copy(postToText(p), String(i))} className="text-[11px] font-bold text-[#D4FF00] shrink-0">
                {copied === String(i) ? '✓ Скопировано' : 'Копировать'}
              </button>
            </div>
            <div className="text-[15px] font-bold leading-snug">{p.title}</div>
            <div className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap">{p.text}</div>
            <div className="text-[12px] text-[#7EA6FF]">{p.hashtags}</div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Промпт для Студии</div>
              <div className="text-[11px] text-white/60 leading-relaxed">{p.imagePrompt}</div>
            </div>
          </div>
        ))}

        <button onClick={() => copy(posts.map(postToText).join('\n\n———\n\n'), 'all')} className="w-full bg-[#D4FF00] text-black font-black py-4 rounded-2xl text-[15px]">
          {copied === 'all' ? '✓ Всё скопировано' : 'Скопировать весь план'}
        </button>
      </div>
    );
  }

  // ---------- ЭКРАН ЗАГРУЗКИ ----------
  if (loading) {
    return (
      <div className="max-w-md mx-auto pt-8">
        <h2 className="text-[28px] font-black tracking-tight mb-6">Мозг</h2>
        <div className="flex flex-col items-center justify-center gap-4 py-20 bg-[#161618] rounded-[24px] border border-white/5">
          <div className="w-10 h-10 border-4 border-white/10 border-t-[#D4FF00] rounded-full animate-spin"></div>
          <div className="text-white/50 text-sm font-medium">Придумываем посты...</div>
        </div>
      </div>
    );
  }

  // ---------- ЭКРАН АНКЕТЫ ----------
  return (
    <div className="max-w-md mx-auto pt-8 space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-[28px] font-black tracking-tight">Мозг</h2>
        <span className="text-[11px] font-bold text-white/40">{step + 1} / {QUESTIONS.length}</span>
      </div>

      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-[#D4FF00] transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="bg-[#161618] border border-white/5 rounded-2xl p-5">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#D4FF00]/70 mb-2">{current.section}</div>
        <div className="text-[17px] font-bold leading-snug mb-1">{current.q}</div>
        <div className="text-[11px] text-white/40 mb-4">{current.hint}</div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={current.ph}
          rows={3}
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[15px] text-white placeholder-white/25 focus:outline-none focus:border-[#D4FF00]/40 resize-none"
        />
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-[12px] p-3 rounded-xl">{error}</div>}

      <div className="flex gap-2">
        <button onClick={back} disabled={step === 0} className="px-5 py-4 rounded-2xl text-[14px] font-bold bg-[#161618] text-white/60 border border-white/5 disabled:opacity-30">
          Назад
        </button>
        <button onClick={next} disabled={!canNext} className="flex-1 bg-[#D4FF00] disabled:bg-[#161618] disabled:text-white/30 text-black font-black py-4 rounded-2xl text-[15px]">
          {isLast ? 'Собрать контент-план' : 'Далее'}
        </button>
      </div>

      {!current.req && (
        <button onClick={() => { setValue(''); next(); }} className="w-full text-[12px] text-white/30 font-bold py-1">
          Пропустить вопрос
        </button>
      )}
    </div>
  );
}
