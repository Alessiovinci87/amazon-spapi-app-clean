import { createContext, useContext, useState, useMemo, useEffect } from "react";

// Context per evitare doppia render del bell:
// - Layout renderizza il bell flottante SOLO se nessuna pagina ha registrato un bell inline.
// - PageTopBar (e simili) chiamano useTakeOverAlertBell() al mount per nascondere il flottante.

const AlertBellContext = createContext({
  inlineActive: false,
  takeOver: () => {},
  release: () => {},
});

export function AlertBellProvider({ children }) {
  const [count, setCount] = useState(0);
  const value = useMemo(
    () => ({
      inlineActive: count > 0,
      takeOver: () => setCount((c) => c + 1),
      release: () => setCount((c) => Math.max(0, c - 1)),
    }),
    [count]
  );
  return <AlertBellContext.Provider value={value}>{children}</AlertBellContext.Provider>;
}

export function useAlertBellHost() {
  return useContext(AlertBellContext);
}

// Da usare nel componente che renderizza il bell inline (es. PageTopBar)
export function useTakeOverAlertBell() {
  const { takeOver, release } = useContext(AlertBellContext);
  useEffect(() => {
    takeOver();
    return release;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
