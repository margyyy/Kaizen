import { createContext, useCallback, useContext, useState } from "react";
import type { AppData } from "./storage/types";
import { loadData, saveData } from "./storage";
import { isSyncEnabled, pushData } from "./sync";
import { debugSaveAppData } from "./debug";

interface DataContextType {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

const DataContext = createContext<DataContextType | null>(null);

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSync() {
  if (!isSyncEnabled()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const latest = loadData();
    if (!latest) return;
    try { await pushData(latest); } catch { /* offline */ }
  }, 2000);
}

export function DataProvider({
  data,
  children,
}: {
  data: AppData;
  children: React.ReactNode;
}) {
  const [state, setState] = useState(data);

  const setData = useCallback((updater: (prev: AppData) => AppData) => {
    setState((prev) => {
      const next = updater(prev);
      saveData(next);
      scheduleSync();
      debugSaveAppData(next).catch(() => {});
      return next;
    });
  }, []);

  return (
    <DataContext.Provider value={{ data: state, setData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
