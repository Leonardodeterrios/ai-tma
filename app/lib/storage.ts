// Хранение данных в памяти телефона (localStorage).
// На этапе 2 эти функции переедут на базу данных — остальной код менять не придётся.
import { useEffect, useRef, useState } from 'react';

/** Список всех проектов (персонажей) */
export const PROJECTS_KEY = 'vb_projects';

/** Ключи данных одного проекта: у каждого свой план, фанаты, лайки и чат с помощником */
export function projectKeys(id: string) {
  return {
    plan: `vb_plan_${id}`,
    fans: `vb_fans_${id}`,
    liked: `vb_liked_${id}`,
    assistant: `vb_assistant_${id}`,
  };
}

/** Ключи прошлой версии (один персонаж на всё приложение) — нужны только для переноса */
export const LEGACY_KEYS = {
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
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const initialRef = useRef(initial);
  const ready = loadedKey === key;

  useEffect(() => {
    setValue(readStored(key, initialRef.current));
    setLoadedKey(key);
  }, [key]);

  // сохраняем только после того, как загрузили данные именно этого ключа
  useEffect(() => {
    if (ready) writeStored(key, value);
  }, [key, value, ready]);

  return [value, setValue, ready] as const;
}
