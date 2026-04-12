'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'datamind_active_dataset';

export type ActiveDatasetMeta = {
  datasetId: string;
  filename: string;
  rows: number;
  columns: number;
};

type DatasetContextValue = {
  activeDataset: ActiveDatasetMeta | null;
  hydrated: boolean;
  setActiveDataset: (meta: ActiveDatasetMeta) => void;
  clearDataset: () => void;
};

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [activeDataset, setActiveState] = useState<ActiveDatasetMeta | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as ActiveDatasetMeta;
        if (parsed?.datasetId) {
          setActiveState(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setActiveDataset = useCallback((meta: ActiveDatasetMeta) => {
    setActiveState(meta);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch {
      /* ignore */
    }
  }, []);

  const clearDataset = useCallback(() => {
    setActiveState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      activeDataset,
      hydrated,
      setActiveDataset,
      clearDataset,
    }),
    [activeDataset, hydrated, setActiveDataset, clearDataset]
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) {
    throw new Error('useDataset must be used within DatasetProvider');
  }
  return ctx;
}
