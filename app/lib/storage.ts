// Хранение данных в памяти телефона (localStorage).
// На этапе 2 эти функции переедут на базу данных — остальной код менять не придётся.
import { useEffect, useRef, useState } from 'react';

export const KEYS = {
  persona: 'vb_persona',
  plan: 'vb_plan',
  fans: 'vb_fans',
  liked: 'vb_liked',
  assistant: 'vb_assistant',
} as const;

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // память переполнена или недоступна — работаем без сохранения
  }
}

export function removeStored(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

/** Как useState, но значение само сохраняется и загружается. ready = данные уже загружены. */
export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    setValue(readStored(key, initialRef.current));
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (ready) writeStored(key, value);
  }, [key, value, ready]);

  return [value, setValue, ready] as const;
}
