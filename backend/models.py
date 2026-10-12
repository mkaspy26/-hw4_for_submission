"""Pydantic / PydanticAI types shared by the API (main.py), the agent (agent.py), and its tools (tools.py)."""

from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, Field

MAX_CHAT_MESSAGE_CHARS = 1_000
MAX_PRODUCT_CARDS = 30  # a whole category (e.g. all hoodies) can be put on the page


# ---------- Products ----------


class InventoryItem(BaseModel):
    size: str
    quantity: int


class ProductCard(BaseModel):
    """Full product info the website renders (product page, chat product cards)."""

    product_id: str
    name: str
    garment_type: str
    description: str
    colors: list[str]
    search_tags: list[str]
    image_url: str
    price: float
    total_stock: int
    inventory: list[InventoryItem] = []


class ProductSummary(BaseModel):
    """Compact product info returned to the LLM by search tools (fewer tokens than a full card)."""

    product_id: str
    name: str
    garment_type: str
    price: float
    colors: list[str]
    short_description: str  # <= 80 chars; full text via get_product_info (keeps search results small)
    sizes_in_stock: list[str]
    sold_out_sizes: list[str]
    total_stock: int


# ---------- Lookup tool results (Problem 6) ----------
# Every lookup result says where its numbers came from, so the model can't mistake a guess for data.

StockStatus = Literal["in_stock", "low_stock", "sold_out"]


class ProductMatch(BaseModel):
    product_id: str
    name: str


class ProductNotFound(BaseModel):
    """Returned instead of data when the product can't be identified. The model must not guess."""

    found: Literal[False] = False
    query: str
    message: str
    did_you_mean: list[ProductMatch] = []


class ProductInfo(BaseModel):
    """Description lookup: what the item is and looks like."""

    found: Literal[True] = True
    product_id: str
    name: str
    garment_type: str
    description: str
    colors: list[str] = Field(description="First color is usually the garment; others are print/lettering.")
    price_usd: float
    source: Literal["campus_customs.db: catalogue"] = "campus_customs.db: catalogue"


class PriceInfo(BaseModel):
    """Price lookup. `price_usd` is the only price the model may quote for this product."""

    found: Literal[True] = True
    product_id: str
    name: str
    price_usd: float
    price_display: str = Field(description='Exactly how to write the price, e.g. "$68"')
    source: Literal["campus_customs.db: catalogue.price"] = "campus_customs.db: catalogue.price"


class SizeStock(BaseModel):
    size: str
    quantity: int
    status: StockStatus


class StockReport(BaseModel):
    """Stock lookup for one product, optionally focused on one requested size."""

    found: Literal[True] = True
    product_id: str
    name: str
    sizes: list[SizeStock]
    total_in_stock: int
    in_stock_sizes: list[str]
    sold_out_sizes: list[str]
    fully_sold_out: bool
    requested_size: str | None = None
    requested_size_offered: bool | None = Field(
        default=None, description="False if we don't make this size at all (we carry XS-XXL only)."
    )
    requested_size_quantity: int | None = None
    requested_size_status: StockStatus | None = None
    source: Literal["campus_customs.db: inventory"] = "campus_customs.db: inventory"


# ---------- Agent ----------


@dataclass
class ChatDeps:
    """Per-request context the agent and its tools can read. Never holds password hashes.

    Customer fields are filled from the users table for the logged-in shopper only (via the session
    cookie, never from anything the browser claims). Page fields are validated against the DB.
    """

    # Who is chatting (None for guests)
    user_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    # Where they are on the site
    page_path: str = "/"
    viewing_product_id: str | None = None
    viewing_product_name: str | None = None
    # Prices that tools returned during this run; the output validator only allows these in replies.
    verified_prices: set[float] = field(default_factory=set)
    # Dollar amounts the shopper typed (e.g. "under $70"), which the reply may repeat.
    shopper_amounts: set[float] = field(default_factory=set)
    # Stock numbers tools returned this run (per-size quantities, totals, result counts), the numbers
    # the shopper typed, and product names seen (so "1 4 Zip" in a name isn't read as a quantity).
    verified_quantities: set[int] = field(default_factory=set)
    shopper_numbers: set[int] = field(default_factory=set)
    seen_product_names: set[str] = field(default_factory=set)


class AgentReply(BaseModel):
    """Structured output the LLM must return for every chat turn."""

    message: str = Field(
        description="Reply shown to the shopper. Friendly Campus Customs voice, short, light markdown "
        "(**bold**, '- ' bullets) allowed."
    )
    product_ids: list[str] = Field(
        default_factory=list,
        max_length=MAX_PRODUCT_CARDS,
        description="product_id values (from tool results only) of the products this reply recommends "
        "or discusses, in display order. Empty for small talk or when nothing matched.",
    )
    results_heading: str | None = Field(
        default=None,
        max_length=60,
        description="Set ONLY when the shopper is browsing a type/category or search (e.g. 'Hoodies', "
        "'Bulldog gear in size L', 'Crewnecks under $60'): the website then shows product_ids as a "
        "results grid on the page under this heading. Null for questions about one specific item, "
        "stock/price follow-ups, small talk, or no matches.",
    )
    needs_human_review: bool = Field(
        default=False,
        description="True when the request involves a conflict or judgement call you must not decide "
        "yourself (refunds, complaints, a shopper's claim that contradicts the database, anything outside "
        "the rules). The shop owner reviews these in the audit trail.",
    )
    review_reason: str | None = Field(default=None, max_length=200, description="One line: why a human should decide.")


# ---------- Chat API ----------


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4_000)


class PageContext(BaseModel):
    """Where the shopper is on the website when they send a chat message (sent by the browser)."""

    path: str = Field(default="/", max_length=200)
    product_id: str | None = Field(default=None, max_length=120)  # set on /products/:id pages


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_CHAT_MESSAGE_CHARS)
    page: PageContext | None = None
    # Only used for shoppers who aren't logged in; logged-in history is loaded from the DB.
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)


class PageResults(BaseModel):
    """Search results the website renders as a product grid on the page (the chat -> page contract)."""

    heading: str
    query: str  # the shopper message that produced these results
    products: list[ProductCard]
    total: int


class ChatReply(BaseModel):
    reply: str
    products: list[ProductCard] = []  # cards shown inside the chat bubble
    page_results: PageResults | None = None  # when set, the website updates the page with these


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductCard] = []
    created_at: str


class CustomerProfile(BaseModel):
    """What the agent may look up about the logged-in shopper (themselves only)."""

    logged_in: Literal[True] = True
    first_name: str
    last_name: str
    email: str
    member_since: str
    saved_chat_messages: int


class NotLoggedIn(BaseModel):
    logged_in: Literal[False] = False
    message: str = "The shopper is a guest (not logged in), so there is no account to look up."


# ---------- Auth ----------


class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PublicUser(BaseModel):
    """What the browser (and the agent) may know about a user. No password_hash, ever."""

    id: int
    first_name: str
    last_name: str
    email: str
