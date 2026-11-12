'use client';
// Вкладка «Чаттер» / «Ответы»: собеседники, переписка и 3 варианта ответа голосом персонажа.
import { useState } from 'react';
import { KIND_TEXT, newId, type Fan, type Persona, type PlanStore, type Reply } from '../lib/persona';
import { copyText, errorText, mondayOf, postJSON } from '../lib/client';
import { projectKeys, readStored, useStored } from '../lib/storage';
import { Btn, ErrorBox, card, input, neon, neonBg, textarea } from './ui';


/** Последние посты из плана — чтобы персонаж мог на них сослаться в личке */
function recentPosts(planKey: string): string[] {
  const plan = readStored<PlanStore>(planKey, { start: '', weeks: {} });
  if (!plan.start) return [];
  const now = new Date();
  const wi = Math.round((mondayOf(now).getTime() - new Date(plan.start).getTime()) / (7 * 86_400_000));
  const todayIdx = (now.getDay() + 6) % 7;
  const days = plan.weeks[wi]?.days || [];
  return days.slice(0, todayIdx + 1).flatMap((d) => d.posts.map((p) => p.text)).slice(-6);
}

export default function Chatter({ persona }: { persona: Persona }) {
  const keys = projectKeys(persona.id);
  const T = KIND_TEXT[persona.kind];
  const [fans, setFans] = useStored<Fan[]>(keys.fans, []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [msg, setMsg] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const fan = fans.find((f) => f.id === activeId) || null;
  const updateFan = (id: string, patch: Partial<Fan> | ((f: Fan) => Partial<Fan>)) =>
    setFans((prev) => prev.map((f) => (f.id === id ? { ...f, ...(typeof patch === 'function' ? patch(f) : patch) } : f)));

  const open = (id: string | null) => { setActiveId(id); setReplies([]); setError(''); setMsg(''); setShowNotes(false); };

  const createFan = () => {
    const f: Fan = { id: newId(), name: newName.trim() || `Новый ${T.person}`, notes: '', stage: 1, history: [] };
    setFans([f, ...fans]);
    setNewName('');
    open(f.id);
  };

  const push = (role: 'fan' | 'model', text: string) => {
    if (!fan || !text.trim()) return;
    updateFan(fan.id, (f) => ({ history: [...f.history, { role, text: text.trim(), time: Date.now() }] }));
  };

  const generate = async () => {
    if (!fan) return;
    let history = fan.history;
    if (msg.trim()) {
      history = [...history, { role: 'fan' as const, text: msg.trim(), time: Date.now() }];
      updateFan(fan.id, { history });
      setMsg('');
    }
    if (!history.length) return;
    setBusy(true);
    setError('');
    setReplies([]);
    try {
      const data = await postJSON<{ replies: Reply[] }>('/api/chatter', {
        persona: { ...persona, refs: [] },
        fan: { ...fan, history },
        recentPosts: recentPosts(keys.plan),
      });
      setReplies(data.replies);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const useReply = async (r: Reply) => {
    await copyText(r.text);
    push('model', r.text);
    setReplies([]);
  };

  // ---------- список фанатов ----------
  if (!fan) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFan()} placeholder={persona.kind === 'self' ? 'Имя или ник подписчика…' : 'Имя фаната…'} style={{ ...input, flex: 1 }} />
          <Btn kind="soft" onClick={createFan}>+ Добавить</Btn>
        </div>
        {fans.length === 0 && (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: '30px 15px', lineHeight: 1.5 }}>
            Пока пусто.<br />Добавь первого, вставь его сообщение, и {persona.name} предложит 3 ответа.
          </div>
        )}
        {fans.map((f) => {
          const last = f.history[f.history.length - 1];
          return (
            <div key={f.id} style={{ ...card, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div onClick={() => open(f.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{f.name}</span>
                  <span style={{ fontSize: 10, color: neon, border: `1px solid ${neon}50`, borderRadius: 20, padding: '2px 8px' }}>{f.stage}. {T.stages[f.stage]?.short}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {last ? `${last.role === 'fan' ? 'Он' : 'Я'}: ${last.text}` : 'нет сообщений'}
                </p>
              </div>
              {confirmDel === f.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn kind="danger" small onClick={() => { setFans(fans.filter((x) => x.id !== f.id)); setConfirmDel(null); }}>Удалить</Btn>
                  <Btn kind="ghost" small onClick={() => setConfirmDel(null)}>Нет</Btn>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(f.id)} style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 16, padding: 8, cursor: 'pointer' }}>✕</button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------- переписка с фанатом ----------
  const canGenerate = !busy && (msg.trim().length > 0 || fan.history.length > 0);
  return (
    <div>
      <button onClick={() => open(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, padding: '0 0 12px', cursor: 'pointer' }}>← Все {T.personPlural}</button>

      <div style={{ ...card, marginBottom: 12 }}>
        <input value={fan.name} onChange={(e) => updateFan(fan.id, { name: e.target.value })} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 18, fontWeight: 700, width: '100%', outline: 'none', padding: 0, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 5 }}>
          {[1, 2, 3, 4, 5].map((s) => {
            const on = fan.stage === s;
            return (
              <button key={s} onClick={() => updateFan(fan.id, { stage: s })} style={{ flex: 1, padding: '7px 2px', borderRadius: 8, border: on ? `1px solid ${neon}` : '1px solid var(--line)', backgroundColor: on ? neonBg : '#0d0d0d', color: on ? neon : '#666', fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: 1.25 }}>
                {s}<br /><span style={{ fontSize: 9, fontWeight: 400 }}>{T.stages[s].short}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowNotes(!showNotes)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, marginTop: 12, cursor: 'pointer', padding: 0 }}>
          {showNotes ? '− Скрыть заметки' : '+ Что я о нём знаю'}
        </button>
        {showNotes && <textarea value={fan.notes} onChange={(e) => updateFan(fan.id, { notes: e.target.value })} placeholder="Работа, хобби, сколько платит, о чём любит говорить…" rows={3} style={{ ...textarea, marginTop: 10 }} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {fan.history.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'fan' ? 'flex-start' : 'flex-end' }}>
            <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: 18, fontSize: 14, lineHeight: 1.4, backgroundColor: m.role === 'fan' ? '#1a1a1a' : neonBg, border: m.role === 'fan' ? '1px solid var(--line)' : `1px solid ${neon}40` }}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && <div style={{ alignSelf: 'flex-end', color: neon, fontSize: 13, padding: '4px 12px' }}>{persona.name} печатает…</div>}
      </div>

      {error && <ErrorBox text={error} onRetry={generate} />}

      {replies.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {replies.map((r, i) => (
            <div key={i} style={{ ...card, border: `1px solid ${neon}40`, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>{T.replyLabels[i] || 'Вариант'}</div>
              <p style={{ margin: '0 0 4px', fontSize: 15, lineHeight: 1.45 }}>{r.text}</p>
              {r.translation && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{r.translation}</p>}
              <Btn full small onClick={() => useReply(r)} style={{ marginTop: 6 }}>Копировать и сохранить</Btn>
            </div>
          ))}
        </div>
      )}

      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Вставь его сообщение…" rows={3} style={{ ...textarea, marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <Btn kind="ghost" small disabled={!msg.trim()} style={{ flex: 1 }} onClick={() => { push('fan', msg); setMsg(''); }}>+ Он написал</Btn>
        <Btn kind="soft" small disabled={!msg.trim()} style={{ flex: 1 }} onClick={() => { push('model', msg); setMsg(''); }}>+ Я написала</Btn>
      </div>
      <Btn full disabled={!canGenerate} onClick={generate}>{busy ? 'Думаю…' : 'Предложить 3 ответа'}</Btn>
    </div>
  );
}
