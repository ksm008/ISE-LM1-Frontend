// SQL 인젝션 실습 공용 훅: 실습 DB 준비, 미션 진행 상태
import { useCallback, useEffect, useRef, useState } from 'react';
import { createShopDb } from './labDb.js';
import { loadSqlJs } from './sqlJs.js';

/** 실습 DB. reset() 하면 처음 상태로 새로 만든다 */
export function useShopDb() {
  const [state, setState] = useState({ db: null, error: null });
  const dbRef = useRef(null);

  const create = useCallback(async () => {
    try {
      const SQL = await loadSqlJs();
      dbRef.current?.close();
      dbRef.current = createShopDb(SQL);
      setState({ db: dbRef.current, error: null });
    } catch (e) {
      setState({ db: null, error: e?.message ?? String(e) });
    }
  }, []);

  useEffect(() => {
    create();
    return () => {
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, [create]);

  return { ...state, reset: create };
}

/** 미션 진행 상태 */
export function useMissions(missions) {
  const [done, setDone] = useState(() => new Set());
  const [latest, setLatest] = useState([]);
  const record = useCallback(
    (attempt) => {
      const now = missions.filter((m) => m.check(attempt)).map((m) => m.id);
      setLatest(now);
      if (now.length) setDone((prev) => new Set([...prev, ...now]));
    },
    [missions],
  );
  const reset = useCallback(() => {
    setDone(new Set());
    setLatest([]);
  }, []);
  return { done, latest, record, reset };
}
