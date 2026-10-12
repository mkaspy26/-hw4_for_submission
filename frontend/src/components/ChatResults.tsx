import { RESULTS_ANCHOR_ID, useChatResults } from "../ChatResultsContext";
import ProductCard from "./ProductCard";

// The "page" half of the chat search feature: renders the agent's PageResults as a product grid.
export default function ChatResults() {
  const { results, clearResults } = useChatResults();
  if (!results) return null;

  return (
    <section id={RESULTS_ANCHOR_ID} className="chat-results" key={results.id}>
      <div className="chat-results-header">
        <div>
          <p className="eyebrow">👑 Chosen for you by Sir Handsome Dan</p>
          <h2>
            {results.heading} <span className="count-pill">{results.total}</span>
          </h2>
          <p className="chat-results-query">You asked: “{results.query}”</p>
        </div>
        <button className="btn-ghost" onClick={clearResults}>
          Clear results
        </button>
      </div>
      <div className="grid">
        {results.products.map((p, i) => (
          <ProductCard key={p.product_id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
