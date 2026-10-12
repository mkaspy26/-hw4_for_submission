"""Database helpers and the tools the Campus Customs agent can call.

Every tool is read-only. Product tools only touch `catalogue` and `inventory`.
`get_customer_profile` reads only the logged-in shopper's own row (by the user id from their session
cookie, never a user id chosen by the LLM) and never selects `password_hash`.
"""

import json
import re
import sqlite3
from difflib import SequenceMatcher
from pathlib import Path
from typing import Literal

from pydantic_ai import RunContext

from models import (
    ChatDeps,
    CustomerProfile,
    InventoryItem,
    NotLoggedIn,
    PriceInfo,
    ProductCard,
    ProductInfo,
    ProductMatch,
    ProductNotFound,
    ProductSummary,
    SizeStock,
    StockReport,
    StockStatus,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "campus_customs.db"
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
MAX_SEARCH_RESULTS = 30

# Shopper words -> words that actually appear in the catalogue text.
SYNONYMS = {
    "tee": ["t-shirt"],
    "tees": ["t-shirt"],
    "tshirt": ["t-shirt"],
    "shirt": ["t-shirt", "shirt"],
    "sweatshirt": ["sweatshirt", "crewneck", "hoodie"],
    "sweater": ["sweater", "crewneck", "fleece"],
    "hoody": ["hoodie"],
    "fleece": ["fleece"],
    "zip": ["zip"],
    "quarterzip": ["quarter-zip", "1/4"],
    "grey": ["gray"],
    "blue": ["blue", "navy"],
    "dan": ["bulldog"],
    "handsome": ["bulldog"],
    "jacket": ["jacket"],
    "shorts": ["shorts"],  # listed so it isn't stemmed to "short" (which matches "short-sleeve")
    "pants": ["pants"],
}
STOPWORDS = {
    "a", "an", "the", "any", "some", "with", "on", "in", "for", "of", "and", "or", "do", "you",
    "have", "got", "u", "me", "show", "i", "want", "looking", "yale", "item", "items", "something",
}


# ---------- Database helpers (also used by main.py) ----------


def get_db(write: bool = False) -> sqlite3.Connection:
    # Read-only unless a caller explicitly needs to write (signup, saving chat messages).
    mode = "rw" if write else "ro"
    conn = sqlite3.connect(f"file:{DB_PATH}?mode={mode}", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def product_from_row(row: sqlite3.Row) -> dict:
    return {
        "product_id": row["product_id"],
        "name": row["name"],
        "garment_type": row["garment_type"],
        "description": row["description"],
        "colors": json.loads(row["colors"]),
        "search_tags": json.loads(row["search_tags"]),
        "image_url": f"/media/{row['image_file_path']}",
        "price": row["price"],
    }


def inventory_for(conn: sqlite3.Connection, product_id: str) -> list[InventoryItem]:
    rows = conn.execute(
        "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
    ).fetchall()
    inv = [InventoryItem(size=r["size"], quantity=r["quantity"]) for r in rows]
    return sorted(inv, key=lambda i: SIZE_ORDER.index(i.size) if i.size in SIZE_ORDER else 99)


def load_product_card(conn: sqlite3.Connection, product_id: str) -> ProductCard | None:
    row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (product_id,)).fetchone()
    if row is None:
        return None
    inventory = inventory_for(conn, product_id)
    return ProductCard(
        **product_from_row(row),
        inventory=inventory,
        total_stock=sum(i.quantity for i in inventory),
    )


def product_cards(product_ids: list[str]) -> list[ProductCard]:
    """Fresh cards straight from the DB, so prices and stock shown are never LLM-written.
    Unknown ids (e.g. a hallucinated id) are silently dropped."""
    cards: list[ProductCard] = []
    seen: set[str] = set()
    with get_db() as conn:
        for pid in product_ids:
            if pid in seen:
                continue
            seen.add(pid)
            card = load_product_card(conn, pid)
            if card:
                cards.append(card)
    return cards


def shorten(text: str, max_chars: int = 80) -> str:
    if len(text) <= max_chars:
        return text
    return text[: text.rfind(" ", 0, max_chars)].rstrip(",;") + "…"


def _terms(query: str) -> list[list[str]]:
    """Split a shopper query into terms; each term is a list of acceptable spellings."""
    words = re.findall(r"[a-z0-9/\-]+", query.lower())
    terms = []
    for w in words:
        if w in STOPWORDS:
            continue
        options = {w, *SYNONYMS.get(w, [])}
        if w not in SYNONYMS and len(w) > 3 and w.endswith("s"):
            options.add(w[:-1])  # hoodies -> hoodie
        terms.append(sorted(options))
    return terms


# ---------- Agent tools ----------


def search_products(
    ctx: RunContext[ChatDeps],
    query: str = "",
    garment_type: str | None = None,
    color: str | None = None,
    max_price: float | None = None,
    size: str | None = None,
    in_stock_only: bool = False,
    sort_by: Literal["relevance", "price_low_to_high", "price_high_to_low"] = "relevance",
) -> list[ProductSummary]:
    """Search the Campus Customs catalogue to FIND products (and their product_ids). Use this before
    naming or recommending products. For a specific item's exact price or stock, follow up with
    get_price / check_stock.

    Args:
        query: Free-text keywords, e.g. "bulldog", "hockey hoodie", "harvard". Matched against name,
            description, colors, and tags. Leave empty to filter only.
        garment_type: Optional category word, e.g. "hoodie", "crewneck", "t-shirt", "quarter-zip", "fleece", "jacket".
        color: Optional color, e.g. "navy", "gray", "white".
        max_price: Optional maximum price in USD.
        size: Optional size (XS, S, M, L, XL, XXL; "medium" etc. also work). Only returns products
            with that size in stock.
        in_stock_only: If true, only return products with at least one size in stock.
        sort_by: "price_low_to_high" for questions like "what's your cheapest...", "price_high_to_low"
            for the most expensive; otherwise "relevance".
    """
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM catalogue").fetchall()
        stock: dict[str, dict[str, int]] = {}
        for r in conn.execute("SELECT product_id, size, quantity FROM inventory"):
            stock.setdefault(r["product_id"], {})[r["size"]] = r["quantity"]

    terms = _terms(query)
    size = normalize_size(size) if size else None
    scored: list[tuple[int, ProductSummary]] = []
    for row in rows:
        p = product_from_row(row)
        haystack = " ".join(
            [p["name"], p["garment_type"], p["description"], *p["colors"], *p["search_tags"]]
        ).lower()

        if garment_type:
            type_text = " ".join([p["garment_type"], p["name"], *p["search_tags"]]).lower()
            if not all(any(opt in type_text for opt in term) for term in _terms(garment_type)):
                continue
        if color:
            color_text = " ".join(p["colors"]).lower()
            options = {color.lower(), *SYNONYMS.get(color.lower(), [])}
            if not any(opt in color_text for opt in options):
                continue
        if max_price is not None and p["price"] > max_price:
            continue

        sizes = stock.get(p["product_id"], {})
        total = sum(sizes.values())
        if size and sizes.get(size, 0) <= 0:
            continue
        if in_stock_only and total <= 0:
            continue

        score = sum(any(opt in haystack for opt in term) for term in terms)
        if terms and score == 0:
            continue

        scored.append((score, ProductSummary(
            product_id=p["product_id"],
            name=p["name"],
            garment_type=p["garment_type"],
            price=p["price"],
            colors=p["colors"],
            short_description=shorten(p["description"]),
            sizes_in_stock=[s for s in SIZE_ORDER if sizes.get(s, 0) > 0],
            sold_out_sizes=[s for s in SIZE_ORDER if sizes.get(s, 0) <= 0],
            total_stock=total,
        )))

    if sort_by == "price_low_to_high":
        scored.sort(key=lambda t: (t[1].price, -t[0], t[1].name))
    elif sort_by == "price_high_to_low":
        scored.sort(key=lambda t: (-t[1].price, -t[0], t[1].name))
    else:
        scored.sort(key=lambda t: (-t[0], t[1].name))
    results = [s for _, s in scored[:MAX_SEARCH_RESULTS]]
    ctx.deps.verified_prices.update(r.price for r in results)
    ctx.deps.verified_quantities.update(r.total_stock for r in results)
    ctx.deps.verified_quantities.add(len(results))  # "I found 27 hoodies"
    ctx.deps.seen_product_names.update(r.name for r in results)
    return results


# ---------- Lookup tools: description, price, stock (Problem 6) ----------

LOW_STOCK_THRESHOLD = 5  # 1-5 units left -> "low_stock" so the agent can say "only N left"

SIZE_ALIASES = {
    "xs": "XS", "extra small": "XS", "x-small": "XS", "xsmall": "XS",
    "s": "S", "small": "S", "sm": "S",
    "m": "M", "medium": "M", "med": "M",
    "l": "L", "large": "L", "lg": "L",
    "xl": "XL", "extra large": "XL", "x-large": "XL", "xlarge": "XL",
    "xxl": "XXL", "2xl": "XXL", "xx-large": "XXL", "xxlarge": "XXL", "extra extra large": "XXL",
}


def normalize_size(size: str) -> str:
    """'medium' -> 'M', '2xl' -> 'XXL'. Unknown sizes come back uppercased (e.g. 'XXXL')."""
    key = size.strip().lower()
    return SIZE_ALIASES.get(key, size.strip().upper())


def stock_status(quantity: int) -> StockStatus:
    if quantity <= 0:
        return "sold_out"
    return "low_stock" if quantity <= LOW_STOCK_THRESHOLD else "in_stock"


def _resolve_product(conn: sqlite3.Connection, product: str) -> sqlite3.Row | ProductNotFound:
    """Find a catalogue row by exact product_id or by (fuzzy) product name."""
    text = product.strip()
    row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (text,)).fetchone()
    if row:
        return row
    row = conn.execute("SELECT * FROM catalogue WHERE LOWER(name) = ?", (text.lower(),)).fetchone()
    if row:
        return row

    rows = conn.execute("SELECT * FROM catalogue").fetchall()
    query = re.sub(r"[^a-z0-9 ]", " ", text.lower())
    scored = sorted(
        ((SequenceMatcher(None, query, r["name"].lower()).ratio(), r) for r in rows),
        key=lambda t: -t[0],
    )
    best_score, best = scored[0]
    runner_up = scored[1][0] if len(scored) > 1 else 0
    if best_score >= 0.85 and best_score - runner_up >= 0.05:
        return best
    return ProductNotFound(
        query=product,
        message="No exact match. Don't guess: ask the shopper which one, or call search_products.",
        did_you_mean=[ProductMatch(product_id=r["product_id"], name=r["name"]) for _, r in scored[:5]],
    )


def get_product_info(ctx: RunContext[ChatDeps], product: str) -> ProductInfo | ProductNotFound:
    """Look up a product's description, colors, garment type, and price from the database.
    Call this whenever the shopper asks what an item is, looks like, or is made with.

    Args:
        product: The product_id (preferred, e.g. "basic-hoodie-big-yale") or the exact product name.
    """
    with get_db() as conn:
        row = _resolve_product(conn, product)
    if isinstance(row, ProductNotFound):
        return row
    p = product_from_row(row)
    ctx.deps.verified_prices.add(p["price"])
    ctx.deps.seen_product_names.add(p["name"])
    return ProductInfo(
        product_id=p["product_id"],
        name=p["name"],
        garment_type=p["garment_type"],
        description=p["description"],
        colors=p["colors"],
        price_usd=p["price"],
    )


def get_price(ctx: RunContext[ChatDeps], product: str) -> PriceInfo | ProductNotFound:
    """Look up the exact current price of one product from the database. Call this for every
    price question ("how much is...", "is it under $60?") and quote `price_display` exactly.

    Args:
        product: The product_id (preferred) or the exact product name.
    """
    with get_db() as conn:
        row = _resolve_product(conn, product)
    if isinstance(row, ProductNotFound):
        return row
    price = row["price"]
    ctx.deps.verified_prices.add(price)
    ctx.deps.seen_product_names.add(row["name"])
    display = f"${price:.0f}" if price == int(price) else f"${price:.2f}"
    return PriceInfo(product_id=row["product_id"], name=row["name"], price_usd=price, price_display=display)


def check_stock(
    ctx: RunContext[ChatDeps], product: str, size: str | None = None
) -> StockReport | ProductNotFound:
    """Look up live stock for a product from the database: quantity and status for every size,
    plus the requested size if given. Call this for EVERY availability question ("do you have it
    in M?", "how many are left?") and before saying any size is available.

    Args:
        product: The product_id (preferred) or the exact product name.
        size: Optional size the shopper asked about, e.g. "M", "medium", "XL", "2XL".
    """
    with get_db() as conn:
        row = _resolve_product(conn, product)
        if isinstance(row, ProductNotFound):
            return row
        inventory = inventory_for(conn, row["product_id"])

    sizes = [SizeStock(size=i.size, quantity=i.quantity, status=stock_status(i.quantity)) for i in inventory]
    report = StockReport(
        product_id=row["product_id"],
        name=row["name"],
        sizes=sizes,
        total_in_stock=sum(s.quantity for s in sizes),
        in_stock_sizes=[s.size for s in sizes if s.quantity > 0],
        sold_out_sizes=[s.size for s in sizes if s.quantity <= 0],
        fully_sold_out=all(s.quantity <= 0 for s in sizes),
    )
    ctx.deps.verified_quantities.update(s.quantity for s in sizes)
    ctx.deps.verified_quantities.add(report.total_in_stock)
    ctx.deps.seen_product_names.add(row["name"])
    if size:
        wanted = normalize_size(size)
        match = next((s for s in sizes if s.size == wanted), None)
        report.requested_size = wanted
        report.requested_size_offered = match is not None
        report.requested_size_quantity = match.quantity if match else 0
        report.requested_size_status = match.status if match else "sold_out"
    return report


def list_categories(ctx: RunContext[ChatDeps]) -> dict:
    """Overview of what the shop sells: product counts per garment type and the price range.
    Use for broad questions like "what do you sell?"."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT LOWER(garment_type) AS t, COUNT(*) AS n, MIN(price) AS lo, MAX(price) AS hi "
            "FROM catalogue GROUP BY LOWER(garment_type) ORDER BY n DESC"
        ).fetchall()
        lo, hi, total = conn.execute("SELECT MIN(price), MAX(price), COUNT(*) FROM catalogue").fetchone()
    ctx.deps.verified_prices.update(v for r in rows for v in (r["lo"], r["hi"]))
    return {
        "total_products": total,
        "price_range_usd": [lo, hi],
        "garment_types": {r["t"]: {"count": r["n"], "price_range_usd": [r["lo"], r["hi"]]} for r in rows},
        "sizes_offered": SIZE_ORDER,
    }


# ---------- Customer tool (Problem 8) ----------


def get_customer_profile(ctx: RunContext[ChatDeps]) -> CustomerProfile | NotLoggedIn:
    """Look up the CURRENT shopper's own account: name, email on file, member-since date, and how many
    chat messages are saved. Use when they ask about their account ("what email do I have on file?",
    "when did I sign up?"). Takes no arguments: it can only ever return the shopper's own account."""
    if ctx.deps.user_id is None:
        return NotLoggedIn()
    with get_db() as conn:
        row = conn.execute(
            "SELECT first_name, last_name, name, email, created_at FROM users WHERE id = ?",
            (ctx.deps.user_id,),
        ).fetchone()
        count = conn.execute(
            "SELECT COUNT(*) FROM chat_messages WHERE user_id = ?", (ctx.deps.user_id,)
        ).fetchone()[0]
    if row is None:
        return NotLoggedIn()
    return CustomerProfile(
        first_name=row["first_name"] or row["name"].split(" ")[0],
        last_name=row["last_name"] or "",
        email=row["email"],
        member_since=row["created_at"][:10],
        saved_chat_messages=count,
    )


TOOLS = [search_products, get_product_info, get_price, check_stock, list_categories, get_customer_profile]
