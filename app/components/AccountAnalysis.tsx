'use client';
// Разбор аккаунта: загружаешь скриншоты статистики, ИИ читает цифры и говорит, что работает.
import { useRef, useState } from 'react';
import type { Analysis, Persona } from '../lib/persona';
import { compressImage, errorText, postJSON } from '../lib/client';
import { Btn, ErrorBox, card, hint, label, neon, textarea } from './ui';

const MAX = 4;

export default function AccountAnalysis({
  persona, analysis, onResult,
}: {
  persona: Persona;
  analysis?: Analysis;
  onResult: (a: Analysis) => void;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const add = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, MAX - images.length);
    if (fileRef.current) fileRef.current.value = '';
    try {
      // 1200px — чтобы ИИ мог прочитать мелкие цифры на скриншоте
      const added = await Promise.all(files.map((f) => compressImage(f, 1200)));
      setImages((cur) => [...cur, ...added].slice(0, MAX));
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  };

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const a = await postJSON<Analysis>('/api/analyze', { persona: { ...persona, refs: [] }, images, notes });
      onResult({ ...a, date: new Date().toISOString() });
      setOpen(false);
      setImages([]);
      setNotes('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const list = (title: string, items: string[], color: string) =>
    items.length > 0 && (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>{title}</div>
        {items.map((t, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.45, padding: '2px 0' }}>• {t}</div>)}
      </div>
    );

  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...label, margin: 0 }}>🔍 Разбор аккаунта</span>
        {!open && <Btn kind="soft" small onClick={() => setOpen(true)}>{analysis ? 'Новый разбор' : 'Разобрать'}</Btn>}
      </div>

      {!open && !analysis && (
        <p style={{ ...hint, margin: '8px 0 0' }}>Загрузи скриншоты статистики из Instagram, Threads или Telegram. ИИ прочитает цифры, найдёт, что заходит, и учтёт это в плане.</p>
      )}

      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={hint}>
            Что снять на скриншот: <b>Instagram</b> → Профессиональная панель и статистика 2–3 лучших рилсов; <b>Threads</b> → Статистика; <b>Telegram</b> → Статистика канала. До {MAX} скриншотов.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {images.map((src, i) => (
              <div key={i} style={{ position: 'relative', width: 64, height: 90, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setImages(images.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', backgroundColor: 'rgba(0,0,0,.7)', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            {images.length < MAX && (
              <button onClick={() => fileRef.current?.click()} style={{ width: 64, height: 90, borderRadius: 10, border: '1px dashed var(--line-strong)', background: 'none', color: 'var(--muted)', fontSize: 22, cursor: 'pointer' }}>+</button>
            )}
            <input type="file" multiple accept="image/*" ref={fileRef} onChange={add} style={{ display: 'none' }} />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Можно дописать: тексты лучших постов, что сама заметила, цифры" style={{ ...textarea, marginBottom: 10 }} />
          {error && <ErrorBox text={error} onRetry={images.length || notes.trim() ? run : undefined} />}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="ghost" small onClick={() => setOpen(false)}>Отмена</Btn>
            <Btn small style={{ flex: 1 }} disabled={busy || (!images.length && !notes.trim())} onClick={run}>{busy ? 'Читаю цифры…' : 'Разобрать аккаунт'}</Btn>
          </div>
        </div>
      )}

      {!open && analysis && (
        <div style={{ marginTop: 12 }}>
          {analysis.seen && <p style={{ ...hint, marginBottom: 10 }}>{analysis.seen}</p>}
          {list('Что работает', analysis.works || [], neon)}
          {list('Что проседает', analysis.weak || [], '#ffb35c')}
          {(analysis.ideas || []).length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7ea6ff', marginBottom: 4 }}>Что повторить</div>
              {analysis.ideas.map((x, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.45, padding: '4px 0' }}>
                  {x.platform && <span style={{ fontSize: 10, color: 'var(--muted)', border: '1px solid var(--line-strong)', borderRadius: 6, padding: '1px 6px', marginRight: 6 }}>{x.platform}</span>}
                  {x.text}
                </div>
              ))}
            </div>
          )}
          <p style={{ ...hint, margin: '10px 0 0' }}>✓ Выводы сохранены: план и стратегия теперь их учитывают.</p>
        </div>
      )}
    </div>
  );
}
