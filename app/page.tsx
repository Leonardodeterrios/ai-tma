'use client';
// Главный экран: шапка, вкладки и общий персонаж для всех вкладок.
import { useEffect, useState } from 'react';
import { EMPTY_PERSONA, type Fan, type Persona } from './lib/persona';
import { KEYS, readStored, removeStored, useStored, writeStored } from './lib/storage';
import Onboarding from './components/Onboarding';
import PersonaEditor from './components/PersonaEditor';
import Assistant from './components/Assistant';
import ContentPlan from './components/ContentPlan';
import Chatter from './components/Chatter';
import { Spinner, neon } from './components/ui';

type Tab = 'chat' | 'plan' | 'chatter';
const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: '🤖 Диалог' },
  { id: 'plan', label: '📈 План' },
  { id: 'chatter', label: '💬 Чаттер' },
];

/** Переносим данные из старой версии приложения, чтобы ничего не потерялось */
function migrateOldData() {
  const oldFans = readStored<Fan[] | null>('synx_fans', null);
  if (oldFans && !readStored<Fan[] | null>(KEYS.fans, null)) {
    writeStored(KEYS.fans, oldFans.map((f) => ({ id: f.id, name: f.name, notes: f.notes || '', stage: f.stage || 1, history: f.history || [] })));
  }
  const old = readStored<Record<string, string> | null>('synx_persona', null);
  // старая версия всегда сохраняла дефолтную Мию — переносим, только если её меняли
  const edited = old && (old.name !== 'Мия' || !String(old.examples || '').startsWith('Вопрос: Как дела?'));
  if (old && edited && !readStored<Persona | null>(KEYS.persona, null)) {
    writeStored(KEYS.persona, {
      ...EMPTY_PERSONA,
      name: old.name || 'Без имени',
      age: old.age || '',
      character: old.character || '',
      lifeFacts: old.lifeFacts || '',
      examples: old.examples || '',
      languageMode: old.languageMode === 'ru_en' ? 'en_ru' : old.languageMode === 'en' ? 'en' : 'ru',
    } satisfies Persona);
  }
  removeStored('synx_fans');
  removeStored('synx_persona');
}

export default function Home() {
  const [migrated, setMigrated] = useState(false);
  useEffect(() => {
    migrateOldData();
    setMigrated(true);
    // Telegram: развернуть мини-апп на весь экран
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void } } }).Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-[#0A0A0A] text-white font-sans overflow-x-hidden">
      <div className="max-w-md mx-auto w-full p-4 pb-10">{migrated ? <App /> : <Spinner />}</div>
    </main>
  );
}

function App() {
  const [persona, setPersona, ready] = useStored<Persona | null>(KEYS.persona, null);
  const [tab, setTab] = useState<Tab>('plan');
  const [editing, setEditing] = useState(false);

  if (!ready) return <Spinner />;
  if (!persona) return <Onboarding onFinish={(p) => setPersona(p)} />;

  // старые сохранения могли быть без новых полей — дополняем
  const p: Persona = { ...EMPTY_PERSONA, ...persona };

  if (editing) {
    return (
      <PersonaEditor
        persona={p}
        onClose={() => setEditing(false)}
        onSave={(next) => { setPersona(next); setEditing(false); }}
        onResetAll={() => {
          Object.values(KEYS).forEach(removeStored);
          setEditing(false);
          setPersona(null);
        }}
      />
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 2px 16px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>Viral Brain 🧠</h2>
        <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 20, border: `1px solid ${neon}50`, backgroundColor: '#111', color: neon, fontSize: 13, fontWeight: 700, cursor: 'pointer', maxWidth: 150 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span> ⚙️
        </button>
      </div>

      <div style={{ display: 'flex', backgroundColor: '#111', borderRadius: 12, padding: 4, marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: 'none', backgroundColor: tab === t.id ? '#222' : 'transparent', color: tab === t.id ? '#fff' : '#666', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'chat' && <Assistant persona={p} />}
      {tab === 'plan' && <ContentPlan persona={p} onAppearance={(appearance) => setPersona((cur) => (cur ? { ...cur, appearance } : cur))} />}
      {tab === 'chatter' && <Chatter persona={p} />}
    </>
  );
}
