'use client';
// Главный экран: выбор направления и список проектов. Внутри проекта — вкладки.
import { useEffect, useState } from 'react';
import { DEMO_PERSONA, EMPTY_PERSONA, KIND_TEXT, KINDS, newId, type Fan, type Kind, type Persona } from './lib/persona';
import { LEGACY_KEYS, PROJECTS_KEY, projectKeys, readStored, removeStored, useStored, writeStored } from './lib/storage';
import Onboarding from './components/Onboarding';
import PersonaEditor from './components/PersonaEditor';
import Assistant from './components/Assistant';
import ContentPlan from './components/ContentPlan';
import Chatter from './components/Chatter';
import { Spinner, card, neon } from './components/ui';

type Tab = 'chat' | 'plan' | 'chatter';
type View = { screen: 'home' } | { screen: 'new'; kind: Kind } | { screen: 'project'; id: string; editing?: boolean };

/** Переносим данные из прошлых версий приложения, чтобы ничего не потерялось */
function migrateOldData() {
  // 1) самая первая версия (synx_*) → прошлая версия (vb_*)
  const oldFans = readStored<Fan[] | null>('synx_fans', null);
  if (oldFans?.length && !readStored<Fan[] | null>(LEGACY_KEYS.fans, null)) {
    writeStored(LEGACY_KEYS.fans, oldFans.map((f) => ({ id: f.id, name: f.name, notes: f.notes || '', stage: f.stage || 1, history: f.history || [] })));
  }
  const old = readStored<Record<string, string> | null>('synx_persona', null);
  const edited = old && (old.name !== 'Мия' || !String(old.examples || '').startsWith('Вопрос: Как дела?'));
  if (old && edited && !readStored<Persona | null>(LEGACY_KEYS.persona, null)) {
    writeStored(LEGACY_KEYS.persona, {
      ...EMPTY_PERSONA,
      name: old.name || 'Без имени',
      age: old.age || '',
      character: old.character || '',
      lifeFacts: old.lifeFacts || '',
      examples: old.examples || '',
      languageMode: old.languageMode === 'ru_en' ? 'en_ru' : old.languageMode === 'en' ? 'en' : 'ru',
    });
  }
  removeStored('synx_fans');
  removeStored('synx_persona');

  // 2) прошлая версия (один персонаж на всё приложение) → проект «ИИ-модель»
  const legacyPersona = readStored<Persona | null>(LEGACY_KEYS.persona, null);
  const legacyFans = readStored<Fan[]>(LEGACY_KEYS.fans, []);
  if (legacyPersona || legacyFans.length) {
    const id = newId();
    const project: Persona = { ...EMPTY_PERSONA, ...(legacyPersona || DEMO_PERSONA), id, kind: 'model' };
    const keys = projectKeys(id);
    (['plan', 'fans', 'liked', 'assistant'] as const).forEach((k) => {
      const raw = readStored<unknown>(LEGACY_KEYS[k], null);
      if (raw !== null) writeStored(keys[k], raw);
    });
    writeStored(PROJECTS_KEY, [...readStored<Persona[]>(PROJECTS_KEY, []), project]);
  }
  Object.values(LEGACY_KEYS).forEach(removeStored);
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
  const [projects, setProjects, ready] = useStored<Persona[]>(PROJECTS_KEY, []);
  const [view, setView] = useState<View>({ screen: 'home' });

  if (!ready) return <Spinner />;

  if (view.screen === 'new') {
    return (
      <Onboarding
        kind={view.kind}
        onCancel={() => setView({ screen: 'home' })}
        onFinish={(p) => {
          setProjects((list) => [...list, p]);
          setView({ screen: 'project', id: p.id });
        }}
      />
    );
  }

  if (view.screen === 'project') {
    const found = projects.find((x) => x.id === view.id);
    if (found) {
      const p: Persona = { ...EMPTY_PERSONA, ...found }; // старые сохранения могли быть без новых полей
      const save = (next: Persona) => setProjects((list) => list.map((x) => (x.id === next.id ? next : x)));

      if (view.editing) {
        return (
          <PersonaEditor
            persona={p}
            onClose={() => setView({ screen: 'project', id: p.id })}
            onSave={(next) => { save(next); setView({ screen: 'project', id: p.id }); }}
            onDelete={() => {
              Object.values(projectKeys(p.id)).forEach(removeStored);
              setProjects((list) => list.filter((x) => x.id !== p.id));
              setView({ screen: 'home' });
            }}
          />
        );
      }
      return (
        <Project
          key={p.id}
          persona={p}
          onHome={() => setView({ screen: 'home' })}
          onEdit={() => setView({ screen: 'project', id: p.id, editing: true })}
          onAppearance={(appearance) => setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, appearance } : x)))}
        />
      );
    }
  }

  // ---------- главный экран ----------
  const kindCard = (k: Kind, big: boolean) => (
    <button key={k} onClick={() => setView({ screen: 'new', kind: k })} style={{ ...card, flex: 1, textAlign: 'left', cursor: 'pointer', padding: big ? '22px 18px' : 14, border: `1px solid ${big ? neon + '40' : '#222'}`, color: '#fff' }}>
      <div style={{ fontSize: big ? 34 : 22, marginBottom: big ? 10 : 6 }}>{KINDS[k].emoji}</div>
      <div style={{ fontSize: big ? 17 : 14, fontWeight: 800, marginBottom: 4 }}>{big ? KINDS[k].title : `+ ${KINDS[k].title.replace('Продюсирую ', '')}`}</div>
      <div style={{ fontSize: 12, color: '#777', lineHeight: 1.35 }}>{KINDS[k].sub}</div>
    </button>
  );

  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 900, margin: '10px 2px 4px', letterSpacing: -0.5 }}>Viral Brain 🧠</h2>

      {projects.length === 0 ? (
        <>
          <p style={{ fontSize: 15, color: '#888', margin: '0 2px 22px' }}>Что будем продюсировать?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {kindCard('self', true)}
            {kindCard('model', true)}
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 15, color: '#888', margin: '0 2px 18px' }}>Мои проекты</p>
          {projects.map((x) => (
            <button key={x.id} onClick={() => setView({ screen: 'project', id: x.id })} style={{ ...card, width: '100%', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, cursor: 'pointer', color: '#fff', textAlign: 'left' }}>
              <span style={{ fontSize: 28 }}>{KINDS[x.kind || 'model'].emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</span>
                <span style={{ display: 'block', fontSize: 12, color: '#777', marginTop: 2 }}>
                  {x.kind === 'self' ? 'Мой блог' : 'ИИ-модель'}{x.platforms?.length ? ` · ${x.platforms.join(', ')}` : ''}
                </span>
              </span>
              <span style={{ color: '#555', fontSize: 20 }}>›</span>
            </button>
          ))}
          <p style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, margin: '22px 2px 10px' }}>Новый проект</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {kindCard('self', false)}
            {kindCard('model', false)}
          </div>
        </>
      )}
    </div>
  );
}

function Project({ persona, onHome, onEdit, onAppearance }: { persona: Persona; onHome: () => void; onEdit: () => void; onAppearance: (a: string) => void }) {
  const [tab, setTab] = useState<Tab>('plan');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'chat', label: '🤖 Диалог' },
    { id: 'plan', label: '📈 План' },
    { id: 'chatter', label: KIND_TEXT[persona.kind].chatterTab },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 16px', gap: 8 }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 14, cursor: 'pointer', padding: '8px 0' }}>‹ Проекты</button>
        <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 20, border: `1px solid ${neon}50`, backgroundColor: '#111', color: neon, fontSize: 13, fontWeight: 700, cursor: 'pointer', maxWidth: 200 }}>
          <span>{KINDS[persona.kind].emoji}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{persona.name}</span> ⚙️
        </button>
      </div>

      <div style={{ display: 'flex', backgroundColor: '#111', borderRadius: 12, padding: 4, marginBottom: 18 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: 'none', backgroundColor: tab === t.id ? '#222' : 'transparent', color: tab === t.id ? '#fff' : '#666', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'chat' && <Assistant persona={persona} />}
      {tab === 'plan' && <ContentPlan persona={persona} onAppearance={onAppearance} />}
      {tab === 'chatter' && <Chatter persona={persona} />}
    </>
  );
}
