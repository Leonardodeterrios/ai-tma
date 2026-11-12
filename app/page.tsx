'use client';
// Главный экран: выбор направления и список проектов. Внутри проекта — вкладки.
import { useEffect, useState, type ReactNode } from 'react';
import { DEMO_PERSONA, EMPTY_PERSONA, newId, type Fan, type Kind, type Persona } from './lib/persona';
import { LEGACY_KEYS, PROJECTS_KEY, projectKeys, readStored, removeStored, useStored, writeStored } from './lib/storage';
import Onboarding from './components/Onboarding';
import PersonaEditor from './components/PersonaEditor';
import Assistant from './components/Assistant';
import ContentPlan from './components/ContentPlan';
import Chatter from './components/Chatter';
import Growth from './components/Growth';
import { Spinner, display, neon } from './components/ui';

type Tab = 'chat' | 'plan' | 'chatter' | 'growth';
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
    // шапка и фон Telegram в цвет приложения
    const w = tg as unknown as { setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void } | undefined;
    try { w?.setHeaderColor?.('#060607'); w?.setBackgroundColor?.('#060607'); } catch {}
  }, []);

  return (
    <main style={{ minHeight: '100dvh', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 120px' }}>{migrated ? <App /> : <Spinner />}</div>
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
          onPatch={(patch) => setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, ...patch } : x)))}
        />
      );
    }
  }

  // ---------- главный экран ----------
  return (
    <div style={{ paddingTop: 18 }}>
      <Brand />

      <h1 style={{ ...display, fontSize: projects.length ? 24 : 32, fontWeight: 800, lineHeight: 1.1, margin: '28px 0 8px' }}>
        {projects.length ? 'Мои проекты' : 'Что будем продюсировать?'}
      </h1>
      {!projects.length && (
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 22px', maxWidth: 340 }}>
          Выбери направление. Дальше ИИ будет вести контент-план, ответы и рост под него.
        </p>
      )}

      {projects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0 30px' }}>
          {projects.map((x) => (
            <button key={x.id} className="vb-tile" onClick={() => setView({ screen: 'project', id: x.id })} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)', textAlign: 'left' }}>
              <PosterThumb kind={x.kind || 'model'} name={x.name} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {x.kind === 'self' ? 'Мой блог' : 'ИИ-модель'}{x.platforms?.length ? ` · ${x.platforms.join(', ')}` : ''}
                </span>
              </span>
              <span style={{ color: 'var(--faint)', fontSize: 22, paddingRight: 4 }}>›</span>
            </button>
          ))}
        </div>
      )}

      {projects.length > 0 && <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)', margin: '0 0 12px' }}>Новый проект</h2>}
      <div style={{ display: 'grid', gridTemplateColumns: projects.length ? '1fr 1fr' : '1fr', gap: 12 }}>
        <Poster kind="self" compact={projects.length > 0} onClick={() => setView({ screen: 'new', kind: 'self' })} />
        <Poster kind="model" compact={projects.length > 0} onClick={() => setView({ screen: 'new', kind: 'model' })} />
      </div>
    </div>
  );
}

/** Логотип: лаймовый знак и название */
function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: neon, color: 'var(--lime-ink)', display: 'grid', placeItems: 'center', ...display, fontWeight: 800, fontSize: 13 }}>vb</span>
      <span style={{ ...display, fontWeight: 700, fontSize: 16 }}>Viral Brain</span>
    </div>
  );
}

// «Кадры» для постеров: у каждого направления своя световая сцена
const POSTER_ART: Record<Kind, string> = {
  self: [
    'radial-gradient(70% 90% at 85% 15%, rgba(216,255,79,0.95), rgba(216,255,79,0) 60%)',
    'radial-gradient(60% 70% at 10% 100%, rgba(46,196,182,0.75), rgba(46,196,182,0) 65%)',
    'linear-gradient(160deg, #1d2410 0%, #0b1214 100%)',
  ].join(','),
  model: [
    'radial-gradient(70% 90% at 80% 10%, rgba(255,92,170,0.9), rgba(255,92,170,0) 60%)',
    'radial-gradient(70% 80% at 0% 100%, rgba(122,92,255,0.85), rgba(122,92,255,0) 65%)',
    'linear-gradient(160deg, #1c0f1f 0%, #0d0a18 100%)',
  ].join(','),
};
const POSTER_TEXT: Record<Kind, { title: string; sub: string; tag: string }> = {
  self: { title: 'Продюсирую себя', sub: 'Блог, канал, личный бренд', tag: 'Threads · Instagram · Telegram' },
  model: { title: 'Продюсирую ИИ-модель', sub: 'Персонаж с характером и голосом', tag: 'Telegram · Fanvue · OnlyFans' },
};

/** Большая карточка-постер на главном экране */
function Poster({ kind, compact, onClick }: { kind: Kind; compact?: boolean; onClick: () => void }) {
  const t = POSTER_TEXT[kind];
  return (
    <button
      className="vb-tile vb-grain"
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden', height: compact ? 150 : 210, borderRadius: 24, border: '1px solid var(--line)', background: POSTER_ART[kind], cursor: 'pointer', color: '#fff', textAlign: 'left', padding: compact ? 14 : 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <span style={{ position: 'relative', zIndex: 1, alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '4px 10px', backdropFilter: 'blur(8px)' }}>
        {compact ? '+ Создать' : t.tag}
      </span>
      <span style={{ position: 'relative', zIndex: 1 }}>
        <span style={{ display: 'block', ...display, fontWeight: 800, fontSize: compact ? 15 : 24, lineHeight: 1.1, textShadow: '0 2px 18px rgba(0,0,0,0.45)' }}>{t.title}</span>
        {!compact && <span style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>{t.sub}</span>}
      </span>
    </button>
  );
}

/** Маленькая обложка проекта в списке */
function PosterThumb({ kind, name }: { kind: Kind; name: string }) {
  return (
    <span className="vb-grain" style={{ position: 'relative', overflow: 'hidden', width: 52, height: 52, borderRadius: 16, background: POSTER_ART[kind], display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <span style={{ position: 'relative', zIndex: 1, ...display, fontWeight: 800, fontSize: 18, color: '#fff', textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>{(name || '?').trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}

// иконки нижней панели (тонкие линии, в цвет текста)
const ICONS: Record<Tab, ReactNode> = {
  chat: <path d="M4 5h16v11H8l-4 4V5z" />,
  plan: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  chatter: <><path d="M3 6h12v9H7l-4 3V6z" /><path d="M9 18h8l4 3v-9h-3" /></>,
  growth: <path d="M4 19l5.5-6 4 3.5L20 8M15 8h5v5" />,
};

function Project({ persona, onHome, onEdit, onPatch }: { persona: Persona; onHome: () => void; onEdit: () => void; onPatch: (patch: Partial<Persona>) => void }) {
  const [tab, setTab] = useState<Tab>('plan');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'chat', label: 'Диалог' },
    { id: 'plan', label: 'План' },
    { id: 'chatter', label: persona.kind === 'self' ? 'Ответы' : 'Чаттер' },
    { id: 'growth', label: 'Рост' },
  ];

  return (
    <>
      {/* стеклянная шапка */}
      <div className="vb-glass" style={{ position: 'sticky', top: 0, zIndex: 20, margin: '0 -16px 18px', padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onHome} aria-label="К проектам" className="vb-btn" style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>‹</button>
        <button onClick={onEdit} className="vb-btn" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
          <PosterThumbSmall kind={persona.kind} name={persona.name} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{persona.name}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{persona.kind === 'self' ? 'Мой блог' : 'ИИ-модель'} · настройки</span>
          </span>
        </button>
      </div>

      {tab === 'chat' && <Assistant persona={persona} />}
      {tab === 'plan' && <ContentPlan persona={persona} onAppearance={(appearance) => onPatch({ appearance })} />}
      {tab === 'chatter' && <Chatter persona={persona} />}
      {tab === 'growth' && <Growth persona={persona} onPatch={onPatch} />}

      {/* плавающая стеклянная панель вкладок */}
      <nav className="vb-glass" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(14px + env(safe-area-inset-bottom))', zIndex: 30, width: 'min(448px, calc(100% - 24px))', display: 'flex', gap: 4, padding: 6, borderRadius: 26, border: '1px solid var(--line-strong)', boxShadow: '0 18px 40px -12px rgba(0,0,0,0.8)' }}>
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              className="vb-btn"
              onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }}
              aria-current={on ? 'page' : undefined}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 2px 7px', borderRadius: 20, border: 'none', cursor: 'pointer', backgroundColor: on ? neon : 'transparent', color: on ? 'var(--lime-ink)' : 'var(--muted)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[t.id]}</svg>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function PosterThumbSmall({ kind, name }: { kind: Kind; name: string }) {
  return (
    <span className="vb-grain" style={{ position: 'relative', overflow: 'hidden', width: 38, height: 38, borderRadius: 12, background: POSTER_ART[kind], display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <span style={{ position: 'relative', zIndex: 1, ...display, fontWeight: 800, fontSize: 14, color: '#fff' }}>{(name || '?').trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}
