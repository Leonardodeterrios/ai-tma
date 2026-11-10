// Вспомогательные функции для экранов: запросы к серверу, сжатие фото, копирование.

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Нет связи с сервером. Проверь интернет и попробуй ещё раз');
  }
  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    if (res.status === 504) throw new Error('Сервер думал слишком долго. Попробуй ещё раз');
    throw new Error(`Сервер ответил странно (код ${res.status})`);
  }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error;
    throw new Error(msg || `Ошибка сервера (код ${res.status})`);
  }
  return data as T;
}

export function errorText(e: unknown) {
  return e instanceof Error ? e.message : 'Что-то пошло не так';
}

/** Сжимает фото до 720px, чтобы оно влезло в память и быстро ушло в ИИ */
export function compressImage(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать фото'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Не удалось прочитать фото'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // запасной способ для старых WebView
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

// ---------- даты для календаря ----------
export function mondayOf(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
