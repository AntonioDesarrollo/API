import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { currentMonthKey, shiftMonth } from './dates';

interface MonthValue {
  month: string;
  setMonth: (m: string) => void;
  step: (dir: 'prev' | 'next' | string) => void;
  isCurrent: boolean;
}

const MonthContext = createContext<MonthValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonthKey());
  const value = useMemo<MonthValue>(
    () => ({
      month,
      setMonth,
      step: (dir) => setMonth((m) => (dir === 'prev' ? shiftMonth(m, -1) : dir === 'next' ? shiftMonth(m, 1) : dir)),
      isCurrent: month === currentMonthKey(),
    }),
    [month],
  );
  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthValue {
  const v = useContext(MonthContext);
  if (!v) throw new Error('useMonth fuera de MonthProvider');
  return v;
}
