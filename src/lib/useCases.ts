import { useEffect, useState } from 'react';
import type { PublicCase, Status } from '../../shared/schema';
import { api } from './api';

export function useCases(statuses: Status[]) {
  const [cases, setCases] = useState<PublicCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const key = statuses.join(',');

  useEffect(() => {
    let cancelled = false;
    const wanted = key.split(',') as Status[];

    const load = () =>
      api
        .list(wanted)
        .then((list) => {
          if (cancelled) return;
          setCases(list);
          setError(null);
        })
        .catch(() => !cancelled && setError('โหลดข้อมูลไม่สำเร็จ'))
        .finally(() => !cancelled && setLoading(false));

    const upsert = (e: MessageEvent) => {
      const c = JSON.parse(e.data) as PublicCase;
      setCases((prev) => {
        const rest = prev.filter((p) => p.id !== c.id);
        return wanted.includes(c.status) ? [...rest, c] : rest;
      });
    };

    load();
    const es = new EventSource('/api/stream');
    es.addEventListener('request.created', upsert);
    es.addEventListener('request.updated', upsert);
    es.addEventListener('request.removed', (e) => {
      const { id } = JSON.parse(e.data) as { id: string };
      setCases((prev) => prev.filter((p) => p.id !== id));
    });
    es.onerror = () => setOnline(false);
    // Reload on (re)connect so events missed while offline are not lost
    es.onopen = () => {
      setOnline(true);
      load();
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [key]);

  return { cases, loading, error, online };
}
