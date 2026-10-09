import { useCallback, useEffect, useState } from 'react';
import type { PublicCase } from '../../shared/schema';
import { ApiError, api } from './api';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

export function useCase(id: string) {
  const [data, setData] = useState<PublicCase | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  const reload = useCallback(
    () =>
      api
        .get(id)
        .then((c) => {
          setData(c);
          setState('ready');
        })
        .catch((e) => setState(e instanceof ApiError && e.status === 404 ? 'notfound' : 'error')),
    [id]
  );

  useEffect(() => {
    reload();
    const es = new EventSource('/api/stream');
    es.addEventListener('request.updated', (e) => {
      const c = JSON.parse(e.data) as PublicCase;
      if (c.id === id) setData(c);
    });
    es.addEventListener('request.removed', (e) => {
      if ((JSON.parse(e.data) as { id: string }).id === id) setState('notfound');
    });
    return () => es.close();
  }, [id, reload]);

  return { data, setData, state, reload };
}
