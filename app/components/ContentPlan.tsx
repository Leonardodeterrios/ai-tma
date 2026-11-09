'use client';
import { useState, useRef } from 'react';

const neonGreen = '#d8ff4f';

type Arche = 'siren' | 'mystery' | 'girl' | 'queen' | 'rebel' | 'muse' | 'huntress' | 'joker';
type Post = { day: string; format: string; goal: string; title: string; text: string; hashtags: string; imagePrompt: string };

const ARCHETYPES: Record<Arche, { name: string; emoji: string; tagline: string }> = {
  siren:    { name: 'Сирена',        emoji: '🔥', tagline: 'Соблазн и власть взгляда' },
  mystery:  { name: 'Загадка',       emoji: '🌙', tagline: 'Её не прочитать — и это цепляет' },
  girl:     { name: 'Своя девчонка', emoji: '🌸', tagline: 'Тепло и лёгкость, как со старым другом' },
  queen:    { name: 'Королева',      emoji: '👑', tagline: 'Холод, статус, высокая цена' },
  rebel:    { name: 'Бунтарка',      emoji: '⚡️', tagline: 'Не по правилам, непредсказуемо' },
  muse:     { name: 'Муза',          emoji: '🎨', tagline: 'Эстетика, свет, атмосфера' },
  huntress: { name: 'Охотница',      emoji: '🎯', tagline: 'Спорт, драйв, она выбирает сама' },
  joker:    { name: 'Комедиантка',   emoji: '😜', tagline: 'Юмор и самоирония' },
};

const TEST: { q: string; options: { label: string; a: Arche }[] }[] = [
  { q: 'В бар заходит он и присылает тебе коктейль. Ты…', options: [
    { label: 'Поднимаю бокал и улыбаюсь — пусть гадает', a: 'mystery' },
    { label: 'Подхожу первой: «и что ты хочешь?»', a: 'huntress' },
    { label: 'Машу рукой, пусть садится рядом', a: 'girl' },
    { label: 'Жду, пока подойдёт сам', a: 'siren' },
  ]},
  { q: 'Идеальная пятница — это…', options: [
    { label: 'Ужин дома, вино, разговоры до трёх', a: 'muse' },
    { label: 'Место, где меня ещё никто не видел', a: 'siren' },
    { label: 'Клуб, громко, танцевать до утра', a: 'rebel' },
    { label: 'Плед, сериал, переписка с фанатами', a: 'girl' },
  ]},
  { q: 'В переписке тебе важнее…', options: [
    { label: 'Чтобы он гадал, что у меня в голове', a: 'mystery' },
    { label: 'Чтобы было смешно', a: 'joker' },
    { label: 'Чтобы он ловил каждый мой намёк', a: 'siren' },
    { label: 'Чтобы было по-настоящему тепло', a: 'muse' },
  ]},
  { q: 'Что цепляет в мужчине?', options: [
    { label: 'Уверенность и умение ждать', a: 'queen' },
    { label: 'Чувство юмора', a: 'joker' },
    { label: 'То, как он смотрит', a: 'siren' },
    { label: 'Надёжность', a: 'muse' },
  ]},
  { q: 'Твой стиль в одежде?', options: [
    { label: 'Дорого и строго по фигуре', a: 'queen' },
    { label: 'Дерзко, наперекор правилам', a: 'rebel' },
    { label: 'Мягко, уютно, но с изюмом', a: 'girl' },
    { label: 'Спортивно, всегда в движении', a: 'huntress' },
  ]},
  { q: 'Фанат написал слишком нагло. Ты…', options: [
    { label: 'Отвечу так, что он покраснеет', a: 'siren' },
    { label: 'Холодно поставлю на место', a: 'queen' },
    { label: 'Пошучу и переведу в игру', a: 'joker' },
    { label: 'Промолчу и удалю', a: 'mystery' },
  ]},
  { q: 'Что чаще всего в твоём контенте?', options: [
    { label: 'Эстетика: места, свет, моменты', a: 'muse' },
    { label: 'Я сама, крупным планом', a: 'siren' },
    { label: 'Смешные ситуации и мемы', a: 'joker' },
    { label: 'Спорт, приключения, драйв', a: 'huntress' },
  ]},
  { q: 'Твоя суперсила?', options: [
    { label: 'Он думает обо мне весь день', a: 'siren' },
    { label: 'Непредсказуемость', a: 'rebel' },
    { label: 'Лёгкость, с которой всё просто', a: 'girl' },
    { label: 'Холодный расчёт', a: 'queen' },
  ]},
  { q: 'Когда тебе скучно, ты…', options: [
    { label: 'Иду на тренировку или гулять далеко', a: 'huntress' },
    { label: 'Устраиваю себе шопинг', a: 'queen' },
    { label: 'Пишу фанату что-нибудь странное', a: 'joker' },
    { label: 'Меняю что-то в жизни: стрижку, город', a: 'rebel' },
  ]},
];

const STORY_CHIPS = ['переезд в новый город', 'учёба в универе', 'работа в баре', 'путешествия', 'своя студия', 'знакомства в сети'];

export default function ContentPlan({ onSendToStudio }: { onSendToStudio?: (prompt: string) => void }) {
  const [stage, setStage] = useState<'test' | 'story' | 'setup' | 'result'>('test');

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Arche>>({});
  const [arche, setArche] = useState<Arche | null>(null);

  const [storyMode, setStoryMode] = useState<'have' | 'create' | 'none'>('have');
  const [storyText, setStoryText] = useState('');
  const [readyMessages, setReadyMessages] = useState('');

  const [refs, setRefs] = useState<{ id: string; base64: string; preview: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const card: React.CSSProperties = { background: '#111', borderRadius: '16px', padding: '15px', border: '1px solid #222' };
  const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff', padding: '12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };

  const q = TEST[step];
  const progress = Math.round(((step + 1) / TEST.length) * 100);

  const pick = (a: Arche) => {
    const next = { ...answers, [step]: a };
    setAnswers(next);
    if (step < TEST.length - 1) {
      setStep(step + 1);
      return;
    }
    const count: Record<string, number> = {};
    Object.values(next).forEach((k) => { count[k] = (count[k] || 0) + 1; });
    const winner = (Object.keys(count).sort((x, y) => count[y] - count[x])[0] || 'siren') as Arche;
    setArche(winner);
    setStage('story');
  };

  const compress = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const max = 720;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = () => reject(new Error('Не удалось прочитать фото'));
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать фото'));
    });

  const addRefs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (refs.length + files.length > 3) { alert('Максимум 3 референса'); return; }
    try {
      const added = await Promise.all(files.map(async (f) => {
        const b64 = await compress(f);
        return { id: Math.random().toString(36).slice(2), base64: b64, preview: b64 };
      }));
      setRefs([...refs, ...added]);
    } catch (err: any) {
      alert(err.message || 'Ошибка фото');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const generate = async () => {
    setLoading(true);
    setStage('result');
    setError(null);
    try {
      const res = await fetch('/api/brain-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetype: arche,
          storyMode,
          storyText,
          readyMessages,
          references: refs.map((r) => r.base64),
        }),
      });
      const raw = await res.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { throw new Error(`Сервер ответил не JSON (код ${res.status})`); }
      if (!res.ok) throw new Error(data.error || 'Ошибка генерации');
      if (!data.posts?.length) throw new Error('Модель не вернула постов');
      setPosts(data.posts);
    } catch (e: any) {
      setError(e.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStage('test'); setStep(0); setAnswers({}); setArche(null);
    setPosts(null); setError(null); setStoryText(''); setReadyMessages(''); setRefs([]);
  };

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500); }
    catch { alert('Не удалось скопировать'); }
  };

  const postText = (p: Post) =>
    `${p.day} · ${p.format}\n\n${p.title}\n\n${p.text}\n\n${p.hashtags}\n\nПромпт для Студии: ${p.imagePrompt}`;

  // ---------- ТЕСТ ----------
  if (stage === 'test') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Тест на архетип</span>
          <span style={{ fontSize: '12px', color: '#666' }}>{step + 1} / {TEST.length}</span>
        </div>
        <div style={{ height: '4px', backgroundColor: '#1a1a1a', borderRadius: '2px', overflow: 'hidden', marginBottom: '18px' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: neonGreen, transition: 'width 0.3s' }}></div>
        </div>

        <div style={{ ...card, marginBottom: '15px' }}>
          <div style={{ fontSize: '17px', fontWeight: 'bold', lineHeight: '1.4' }}>{q.q}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {q.options.map((o, i) => (
            <button key={i} onClick={() => pick(o.a)} style={{ textAlign: 'left', padding: '15px', borderRadius: '12px', border: '1px solid #2a2a2a', backgroundColor: '#0d0d0d', color: '#ddd', fontSize: '13px', lineHeight: '1.4', cursor: 'pointer' }}>
              {o.label}
            </button>
          ))}
        </div>

        {step > 0 && (
          <button onClick={() => setStep(step - 1)} style={{ width: '100%', background: 'none', border: 'none', color: '#444', fontSize: '11px', padding: '14px', cursor: 'pointer' }}>
            ← Назад
          </button>
        )}
      </div>
    );
  }

  // ---------- ИСТОРИЯ ----------
  if (stage === 'story' && arche) {
    const a = ARCHETYPES[arche];
    return (
      <div>
        <div style={{ ...card, border: `1px solid ${neonGreen}40`, marginBottom: '18px', textAlign: 'center', padding: '20px 15px' }}>
          <div style={{ fontSize: '34px', marginBottom: '6px' }}>{a.emoji}</div>
          <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Твой архетип</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: neonGreen, marginBottom: '6px' }}>{a.name}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{a.tagline}</div>
        </div>

        <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>История персонажа</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
          {[
            { id: 'have' as const, label: 'У меня уже есть история', sub: 'Расскажу в двух словах' },
            { id: 'create' as const, label: 'Хочу создать с нуля', sub: 'Придумаем вместе' },
            { id: 'none' as const, label: 'Без истории', sub: 'Просто лайфстайл-контент' },
          ].map((m) => (
            <button key={m.id} onClick={() => setStoryMode(m.id)} style={{ textAlign: 'left', padding: '14px', borderRadius: '12px', border: storyMode === m.id ? `1px solid ${neonGreen}` : '1px solid #2a2a2a', backgroundColor: storyMode === m.id ? '#1e2410' : '#0d0d0d', cursor: 'pointer' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: storyMode === m.id ? neonGreen : '#ddd' }}>{m.label}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{m.sub}</div>
            </button>
          ))}
        </div>

        {storyMode !== 'none' && (
          <div style={{ ...card, marginBottom: '15px' }}>
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder={storyMode === 'have' ? 'Кто она, откуда, что у неё сейчас происходит...' : 'Какое настроение и сюжет хочешь? Например: переехала в Дубай, снимает квартиру, ищет себя...'}
              rows={4}
              style={{ ...inputStyle, resize: 'none', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {STORY_CHIPS.map((c) => (
                <button key={c} onClick={() => setStoryText((prev) => (prev ? `${prev}, ${c}` : c))} style={{ padding: '6px 10px', borderRadius: '20px', border: '1px solid #2a2a2a', backgroundColor: '#000', color: '#888', fontSize: '11px', cursor: 'pointer' }}>
                  + {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setStage('setup')} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: neonGreen, color: '#000', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          Далее
        </button>
      </div>
    );
  }

  // ---------- НАСТРОЙКА ----------
  if (stage === 'setup') {
    return (
      <div>
        <div style={{ ...card, marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>Референсы (до 3)</div>
              <div style={{ fontSize: '10px', color: '#666' }}>ИИ посмотрит на фото и опишет внешность в промптах</div>
            </div>
            <button onClick={() => fileRef.current?.click()} style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${neonGreen}50`, backgroundColor: '#1a1a1a', color: neonGreen, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>+ Фото</button>
            <input type="file" multiple accept="image/*" ref={fileRef} onChange={addRefs} style={{ display: 'none' }} />
          </div>
          {refs.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {refs.map((r) => (
                <div key={r.id} style={{ position: 'relative', width: '62px', height: '62px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
                  <img src={r.preview} alt="ref" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setRefs(refs.filter((x) => x.id !== r.id))} style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...card, marginBottom: '15px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>Готовые сообщения</div>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '10px' }}>Вставь 2-3 своих реальных сообщения в личке — план напишется твоим голосом</div>
          <textarea
            value={readyMessages}
            onChange={(e) => setReadyMessages(e.target.value)}
            placeholder={'Приветик) как прошёл день?\n\nблин, я сегодня вырубилась в 9 вечера 😅\n\nне, серьёзно, ты правда так думаешь?'}
            rows={5}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        {error && <div style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setStage('story')} style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#111', color: '#888', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Назад</button>
          <button onClick={generate} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: neonGreen, color: '#000', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            Собрать контент-план
          </button>
        </div>
      </div>
    );
  }

  // ---------- РЕЗУЛЬТАТ ----------
  const a = arche ? ARCHETYPES[arche] : null;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
          {a ? `${a.emoji} ${a.name}` : 'Контент-план'}
        </span>
        <button onClick={reset} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#111', color: '#aaa', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Заново</button>
      </div>

      {loading && (
        <div style={{ ...card, textAlign: 'center', padding: '50px 15px' }}>
          <div style={{ width: '34px', height: '34px', border: '3px solid #222', borderTopColor: neonGreen, borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Пишем план на неделю...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ ...card, borderColor: '#5a2020' }}>
          <p style={{ fontSize: '12px', color: '#ff6b6b', margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && posts && posts.map((p, i) => (
        <div key={i} style={{ ...card, marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', backgroundColor: neonGreen, color: '#000', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>{p.day}</span>
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>{p.format}</span>
            <span style={{ fontSize: '10px', color: '#7ea6ff', border: '1px solid #7ea6ff40', borderRadius: '20px', padding: '1px 7px' }}>{p.goal}</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>{p.title}</div>
          <div style={{ fontSize: '13px', color: '#bbb', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{p.text}</div>
          <div style={{ fontSize: '12px', color: '#7ea6ff', marginBottom: '10px' }}>{p.hashtags}</div>
          <div style={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Промпт для Студии</div>
            <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>{p.imagePrompt}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => copy(postText(p), String(i))} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#aaa', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              {copied === String(i) ? '✓ Скопировано' : 'Копировать'}
            </button>
            <button
              onClick={() => {
                if (onSendToStudio) { onSendToStudio(p.imagePrompt); alert('Промпт отправлен в Студию'); }
                else { copy(p.imagePrompt, 'p' + i); }
              }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#1e2410', color: neonGreen, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {copied === 'p' + i ? '✓ Промпт скопирован' : '→ Промпт в Студию'}
            </button>
          </div>
        </div>
      ))}

      {!loading && posts && (
        <button onClick={() => copy(posts.map(postText).join('\n\n———\n\n'), 'all')} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: neonGreen, color: '#000', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          {copied === 'all' ? '✓ Всё скопировано' : 'Скопировать весь план'}
        </button>
      )}
    </div>
  );
}
