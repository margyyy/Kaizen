import { createContext, useCallback, useContext, useState } from "react";
import type { AppData } from "./storage/types";
import { saveData } from "./storage";
import { debugSaveAppData } from "./debug";
import { pushData, getSession } from "./sync";

interface DataContextType {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
}

const DataContext = createContext<DataContextType | null>(null);

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
      debugSaveAppData(next).catch(() => {});
      // Web: fire-and-forget push to Supabase
      if (typeof window !== "undefined" && !("__TAURI__" in window)) {
        getSession().then(({ data: { session } }) => {
          if (session) {
            pushData(next).catch(() => {});
          }
        });
      }
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
