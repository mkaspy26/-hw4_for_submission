import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PageResults } from "./api";

export const RESULTS_ANCHOR_ID = "chat-results";

interface ChatResultsState {
  results: (PageResults & { id: number }) | null;
  showResults: (r: PageResults) => void;
  goToResults: () => void;
  clearResults: () => void;
}

const ChatResultsContext = createContext<ChatResultsState | null>(null);

// Holds the latest product matches the chat agent sent for the page. Lives above the routes,
// so results survive opening a product page and coming back; leaving /products clears them.
export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ChatResultsState["results"]>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Results belong to the Products area: they survive opening a product and coming back
  // (/products/:id -> /products), but clear once the shopper leaves for another page.
  useEffect(() => {
    if (!pathname.startsWith("/products")) setResults(null);
  }, [pathname]);

  const goToResults = useCallback(() => {
    navigate("/products");
    // Wait a frame for the Products page to render, then bring the results into view.
    requestAnimationFrame(() =>
      document.getElementById(RESULTS_ANCHOR_ID)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, [navigate]);

  const showResults = useCallback(
    (r: PageResults) => {
      setResults({ ...r, id: Date.now() }); // new id re-runs the card animation
      goToResults();
    },
    [goToResults],
  );

  const clearResults = useCallback(() => setResults(null), []);

  return (
    <ChatResultsContext.Provider value={{ results, showResults, goToResults, clearResults }}>
      {children}
    </ChatResultsContext.Provider>
  );
}

export function useChatResults() {
  const ctx = useContext(ChatResultsContext);
  if (!ctx) throw new Error("useChatResults must be used inside ChatResultsProvider");
  return ctx;
}
