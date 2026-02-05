import { useState, useEffect } from 'react';

export type RecordsPerPage = 10 | 25 | 50 | 100 | 'all';

const STORAGE_KEY = 'records-per-page';
const DEFAULT_VALUE: RecordsPerPage = 25;

export function useRecordsPerPage() {
  const [recordsPerPage, setRecordsPerPage] = useState<RecordsPerPage>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = stored === 'all' ? 'all' : parseInt(stored, 10);
        if (parsed === 'all' || [10, 25, 50, 100].includes(parsed as number)) {
          return parsed as RecordsPerPage;
        }
      }
    } catch (e) {
      console.warn('Failed to read records-per-page from localStorage');
    }
    return DEFAULT_VALUE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(recordsPerPage));
    } catch (e) {
      console.warn('Failed to save records-per-page to localStorage');
    }
  }, [recordsPerPage]);

  const applyLimit = <T,>(items: T[]): T[] => {
    if (recordsPerPage === 'all') {
      return items;
    }
    return items.slice(0, recordsPerPage);
  };

  return {
    recordsPerPage,
    setRecordsPerPage,
    applyLimit,
  };
}
