import { getAccessToken } from './firebaseAuth';

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const rawText = await res.text();
  let parsed: unknown = null;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const preview = rawText.slice(0, 120).replace(/\s+/g, ' ');
      throw new Error(
        `Sunucu JSON yerine beklenmeyen yanıt döndürdü (HTTP ${res.status}): ${preview}`
      );
    }
  }

  if (!res.ok) {
    const errMsg =
      typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : `Sunucu hatası (HTTP ${res.status})`;
    throw new Error(errMsg);
  }

  return parsed as T;
}
