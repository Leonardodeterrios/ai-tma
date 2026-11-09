'use client';
import { useEffect, useState } from 'react';

const neonGreen = '#d8ff4f';

type Msg = { role: 'fan' | 'model'; text: string; time: number };
type Fan = { id: string; name: string; handle: string; notes: string; stage: number; history: Msg[] };
type Persona'use client';
import { useEffect, useState } from 'react';
import ContentPlan from './ContentPlan';

const neonGreen = '#d8ff4f';

type Msg = { role: 'fan' | 'model'; text: string; time: number };
type Fan = { id: string; name: string; handle: string; notes: string; stage: number; history: Msg[] };
type Persona = { name: string; age: string; character: string; languageMode: string; lifeFacts: string; examples: string };

const DEFAULT_PERSONA: Persona = {
  name: 'Мия',
  age: '22',
  character: 'игривая, циничная, но тёплая с теми, кто платит. Любит дразнить.',
  languageMode: 'ru_en',
  lifeFacts: 'живу в Бангкоке, есть кот Бублик, люблю аниме',
  examples: 'Вопрос: Как дела?\nОтвет: приветик) да всё супер, валяюсь пью кофе. а ты чем занят?\n\nВопрос: О чем мечтаешь?\nОтвет: блин, хочу просто чилить у океана и не париться о деньгах 💔',
};

const STAGES: Record<number, string> = { 1: 'Знакомство', 2: 'Флирт', 3: 'Прогрев', 4: 'Первое PPV', 5: 'Продажа' };

export default function BrainTab({ onSendToStudio }: { onSendToStudio?: (prompt: string) => void } = {}) {
  const [brainMode, setBrainMode] = useState('chatter');
  const [ready, setReady] = useState(false);

  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);
  const [showPersona, setShowPersona] = useState(false);

  const [fans, setFans] = useState<Fan[]>([]);
  const [activeFanId, setActiveFanId] = useState<string | null>(null);
  const [newFanName, setNewFanName] = useState('');
  const [showFanNotes, setShowFanNotes] = useState(false);

  const [fanInput, setFanInput] = useState('');
  const [variants, setVariants] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const [chatLog, setChatLog] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatThinking, setChatThinking] = useState(false);
  const [chatVariants, setChatVariants] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedPersona = localStorage.getItem('synx_persona');
      if (savedPersona) setPersona({ ...DEFAULT_PERSONA, ...JSON.parse(savedPersona) });
      const savedFans = localStorage.getItem('synx_fans');
      if (savedFans) setFans(JSON.parse(savedFans));
    } catch (e) {}
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem('synx_persona', JSON.stringify(persona)); }, [persona, ready]);
  useEffect(() => { if (ready) localStorage.setItem('synx_fans', JSON.stringify(fans)); }, [fans, ready]);

  const activeFan = fans.find((f) => f.id === activeFanId) || null;
  const updateFan = (id: string, patch: Partial<Fan>) => setFans((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const createFan = () => {
    const name = newFanName.trim() || 'Новый фанат';
    const fan: Fan = { id: Date.now().toString(), name, handle: '', notes: '', stage: 1, history: [] };
    setFans([fan, ...fans]);
    setNewFanName('');
    setActiveFanId(fan.id);
  };

  const deleteFan = (id: string) => {
    if (!confirm('Удалить фаната?')) return;
    setFans((prev) => prev.filter((f) => f.id !== id));
    if (activeFanId === id) setActiveFanId(null);
  };

  const pushToHistory = (role: 'fan' | 'model', text: string) => {
    if (!activeFan || !text.trim()) return;
    updateFan(activeFan.id, { history: [...activeFan.history, { role, text: text.trim(), time: Date.now() }] });
    setFanInput('');
  };

  const generateReply = async () => {
    if (!activeFan || !fanInput.trim()) return;

    const newHistory = [...activeFan.history, { role: 'fan' as const, text: fanInput.trim(), time: Date.now() }];
    updateFan(activeFan.id, { history: newHistory });
    setFanInput('');

    setIsThinking(true);
    setVariants([]);

    try {
      const res = await fetch('/api/chatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, fan: { ...activeFan, history: newHistory }, fanMessage: fanInput.trim() }),
      });
      const data = await res.json();
      if (data.replies) setVariants(data.replies);
      else setVariants(['❌ ' + (data.error || 'Ошибка')]);
    } catch (e: any) {
      setVariants(['❌ Ошибка сервера']);
    } finally {
      setIsThinking(false);
    }
  };

  const useVariant = async (text: string, copy: boolean) => {
    if (!activeFan) return;
    if (copy) { try { await navigator.clipboard.writeText(text); } catch (e) {} }
    updateFan(activeFan.id, { history: [...activeFan.history, { role: 'model', text, time: Date.now() }] });
    setVariants([]);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: Msg = { role: 'fan', text: chatInput.trim(), time: Date.now() };
    const newLog = [...chatLog, userMsg];
    setChatLog(newLog);
    setChatInput('');
    setChatThinking(true);
    setChatVariants([]);

    try {
      const res = await fetch('/api/chatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          fan: { id: 'dialog', name: 'Собеседник', handle: '', notes: 'свободный диалог, без продаж', stage: 1, history: newLog },
          fanMessage: userMsg.text,
        }),
      });
      const data = await res.json();
      if (data.replies) setChatVariants(data.replies);
      else setChatVariants(['❌ ' + (data.error || 'Ошибка')]);
    } catch (e) {
      setChatVariants(['❌ Ошибка сервера']);
    } finally {
      setChatThinking(false);
    }
  };

  const card: React.CSSProperties = { background: '#111', borderRadius: '16px', padding: '15px', border: '1px solid #222' };
  const label: React.CSSProperties = { fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '6px', display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff', padding: '12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 90px)' }}>
      <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', textTransform: 'uppercase' }}>Viral Brain 🧠</h2>

      <div style={{ display: 'flex', backgroundColor: '#111', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
        {[ { id: 'chatter', label: '💬 Чаттер' }, { id: 'content', label: '📈 План' }, { id: 'chat', label: '🤖 Диалог' } ].map((m) => (
          <button key={m.id} onClick={() => setBrainMode(m.id)} style={{ flex: 1, padding: '8px 5px', borderRadius: '8px', border: 'none', backgroundColor: brainMode === m.id ? '#222' : 'transparent', color: brainMode === m.id ? (m.id === 'chat' ? neonGreen : '#fff') : '#666', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* ================= ЧАТТЕР ================= */}
      {brainMode === 'chatter' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <button onClick={() => { setShowPersona(!showPersona); setActiveFanId(null); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: showPersona ? `1px solid ${neonGreen}` : '1px solid #333', backgroundColor: showPersona ? '#1a1a1a' : '#111', color: showPersona ? neonGreen : '#aaa', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
              ⚙️ Персона: {persona.name}
            </button>
            {activeFan && !showPersona && (
              <button onClick={() => { setActiveFanId(null); setVariants([]); }} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                ← Все фанаты
              </button>
            )}
          </div>

          {showPersona && (
            <div style={{ ...card, border: `1px solid ${neonGreen}40` }}>
              <label style={label}>Имя</label>
              <input value={persona.name} onChange={(e) => setPersona({ ...persona, name: e.target.value })} style={{ ...inputStyle, marginBottom: '12px' }} />

              <label style={label}>Язык ответов</label>
              <select value={persona.languageMode} onChange={(e) => setPersona({ ...persona, languageMode: e.target.value })} style={{ ...inputStyle, marginBottom: '12px', WebkitAppearance: 'none' }}>
                <option value="ru">Только Русский</option>
                <option value="en">Только Английский (разговорный)</option>
                <option value="ru_en">Русский + Английский в скобках [ ]</option>
              </select>

              <label style={label}>Факты из жизни</label>
              <textarea value={persona.lifeFacts} onChange={(e) => setPersona({ ...persona, lifeFacts: e.target.value })} style={{ ...inputStyle, height: '60px', marginBottom: '12px', resize: 'none' }} />

              <label style={label}>Примеры твоего общения (ВАЖНО!)</label>
              <p style={{ fontSize: '11px', color: '#666', margin: '0 0 8px 0' }}>Напиши тут 2-3 примера, как ты обычно отвечаешь. ИИ скопирует твой стиль, регистр и сленг.</p>
              <textarea value={persona.examples} onChange={(e) => setPersona({ ...persona, examples: e.target.value })} style={{ ...inputStyle, height: '100px', marginBottom: '15px', resize: 'none' }} />

              <button onClick={() => setShowPersona(false)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: neonGreen, color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                Сохранить персону
              </button>
            </div>
          )}

          {!showPersona && !activeFan && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input value={newFanName} onChange={(e) => setNewFanName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFan()} placeholder="Имя фаната..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={createFan} style={{ padding: '0 18px', borderRadius: '10px', border: `1px solid ${neonGreen}`, backgroundColor: '#1a1a1a', color: neonGreen, fontWeight: 'bold', cursor: 'pointer' }}>+ Создать</button>
              </div>
              {fans.map((fan) => {
                const last = fan.history[fan.history.length - 1];
                return (
                  <div key={fan.id} style={{ ...card, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div onClick={() => setActiveFanId(fan.id)} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{fan.name}</span>
                        <span style={{ fontSize: '10px', color: neonGreen, border: `1px solid ${neonGreen}50`, borderRadius: '20px', padding: '2px 8px' }}>Этап {fan.stage}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last ? (last.role === 'fan' ? 'Ф: ' + last.text : 'Я: ' + last.text) : 'нет сообщений'}</p>
                    </div>
                    <button onClick={() => deleteFan(fan.id)} style={{ background: 'none', border: 'none', color: '#444', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {!showPersona && activeFan && (
            <div>
              <div style={{ ...card, marginBottom: '12px' }}>
                <input value={activeFan.name} onChange={(e) => updateFan(activeFan.id, { name: e.target.value })} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '17px', fontWeight: 'bold', width: '100%', outline: 'none', padding: 0, marginBottom: '12px' }} />
                <div style={{ display: 'flex', gap: '5px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => updateFan(activeFan.id, { stage: s })} style={{ flex: 1, padding: '8px 2px', borderRadius: '8px', border: activeFan.stage === s ? `1px solid ${neonGreen}` : '1px solid #2a2a2a', backgroundColor: activeFan.stage === s ? '#1e2410' : '#0d0d0d', color: activeFan.stage === s ? neonGreen : '#666', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{s}<br/><span style={{ fontSize: '8px' }}>{STAGES[s]}</span></button>
                  ))}
                </div>
                <button onClick={() => setShowFanNotes(!showFanNotes)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '11px', marginTop: '12px', cursor: 'pointer', padding: 0 }}>{showFanNotes ? '− Скрыть заметки' : '+ Что я о нём знаю'}</button>
                {showFanNotes && <textarea value={activeFan.notes} onChange={(e) => updateFan(activeFan.id, { notes: e.target.value })} placeholder="Заметки о фанате (работа, хобби, сколько платит)..." style={{ ...inputStyle, height: '80px', marginTop: '10px', resize: 'none' }} />}
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeFan.history.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'fan' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: '16px', backgroundColor: msg.role === 'fan' ? '#1a1a1a' : '#1e2410', border: msg.role === 'fan' ? '1px solid #222' : `1px solid ${neonGreen}40`, color: msg.role === 'fan' ? '#ccc' : '#fff', fontSize: '14px', lineHeight: '1.4' }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isThinking && <div style={{ alignSelf: 'flex-end', color: neonGreen, fontSize: '12px', padding: '5px 15px' }}>печатает...</div>}
              </div>

              {variants.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Варианты ответа</p>
                  {variants.map((v, i) => (
                    <div key={i} style={{ ...card, border: `1px solid ${neonGreen}40`, marginBottom: '8px' }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.5' }}>{v}</p>
                      <button onClick={() => useVariant(v, true)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: neonGreen, color: '#000', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Копировать и сохранить в историю</button>
                    </div>
                  ))}
                </div>
              )}

              <textarea value={fanInput} onChange={(e) => setFanInput(e.target.value)} placeholder="Вставь сообщение (своё или фаната)..." style={{ ...inputStyle, height: '70px', marginBottom: '10px', resize: 'none' }} />

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button onClick={() => pushToHistory('fan', fanInput)} disabled={!fanInput.trim()} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#aaa', fontSize: '12px', cursor: 'pointer' }}>+ Добавить Фаната</button>
                <button onClick={() => pushToHistory('model', fanInput)} disabled={!fanInput.trim()} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1e2410', color: neonGreen, fontSize: '12px', cursor: 'pointer' }}>+ Добавить Себя</button>
              </div>

              <button onClick={generateReply} disabled={isThinking || !fanInput.trim()} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: isThinking || !fanInput.trim() ? '#333' : neonGreen, color: isThinking || !fanInput.trim() ? '#666' : '#000', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isThinking ? 'Генерация...' : 'Сгенерировать ответ ИИ'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= ПЛАН ================= */}
      {brainMode === 'content' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <ContentPlan onSendToStudio={onSendToStudio} />
        </div>
      )}

      {/* ================= ДИАЛОГ ================= */}
      {brainMode === 'chat' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ maxHeight: '420px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chatLog.length === 0 && (
              <div style={{ ...card, textAlign: 'center', padding: '40px 15px' }}>
                <span style={{ fontSize: '30px' }}>🤖</span>
                <p style={{ fontSize: '12px', color: '#666', margin: '10px 0 0 0' }}>Свободный диалог с {persona.name}.<br/>Персона берётся из Чаттера.</p>
              </div>
            )}
            {chatLog.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'fan' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: '16px', backgroundColor: msg.role === 'fan' ? '#1a1a1a' : '#1e2410', border: msg.role === 'fan' ? '1px solid #222' : `1px solid ${neonGreen}40`, color: '#fff', fontSize: '14px', lineHeight: '1.4' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatThinking && <div style={{ color: neonGreen, fontSize: '12px', padding: '5px 10px' }}>печатает...</div>}
          </div>

          {chatVariants.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Выбери ответ</p>
              {chatVariants.map((v, i) => (
                <div key={i} onClick={() => { setChatLog([...chatLog, { role: 'model', text: v, time: Date.now() }]); setChatVariants([]); }} style={{ ...card, border: `1px solid ${neonGreen}40`, marginBottom: '8px', cursor: 'pointer' }}>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{v}</p>
                </div>
              ))}
            </div>
          )}

          <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Напиши что-нибудь..." style={{ ...inputStyle, height: '70px', marginBottom: '10px', resize: 'none' }} />
          <button onClick={sendChat} disabled={chatThinking || !chatInput.trim()} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: chatThinking || !chatInput.trim() ? '#333' : neonGreen, color: chatThinking || !chatInput.trim() ? '#666' : '#000', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            {chatThinking ? 'Думает...' : 'Отправить'}
          </button>
          {chatLog.length > 0 && (
            <button onClick={() => { setChatLog([]); setChatVariants([]); }} style={{ width: '100%', background: 'none', border: 'none', color: '#444', fontSize: '11px', padding: '12px', cursor: 'pointer' }}>
              Очистить диалог
            </button>
          )}
        </div>
      )}
    </div>
  );
}
 = { name: string; age: string; character: string; languageMode: string; lifeFacts: string; examples: string };
type Post = { day: string; format: string; title: string; text: string; hashtags: string; imagePrompt: string };

const DEFAULT_PERSONA: Persona = {
  name: 'Мия',
  age: '22',
  character: 'игривая, циничная, но тёплая с теми, кто платит. Любит дразнить.',
  languageMode: 'ru_en',
  lifeFacts: 'живу в Бангкоке, есть кот Бублик, люблю аниме',
  examples: 'Вопрос: Как дела?\nОтвет: приветик) да всё супер, валяюсь пью кофе. а ты чем занят?\n\nВопрос: О чем мечтаешь?\nОтвет: блин, хочу просто чилить у океана и не париться о деньгах 💔',
};

const STAGES: Record<number, string> = { 1: 'Знакомство', 2: 'Флирт', 3: 'Прогрев', 4: 'Первое PPV', 5: 'Продажа' };

const QUESTIONS = [
  { key: 'name',      section: 'Персонаж', q: 'Как зовут персонажа?',              ph: 'Алиса', req: true },
  { key: 'age',       section: 'Персонаж', q: 'Сколько ей лет?',                    ph: '23–25', req: true },
  { key: 'city',      section: 'Персонаж', q: 'Где она живёт?',                     ph: 'Москва, периодически Дубай', req: true },
  { key: 'looks',     section: 'Персонаж', q: 'Как она выглядит?',                  ph: 'длинные тёмные волосы, спортивная', req: true },
  { key: 'character', section: 'Персонаж', q: 'Характер тремя словами',             ph: 'дерзкая, ироничная, тёплая', req: true },
  { key: 'job',       section: 'Персонаж', q: 'Чем она занимается?',                ph: 'фотограф, снимает моду', req: true },
  { key: 'hobby',     section: 'Персонаж', q: 'Хобби и увлечения?',                 ph: 'теннис, вино, старые фильмы', req: true },
  { key: 'speech',    section: 'Персонаж', q: 'Как она говорит?',                   ph: 'короткими фразами, с сарказмом', req: false },
  { key: 'loves',     section: 'Персонаж', q: 'Что она любит?',                     ph: 'кофе без сахара, джаз, Бали', req: false },
  { key: 'hates',     section: 'Персонаж', q: 'Что её раздражает?',                 ph: 'пафос, очереди, фальшь', req: false },
  { key: 'dream',     section: 'Персонаж', q: 'О чём она мечтает?',                 ph: 'своя студия в Лиссабоне', req: true },
  { key: 'weakness',  section: 'Персонаж', q: 'В чём её слабость?',                 ph: 'боится одиночества', req: false },
  { key: 'secret',    section: 'Персонаж', q: 'Есть секрет, о котором она молчит?', ph: 'уволилась с престижной работы', req: false },
  { key: 'theme',     section: 'Канал',    q: 'О чём канал?',                       ph: 'жизнь девушки в большом городе', req: true },
  { key: 'audience',  section: 'Канал',    q: 'Кто её смотрит?',                    ph: 'девушки 20–30, про эстетику', req: true },
  { key: 'tone',      section: 'Канал',    q: 'Какой тон у постов?',                ph: 'иронично-тёплый', req: true },
  { key: 'formats',   section: 'Канал',    q: 'Какие форматы постов?',              ph: 'фото, сторис, короткие заметки', req: false },
  { key: 'forbidden', section: 'Канал',    q: 'Чего категорически нельзя?',         ph: 'политика, жалобы, реклама', req: false },
  { key: 'frequency', section: 'Канал',    q: 'Как часто посты?',                   ph: '4 раза в неделю', req: false },
  { key: 'cta',       section: 'Канал',    q: 'Куда вести подписчика?',             ph: 'писать в личку, подписаться', req: false },
];

export default function BrainTab({ onSendToStudio }: { onSendToStudio?: (prompt: string) => void } = {}) {
  const [brainMode, setBrainMode] = useState('chatter');
  const [ready, setReady] = useState(false);

  // ---------- ЧАТТЕР: состояние ----------
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);
  const [showPersona, setShowPersona] = useState(false);

  const [fans, setFans] = useState<Fan[]>([]);
  const [activeFanId, setActiveFanId] = useState<string | null>(null);
  const [newFanName, setNewFanName] = useState('');
  const [showFanNotes, setShowFanNotes] = useState(false);

  const [fanInput, setFanInput] = useState('');
  const [variants, setVariants] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // ---------- ПЛАН: состояние ----------
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [planLoading, setPlanLoading] = useState(false);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // ---------- ДИАЛОГ: состояние ----------
  const [chatLog, setChatLog] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatThinking, setChatThinking] = useState(false);
  const [chatVariants, setChatVariants] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedPersona = localStorage.getItem('synx_persona');
      if (savedPersona) setPersona({ ...DEFAULT_PERSONA, ...JSON.parse(savedPersona) });
      const savedFans = localStorage.getItem('synx_fans');
      if (savedFans) setFans(JSON.parse(savedFans));
    } catch (e) {}
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem('synx_persona', JSON.stringify(persona)); }, [persona, ready]);
  useEffect(() => { if (ready) localStorage.setItem('synx_fans', JSON.stringify(fans)); }, [fans, ready]);

  const activeFan = fans.find((f) => f.id === activeFanId) || null;
  const updateFan = (id: string, patch: Partial<Fan>) => setFans((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const createFan = () => {
    const name = newFanName.trim() || 'Новый фанат';
    const fan: Fan = { id: Date.now().toString(), name, handle: '', notes: '', stage: 1, history: [] };
    setFans([fan, ...fans]);
    setNewFanName('');
    setActiveFanId(fan.id);
  };

  const deleteFan = (id: string) => {
    if (!confirm('Удалить фаната?')) return;
    setFans((prev) => prev.filter((f) => f.id !== id));
    if (activeFanId === id) setActiveFanId(null);
  };

  const pushToHistory = (role: 'fan' | 'model', text: string) => {
    if (!activeFan || !text.trim()) return;
    updateFan(activeFan.id, { history: [...activeFan.history, { role, text: text.trim(), time: Date.now() }] });
    setFanInput('');
  };

  const generateReply = async () => {
    if (!activeFan || !fanInput.trim()) return;

    const newHistory = [...activeFan.history, { role: 'fan' as const, text: fanInput.trim(), time: Date.now() }];
    updateFan(activeFan.id, { history: newHistory });
    setFanInput('');

    setIsThinking(true);
    setVariants([]);

    try {
      const res = await fetch('/api/chatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, fan: { ...activeFan, history: newHistory }, fanMessage: fanInput.trim() }),
      });
      const data = await res.json();
      if (data.replies) setVariants(data.replies);
      else setVariants(['❌ ' + (data.error || 'Ошибка')]);
    } catch (e: any) {
      setVariants(['❌ Ошибка сервера']);
    } finally {
      setIsThinking(false);
    }
  };

  const useVariant = async (text: string, copy: boolean) => {
    if (!activeFan) return;
    if (copy) { try { await navigator.clipboard.writeText(text); } catch (e) {} }
    updateFan(activeFan.id, { history: [...activeFan.history, { role: 'model', text, time: Date.now() }] });
    setVariants([]);
  };

  // ---------- ПЛАН: логика ----------
  const q = QUESTIONS[step];
  const qValue = q ? answers[q.key] ?? '' : '';
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100);
  const canNext = !q?.req || qValue.trim().length > 0;
  const isLast = step === QUESTIONS.length - 1;
  const setQValue = (v: string) => setAnswers((prev) => ({ ...prev, [q.key]: v }));

  const nextQ = () => {
    if (!canNext) return;
    if (isLast) { generatePlan(); return; }
    setStep((s) => s + 1);
  };

  const generatePlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
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
      if (!data.posts?.length) throw new Error('Модель не вернула постов');
      setPosts(data.posts);
    } catch (e: any) {
      setPlanError(e.message || 'Что-то пошло не так');
    } finally {
      setPlanLoading(false);
    }
  };

  const resetPlan = () => { setPosts(null); setStep(0); setAnswers({}); setPlanError(null); };

  const copyText = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500); }
    catch { alert('Не удалось скопировать'); }
  };

  const postToText = (p: Post) =>
    `${p.day} · ${p.format}\n\n${p.title}\n\n${p.text}\n\n${p.hashtags}\n\nПромпт для Студии: ${p.imagePrompt}`;

  // ---------- ДИАЛОГ: логика ----------
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: Msg = { role: 'fan', text: chatInput.trim(), time: Date.now() };
    const newLog = [...chatLog, userMsg];
    setChatLog(newLog);
    setChatInput('');
    setChatThinking(true);
    setChatVariants([]);

    try {
      const res = await fetch('/api/chatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          fan: { id: 'dialog', name: 'Собеседник', handle: '', notes: 'свободный диалог, без продаж', stage: 1, history: newLog },
          fanMessage: userMsg.text,
        }),
      });
      const data = await res.json();
      if (data.replies) setChatVariants(data.replies);
      else setChatVariants(['❌ ' + (data.error || 'Ошибка')]);
    } catch (e) {
      setChatVariants(['❌ Ошибка сервера']);
    } finally {
      setChatThinking(false);
    }
  };

  const card: React.CSSProperties = { background: '#111', borderRadius: '16px', padding: '15px', border: '1px solid #222' };
  const label: React.CSSProperties = { fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '6px', display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff', padding: '12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 90px)' }}>
      <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', textTransform: 'uppercase' }}>Viral Brain 🧠</h2>

      {/* ПЕРЕКЛЮЧАТЕЛИ РЕЖИМОВ */}
      <div style={{ display: 'flex', backgroundColor: '#111', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
        {[ { id: 'chatter', label: '💬 Чаттер' }, { id: 'content', label: '📈 План' }, { id: 'chat', label: '🤖 Диалог' } ].map((m) => (
          <button key={m.id} onClick={() => setBrainMode(m.id)} style={{ flex: 1, padding: '8px 5px', borderRadius: '8px', border: 'none', backgroundColor: brainMode === m.id ? '#222' : 'transparent', color: brainMode === m.id ? (m.id === 'chat' ? neonGreen : '#fff') : '#666', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* ================= ЧАТТЕР ================= */}
      {brainMode === 'chatter' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <button onClick={() => { setShowPersona(!showPersona); setActiveFanId(null); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: showPersona ? `1px solid ${neonGreen}` : '1px solid #333', backgroundColor: showPersona ? '#1a1a1a' : '#111', color: showPersona ? neonGreen : '#aaa', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
              ⚙️ Персона: {persona.name}
            </button>
            {activeFan && !showPersona && (
              <button onClick={() => { setActiveFanId(null); setVariants([]); }} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                ← Все фанаты
              </button>
            )}
          </div>

          {showPersona && (
            <div style={{ ...card, border: `1px solid ${neonGreen}40` }}>
              <label style={label}>Имя</label>
              <input value={persona.name} onChange={(e) => setPersona({ ...persona, name: e.target.value })} style={{ ...inputStyle, marginBottom: '12px' }} />

              <label style={label}>Язык ответов</label>
              <select value={persona.languageMode} onChange={(e) => setPersona({ ...persona, languageMode: e.target.value })} style={{ ...inputStyle, marginBottom: '12px', WebkitAppearance: 'none' }}>
                <option value="ru">Только Русский</option>
                <option value="en">Только Английский (разговорный)</option>
                <option value="ru_en">Русский + Английский в скобках [ ]</option>
              </select>

              <label style={label}>Факты из жизни</label>
              <textarea value={persona.lifeFacts} onChange={(e) => setPersona({ ...persona, lifeFacts: e.target.value })} style={{ ...inputStyle, height: '60px', marginBottom: '12px', resize: 'none' }} />

              <label style={label}>Примеры твоего общения (ВАЖНО!)</label>
              <p style={{ fontSize: '11px', color: '#666', margin: '0 0 8px 0' }}>Напиши тут 2-3 примера, как ты обычно отвечаешь. ИИ скопирует твой стиль, регистр и сленг.</p>
              <textarea value={persona.examples} onChange={(e) => setPersona({ ...persona, examples: e.target.value })} style={{ ...inputStyle, height: '100px', marginBottom: '15px', resize: 'none' }} />

              <button onClick={() => setShowPersona(false)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: neonGreen, color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                Сохранить персону
              </button>
            </div>
          )}

          {!showPersona && !activeFan && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input value={newFanName} onChange={(e) => setNewFanName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFan()} placeholder="Имя фаната..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={createFan} style={{ padding: '0 18px', borderRadius: '10px', border: `1px solid ${neonGreen}`, backgroundColor: '#1a1a1a', color: neonGreen, fontWeight: 'bold', cursor: 'pointer' }}>+ Создать</button>
              </div>
              {fans.map((fan) => {
                const last = fan.history[fan.history.length - 1];
                return (
                  <div key={fan.id} style={{ ...card, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div onClick={() => setActiveFanId(fan.id)} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{fan.name}</span>
                        <span style={{ fontSize: '10px', color: neonGreen, border: `1px solid ${neonGreen}50`, borderRadius: '20px', padding: '2px 8px' }}>Этап {fan.stage}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last ? (last.role === 'fan' ? 'Ф: ' + last.text : 'Я: ' + last.text) : 'нет сообщений'}</p>
                    </div>
                    <button onClick={() => deleteFan(fan.id)} style={{ background: 'none', border: 'none', color: '#444', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {!showPersona && activeFan && (
            <div>
              <div style={{ ...card, marginBottom: '12px' }}>
                <input value={activeFan.name} onChange={(e) => updateFan(activeFan.id, { name: e.target.value })} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '17px', fontWeight: 'bold', width: '100%', outline: 'none', padding: 0, marginBottom: '12px' }} />
                <div style={{ display: 'flex', gap: '5px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => updateFan(activeFan.id, { stage: s })} style={{ flex: 1, padding: '8px 2px', borderRadius: '8px', border: activeFan.stage === s ? `1px solid ${neonGreen}` : '1px solid #2a2a2a', backgroundColor: activeFan.stage === s ? '#1e2410' : '#0d0d0d', color: activeFan.stage === s ? neonGreen : '#666', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{s}<br/><span style={{ fontSize: '8px' }}>{STAGES[s]}</span></button>
                  ))}
                </div>
                <button onClick={() => setShowFanNotes(!showFanNotes)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '11px', marginTop: '12px', cursor: 'pointer', padding: 0 }}>{showFanNotes ? '− Скрыть заметки' : '+ Что я о нём знаю'}</button>
                {showFanNotes && <textarea value={activeFan.notes} onChange={(e) => updateFan(activeFan.id, { notes: e.target.value })} placeholder="Заметки о фанате (работа, хобби, сколько платит)..." style={{ ...inputStyle, height: '80px', marginTop: '10px', resize: 'none' }} />}
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeFan.history.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'fan' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: '16px', backgroundColor: msg.role === 'fan' ? '#1a1a1a' : '#1e2410', border: msg.role === 'fan' ? '1px solid #222' : `1px solid ${neonGreen}40`, color: msg.role === 'fan' ? '#ccc' : '#fff', fontSize: '14px', lineHeight: '1.4' }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isThinking && <div style={{ alignSelf: 'flex-end', color: neonGreen, fontSize: '12px', padding: '5px 15px' }}>печатает...</div>}
              </div>

              {variants.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Варианты ответа</p>
                  {variants.map((v, i) => (
                    <div key={i} style={{ ...card, border: `1px solid ${neonGreen}40`, marginBottom: '8px' }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.5' }}>{v}</p>
                      <button onClick={() => useVariant(v, true)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: neonGreen, color: '#000', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Копировать и сохранить в историю</button>
                    </div>
                  ))}
                </div>
              )}

              <textarea value={fanInput} onChange={(e) => setFanInput(e.target.value)} placeholder="Вставь сообщение (своё или фаната)..." style={{ ...inputStyle, height: '70px', marginBottom: '10px', resize: 'none' }} />

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button onClick={() => pushToHistory('fan', fanInput)} disabled={!fanInput.trim()} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#aaa', fontSize: '12px', cursor: 'pointer' }}>+ Добавить Фаната</button>
                <button onClick={() => pushToHistory('model', fanInput)} disabled={!fanInput.trim()} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1e2410', color: neonGreen, fontSize: '12px', cursor: 'pointer' }}>+ Добавить Себя</button>
              </div>

              <button onClick={generateReply} disabled={isThinking || !fanInput.trim()} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: isThinking || !fanInput.trim() ? '#333' : neonGreen, color: isThinking || !fanInput.trim() ? '#666' : '#000', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isThinking ? 'Генерация...' : 'Сгенерировать ответ ИИ'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= ПЛАН ================= */}
      {brainMode === 'content' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {posts ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>{posts.length} постов</span>
                <button onClick={resetPlan} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#111', color: '#aaa', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Заново</button>
              </div>

              {posts.map((p, i) => (
                <div key={i} style={{ ...card, marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', backgroundColor: neonGreen, color: '#000', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>{p.day}</span>
                    <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>{p.format}</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>{p.title}</div>
                  <div style={{ fontSize: '13px', color: '#bbb', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{p.text}</div>
                  <div style={{ fontSize: '12px', color: '#7ea6ff', marginBottom: '10px' }}>{p.hashtags}</div>
                  <div style={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Промпт для Студии</div>
                    <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>{p.imagePrompt}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => copyText(postToText(p), String(i))} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#aaa', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {copied === String(i) ? '✓ Скопировано' : 'Копировать пост'}
                    </button>
                    <button
                      onClick={() => {
                        if (onSendToStudio) { onSendToStudio(p.imagePrompt); alert('Промпт отправлен в Студию'); }
                        else { copyText(p.imagePrompt, 'p' + i); }
                      }}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#1e2410', color: neonGreen, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {copied === 'p' + i ? '✓ Промпт скопирован' : '→ Промпт в Студию'}
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={() => copyText(posts.map(postToText).join('\n\n———\n\n'), 'all')} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: neonGreen, color: '#000', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
                {copied === 'all' ? '✓ Всё скопировано' : 'Скопировать весь план'}
              </button>
            </div>
          ) : planLoading ? (
            <div style={{ ...card, textAlign: 'center', padding: '50px 15px' }}>
              <div style={{ width: '34px', height: '34px', border: '3px solid #222', borderTopColor: neonGreen, borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Пишем контент-план...</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Сборка персонажа</span>
                <span style={{ fontSize: '12px', color: '#666' }}>{step + 1} / {QUESTIONS.length}</span>
              </div>
              <div style={{ height: '4px', backgroundColor: '#1a1a1a', borderRadius: '2px', overflow: 'hidden', marginBottom: '18px' }}>
                <div style={{ height: '100%', width: `${progress}%`, backgroundColor: neonGreen, transition: 'width 0.3s' }}></div>
              </div>

              <div style={{ ...card, marginBottom: '15px' }}>
                <div style={{ fontSize: '10px', color: `${neonGreen}aa`, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 'bold' }}>{q.section}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>{q.q}</div>
                <textarea
                  value={qValue}
                  onChange={(e) => setQValue(e.target.value)}
                  placeholder={q.ph}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              {planError && <div style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>{planError}</div>}

              <div style={{ display: 'flex', gap: '8px' }}>
                {step > 0 && (
                  <button onClick={() => setStep((s) => s - 1)} style={{ padding: '14px 20px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#111', color: '#888', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Назад</button>
                )}
                <button onClick={nextQ} disabled={!canNext} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: canNext ? neonGreen : '#1a1a1a', color: canNext ? '#000' : '#555', fontSize: '14px', fontWeight: 'bold', cursor: canNext ? 'pointer' : 'default' }}>
                  {isLast ? 'Собрать план' : 'Далее'}
                </button>
              </div>

              {!q.req && (
                <button onClick={() => { setQValue(''); nextQ(); }} style={{ width: '100%', background: 'none', border: 'none', color: '#444', fontSize: '11px', padding: '12px', cursor: 'pointer' }}>
                  Пропустить вопрос
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= ДИАЛОГ ================= */}
      {brainMode === 'chat' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ maxHeight: '420px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chatLog.length === 0 && (
              <div style={{ ...card, textAlign: 'center', padding: '40px 15px' }}>
                <span style={{ fontSize: '30px' }}>🤖</span>
                <p style={{ fontSize: '12px', color: '#666', margin: '10px 0 0 0' }}>Свободный диалог с {persona.name}.<br/>Персона берётся из Чаттера.</p>
              </div>
            )}
            {chatLog.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'fan' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: '16px', backgroundColor: msg.role === 'fan' ? '#1a1a1a' : '#1e2410', border: msg.role === 'fan' ? '1px solid #222' : `1px solid ${neonGreen}40`, color: '#fff', fontSize: '14px', lineHeight: '1.4' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatThinking && <div style={{ color: neonGreen, fontSize: '12px', padding: '5px 10px' }}>печатает...</div>}
          </div>

          {chatVariants.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Выбери ответ</p>
              {chatVariants.map((v, i) => (
                <div key={i} onClick={() => { setChatLog([...chatLog, { role: 'model', text: v, time: Date.now() }]); setChatVariants([]); }} style={{ ...card, border: `1px solid ${neonGreen}40`, marginBottom: '8px', cursor: 'pointer' }}>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{v}</p>
                </div>
              ))}
            </div>
          )}

          <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Напиши что-нибудь..." style={{ ...inputStyle, height: '70px', marginBottom: '10px', resize: 'none' }} />
          <button onClick={sendChat} disabled={chatThinking || !chatInput.trim()} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: chatThinking || !chatInput.trim() ? '#333' : neonGreen, color: chatThinking || !chatInput.trim() ? '#666' : '#000', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            {chatThinking ? 'Думает...' : 'Отправить'}
          </button>
          {chatLog.length > 0 && (
            <button onClick={() => { setChatLog([]); setChatVariants([]); }} style={{ width: '100%', background: 'none', border: 'none', color: '#444', fontSize: '11px', padding: '12px', cursor: 'pointer' }}>
              Очистить диалог
            </button>
          )}
        </div>
      )}
    </div>
  );
}
