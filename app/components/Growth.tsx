'use client';
// Вкладка «Рост»: цели в цифрах, шкала прогресса, отчёт недели и стратегия на следующую.
import { useState } from 'react';
import {
  EMPTY_METRICS, METRIC_FIELDS,
  type CheckIn, type GrowthStore, type Metrics, type Persona, type PlanStore, type ReviewItem, type Strategy, type Taste,
} from '../lib/persona';
import { addDays, copyText, errorText, mondayOf, postJSON } from '../lib/client';
import { projectKeys, readStored, useStored, writeStored } from '../lib/storage';
import { Btn, ErrorBox, Spinner, card, hint, input, label, neon, neonBg } from './ui';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const num = (v: string | undefined) => {
  const n = Number(String(v || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) => n.toLocaleString('ru-RU');
const dateLabel = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};
const emptyCheckIn = (): CheckIn => ({ metrics: { ...EMPTY_METRICS }, review: [], confirmed: false });

export default function Growth({ persona, onPatch }: { persona: Persona; onPatch: (patch: Partial<Persona>) => void }) {
  const keys = projectKeys(persona.id);
  const [store, setStore, ready] = useStored<GrowthStore>(keys.growth, { weeks: {} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // форма целей открыта, пока целей нет (и не закрывается сама после первой цифры)
  const [editingGoals, setEditingGoals] = useState(() => !(Number(persona.goalFollowers) || Number(persona.goalRevenue)));
  const [editingWeek, setEditingWeek] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!ready) return <Spinner />;

  const thisKey = keyOf(mondayOf(new Date()));
  const allKeys = Object.keys(store.weeks).sort();
  const current: CheckIn = { ...emptyCheckIn(), ...store.weeks[thisKey] };
  const prevKey = [...allKeys].reverse().find((k) => k < thisKey && store.weeks[k]?.strategy);
  const prevRecs = prevKey ? store.weeks[prevKey].strategy?.recommendations || [] : [];
  const review: ReviewItem[] = prevRecs.map((_, i) => current.review[i] || { done: null, reason: '' });

  const patchWeek = (patch: Partial<CheckIn>) =>
    setStore((s) => ({ ...s, weeks: { ...s.weeks, [thisKey]: { ...emptyCheckIn(), ...s.weeks[thisKey], ...patch } } }));
  const setMetric = (k: keyof Metrics, v: string) => patchWeek({ metrics: { ...current.metrics, [k]: v } });
  const setReview = (i: number, patch: Partial<ReviewItem>) => patchWeek({ review: review.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  // ---------- прогресс к цели ----------
  const filled = allKeys.filter((k) => k <= thisKey && store.weeks[k]?.metrics);
  const lastFollowers = [...filled].reverse().map((k) => num(store.weeks[k].metrics.followers)).find((n) => n > 0) || 0;
  const revenue4w = filled.filter((k) => k > keyOf(addDays(mondayOf(new Date()), -28))).reduce((sum, k) => sum + num(store.weeks[k].metrics.revenue), 0);
  const goalF = num(persona.goalFollowers);
  const goalR = num(persona.goalRevenue);
  const weeksLeft = persona.goalDeadline ? Math.max(0, Math.ceil((new Date(persona.goalDeadline).getTime() - Date.now()) / (7 * DAY_MS))) : 0;
  const hasGoals = goalF > 0 || goalR > 0;

  // ---------- можно ли получить стратегию ----------
  const reviewOk = review.every((r) => r.done === true || (r.done === false && r.reason.trim().length > 2));
  const metricsOk = METRIC_FIELDS.some((f) => current.metrics[f.key].trim());
  const canAsk = metricsOk && (!prevRecs.length || (reviewOk && current.confirmed));
  const showForm = !current.strategy || editingWeek;

  const askStrategy = async () => {
    setBusy(true);
    setError('');
    try {
      const taste = readStored<Taste>(keys.liked, { liked: [], disliked: [] });
      const history = allKeys
        .filter((k) => k <= thisKey)
        .concat(store.weeks[thisKey] ? [] : [thisKey])
        .sort()
        .map((k) => ({ week: k, metrics: k === thisKey ? current.metrics : store.weeks[k].metrics }));
      const strategy = await postJSON<Strategy>('/api/strategy', {
        persona: { ...persona, refs: [] },
        history,
        review: prevRecs.map((r, i) => ({ text: r.text, done: review[i].done, reason: review[i].reason })),
        liked: taste.liked,
      });
      patchWeek({ strategy, appliedToPlan: false });
      setEditingWeek(false);
      setApplied(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  /** Переносим стратегию в сценарий плана следующей недели */
  const applyToPlan = () => {
    const s = current.strategy;
    if (!s) return;
    const plan = readStored<PlanStore>(keys.plan, { start: '', weeks: {} });
    const start = plan.start ? new Date(plan.start) : mondayOf(new Date());
    const nextWi = Math.round((mondayOf(new Date()).getTime() - start.getTime()) / (7 * DAY_MS)) + 1;
    const wk = plan.weeks[nextWi] || { storyline: '', scenario: '', bans: '', days: [] };
    const text = `${s.scenario}\nФокус недели: ${s.focus}\nЗадачи: ${s.recommendations.map((r) => r.text).join('; ')}`;
    writeStored(keys.plan, {
      start: plan.start || start.toISOString(),
      weeks: { ...plan.weeks, [nextWi]: { ...wk, scenario: wk.scenario ? `${wk.scenario}\n\n${text}` : text } },
    });
    patchWeek({ appliedToPlan: true });
    setApplied(true);
  };

  const bar = (value: number, goal: number, color: string) => (
    <div style={{ height: 8, backgroundColor: '#1a1a1a', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.min(100, goal ? (value / goal) * 100 : 0)}%`, backgroundColor: color, transition: 'width .4s' }} />
    </div>
  );

  // график подписчиков по неделям
  const chart = filled.slice(-8).map((k) => ({ k, v: num(store.weeks[k].metrics.followers) }));
  const chartMax = Math.max(1, ...chart.map((c) => c.v), goalF);

  return (
    <div>
      {/* ---------- ЦЕЛИ ---------- */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ ...label, margin: 0 }}>🎯 Мои цели</span>
          <button onClick={() => setEditingGoals(!editingGoals)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer' }}>
            {editingGoals ? (hasGoals ? 'Готово' : '') : 'Изменить'}
          </button>
        </div>

        {editingGoals ? (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={{ ...hint, display: 'block', marginBottom: 4 }}>Подписчиков</span>
                <input value={persona.goalFollowers} onChange={(e) => onPatch({ goalFollowers: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="10000" style={input} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ ...hint, display: 'block', marginBottom: 4 }}>Доход в месяц, ₽</span>
                <input value={persona.goalRevenue} onChange={(e) => onPatch({ goalRevenue: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="300000" style={input} />
              </div>
            </div>
            <span style={{ ...hint, display: 'block', marginBottom: 4 }}>К какому сроку</span>
            <input type="date" value={persona.goalDeadline} onChange={(e) => onPatch({ goalDeadline: e.target.value })} style={{ ...input, colorScheme: 'dark' }} />
          </>
        ) : (
          <>
            {goalF > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Подписчики</span>
                  <span style={{ color: '#aaa' }}>{fmt(lastFollowers)} / {fmt(goalF)} · <b style={{ color: neon }}>{Math.round((lastFollowers / goalF) * 100)}%</b></span>
                </div>
                {bar(lastFollowers, goalF, neon)}
              </div>
            )}
            {goalR > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Доход за 4 недели</span>
                  <span style={{ color: '#aaa' }}>{fmt(revenue4w)} / {fmt(goalR)} ₽ · <b style={{ color: '#ffb35c' }}>{Math.round((revenue4w / goalR) * 100)}%</b></span>
                </div>
                {bar(revenue4w, goalR, '#ffb35c')}
              </div>
            )}
            {persona.goalDeadline && <div style={{ fontSize: 12, color: '#777', marginTop: 10 }}>До срока: {weeksLeft} нед.</div>}
          </>
        )}
      </div>

      {chart.length > 1 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <span style={label}>Подписчики по неделям</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, marginTop: 8 }}>
            {chart.map((c) => (
              <div key={c.k} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#888', marginBottom: 2 }}>{c.v ? fmt(c.v) : ''}</div>
                <div style={{ height: Math.max(3, (c.v / chartMax) * 64), backgroundColor: c.k === thisKey ? neon : '#3a4a1a', borderRadius: 4 }} />
                <div style={{ fontSize: 9, color: '#666', marginTop: 4 }}>{dateLabel(c.k)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- НЕДЕЛЯ ---------- */}
      {showForm ? (
        <>
          {prevRecs.length > 0 && (
            <div style={{ ...card, marginBottom: 12, border: `1px solid ${neon}30` }}>
              <span style={label}>✅ Отчёт по прошлой неделе</span>
              <p style={hint}>Отметь каждую рекомендацию. Если не получилось, напиши почему: стратегия это учтёт.</p>
              {prevRecs.map((r, i) => (
                <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid #1c1c1c' : 'none' }}>
                  <div style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 8 }}>{r.text}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ChoiceBtn on={review[i].done === true} color={neon} onClick={() => setReview(i, { done: true })}>✓ Выполнила</ChoiceBtn>
                    <ChoiceBtn on={review[i].done === false} color="#ff8b8b" onClick={() => setReview(i, { done: false })}>✗ Не выполнила</ChoiceBtn>
                  </div>
                  {review[i].done === false && (
                    <input value={review[i].reason} onChange={(e) => setReview(i, { reason: e.target.value })} placeholder="Почему? (не было времени, не поняла как, не захотела…)" style={{ ...input, marginTop: 8, fontSize: 13 }} />
                  )}
                </div>
              ))}
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 12, cursor: 'pointer', opacity: reviewOk ? 1 : 0.4 }}>
                <input type="checkbox" disabled={!reviewOk} checked={current.confirmed && reviewOk} onChange={(e) => patchWeek({ confirmed: e.target.checked })} style={{ width: 20, height: 20, accentColor: neon, flexShrink: 0 }} />
                <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {review.every((r) => r.done) ? 'Подтверждаю, что выполнила все рекомендации прошлой недели 💪' : 'Подтверждаю: остальное выполнила, а где не получилось, честно написала почему'}
                </span>
              </label>
            </div>
          )}

          <div style={{ ...card, marginBottom: 12 }}>
            <span style={label}>📊 Показатели этой недели</span>
            <p style={hint}>Заполни то, что знаешь. Чем больше цифр, тем точнее стратегия.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {METRIC_FIELDS.map((f) => (
                <div key={f.key}>
                  <span style={{ fontSize: 12, color: '#bbb' }}>{f.label}</span>
                  <input value={current.metrics[f.key]} onChange={(e) => setMetric(f.key, e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder={f.hint} style={{ ...input, marginTop: 4, padding: 10 }} />
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#bbb', display: 'block', marginTop: 10 }}>Что зашло лучше всего</span>
            <input value={current.metrics.best} onChange={(e) => setMetric('best', e.target.value)} placeholder="например: рилс про пластиковую кожу, 40к просмотров" style={{ ...input, marginTop: 4 }} />
          </div>

          {error && <ErrorBox text={error} onRetry={canAsk ? askStrategy : undefined} />}
          <Btn full disabled={!canAsk || busy} onClick={askStrategy}>
            {busy ? 'Разбираю цифры…' : !metricsOk ? 'Заполни хотя бы одну цифру' : !canAsk ? 'Сначала отчитайся по прошлой неделе' : 'Получить стратегию на следующую неделю'}
          </Btn>
          {editingWeek && <Btn full kind="ghost" onClick={() => setEditingWeek(false)} style={{ marginTop: 8 }}>Отмена</Btn>}
        </>
      ) : (
        current.strategy && (
          <StrategyCard
            s={current.strategy}
            applied={applied || Boolean(current.appliedToPlan)}
            onApply={applyToPlan}
            onEdit={() => setEditingWeek(true)}
          />
        )
      )}

      {!prevRecs.length && showForm && (
        <p style={{ ...hint, textAlign: 'center', marginTop: 14 }}>Каждую неделю ты будешь отчитываться по рекомендациям, и только потом получать новую стратегию. Так рост не стоит на месте.</p>
      )}
    </div>
  );
}

function ChoiceBtn({ on, color, onClick, children }: { on: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: on ? `1px solid ${color}` : '1px solid #2a2a2a', backgroundColor: on ? '#151515' : '#0b0b0b', color: on ? color : '#777' }}>
      {children}
    </button>
  );
}

function StrategyCard({ s, applied, onApply, onEdit }: { s: Strategy; applied: boolean; onApply: () => void; onEdit: () => void }) {
  const [copied, setCopied] = useState<number | null>(null);
  return (
    <div>
      {s.math && s.math.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <span style={label}>🔢 Цифры недели</span>
          {s.math.map((line, i) => (
            <div key={i} style={{ fontSize: 13, color: '#ccc', lineHeight: 1.45, padding: '3px 0' }}>{line}</div>
          ))}
        </div>
      )}
      <div style={{ ...card, marginBottom: 12, border: `1px solid ${neon}40` }}>
        <span style={label}>🧭 Стратегия на следующую неделю</span>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 10px', color: '#ddd' }}>{s.summary}</p>
        <div style={{ fontSize: 13, color: '#ffb35c', marginBottom: 10 }}>{s.verdict}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: neon, backgroundColor: neonBg, borderRadius: 10, padding: '10px 12px' }}>Фокус: {s.focus}</div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <span style={label}>Что делаем</span>
        {s.recommendations.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: i ? '1px solid #1c1c1c' : 'none' }}>
            <span style={{ color: neon, fontWeight: 800, fontSize: 14 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {r.platform && <span style={{ fontSize: 10, color: '#999', border: '1px solid #333', borderRadius: 6, padding: '1px 6px' }}>{r.platform}</span>}
              <div style={{ fontSize: 14, lineHeight: 1.4, marginTop: r.platform ? 5 : 0 }}>{r.text}</div>
              {r.example && (
                <div style={{ fontSize: 13, color: '#e8e8e8', backgroundColor: '#0b0b0b', border: '1px solid #222', borderRadius: 10, padding: '8px 10px', marginTop: 6, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                  {r.example}
                  <button onClick={async () => { if (await copyText(r.example || '')) { setCopied(i); setTimeout(() => setCopied(null), 1500); } }} style={{ display: 'block', background: 'none', border: 'none', color: '#666', fontSize: 11, padding: '6px 0 0', cursor: 'pointer' }}>
                    {copied === i ? '✓ скопировано' : 'копировать'}
                  </button>
                </div>
              )}
              <div style={{ fontSize: 12, color: '#777', marginTop: 5, lineHeight: 1.35 }}>{r.why}</div>
            </div>
          </div>
        ))}
        <p style={{ ...hint, marginTop: 10, marginBottom: 0 }}>Через неделю отметишь, что получилось, и получишь новую стратегию.</p>
      </div>

      <Btn full disabled={applied} onClick={onApply}>{applied ? '✓ Добавлено в сценарий плана следующей недели' : 'Перенести в план следующей недели'}</Btn>
      <Btn full kind="ghost" onClick={onEdit} style={{ marginTop: 8 }}>Изменить цифры и пересобрать</Btn>
    </div>
  );
}
