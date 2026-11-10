'use client';
// Общие стили и маленькие кнопки — чтобы все экраны выглядели одинаково.
import type { CSSProperties, ReactNode } from 'react';

export const neon = '#d8ff4f';
export const neonBg = '#1e2410';

export const card: CSSProperties = { background: '#111', borderRadius: 16, padding: 15, border: '1px solid #222' };
export const label: CSSProperties = { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' };
export const hint: CSSProperties = { fontSize: 11, color: '#666', margin: '0 0 8px', lineHeight: 1.4 };
export const input: CSSProperties = {
  width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 10, color: '#fff',
  padding: 12, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
};
export const textarea: CSSProperties = { ...input, resize: 'none', lineHeight: 1.45 };

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger';

export function Btn({
  children, onClick, kind = 'primary', disabled, full, small, style,
}: {
  children: ReactNode; onClick?: () => void; kind?: BtnKind; disabled?: boolean; full?: boolean; small?: boolean; style?: CSSProperties;
}) {
  const kinds: Record<BtnKind, CSSProperties> = {
    primary: { backgroundColor: neon, color: '#000', border: 'none' },
    ghost: { backgroundColor: '#111', color: '#aaa', border: '1px solid #333' },
    soft: { backgroundColor: neonBg, color: neon, border: `1px solid ${neon}40` },
    danger: { backgroundColor: 'transparent', color: '#ff6b6b', border: '1px solid #5a2020' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...kinds[kind],
        width: full ? '100%' : undefined,
        padding: small ? '8px 12px' : '15px 16px',
        borderRadius: small ? 9 : 12,
        fontSize: small ? 12 : 14,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'opacity .2s',
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
      onClick={onClick}
      style={{
        padding: '7px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
        border: active ? `1px solid ${color}` : '1px solid #2a2a2a',
        backgroundColor: active ? '#1a1a1a' : '#0d0d0d',
        color: active ? color : '#888',
      }}
    >
      {children}
    </button>
  );
}

export function Spinner({ text }: { text?: string }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '40px 15px' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #222', borderTopColor: neon, borderRadius: '50%', margin: '0 auto 14px', animation: 'vbspin 1s linear infinite' }} />
      {text && <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{text}</p>}
      <style>{'@keyframes vbspin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div style={{ ...card, borderColor: '#5a2020', marginBottom: 12 }}>
      <p style={{ fontSize: 13, color: '#ff6b6b', margin: onRetry ? '0 0 12px' : 0, lineHeight: 1.4 }}>{text}</p>
      {onRetry && <Btn kind="ghost" small onClick={onRetry}>↻ Попробовать ещё раз</Btn>}
    </div>
  );
}
