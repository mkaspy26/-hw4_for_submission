import { useEffect, useMemo, useState } from "react";
import { fetchProducts, Product } from "../api";
import { useChatResults } from "../ChatResultsContext";
import ChatResults from "../components/ChatResults";
import ProductCard from "../components/ProductCard";
import Secret from "../components/Secret";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// Category rules cover the catalogue's 22 different garment_type spellings (checked: all 102 products match one).
const CATEGORIES: { label: string; test: (s: string) => boolean }[] = [
  { label: "Hoodies", test: (s) => s.includes("hood") },
  { label: "Quarter-Zips", test: (s) => /quarter-zip|1 4 zip|1\/4/.test(s) },
  { label: "Jackets & Fleece", test: (s) => /jacket|fleece/.test(s) },
  { label: "T-Shirts", test: (s) => /t-shirt|t shirt|\btee\b/.test(s) },
  { label: "Long Sleeves", test: (s) => /long-sleeve|long sleeve|performance/.test(s) },
  { label: "Crewnecks", test: (s) => /crew|sweatshirt|mockneck/.test(s) },
];

export function categoryOf(p: Product): string {
  const s = `${p.garment_type} ${p.name}`.toLowerCase();
  return CATEGORIES.find((c) => c.test(s))?.label ?? "Other";
}

type Sort = "featured" | "price-asc" | "price-desc" | "name";

export default function Products() {
  const { results } = useChatResults();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState<Sort>("featured");

  useEffect(() => {
    fetchProducts().then(setProducts).catch((e) => setError(String(e)));
  }, []);

  const inSize = (p: Product) => !size || (p.inventory ?? []).some((i) => i.size === size && i.quantity > 0);
  const matchesQuery = (p: Product) => {
    const q = query.trim().toLowerCase();
    return !q || [p.name, p.garment_type, p.description, ...p.colors, ...p.search_tags].join(" ").toLowerCase().includes(q);
  };

  // Counts on each pill reflect the size + text filters, so shoppers see what's actually available.
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: 0 };
    for (const p of products ?? []) {
      if (!inSize(p) || !matchesQuery(p)) continue;
      c.All++;
      const cat = categoryOf(p);
      c[cat] = (c[cat] ?? 0) + 1;
    }
    return c;
  }, [products, size, query]);

  const shown = useMemo(() => {
    const list = (products ?? []).filter(
      (p) => inSize(p) && matchesQuery(p) && (category === "All" || categoryOf(p) === category),
    );
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, size, query, sort]);

  const filtered = category !== "All" || size || query || sort !== "featured";
  const clear = () => {
    setCategory("All");
    setSize("");
    setQuery("");
    setSort("featured");
  };

  return (
    <>
      <ChatResults />
      <div className="products-header">
        <div>
          <p className="eyebrow">The Collection</p>
          <h1>
            {results ? "Browse Everything" : "Regalia of the Old Stones"} <Secret id="beinecke" />
          </h1>
        </div>
        <input
          className="search"
          placeholder="Search hoodies, navy, bulldog…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <div className="pills" role="tablist" aria-label="Category">
          {["All", ...CATEGORIES.map((c) => c.label)].map((label) => (
            <button
              key={label}
              role="tab"
              aria-selected={category === label}
              className={`pill ${category === label ? "active" : ""}`}
              onClick={() => setCategory(label)}
            >
              {label} <span className="pill-count">{counts[label] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="filter-controls">
          <label>
            In stock in
            <select value={size} onChange={(e) => setSize(e.target.value)} aria-label="Size">
              <option value="">Any size</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          {filtered && (
            <button className="link-btn" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">Couldn't load products ({error}). Is the backend running?</p>}
      {!products && !error && <p>Loading products…</p>}
      {products && (
        <>
          <p className="muted">
            {shown.length} {shown.length === 1 ? "item" : "items"}
            {size && ` in stock in ${size}`}
          </p>
          {shown.length === 0 ? (
            <div className="empty">
              <p>Nothing matches those filters.</p>
              <button className="btn" onClick={clear}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid">
              {shown.map((p, i) => (
                <ProductCard key={p.product_id} product={p} index={Math.min(i, 12)} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
