import { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { formatPrice, Product } from "../api";

const LOW_STOCK = 5;

export const shorten = (text: string, max = 90) =>
  text.length <= max ? text : text.slice(0, text.lastIndexOf(" ", max)) + "…";

// One card used everywhere (catalogue grid and chat results), so every card opens the same
// single-item page at /products/:id.
export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const inventory = product.inventory ?? [];
  const lowSizes = inventory.filter((i) => i.quantity > 0 && i.quantity <= LOW_STOCK).map((i) => i.size);

  return (
    <Link
      to={`/products/${product.product_id}`}
      className="card"
      style={{ "--i": index } as CSSProperties}
      data-product-id={product.product_id}
    >
      <div className="card-img">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        <span className="card-view">View details →</span>
        {product.total_stock === 0 ? (
          <span className="badge badge-overlay">Sold out</span>
        ) : (
          lowSizes.length > 0 && (
            <span className="badge badge-overlay badge-low">Few left: {lowSizes.join(", ")}</span>
          )
        )}
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>
        <p className="price">{formatPrice(product.price)}</p>
        <p className="muted small">{shorten(product.description)}</p>
        {inventory.length > 0 && (
          <div className="size-chips" aria-label="Sizes">
            {inventory.map((i) => (
              <span key={i.size} className={i.quantity === 0 ? "chip out" : "chip"}>
                {i.size}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
