import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { SECRETS } from "./secrets";

const STORAGE_KEY = "cc_secrets_found";

interface SecretsState {
  found: Set<string>;
  discover: (id: string) => void;
  total: number;
  justCompleted: boolean;
  dismissCompleted: () => void;
  grimoireOpen: boolean;
  setGrimoireOpen: (open: boolean) => void;
}

const SecretsContext = createContext<SecretsState | null>(null);

// Remembers which hidden facts this browser has discovered (localStorage, so it survives reloads).
export function SecretsProvider({ children }: { children: ReactNode }) {
  const [found, setFound] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    } catch {
      return new Set();
    }
  });
  const [justCompleted, setJustCompleted] = useState(false);
  const [grimoireOpen, setGrimoireOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...found]));
  }, [found]);

  const discover = useCallback((id: string) => {
    setFound((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      if (next.size === SECRETS.length) setJustCompleted(true);
      return next;
    });
  }, []);

  return (
    <SecretsContext.Provider
      value={{
        found,
        discover,
        total: SECRETS.length,
        justCompleted,
        dismissCompleted: () => setJustCompleted(false),
        grimoireOpen,
        setGrimoireOpen,
      }}
    >
      {children}
    </SecretsContext.Provider>
  );
}

export function useSecrets() {
  const ctx = useContext(SecretsContext);
  if (!ctx) throw new Error("useSecrets must be used inside SecretsProvider");
  return ctx;
}
