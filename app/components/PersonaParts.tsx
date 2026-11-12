'use client';
// Части персонажа, которые используются и при первом входе, и в редакторе.
import { useRef, useState } from 'react';
import { ARCHETYPES, GOAL_CHIPS, LANGUAGE_OPTIONS, MODEL_PLATFORMS, OFFER_CHIPS, SALES_LEVELS, SELF_PLATFORMS, STORY_CHIPS, TEST, TONES, type Arche, type Persona, type StoryMode } from '../lib/persona';
import { compressImage, errorText, postJSON } from '../lib/client';
import { Btn, Chip, card, hint, input, label, neon, neonBg, textarea } from './ui';

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
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>{step + 1} / {TEST.length}</span>
      </div>
      <div style={{ height: 4, backgroundColor: 'var(--raised)', borderRadius: 2, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: '100%', width: `${((step + 1) / TEST.length) * 100}%`, backgroundColor: neon, transition: 'width .3s' }} />
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{q.q}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((o) => (
          <button key={o.label} onClick={() => pick(o.a)} style={{ textAlign: 'left', padding: 15, borderRadius: 12, border: '1px solid var(--line)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: 14, lineHeight: 1.4, cursor: 'pointer' }}>
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

const linkBtn = { background: 'none', border: 'none', color: 'var(--faint)', fontSize: 12, padding: 12, cursor: 'pointer' } as const;

// ---------- Карточка архетипа ----------
export function ArchetypeCard({ a }: { a: Arche }) {
  const x = ARCHETYPES[a];
  return (
    <div style={{ ...card, border: `1px solid ${neon}40`, textAlign: 'center', padding: '18px 15px' }}>
      <div style={{ fontSize: 32, marginBottom: 4 }}>{x.emoji}</div>
      <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 2 }}>Архетип</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: neon, marginBottom: 4 }}>{x.name}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{x.tagline}</div>
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
            <button key={m.id} onClick={() => set({ storyMode: m.id })} style={{ textAlign: 'left', padding: 14, borderRadius: 12, border: on ? `1px solid ${neon}` : '1px solid var(--line)', backgroundColor: on ? neonBg : '#0d0d0d', cursor: 'pointer' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: on ? neon : '#ddd' }}>{m.title}</div>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{m.sub}</div>
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
              <button key={c} onClick={() => set({ story: p.story ? `${p.story}, ${c}` : c })} style={{ padding: '6px 10px', borderRadius: 20, border: '1px solid var(--line)', backgroundColor: 'rgba(0,0,0,0.35)', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>
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
            <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => onChange(refs.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', backgroundColor: 'rgba(0,0,0,.7)', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>✕</button>
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

// ---------- «Продюсирую себя» ----------
type SetP = (patch: Partial<Persona>) => void;
type Scan = { niche: string; audience: string; offer: string; proof: string; about: string };

const smallChip = { padding: '6px 10px', borderRadius: 20, border: '1px solid var(--line)', backgroundColor: 'rgba(0,0,0,0.35)', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' } as const;

/** Шаг 1: кто ты, сайт, инстаграм, ниша, аудитория */
export function SelfBrandFields({ p, set }: { p: Persona; set: SetP }) {
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');

  const scan = async () => {
    setScanning(true);
    setScanMsg('');
    try {
      const r = await postJSON<Scan>('/api/brand-scan', { url: p.site });
      // заполняем только пустые поля, чтобы не стереть то, что уже написано
      const patch: Partial<Persona> = {};
      if (!p.niche && r.niche) patch.niche = r.niche;
      if (!p.audience && r.audience) patch.audience = r.audience;
      if (!p.offer && r.offer) patch.offer = r.offer;
      if (r.proof) patch.proof = p.proof ? `${p.proof}\n${r.proof}` : r.proof;
      if (!p.character && r.about) patch.character = r.about;
      set(patch);
      setScanMsg(Object.keys(patch).length ? '✓ Изучила сайт и заполнила, что нашла. Проверь и поправь.' : 'Сайт открыла, но полезного текста почти нет. Заполни руками.');
    } catch (e) {
      setScanMsg(errorText(e));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <span style={label}>Сайт (если есть)</span>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input value={p.site} onChange={(e) => set({ site: e.target.value.trim() })} inputMode="url" placeholder="ai-creators.ru" style={{ ...input, flex: 1 }} />
        <Btn kind="soft" small disabled={!p.site || scanning} onClick={scan}>{scanning ? 'Читаю…' : 'Изучить'}</Btn>
      </div>
      <p style={{ ...hint, color: scanMsg.startsWith('✓') ? neon : scanMsg ? '#ff8b8b' : '#666', marginBottom: 14 }}>
        {scanMsg || 'ИИ прочитает сайт и сам заполнит продукт, аудиторию и цифры.'}
      </p>

      <span style={label}>Instagram (если есть)</span>
      <input value={p.instagram} onChange={(e) => set({ instagram: e.target.value.trim() })} placeholder="instagram.com/твой_ник" style={{ ...input, marginBottom: 6 }} />
      <p style={{ ...hint, marginBottom: 14 }}>Напрямую к Instagram приложение не подключается. Зато во вкладке «Рост» можно загрузить скриншоты статистики, и ИИ их разберёт.</p>

      <span style={label}>О чём твой блог</span>
      <textarea value={p.niche} onChange={(e) => set({ niche: e.target.value })} rows={2} placeholder="например: учу создавать ИИ-моделей и зарабатывать на них" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Кто тебя читает и что у них болит</span>
      <textarea value={p.audience} onChange={(e) => set({ audience: e.target.value })} rows={3} placeholder="например: девушки 20–35, уже пробовали нейросети, но получается пластиковая кожа и разные лица" style={textarea} />
    </div>
  );
}

/** Шаг 2: цель, видение, продукт, продаваемость, цифры */
export function SelfGoalFields({ p, set }: { p: Persona; set: SetP }) {
  const hasOffer = p.offer.trim().length > 0;
  return (
    <div>
      <span style={label}>Главная цель блога</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {GOAL_CHIPS.map((g) => <Chip key={g} active={p.goal === g} onClick={() => set({ goal: p.goal === g ? '' : g })}>{g}</Chip>)}
      </div>

      <span style={label}>Каким ты видишь свой блог</span>
      <p style={hint}>Своими словами: какое ощущение должно оставаться у читателя, на кого хочешь быть похожа, чего точно не хочешь.</p>
      <textarea value={p.vision} onChange={(e) => set({ vision: e.target.value })} rows={3} placeholder="например: как подруга-практик, без инфоцыганства и «успешного успеха», много визуала и конкретики" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Что продаёшь</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {OFFER_CHIPS.map((c) => (
          <button key={c} onClick={() => set({ offer: c === 'пока ничего не продаю' ? '' : p.offer ? `${p.offer}, ${c}` : c })} style={smallChip}>+ {c}</button>
        ))}
      </div>
      <textarea value={p.offer} onChange={(e) => set({ offer: e.target.value })} rows={2} placeholder="например: курс AI Creators, 3 тарифа, от 9 900 ₽" style={{ ...textarea, marginBottom: 14 }} />

      {hasOffer && (
        <>
          <span style={label}>Насколько продаём</span>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[1, 2, 3].map((lvl) => {
              const on = p.salesLevel === lvl;
              return (
                <button key={lvl} onClick={() => set({ salesLevel: lvl })} style={{ flex: 1, padding: '10px 6px', borderRadius: 12, cursor: 'pointer', textAlign: 'center', border: on ? `1px solid ${neon}` : '1px solid var(--line)', backgroundColor: on ? neonBg : '#0d0d0d' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: on ? neon : '#ddd' }}>{SALES_LEVELS[lvl].title}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }}>{SALES_LEVELS[lvl].sub}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <span style={label}>Цифры, кейсы, результаты</span>
      <p style={hint}>Именно это делает посты живыми. ИИ не будет выдумывать факты, он возьмёт их отсюда.</p>
      <textarea value={p.proof} onChange={(e) => set({ proof: e.target.value })} rows={4} placeholder={'например: мои ИИ-модели оплатили семье переезд и год аренды дома в Таиланде\nученица Аня за месяц вышла на 80 000 ₽'} style={textarea} />
    </div>
  );
}

/** Шаг 3: где ведёшь и что развиваем (и для блога, и для модели) */
export function SelfPlatformFields({ p, set }: { p: Persona; set: SetP }) {
  const several = p.platforms.length > 1;
  const model = p.kind === 'model';
  return (
    <div>
      <span style={label}>{model ? 'Где она живёт' : 'Где ведёшь или хочешь вести'}</span>
      <MultiChips
        options={model ? MODEL_PLATFORMS : SELF_PLATFORMS}
        value={p.platforms}
        onChange={(platforms) => set({
          platforms,
          // одна площадка — фокус на ней; стало несколько — по умолчанию «всё вместе»
          focus: platforms.length <= 1 ? platforms[0] || 'all' : p.platforms.length <= 1 || !platforms.includes(p.focus) ? 'all' : p.focus,
        })}
      />
      {several && (
        <>
          <span style={{ ...label, marginTop: 16 }}>Что развиваем</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => set({ focus: 'all' })} style={{ textAlign: 'left', padding: 14, borderRadius: 12, cursor: 'pointer', border: p.focus === 'all' ? `1px solid ${neon}` : '1px solid var(--line)', backgroundColor: p.focus === 'all' ? neonBg : '#0d0d0d' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: p.focus === 'all' ? neon : '#ddd' }}>Всё вместе, как воронку</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{model ? 'Каждый день посты для каждой площадки. Threads и Instagram знакомят с ней, в Telegram к ней привыкают, Fanvue и OnlyFans продают.' : 'Каждый день посты для каждой площадки. Threads и Instagram дают охват, Telegram прогревает, дальше продукт.'}</div>
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {p.platforms.map((x) => <Chip key={x} active={p.focus === x} onClick={() => set({ focus: x })}>Только {x}</Chip>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Шаг 4: голос */
export function SelfVoiceFields({ p, set }: { p: Persona; set: SetP }) {
  return (
    <div>
      <span style={label}>Тон</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {TONES.map((t) => <Chip key={t} active={p.tone === t} onClick={() => set({ tone: p.tone === t ? '' : t })}>{t}</Chip>)}
      </div>

      <span style={label}>Как ты пишешь (самое важное)</span>
      <p style={hint}>Вставь 2–3 своих поста или подписи из Instagram, которые зашли. ИИ скопирует твою манеру.</p>
      <textarea value={p.examples} onChange={(e) => set({ examples: e.target.value })} rows={6} placeholder="Вставь сюда свои посты…" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Немного о себе</span>
      <textarea value={p.character} onChange={(e) => set({ character: e.target.value })} rows={2} placeholder="например: мама двоих детей, переехали в Таиланд, раньше работала дизайнером" style={{ ...textarea, marginBottom: 14 }} />

      <span style={label}>Факты из жизни для живых постов</span>
      <textarea value={p.lifeFacts} onChange={(e) => set({ lifeFacts: e.target.value })} rows={2} placeholder="город, дом, дети, питомцы, хобби, привычки" style={textarea} />
    </div>
  );
}

// ---------- Язык модели ----------
export function LanguageFields({ p, set }: { p: Persona; set: SetP }) {
  return (
    <div>
      <span style={label}>На каком языке говорит модель</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LANGUAGE_OPTIONS.map((o) => {
          const on = p.languageMode === o.id;
          return (
            <button key={o.id} onClick={() => set({ languageMode: o.id })} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: on ? `1px solid ${neon}` : '1px solid var(--line)', backgroundColor: on ? neonBg : '#0d0d0d' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: on ? neon : '#ddd' }}>{o.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{o.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
