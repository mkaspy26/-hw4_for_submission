# Campus Customs: Usability Improvements (Problem 9)

Four improvements: two on the website (front end) and two on the agent/backend. Each section says **what I added** and **why it helps the shopper or the business**. Results are filled in after building and testing in the running app.

---

## Front end

### F1. Filter and sort on the Products page

**What I'm adding:** a filter bar above the catalogue:
- **Category pills:** All · Hoodies · Crewnecks · T-Shirts · Quarter-Zips · Jackets & Fleece · Long Sleeves, each with a live count.
- **"In stock in my size"** dropdown (XS–XXL). It hides anything sold out in that size.
- **Sort:** Featured / Price low→high / Price high→low / Name.
- The text search box still works on top of these, and a "Clear filters" link resets everything.

**Why it helps:**
- *Shopper:* 102 products in one long grid is a lot of scrolling. Most shoppers think "I want a hoodie, size M, cheapest first". This turns that into two clicks.
- *Shopper:* the size filter means you stop clicking into items only to find your size is sold out (145 of 612 size rows are sold out).
- *Business:* faster discovery means fewer people leaving before they find something. Filtering by in-stock size steers shoppers to products we can actually sell.

### F2. Smart suggestion chips in the chat + "Ask about this item"

**What I'm adding:**
- Clickable **suggested questions** above the chat input. They change with the page:
  - *On a product page:* "What sizes are in stock?", "What colors does it come in?", "Show me similar items".
  - *Everywhere else:* "Show me hoodies", "Gifts under $40", "What's in stock in size M?", "Cheapest crewneck?".
- One click sends the question.
- An **"💬 Ask about this item"** button on each product page that opens the chat ready to talk about that product.

**Why it helps:**
- *Shopper:* many people don't know what a shop chatbot can do, so a blank text box is intimidating. Chips show the useful questions and save typing (especially on a phone).
- *Shopper:* the product-page chips use the page context from Problem 8, so "What sizes are in stock?" just works for the item they're viewing.
- *Business:* more people use the assistant, and it answers stock and size questions that would otherwise become emails to orderdept@ or abandoned carts.

---

## Agent / backend

### B1. Faster, cheaper agent (smaller tool results + fewer model calls + cost logging)

**What I'm adding:**
1. **Leaner search results:** `search_products` returns a `short_description` (≤ 80 characters) instead of the full description. The full text is still one call away with `get_product_info`.
2. **Direct lookups:** a prompt rule that when the shopper names a specific item, the agent calls `check_stock` / `get_price` with that name directly instead of searching first. That saves a whole model round trip.
3. **Usage logging:** every `/api/chat` request logs model calls, input/output tokens, tool calls, and latency to the server log (e.g. `chat tokens_in=… tokens_out=… requests=… ms=…`).

**Why it helps:**
- *Shopper:* fewer and smaller model calls mean faster replies in the chat box.
- *Business:* every token sent through Portkey costs money. Input tokens are ~98% of our usage (baseline: 56,821 in vs 1,116 out for 5 test questions), so trimming what we send the model is the biggest lever on cost. The log lets the shop see the cost per conversation and spot expensive questions.

**Baseline (before), the same 5 questions:** 56,821 input tokens, 1,116 output tokens, **avg 5.2 s** per reply. A hoodie search returned 11,535 characters, and named-item stock questions took 3 model calls.

### B2. Stock-number guardrail (no invented quantities)

**What I'm adding:** a second output validator next to the price check from Problem 6.
- Every stock count in the agent's reply ("only **2** left", "25 available", "3 in stock") must match a quantity a tool returned **this turn**.
- If not, PydanticAI sends the model back with a `ModelRetry` to call `check_stock`.
- The tools record every quantity they return in `ChatDeps.verified_quantities`.

**Why it helps:**
- *Shopper:* a wrong "we have 10 left" means someone drives to 57 Broadway or orders a size that doesn't exist. Stock numbers are now as trustworthy as prices.
- *Business:* this closes the "known gap" noted in harness section 4.3. Invented stock leads to cancelled orders, refunds, and lost trust, and this blocks it automatically instead of relying on the prompt alone.

---

## Results (verified in the running app)

All four were tested in the running app (FastAPI on :8000 + Vite on :5173). The counts were checked against `campus_customs.db`.

### F1. Filter and sort ✅
| Action on /products | Result | DB check |
|---|---|---|
| Page load | Pills: All 102 · Hoodies 27 · Quarter-Zips 11 · Jackets & Fleece 8 · T-Shirts 25 · Long Sleeves 2 · Crewnecks 29 (every product lands in a category) | 102 ✅ |
| Click **Hoodies** | 27 items | 27 hooded items ✅ |
| **In stock in: L** | "20 items in stock in L". All pill counts update (All 78) | 20 hoodies, 78 products with L > 0 ✅ |
| **Sort: Price low→high** | First card: Yale Sports Hoodie Tennis **$45**, then the $68 hoodies | min = $45 ✅ |
| Sold-out check | No card in the L view has L crossed out | ✅ |
| **Clear filters** / no matches | Resets everything. An empty state appears with a Clear button | ✅ |

The filter bar sticks under the nav while scrolling. Catalogue cards now also show size chips and "Few left" badges, because `GET /api/products` returns per-size inventory (one extra SQL query for all 612 rows).

### F2. Suggestion chips + "Ask about this item" ✅
- On `/products/fencing-left-chest-hoodie`, clicking **💬 Ask about this item** opened the chat. The header chip read "👀 Asking about: Fencing Left Chest Hoodie".
- Product-page chips showed: *What sizes are in stock? · What colors does it come in? · Show me similar items*.
- Clicking **"What sizes are in stock?"** sent it, and the agent replied "in stock in **S, M, and XL**. **XS, L, and XXL are sold out**" ✅ (matches the DB).
- Off product pages the chips switch to *Show me hoodies · Gifts under $40 · What's in stock in size M? · Cheapest crewneck?*.
- Chips hide while the assistant is thinking, so nobody double-sends.

### B1. Faster, cheaper agent ✅
The same 5 benchmark questions, run directly against the agent through Portkey:

| | Before | After | Change |
|---|---|---|---|
| Input tokens (5 questions) | 56,821 | 47,701 | **−16%** |
| Output tokens | 1,116 | 1,088 | −3% |
| Avg reply time | 5.2 s | 4.5 s | **−13%** |
| "is the sailing left chest hoodie in stock in L?" | 3 model calls, 17,527 tokens, 6.5 s | 2 calls, 7,643 tokens, 3.6 s | **−56% tokens, −45% time** |
| Hoodie search result size | 11,535 chars | 9,927 chars | −14% |
| `search_products` speed | 1.8 ms (103 SQL queries) | 1.3 ms (2 queries) | −28% |

- **Prompt caching** (found while measuring): Azure/OpenAI caches the repeated start of the prompt automatically, e.g. 7,154 of 7,510 input tokens cached (~95%). Cached tokens are billed at a steep discount. It works because the static `prompt.md` comes first and the per-shopper sections (name, page) come after it. The usage log now shows `cached=` so this stays visible.
- **Usage log**, in the running server console:
  ```
  INFO:     chat user=guest requests=2 tokens_in=7510 (cached=7154) tokens_out=74 tools=get_price ms=4069
  INFO:     chat user=1 requests=2 tokens_in=9495 (cached=0) tokens_out=91 tools=check_stock ms=4474
  ```

### B2. Stock-number guardrail ✅
- **It catches invented numbers.** A scripted test model first answered "Only **9** left in XL!" without checking. The validator rejected it ("Your reply states a stock quantity of 9, but no tool returned that number…"), the model then called `check_stock`, and the final reply was "Only **2** left in XL!" (the real DB value).
- **No false alarms on real answers.** 8 live questions → **0 guardrail retries**, and every quoted number matched SQL: "Only **2** 2025 Yale vs. Harvard T-Shirts left in L" (L = 2), "**20** Ice Hockey Left Chest Hoodies in XS" (XS = 20), "I found **27 hoodies**" (result counts are allowed).
- Product names are blanked out before scanning, so "School of Art **1 4** Zip … in stock" and "**2025** Yale vs Harvard" aren't mistaken for quantities.

