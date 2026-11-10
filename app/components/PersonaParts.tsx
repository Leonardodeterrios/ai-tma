'use client';
// Части персонажа, которые используются и при первом входе, и в редакторе.
import { useRef, useState } from 'react';
import { ARCHETYPES, OFFER_CHIPS, SELF_PLATFORMS, STORY_CHIPS, TEST, TONES, type Arche, type Persona, type StoryMode } from '../lib/persona';
import { compressImage, errorText } from '../lib/client';
import { Btn, Chip, card, hint, label, neon, neonBg, textarea } from './ui';

// ---------- Тест на архетип ----------
export function ArchetypeTest({ onDone, onCancel }: { onDone: (a: Arche) => void; onCancel?: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Arche[]>([]);
  const q = TEST[step];

  const pick = (a: Arche) => {
    const next = [...answers.slice(0, step), a];
    setAnswers(next);
    if (step < TEST.length - 1) return setStep(step + 1);
    const count: Partial<Record<Arche, number>> = {};
    next.forEach((k) => { count[k] = (count[k] || 0) + 1; });
    const winner = (Object.keys(count) as Arche[]).sort((x, y) => (count[y] || 0) - (count[x] || 0))[0] || 'siren';
    onDone(winner);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={label}>Тест на архетип</span>
        <span style={{ fontSize: 12, color: '#666' }}>{step + 1} / {TEST.length}</span>
      </div>
      <div style={{ height: 4, backgroundColor: '#1a1a1a', borderRadius: 2, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: '100%', width: `${((step + 1) / TEST.length) * 100}%`, backgroundColor: neon, transition: 'width .3s' }} />
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{q.q}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((o) => (
          <button key={o.label} onClick={() => pick(o.a)} style={{ textAlign: 'left', padding: 15, borderRadius: 12, border: '1px solid #2a2a2a', backgroundColor: '#0d0d0d', color: '#ddd', fontSize: 14, lineHeight: 1.4, cursor: 'pointer' }}>
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {step > 0 ? <button onClick={() => setStep(step - 1)} style={linkBtn}>← Назад</button> : <span />}
        {onCancel && <button onClick={onCancel} style={linkBtn}>Отмена</button>}
      </div>
    </div>
  );
}

const linkBtn = { background: 'none', border: 'none', color: '#555', fontSize: 12, padding: 12, cursor: 'pointer' } as const;

// ---------- Карточка архетипа ----------
export function ArchetypeCard({ a }: { a: Arche }) {
  const x = ARCHETYPES[a];
  return (
    <div style={{ ...card, border: `1px solid ${neon}40`, textAlign: 'center', padding: '18px 15px' }}>
      <div style={{ fontSize: 32, marginBottom: 4 }}>{x.emoji}</div>
      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Архетип</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: neon, marginBottom: 4 }}>{x.name}</div>
      <div style={{ fontSize: 12, color: '#888' }}>{x.tagline}</div>
    </div>
  );
}

// ---------- История ----------
export function StoryFields({ p, set }: { p: Persona; set: (patch: Partial<Persona>) => void }) {
  const modes: { id: StoryMode; title: string; sub: string }[] = [
    { id: 'have', title: 'У меня уже есть история', sub: 'Расскажу в двух словах' },
    { id: 'create', title: 'Хочу создать с нуля', sub: 'Опишу настроение, ИИ додумает' },
    { id: 'none', title: 'Без истории', sub: 'Просто лайфстайл-контент' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {modes.map((m) => {
          const on = p.storyMode === m.id;
          return (
            <button key={m.id} onClick={() => set({ storyMode: m.id })} style={{ textAlign: 'left', padding: 14, borderRadius: 12, border: on ? `1px solid ${neon}` : '1px solid #2a2a2a', backgroundColor: on ? neonBg : '#0d0d0d', cursor: 'pointer' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: on ? neon : '#ddd' }}>{m.title}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{m.sub}</div>
            </button>
          );
        })}
      </div>
      {p.storyMode !== 'none' && (
        <>
          <textarea
            value={p.story}
            onChange={(e) => set({ story: e.target.value })}
            rows={4}
            placeholder={p.storyMode === 'have' ? 'Кто она, откуда, что у неё сейчас происходит…' : 'Например: переехала в Дубай, снимает квартиру, ищет себя…'}
            style={{ ...textarea, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STORY_CHIPS.map((c) => (
              <button key={c} onClick={() => set({ story: p.story ? `${p.story}, ${c}` : c })} style={{ padding: '6px 10px', borderRadius: 20, border: '1px solid #2a2a2a', backgroundColor: '#000', color: '#888', fontSize: 11, cursor: 'pointer' }}>
                + {c}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Фото-референсы ----------
export function PhotoRefs({ refs, onChange }: { refs: string[]; onChange: (refs: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');

  const add = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - refs.length);
    if (fileRef.current) fileRef.current.value = '';
    if (!files.length) return;
    try {
      setErr('');
      const added = await Promise.all(files.map((f) => compressImage(f)));
      onChange([...refs, ...added].slice(0, 3));
    } catch (e2) {
      setErr(errorText(e2));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div>
          <span style={label}>Фото-референсы (до 3)</span>
          <p style={{ ...hint, margin: 0 }}>ИИ посмотрит на внешность и будет описывать её в промптах для фото</p>
        </div>
        {refs.length < 3 && <Btn kind="soft" small onClick={() => fileRef.current?.click()}>+ Фото</Btn>}
        <input type="file" multiple accept="image/*" ref={fileRef} onChange={add} style={{ display: 'none' }} />
      </div>
      {refs.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {refs.map((r, i) => (
            <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => onChange(refs.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', backgroundColor: 'rgba(0,0,0,.7)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      )}
      {err && <p style={{ color: '#ff6b6b', fontSize: 12, margin: '8px 0 0' }}>{err}</p>}
    </div>
  );
}

// ---------- Выбор нескольких вариантов (площадки) ----------
export function MultiChips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <Chip key={o} active={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
            {on ? '✓ ' : ''}{o}
          </Chip>
        );
      })}
    </div>
  );
}

// ---------- «Продюсирую себя»: ниша, аудитория, продукт ----------
export function SelfBrandFields({ p, set }: { p: Persona; set: (patch: Partial<Persona>) => void }) {
  return (
    <div>
      <span style={label}>О чём твой блог</span>
      <textarea value={p.niche} onChange={(e) => set({ niche: e.target.value })} rows={2} placeholder="например: учу создавать ИИ-моделей и зарабатывать на них" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Кто тебя читает и что у них болит</span>
      <textarea value={p.audience} onChange={(e) => set({ audience: e.target.value })} rows={3} placeholder="например: девушки 20–35, уже пробовали нейросети, не получается живая кожа и одно лицо в разных ракурсах" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Что ты продаёшь</span>
      <p style={hint}>Можно выбрать и дописать. План будет вести к этому.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {OFFER_CHIPS.map((c) => (
          <button key={c} onClick={() => set({ offer: c === 'пока ничего не продаю' ? '' : p.offer ? `${p.offer}, ${c}` : c })} style={{ padding: '6px 10px', borderRadius: 20, border: '1px solid #2a2a2a', backgroundColor: '#000', color: '#888', fontSize: 11, cursor: 'pointer' }}>
            + {c}
          </button>
        ))}
      </div>
      <textarea value={p.offer} onChange={(e) => set({ offer: e.target.value })} rows={2} placeholder="например: курс AI Creators на ai-creators.ru" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Где ведёшь</span>
      <MultiChips options={SELF_PLATFORMS} value={p.platforms} onChange={(platforms) => set({ platforms })} />
    </div>
  );
}

// ---------- «Продюсирую себя»: голос ----------
export function SelfVoiceFields({ p, set }: { p: Persona; set: (patch: Partial<Persona>) => void }) {
  return (
    <div>
      <span style={label}>Тон</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {TONES.map((t) => <Chip key={t} active={p.tone === t} onClick={() => set({ tone: p.tone === t ? '' : t })}>{t}</Chip>)}
      </div>

      <span style={label}>Как ты пишешь (самое важное)</span>
      <p style={hint}>Вставь 1–3 своих поста, которые зашли. ИИ скопирует твою манеру.</p>
      <textarea value={p.examples} onChange={(e) => set({ examples: e.target.value })} rows={6} placeholder="Вставь сюда свои посты…" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Немного о себе</span>
      <textarea value={p.character} onChange={(e) => set({ character: e.target.value })} rows={2} placeholder="например: мама двоих детей, переехали в Таиланд, раньше работала дизайнером" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Факты из жизни для живых постов</span>
      <textarea value={p.lifeFacts} onChange={(e) => set({ lifeFacts: e.target.value })} rows={2} placeholder="город, дом, дети, питомцы, хобби, привычки" style={textarea} />
    </div>
  );
}
