'use client';
// Вкладка «План»: календарь недели, посты по дням, сценарий и медиа.
import { useEffect, useMemo, useState } from 'react';
import {
  DAYS, GOALS, GOAL_COLORS, newId,
  type DayPlan, type Goal, type Persona, type PlanStore, type Post, type Taste, type Week,
} from '../lib/persona';
import { addDays, copyText, errorText, mondayOf, postJSON } from '../lib/client';
import { KEYS, useStored } from '../lib/storage';
import { Btn, Chip, ErrorBox, Spinner, card, hint, label, neon, textarea } from './ui';

type Mode = 'feed' | 'scenario' | 'media';
type RawPost = Partial<Omit<Post, 'id' | 'rating'>>;
type Outline = { storyline: string; appearance: string; days: { day: string; beat: string; goal: string }[] };
type Gen = { wi: number; phase: 'outline' | 'days'; done: number } | null;

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'];
const DAY_MS = 86_400_000;

const emptyWeek = (): Week => ({ storyline: '', scenario: '', bans: '', days: [] });
const asGoal = (g: unknown): Goal => (GOALS.includes(g as Goal) ? (g as Goal) : 'Доверие');

function toPost(r: RawPost): Post {
  const needsMedia = Boolean(r.needsMedia);
  return {
    id: newId(),
    time: /^\d{1,2}:\d{2}$/.test(r.time || '') ? (r.time as string).padStart(5, '0') : '12:00',
    format: r.format || 'Пост',
    goal: asGoal(r.goal),
    text: r.text || '',
    hashtags: r.hashtags || '',
    needsMedia,
    imagePrompt: needsMedia ? r.imagePrompt || '' : '',
    rating: 0,
  };
}

const byTime = (a: Post, b: Post) => a.time.localeCompare(b.time);
const postForCopy = (p: Post) => [p.text, p.hashtags].filter(Boolean).join('\n\n');

export default function ContentPlan({ persona, onAppearance }: { persona: Persona; onAppearance: (a: string) => void }) {
  const [plan, setPlan, planReady] = useStored<PlanStore>(KEYS.plan, { start: '', weeks: {} });
  const [taste, setTaste] = useStored<Taste>(KEYS.liked, { liked: [], disliked: [] });

  const today = useMemo(() => new Date(), []);
  const start = plan.start ? new Date(plan.start) : mondayOf(today);
  const currentWi = Math.max(0, Math.round((mondayOf(today).getTime() - start.getTime()) / (7 * DAY_MS)));

  const [wi, setWi] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('feed');
  const [gen, setGen] = useState<Gen>(null);
  const [error, setError] = useState('');
  const [busyPost, setBusyPost] = useState<string | null>(null); // id поста или 'add' / 'day'
  const [copied, setCopied] = useState<string | null>(null);

  // первый запуск: запоминаем начало календаря и открываем текущую неделю и сегодняшний день
  useEffect(() => {
    if (!planReady) return;
    if (!plan.start) setPlan((p) => ({ ...p, start: mondayOf(new Date()).toISOString() }));
    setWi(currentWi);
    setDayIdx((today.getDay() + 6) % 7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planReady]);

  const week: Week = plan.weeks[wi] || emptyWeek();
  const weekMonday = addDays(start, wi * 7);
  const day: DayPlan | undefined = week.days[dayIdx];
  const isGenerating = gen?.wi === wi;
  const apiPersona = { ...persona, refs: [] };

  // ---------- изменения плана ----------
  const patchWeek = (w: number, fn: (wk: Week) => Week) =>
    setPlan((p) => ({ ...p, weeks: { ...p.weeks, [w]: fn(p.weeks[w] || emptyWeek()) } }));
  const patchDay = (w: number, d: number, fn: (dp: DayPlan) => DayPlan) =>
    patchWeek(w, (wk) => ({ ...wk, days: wk.days.map((dp, i) => (i === d ? fn(dp) : dp)) }));
  const patchPost = (id: string, patch: Partial<Post>) =>
    patchDay(wi, dayIdx, (dp) => ({ ...dp, posts: dp.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const setScenario = (patch: Partial<Pick<Week, 'scenario' | 'bans'>>) => patchWeek(wi, (wk) => ({ ...wk, ...patch }));

  // ---------- генерация ----------
  const tasteBody = () => ({ liked: taste.liked.slice(0, 5), disliked: taste.disliked.slice(0, 3) });

  const genDay = async (w: number, d: number, ctx: { wk: Week; appearance: string }) => {
    const dp = ctx.wk.days[d];
    try {
      const data = await postJSON<{ posts: RawPost[] }>('/api/brain-plan', {
        action: 'day',
        persona: { ...apiPersona, appearance: ctx.appearance },
        storyline: ctx.wk.storyline,
        scenario: ctx.wk.scenario,
        bans: ctx.wk.bans,
        day: DAYS[d],
        beat: dp.beat,
        goal: dp.goal,
        weekBeats: ctx.wk.days.map((x, i) => `${DAYS[i]}: ${x.beat}`),
        ...tasteBody(),
      });
      patchDay(w, d, (x) => ({ ...x, failed: false, posts: data.posts.map(toPost).sort(byTime) }));
    } catch {
      patchDay(w, d, (x) => ({ ...x, failed: true }));
    }
  };

  const buildWeek = async () => {
    const w = wi;
    const base = plan.weeks[w] || emptyWeek();
    setError('');
    setMode('feed');
    setGen({ wi: w, phase: 'outline', done: 0 });
    try {
      const outline = await postJSON<Outline>('/api/brain-plan', {
        action: 'outline',
        persona: apiPersona,
        references: persona.appearance ? [] : persona.refs,
        scenario: base.scenario,
        bans: base.bans,
        ...tasteBody(),
      });
      const appearance = persona.appearance || outline.appearance || '';
      if (!persona.appearance && outline.appearance) onAppearance(outline.appearance);

      const wk: Week = {
        ...base,
        storyline: outline.storyline,
        days: DAYS.map((_, i) => ({ beat: outline.days[i]?.beat || '', goal: asGoal(outline.days[i]?.goal), posts: [] })),
      };
      patchWeek(w, () => wk);
      setGen({ wi: w, phase: 'days', done: 0 });

      await Promise.all(
        DAYS.map((_, i) => genDay(w, i, { wk, appearance }).then(() => setGen((g) => (g ? { ...g, done: g.done + 1 } : g)))),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setGen(null);
    }
  };

  const retryDay = async (d = dayIdx) => {
    setBusyPost('day');
    patchDay(wi, d, (x) => ({ ...x, failed: false }));
    await genDay(wi, d, { wk: week, appearance: persona.appearance });
    setBusyPost(null);
  };

  const rewritePost = async (post?: Post) => {
    if (!day) return;
    setBusyPost(post ? post.id : 'add');
    setError('');
    try {
      const data = await postJSON<{ post: RawPost }>('/api/brain-plan', {
        action: 'post',
        persona: apiPersona,
        storyline: week.storyline,
        scenario: week.scenario,
        bans: week.bans,
        day: DAYS[dayIdx],
        beat: day.beat,
        current: post?.text || '',
        others: day.posts.filter((p) => p.id !== post?.id).map((p) => p.text),
        ...tasteBody(),
      });
      const fresh = toPost(data.post);
      patchDay(wi, dayIdx, (dp) => ({
        ...dp,
        posts: (post ? dp.posts.map((p) => (p.id === post.id ? { ...fresh, time: post.time } : p)) : [...dp.posts, fresh]).sort(byTime),
      }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyPost(null);
    }
  };

  // ---------- лайки ----------
  const rate = (p: Post, value: 1 | -1) => {
    const next = p.rating === value ? 0 : value;
    patchPost(p.id, { rating: next });
    setTaste((t) => {
      const liked = t.liked.filter((x) => x !== p.text);
      const disliked = t.disliked.filter((x) => x !== p.text);
      if (next === 1) liked.unshift(p.text);
      if (next === -1) disliked.unshift(p.text);
      return { liked: liked.slice(0, 20), disliked: disliked.slice(0, 20) };
    });
  };

  const doCopy = async (text: string, id: string) => {
    if (await copyText(text)) {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  // ---------- шапка: недели, режимы, дни ----------
  const range = `${weekMonday.getDate()} ${MONTHS[weekMonday.getMonth()]} – ${addDays(weekMonday, 6).getDate()} ${MONTHS[addDays(weekMonday, 6).getMonth()]}`;
  const arrow = (enabled: boolean) => ({ background: 'none', border: 'none', color: enabled ? '#ddd' : '#333', fontSize: 22, padding: '4px 14px', cursor: enabled ? 'pointer' : 'default' });

  const header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
        <button style={arrow(wi > 0)} disabled={wi === 0} onClick={() => setWi(wi - 1)}>‹</button>
        <span style={{ fontSize: 20, fontWeight: 800, minWidth: 120, textAlign: 'center' }}>
          {wi === currentWi ? 'Эта неделя' : `Неделя ${wi + 1}`}
        </span>
        <button style={arrow(wi < currentWi + 4)} disabled={wi >= currentWi + 4} onClick={() => setWi(wi + 1)}>›</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 14 }}>{range}</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([['feed', 'Лента'], ['scenario', 'Сценарий'], ['media', 'Медиа']] as const).map(([id, name]) => (
          <button key={id} onClick={() => setMode(id)} style={{ flex: 1, padding: '10px 4px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: mode === id ? '1px solid #c9915a' : '1px solid #2a2a2a', backgroundColor: mode === id ? '#2a1d12' : '#0d0d0d', color: mode === id ? '#f2c08d' : '#aaa' }}>
            {name}
          </button>
        ))}
      </div>
    </>
  );

  const dayStrip = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 14 }}>
      {DAYS.map((d, i) => {
        const date = addDays(weekMonday, i);
        const isToday = date.toDateString() === today.toDateString();
        const on = i === dayIdx;
        const has = (week.days[i]?.posts.length || 0) > 0;
        return (
          <button key={d} onClick={() => setDayIdx(i)} style={{ padding: '6px 0 8px', borderRadius: 12, cursor: 'pointer', border: on ? '1px solid #bbb' : '1px solid #222', backgroundColor: on ? '#1c1c1c' : '#0b0b0b', color: on ? '#fff' : '#999' }}>
            <div style={{ fontSize: 11, color: isToday ? neon : '#666', marginBottom: 2 }}>{date.getDate()}</div>
            <div style={{ fontSize: 14 }}>{d}</div>
            <div style={{ width: 4, height: 4, borderRadius: 2, margin: '4px auto 0', backgroundColor: has ? neon : 'transparent' }} />
          </button>
        );
      })}
    </div>
  );

  if (!planReady) return <Spinner />;

  // ---------- СЦЕНАРИЙ ----------
  if (mode === 'scenario') {
    return (
      <div>
        {header}
        <p style={{ ...hint, fontSize: 13 }}>Что происходит у персонажа на этой неделе: события, запуск, настроение. Персонаж вплетёт это в посты.</p>
        <span style={label}>Сценарий недели</span>
        <textarea value={week.scenario} maxLength={3000} onChange={(e) => setScenario({ scenario: e.target.value })} rows={6} placeholder="например: в среду переезд, к выходным первая встреча с новым соседом" style={textarea} />
        <div style={{ textAlign: 'right', fontSize: 11, color: '#555', margin: '4px 0 16px' }}>{week.scenario.length}/3000</div>

        <span style={label}>Запреты</span>
        <p style={hint}>Что точно не нужно на этой неделе. ИИ исключит это из сюжета и постов.</p>
        <textarea value={week.bans} maxLength={3000} onChange={(e) => setScenario({ bans: e.target.value })} rows={4} placeholder="например: без поездок и спорта, не упоминать бывшего" style={textarea} />
        <div style={{ textAlign: 'right', fontSize: 11, color: '#555', margin: '4px 0 16px' }}>{week.bans.length}/3000</div>

        <Btn full disabled={Boolean(gen)} onClick={buildWeek}>
          {week.days.length ? 'Учесть в постах недели' : 'Собрать план недели'}
        </Btn>
        {week.days.length > 0 && (
          <p style={{ ...hint, textAlign: 'center', marginTop: 10 }}>Посты недели напишутся заново. Те, что ты лайкнула, ИИ запомнил как пример стиля.</p>
        )}
      </div>
    );
  }

  // ---------- МЕДИА ----------
  if (mode === 'media') {
    const items = week.days.flatMap((dp, i) => dp.posts.filter((p) => p.needsMedia && p.imagePrompt).map((p) => ({ p, d: DAYS[i] })));
    return (
      <div>
        {header}
        {items.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: '#777', fontSize: 13, padding: 30 }}>Пока нет постов с фото. Сначала собери план в «Ленте».</div>
        ) : (
          <>
            <p style={{ ...hint, fontSize: 13 }}>Все промпты для фото этой недели в одном месте. Сгенерируй их пачкой в Студии.</p>
            {items.map(({ p, d }) => (
              <div key={p.id} style={{ ...card, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{d} · {p.time} · {p.text.slice(0, 50)}{p.text.length > 50 ? '…' : ''}</div>
                <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.45, marginBottom: 10 }}>{p.imagePrompt}</div>
                <Btn kind="ghost" small onClick={() => doCopy(p.imagePrompt, 'm' + p.id)}>{copied === 'm' + p.id ? '✓ Скопировано' : 'Копировать промпт'}</Btn>
              </div>
            ))}
            <Btn full onClick={() => doCopy(items.map(({ p, d }) => `${d} ${p.time}\n${p.imagePrompt}`).join('\n\n'), 'allm')}>
              {copied === 'allm' ? '✓ Все промпты скопированы' : 'Скопировать все промпты'}
            </Btn>
          </>
        )}
      </div>
    );
  }

  // ---------- ЛЕНТА ----------
  return (
    <div>
      {header}
      {dayStrip}

      {error && <ErrorBox text={error} onRetry={week.days.length ? undefined : buildWeek} />}

      {isGenerating && gen?.phase === 'outline' && <Spinner text="Придумываем сюжет недели…" />}
      {isGenerating && gen?.phase === 'days' && (
        <div style={{ ...card, marginBottom: 12, fontSize: 13, color: '#aaa' }}>
          Пишем посты: {gen.done} из 7 дней
          <div style={{ height: 4, backgroundColor: '#1a1a1a', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(gen.done / 7) * 100}%`, backgroundColor: neon, transition: 'width .3s' }} />
          </div>
        </div>
      )}

      {!week.days.length && !isGenerating && (
        <div style={{ ...card, textAlign: 'center', padding: '30px 18px' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🗓</div>
          <p style={{ fontSize: 14, color: '#aaa', margin: '0 0 18px', lineHeight: 1.5 }}>
            План на эту неделю ещё не собран.<br />ИИ придумает сюжет и напишет по 2–3 поста на каждый день.
          </p>
          <Btn full disabled={Boolean(gen)} onClick={buildWeek}>Собрать план недели</Btn>
          <button onClick={() => setMode('scenario')} style={{ background: 'none', border: 'none', color: '#777', fontSize: 12, padding: 14, cursor: 'pointer' }}>
            Сначала добавить события недели →
          </button>
        </div>
      )}

      {week.storyline && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Сюжет недели</div>
          <div style={{ fontSize: 15 }}>{week.storyline}</div>
          {day?.beat && (
            <div style={{ fontSize: 12, color: '#777', marginTop: 8, lineHeight: 1.4 }}>
              <span style={{ color: GOAL_COLORS[day.goal] }}>● {day.goal}</span> · {day.beat}
            </div>
          )}
        </div>
      )}

      {day?.failed && <ErrorBox text="Этот день не получился" onRetry={() => retryDay()} />}
      {day && !day.failed && day.posts.length === 0 && isGenerating && <Spinner text={`Пишем ${DAYS[dayIdx]}…`} />}

      {day?.posts.map((p) => (
        <PostCard
          key={p.id}
          p={p}
          busy={busyPost === p.id}
          copied={copied}
          onEdit={(text) => patchPost(p.id, { text })}
          onRate={(v) => rate(p, v)}
          onRewrite={() => rewritePost(p)}
          onDelete={() => patchDay(wi, dayIdx, (dp) => ({ ...dp, posts: dp.posts.filter((x) => x.id !== p.id) }))}
          onCopy={(t, id) => doCopy(t, id)}
        />
      ))}

      {day && !isGenerating && !day.failed && (
        <>
          <button onClick={() => rewritePost()} disabled={Boolean(busyPost)} style={{ width: '100%', padding: 15, borderRadius: 14, border: '1px dashed #333', background: 'none', color: '#bbb', fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
            {busyPost === 'add' ? 'Пишем…' : '+ Добавить пост'}
          </button>
          <Btn full kind="ghost" disabled={Boolean(busyPost)} onClick={() => retryDay()}>
            {busyPost === 'day' ? 'Переписываем день…' : 'Переписать день целиком'}
          </Btn>
        </>
      )}
    </div>
  );
}

// ---------- Карточка поста ----------
function PostCard({
  p, busy, copied, onEdit, onRate, onRewrite, onDelete, onCopy,
}: {
  p: Post; busy: boolean; copied: string | null;
  onEdit: (text: string) => void; onRate: (v: 1 | -1) => void; onRewrite: () => void; onDelete: () => void;
  onCopy: (text: string, id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const icon = (on: boolean) => ({ background: 'none', border: 'none', fontSize: 16, padding: '4px 6px', cursor: 'pointer', opacity: on ? 1 : 0.4, filter: on ? 'none' : 'grayscale(1)' });

  return (
    <div style={{ ...card, marginBottom: 10, opacity: busy ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GOAL_COLORS[p.goal] }} />
        <span style={{ fontSize: 13, color: '#999' }}>{p.time}</span>
        <span style={{ fontSize: 10, color: GOAL_COLORS[p.goal], border: `1px solid ${GOAL_COLORS[p.goal]}50`, borderRadius: 20, padding: '1px 8px' }}>{p.goal}</span>
        <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase' }}>{p.format}</span>
        <button onClick={onDelete} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#444', fontSize: 14, cursor: 'pointer' }}>✕</button>
      </div>

      {editing ? (
        <textarea autoFocus value={p.text} onChange={(e) => onEdit(e.target.value)} onBlur={() => setEditing(false)} rows={5} style={{ ...textarea, marginBottom: 8 }} />
      ) : (
        <div onClick={() => setEditing(true)} style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 8, cursor: 'text' }}>{busy ? 'Переписываем…' : p.text}</div>
      )}
      {p.hashtags && <div style={{ fontSize: 12, color: '#7ea6ff', marginBottom: 8 }}>{p.hashtags}</div>}

      {p.needsMedia && p.imagePrompt && (
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => setShowPrompt(!showPrompt)} style={{ background: 'none', border: 'none', color: '#d9945b', fontSize: 12, padding: 0, cursor: 'pointer' }}>
            📷 Нужно фото {showPrompt ? '▴' : '▾ промпт'}
          </button>
          {showPrompt && (
            <div style={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: 10, padding: 10, marginTop: 6 }}>
              <div style={{ fontSize: 11, color: '#999', lineHeight: 1.45, marginBottom: 8 }}>{p.imagePrompt}</div>
              <Chip onClick={() => onCopy(p.imagePrompt, 'p' + p.id)}>{copied === 'p' + p.id ? '✓ Скопировано' : 'Копировать промпт'}</Chip>
            </div>
          )}
        </div>
      )}
      {!p.needsMedia && <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Без фото</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid #1c1c1c', paddingTop: 8 }}>
        <button style={icon(p.rating === 1)} onClick={() => onRate(1)} title="Нравится">👍</button>
        <button style={icon(p.rating === -1)} onClick={() => onRate(-1)} title="Не нравится">👎</button>
        <span style={{ flex: 1 }} />
        <Chip onClick={onRewrite}>↻ Переписать</Chip>
        <Chip onClick={() => onCopy(postForCopy(p), 'c' + p.id)}>{copied === 'c' + p.id ? '✓' : 'Копировать'}</Chip>
      </div>
    </div>
  );
}
