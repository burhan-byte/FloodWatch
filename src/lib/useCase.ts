import { useCallback, useEffect, useState } from 'react';
import type { PublicCase } from '../../shared/schema';
import { ApiError, api } from './api';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

export function useCase(id: string) {
  const [data, setData] = useState<PublicCase | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [online, setOnline] = useState(true);

  const reload = useCallback(
    () =>
      api
        .get(id)
        .then((c) => {
          setData(c);
          setState('ready');
        })
        .catch((e) => {
          if (e instanceof ApiError && e.status === 404) return setState('notfound');
          // A failed background refresh keeps the case already on screen
          setState((prev) => (prev === 'ready' ? prev : 'error'));
        }),
    [id]
  );

  useEffect(() => {
    reload();
    const es = new EventSource('/api/stream');
    es.addEventListener('request.updated', (e) => {
      const c = JSON.parse(e.data) as PublicCase;
      if (c.id !== id) return;
      setData(c);
      setState('ready');
    });
    es.addEventListener('request.removed', (e) => {
      if ((JSON.parse(e.data) as { id: string }).id === id) setState('notfound');
    });
    es.onerror = () => setOnline(false);
    // Reload on (re)connect so updates missed while offline are not lost
    es.onopen = () => {
      setOnline(true);
      reload();
    };
    return () => es.close();
  }, [id, reload]);

  return { data, setData, state, reload, online };
}
