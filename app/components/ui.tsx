'use client';
// Общие стили и маленькие компоненты — чтобы все экраны выглядели одинаково.
// Цвета берутся из переменных в globals.css.
import type { CSSProperties, ReactNode } from 'react';

export const neon = '#d8ff4f';
export const neonBg = 'rgba(216, 255, 79, 0.08)';

/** Заголовок в фирменном широком шрифте */
export const display: CSSProperties = { fontFamily: 'var(--font-display), system-ui, sans-serif', letterSpacing: '-0.02em' };

export const card: CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius)',
  padding: 16,
  border: '1px solid var(--line)',
};
export const label: CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'block' };
export const hint: CSSProperties = { fontSize: 12, color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.45 };
export const input: CSSProperties = {
  width: '100%', backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid var(--line-strong)', borderRadius: 14, color: 'var(--text)',
  padding: '13px 14px', fontSize: 15, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s',
};
export const textarea: CSSProperties = { ...input, resize: 'none', lineHeight: 1.5 };

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger';

export function Btn({
  children, onClick, kind = 'primary', disabled, full, small, style,
}: {
  children: ReactNode; onClick?: () => void; kind?: BtnKind; disabled?: boolean; full?: boolean; small?: boolean; style?: CSSProperties;
}) {
  const kinds: Record<BtnKind, CSSProperties> = {
    primary: { backgroundColor: neon, color: 'var(--lime-ink)', border: '1px solid transparent' },
    ghost: { backgroundColor: 'var(--raised)', color: 'var(--text)', border: '1px solid var(--line)' },
    soft: { backgroundColor: neonBg, color: neon, border: '1px solid rgba(216,255,79,0.25)' },
    danger: { backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid rgba(255,107,107,0.35)' },
  };
  return (
    <button
      className={`vb-btn${kind === 'primary' ? ' vb-btn-primary' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...kinds[kind],
        width: full ? '100%' : undefined,
        padding: small ? '9px 14px' : '16px 20px',
        borderRadius: 999,
        fontSize: small ? 13 : 15,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, color = neon }: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      className="vb-btn"
      onClick={onClick}
      style={{
        padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        border: active ? `1px solid ${color}` : '1px solid var(--line)',
        backgroundColor: active ? 'rgba(216,255,79,0.08)' : 'var(--surface)',
        color: active ? color : 'var(--muted)',
      }}
    >
      {children}
    </button>
  );
}

/** Маленькая метка-таблетка: NEW, площадка, тип контента */
export function Pill({ children, color = 'var(--text)', bg = 'var(--raised)', style }: { children: ReactNode; color?: string; bg?: string; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color, backgroundColor: bg, borderRadius: 999, padding: '3px 9px', lineHeight: 1.4, whiteSpace: 'nowrap', ...style }}>
      {children}
    </span>
  );
}

export function Spinner({ text }: { text?: string }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '40px 15px' }}>
      <div style={{ width: 30, height: 30, border: '3px solid var(--line-strong)', borderTopColor: neon, borderRadius: '50%', margin: '0 auto 14px', animation: 'vbspin 0.9s linear infinite' }} />
      {text && <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>{text}</p>}
      <style>{'@keyframes vbspin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div style={{ ...card, borderColor: 'rgba(255,107,107,0.35)', background: 'rgba(255,107,107,0.06)', marginBottom: 12 }}>
      <p style={{ fontSize: 14, color: 'var(--danger)', margin: onRetry ? '0 0 12px' : 0, lineHeight: 1.45 }}>{text}</p>
      {onRetry && <Btn kind="ghost" small onClick={onRetry}>↻ Попробовать ещё раз</Btn>}
    </div>
  );
}
