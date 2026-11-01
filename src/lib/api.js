import { useEffect, useState, useCallback } from 'react';

export async function api(path, { method = 'GET', body, form } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (form) opts.body = form;
  else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  const res = await fetch(path.startsWith('/') ? path : `/api/${path}`, opts);
  const isJson = res.headers.get('content-type')?.includes('json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) throw Object.assign(new Error(data?.error || `Erreur ${res.status}`), { status: res.status, data });
  return data;
}

const cache = new Map();

/** Chargement simple avec cache mémoire (navigation instantanée au retour). */
export function useApi(path, deps = []) {
  const [state, setState] = useState(() => ({ data: cache.get(path), error: null, loading: !cache.has(path) }));
  const load = useCallback(() => {
    if (!path) return;
    setState(s => ({ ...s, loading: !cache.has(path) }));
    api(path).then(data => { cache.set(path, data); setState({ data, error: null, loading: false }); })
      .catch(error => setState({ data: null, error, loading: false }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

/** Upload avec progression (XHR). */
export function upload(path, form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/${path}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data; try { data = JSON.parse(xhr.responseText); } catch { data = {}; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(Object.assign(new Error(data.error || `Erreur ${xhr.status}`), { status: xhr.status, data }));
    };
    xhr.onerror = () => reject(new Error('Connexion interrompue'));
    xhr.send(form);
  });
}
