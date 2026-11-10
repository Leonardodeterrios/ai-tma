'use client';
// Вкладка «Диалог»: ИИ-помощник, который знает персонажа. С ним можно посоветоваться.
import { useEffect, useRef, useState } from 'react';
import type { Persona, PlanStore } from '../lib/persona';
import { copyText, errorText, mondayOf, postJSON } from '../lib/client';
import { KEYS, readStored, useStored } from '../lib/storage';
import { Btn, ErrorBox, card, neon, neonBg, textarea } from './ui';

type AMsg = { role: 'user' | 'assistant'; text: string };

const QUICK = [
  { label: '💡 Идея для поста', text: 'Придумай 3 идеи для поста на сегодня' },
  { label: '💬 Как ответить фанату', text: 'Фанат написал: «…». Как ответить, чтобы продолжить разговор?' },
  { label: '✍️ Перепиши живее', text: 'Перепиши этот текст живее, голосом персонажа:\n' },
  { label: '📖 Сюжет недели', text: 'Предложи 3 варианта сюжета на следующую неделю' },
];

/** Сюжет текущей недели из плана — чтобы помощник был в курсе */
function currentStoryline() {
  const plan = readStored<PlanStore>(KEYS.plan, { start: '', weeks: {} });
  if (!plan.start) return '';
  const wi = Math.round((mondayOf(new Date()).getTime() - new Date(plan.start).getTime()) / (7 * 86_400_000));
  return plan.weeks[wi]?.storyline || '';
}

export default function Assistant({ persona }: { persona: Persona }) {
  const [log, setLog] = useStored<AMsg[]>(KEYS.assistant, []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [log.length, busy]);

  const ask = async (messages: AMsg[]) => {
    setBusy(true);
    setError('');
    try {
      const data = await postJSON<{ reply: string }>('/api/assistant', {
        persona: { ...persona, refs: [] }, // фото помощнику не нужны
        storyline: currentStoryline(),
        messages: messages.slice(-16),
      });
      setLog([...messages, { role: 'assistant', text: data.reply }]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...log, { role: 'user' as const, text: t }];
    setLog(next);
    setText('');
    ask(next);
  };

  const retry = () => {
    if (log.length && log[log.length - 1].role === 'user') ask(log);
  };

  return (
    <div>
      {log.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '28px 15px', marginBottom: 14 }}>
          <div style={{ fontSize: 32 }}>🤖</div>
          <p style={{ fontSize: 14, color: '#aaa', margin: '10px 0 0', lineHeight: 1.5 }}>
            Твой помощник. Знает {persona.name}, её характер и сюжет недели.<br />Спроси что угодно или нажми кнопку ниже.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {log.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
            <div style={{
              padding: '11px 15px', borderRadius: 18, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap',
              backgroundColor: m.role === 'user' ? '#1a1a1a' : neonBg,
              border: m.role === 'user' ? '1px solid #222' : `1px solid ${neon}30`,
            }}>
              {m.text}
            </div>
            {m.role === 'assistant' && (
              <button onClick={async () => { if (await copyText(m.text)) { setCopied(i); setTimeout(() => setCopied(null), 1500); } }} style={{ background: 'none', border: 'none', color: '#555', fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>
                {copied === i ? '✓ скопировано' : 'копировать'}
              </button>
            )}
          </div>
        ))}
        {busy && <div style={{ color: neon, fontSize: 13, padding: '4px 10px' }}>думает…</div>}
        <div ref={endRef} />
      </div>

      {error && <ErrorBox text={error} onRetry={retry} />}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
        {QUICK.map((q) => (
          <button key={q.label} onClick={() => setText(q.text)} style={{ padding: '8px 12px', borderRadius: 20, border: '1px solid #2a2a2a', backgroundColor: '#0d0d0d', color: '#aaa', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {q.label}
          </button>
        ))}
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Спроси помощника…" style={{ ...textarea, marginBottom: 10 }} />
      <Btn full disabled={busy || !text.trim()} onClick={send}>{busy ? 'Думает…' : 'Отправить'}</Btn>
      {log.length > 0 && (
        <button onClick={() => { setLog([]); setError(''); }} style={{ width: '100%', background: 'none', border: 'none', color: '#555', fontSize: 12, padding: 14, cursor: 'pointer' }}>
          Начать новый разговор
        </button>
      )}
    </div>
  );
}
