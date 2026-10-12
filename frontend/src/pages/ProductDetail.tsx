import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProduct, formatPrice, Product } from "../api";
import { OPEN_CHAT_EVENT } from "../components/ChatWidget";
import Secret from "../components/Secret";
import HandsomeDan from "../components/HandsomeDan";
// "From the Head's Study" flavour notes (written once by backend/generate_college_notes.py).
// They're style, not facts: description, price, and stock always come from the database.
import collegeNotes from "../collegeNotes.json";

const NOTES = collegeNotes as Record<string, { note: string; college: string }>;

export default function ProductDetail() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    setProduct(null);
    fetchProduct(productId).then(setProduct).catch((e) => setError(String(e)));
  }, [productId]);

  if (error) return <p className="error">Couldn't load this product ({error}).</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <>
      <Link to="/products" className="back">
        ← Back to products
      </Link>
      <Secret id="bowl" className="detail-secret" />
      <div className="detail">
        <img src={product.image_url} alt={product.name} className="detail-img" />
        <div className="detail-info">
          <p className="eyebrow">{product.garment_type}</p>
          <h1>{product.name}</h1>
          <p className="price big">{formatPrice(product.price)}</p>
          <p className="detail-desc">{product.description}</p>

          {NOTES[product.product_id] && (
            <blockquote className="head-note">
              <span className="head-note-kicker">✒ From the Head's Study · {NOTES[product.product_id].college}</span>
              <p>{NOTES[product.product_id].note}</p>
            </blockquote>
          )}

          <h3>Colors</h3>
          <p>{product.colors.join(", ")}</p>

          <h3>Sizes &amp; Stock</h3>
          <div className="sizes">
            {product.inventory?.map((i) => (
              <div key={i.size} className={`size ${i.quantity === 0 ? "out" : ""}`}>
                <strong>{i.size}</strong>
                <span>{i.quantity === 0 ? "Sold out" : `${i.quantity} left`}</span>
              </div>
            ))}
          </div>
          <p className="muted small">{product.total_stock} total in stock</p>

          <button className="btn ask-btn" onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}>
            <HandsomeDan size={30} variant="head" /> Ask Sir Handsome Dan about this item
          </button>
          <p className="muted small">Sir Handsome Dan knows you're looking at this one. Ask about sizes, colors, or similar styles.</p>
        </div>
      </div>
    </>
  );
}
