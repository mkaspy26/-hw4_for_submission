"""Campus Customs chat agent: wires the model (via Portkey), the system prompt, and the tools.

main.py calls `run_chat(...)` for every chat message from the website.
"""

import asyncio
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from openai import APITimeoutError, AsyncOpenAI
from pydantic import BaseModel
from pydantic_ai import Agent, ModelRetry, RunContext, capture_run_messages
from pydantic_ai.exceptions import ModelHTTPError, UsageLimitExceeded
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    RetryPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models.openai import OpenAIChatModel, OpenAIChatModelSettings
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

from models import AgentReply, ChatDeps, ChatReply, ChatTurn, PageResults
from tools import TOOLS, get_db, product_cards

BACKEND_DIR = Path(__file__).resolve().parent
PROMPT_PATH = BACKEND_DIR / "prompts" / "prompt.md"
PROJECT_ENV_PATH = BACKEND_DIR.parent / ".env"  # copy of the top-level .env.example with real values
LOCAL_ENV_PATH = BACKEND_DIR / ".env"  # (also accepted, for older setups)
COURSE_ENV_PATH = BACKEND_DIR.parent.parent / ".portkey.env"  # course secret file (fallback)
PORTKEY_BASE_URL = "https://api.portkey.ai/v1"

log = logging.getLogger("uvicorn.error.campus_customs")  # shows up in the Uvicorn console

HISTORY_TURNS = 20  # most recent messages replayed to the model each turn
# Per-message budget for the agent loop. Measured normal runs: 2-3 model requests, 1-4 tool calls,
# 7k-12k total tokens (worst seen: 3 requests / 17.5k). Limits leave ~2x headroom, then stop.
MAX_MODEL_REQUESTS = 6
MAX_TOOL_CALLS = 8
MAX_TOTAL_TOKENS = 30_000
LIMITS = UsageLimits(
    request_limit=MAX_MODEL_REQUESTS,
    tool_calls_limit=MAX_TOOL_CALLS,
    total_tokens_limit=MAX_TOTAL_TOKENS,
)


def _read_env_file(path: Path) -> None:
    """Copy KEY=value lines into the environment without overriding real env vars."""
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                if value.strip():
                    os.environ.setdefault(key.strip(), value.strip())


_read_env_file(PROJECT_ENV_PATH)
_read_env_file(LOCAL_ENV_PATH)
_read_env_file(COURSE_ENV_PATH)

if not os.getenv("PORTKEY_API_KEY"):
    raise SystemExit(
        f"PORTKEY_API_KEY not found. Copy .env.example to {PROJECT_ENV_PATH} and add your key "
        "(or set the PORTKEY_API_KEY environment variable)."
    )

MODEL_NAME = os.getenv("CAMPUS_CHAT_MODEL") or "gpt-5.6-luna"

# Portkey speaks the OpenAI API, so the OpenAI client just points at Portkey's URL.
MODEL_CALL_TIMEOUT_S = 30  # one model request
RUN_TIMEOUT_S = 60  # the whole agent loop for one chat message

CLIENT = AsyncOpenAI(
    api_key=os.environ["PORTKEY_API_KEY"],
    base_url=PORTKEY_BASE_URL,
    default_headers={"x-portkey-provider": "openai"},
    timeout=MODEL_CALL_TIMEOUT_S,
    max_retries=1,
)
MODEL = OpenAIChatModel(MODEL_NAME, provider=OpenAIProvider(openai_client=CLIENT))
# Azure (behind Portkey) rejects function tools + reasoning on /chat/completions, so reasoning is off.
SETTINGS = OpenAIChatModelSettings(openai_reasoning_effort="none", max_tokens=1_200)


def load_prompt() -> str:
    # Read on every run so edits to prompt.md apply without restarting the server.
    return PROMPT_PATH.read_text()


shop_agent = Agent(
    MODEL,
    deps_type=ChatDeps,
    output_type=AgentReply,
    tools=TOOLS,
    model_settings=SETTINGS,
    retries=3,
)


@shop_agent.instructions
def system_prompt(ctx: RunContext[ChatDeps]) -> str:
    return load_prompt()


@shop_agent.instructions
def shopper_context(ctx: RunContext[ChatDeps]) -> str:
    """Who is chatting. Filled from the users table via the session cookie, so it can be trusted."""
    d = ctx.deps
    if d.user_id is None:
        return (
            "## Current shopper\nA guest (not logged in). You don't know their name or email. Don't ask "
            "for them; if they want saved chat history, suggest creating an account."
        )
    full_name = f"{d.first_name} {d.last_name}".strip()
    return (
        f"## Current shopper\nLogged in as **{full_name}** (first name: {d.first_name}; email on file: "
        f"{d.email}). Their earlier conversations with you are included above as message history, so "
        "you can pick up where you left off. Use get_customer_profile for account questions. Only "
        "mention their email if they ask about their account."
    )


@shop_agent.instructions
def page_context(ctx: RunContext[ChatDeps]) -> str:
    """Where the shopper is on the site. The product id was checked against the DB in main.py."""
    d = ctx.deps
    if d.viewing_product_id:
        return (
            f"## Current page\nThe shopper is looking at the product page for **{d.viewing_product_name}** "
            f"(product_id: `{d.viewing_product_id}`). When they say \"this\", \"it\", \"this one\", or ask "
            "about colors/sizes/price without naming an item, they mean THIS product, even if other products "
            "came up earlier in the chat. Look it up with the tools using that product_id."
        )
    return f"## Current page\nThe shopper is on `{d.page_path}` (not a single product page)."


PRICE_RE = re.compile(r"\$\s?(\d+(?:\.\d{1,2})?)")


def dollar_amounts(text: str) -> set[float]:
    return {float(m) for m in PRICE_RE.findall(text)}


@shop_agent.output_validator
def only_verified_prices(ctx: RunContext[ChatDeps], output: AgentReply) -> AgentReply:
    """Guardrail: every $ amount in the reply must have come from a DB tool during this turn
    (or been typed by the shopper). Otherwise the model is sent back to look the price up."""
    unverified = dollar_amounts(output.message) - ctx.deps.verified_prices - ctx.deps.shopper_amounts
    if unverified:
        amounts = ", ".join(f"${a:g}" for a in sorted(unverified))
        raise ModelRetry(
            f"Your reply mentions {amounts}, but no tool returned that price in this turn. "
            "Call get_price (or search_products) and quote only prices the tools return. "
            "Don't calculate totals, discounts, or estimates."
        )
    return output


# "only 2 left", "25 available", "3 in stock", "there are 12 remaining in M"
QUANTITY_RE = re.compile(
    r"\b(\d{1,3})\s+(?:[A-Za-z][\w'’/-]*\s+){0,5}?(?:left|available|remaining|in stock|units?|pieces?)\b",
    re.IGNORECASE,
)


def stock_numbers(text: str, product_names: set[str]) -> set[int]:
    """Numbers the reply presents as stock counts. Product names are blanked out first, so a name like
    "School Of Art 1 4 Zip" or "2025 Yale Vs Harvard T Shirt" isn't mistaken for a quantity."""
    clean = text.replace("**", "").replace("__", "")
    for name in sorted(product_names, key=len, reverse=True):
        clean = re.sub(re.escape(name), " ", clean, flags=re.IGNORECASE)
    return {int(n) for n in QUANTITY_RE.findall(clean)}


# "I found 27 hoodies", "found **21** crewnecks"
FOUND_RE = re.compile(r"\bfound\s+(\d{1,3})\b", re.IGNORECASE)


def valid_product_ids(ids: list[str]) -> list[str]:
    """Distinct ids, in order, that exist in the catalogue."""
    with get_db() as conn:
        known = {r[0] for r in conn.execute("SELECT product_id FROM catalogue")}
    seen: set[str] = set()
    return [i for i in ids if i in known and not (i in seen or seen.add(i))]


@shop_agent.output_validator
def only_verified_quantities(ctx: RunContext[ChatDeps], output: AgentReply) -> AgentReply:
    """Guardrail: every stock count in the reply must be a quantity a tool returned this turn
    (or a number the shopper typed, or the number of products being shown)."""
    d = ctx.deps
    # Drop duplicate / unknown ids first, so every count below is about cards that will really show.
    output.product_ids = valid_product_ids(output.product_ids)
    shown = len(output.product_ids)
    claimed = {int(n) for n in FOUND_RE.findall(output.message.replace("**", ""))}
    if output.results_heading and claimed - {shown}:
        raise ModelRetry(
            f"Your message says you found {', '.join(map(str, sorted(claimed)))} items, but product_ids "
            f"contains {shown} valid, distinct products. Make the count in your message match exactly."
        )
    allowed = d.verified_quantities | d.shopper_numbers | {shown}
    unverified = stock_numbers(output.message, d.seen_product_names) - allowed
    if unverified:
        nums = ", ".join(str(n) for n in sorted(unverified))
        raise ModelRetry(
            f"Your reply states a stock quantity of {nums}, but no tool returned that number in this turn. "
            "Call check_stock for the product and quote only the exact quantities it returns."
        )
    return output


def to_message_history(turns: list[ChatTurn]) -> list[ModelMessage]:
    """Turn saved chat turns into PydanticAI message history."""
    history: list[ModelMessage] = []
    for turn in turns[-HISTORY_TURNS:]:
        if turn.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        else:
            history.append(ModelResponse(parts=[TextPart(content=turn.content)]))
    return history


TIMEOUT_REPLY = (
    "My apologies, the shelves are taking far too long to answer right now. "
    "Please try that again in a moment."
)

LIMIT_REPLY = (
    "That one needs more searching than I can do in a single go. Could you narrow it down for me, "
    "say a type of item, a colour, or a size? Then I'll find it straight away."
)

BLOCKED_REPLY = (
    "I'm afraid that is beyond what I may help with. I am Handsome Dan, keeper of the Campus Customs "
    "collection: hoodies, crewnecks, tees, sizes, and stock. How may I be of service?"
)


def _is_content_filter(error: ModelHTTPError) -> bool:
    return "content_filter" in str(error.body) or "content management policy" in str(error.body)


def with_page_note(message: str, deps: ChatDeps) -> str:
    """Attach the current product page to THIS turn's user message. The system-prompt page section
    alone lost to recent chat history ("is M in stock?" was answered about an earlier product), so
    the note sits right next to the question. It isn't saved, so old page notes don't pile up."""
    if not deps.viewing_product_id:
        return message
    return (
        f"[Page context from the website, not typed by the shopper: they are now on the product page "
        f"for {deps.viewing_product_name} (product_id: {deps.viewing_product_id}). Unless the message "
        f"below names a different item, it is about {deps.viewing_product_name}, not products from "
        f"earlier in the chat.]\n{message}"
    )


# ---------- Append-only audit trail: output/audit_trail.json ----------
# One entry per agent run: time, who (guest / user id, never emails), page, every tool call with short
# args/results, guardrail retries, usage, stop reason. Only ever appended (temp file + atomic rename);
# never wiped between runs.

AUDIT_PATH = Path(__file__).resolve().parent.parent / "output" / "audit_trail.json"
MAX_TEXT = 200
_audit_lock = asyncio.Lock()


def short_text(value: Any, limit: int = MAX_TEXT) -> str:
    """Compact, human-readable summary of a tool arg/result."""
    if isinstance(value, BaseModel):
        value = value.model_dump(exclude_none=True)
    if isinstance(value, list):
        names = [v.name if hasattr(v, "name") else v.get("name") if isinstance(v, dict) else str(v) for v in value]
        text = f"{len(value)} results: " + ", ".join(str(n) for n in names[:5]) + (" …" if len(value) > 5 else "")
    elif isinstance(value, (dict, tuple)):
        text = json.dumps(value, default=str, ensure_ascii=False)
    else:
        text = str(value)
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def audit_steps(messages: list[ModelMessage]) -> list[dict]:
    """The agent loop, step by step: model tool calls, tool results, and validator retries."""
    steps: list[dict] = []
    for m in messages:
        for p in m.parts:
            if isinstance(m, ModelResponse) and isinstance(p, ToolCallPart):
                if p.tool_name == "final_result":
                    steps.append({"step": "final_answer"})
                else:
                    steps.append({"step": "tool_call", "tool": p.tool_name, "args": short_text(p.args_as_dict())})
            elif isinstance(m, ModelRequest) and isinstance(p, ToolReturnPart) and p.tool_name != "final_result":
                steps.append({"step": "tool_result", "tool": p.tool_name, "result": short_text(p.content)})
            elif isinstance(m, ModelRequest) and isinstance(p, RetryPromptPart):
                steps.append({"step": "guardrail_retry", "tool": p.tool_name or "output", "reason": short_text(p.content, 160)})
    return steps


async def record_audit(entry: dict) -> None:
    """Append one entry. Never truncates existing history (a corrupt file is moved aside, not erased)."""
    entry = {"time": datetime.now(timezone.utc).isoformat(timespec="seconds"), "run_id": uuid.uuid4().hex[:10], **entry}
    async with _audit_lock:
        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        entries: list = []
        if AUDIT_PATH.exists():
            try:
                entries = json.loads(AUDIT_PATH.read_text() or "[]")
            except json.JSONDecodeError:
                AUDIT_PATH.rename(AUDIT_PATH.with_suffix(f".corrupt-{int(datetime.now().timestamp())}.json"))
                entries = []
        entries.append(entry)
        tmp = AUDIT_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(entries, indent=2, ensure_ascii=False))
        os.replace(tmp, AUDIT_PATH)


async def run_chat(message: str, deps: ChatDeps, history: list[ChatTurn]) -> ChatReply:
    deps.shopper_amounts = dollar_amounts(message)
    deps.shopper_numbers = {int(n) for n in re.findall(r"\b\d{1,3}\b", message)}
    started = time.perf_counter()
    prior = to_message_history(history)
    stop_reason, output, usage, error = "final_answer", None, None, None

    with capture_run_messages() as run_messages:
        try:
            result = await asyncio.wait_for(
                shop_agent.run(with_page_note(message, deps), deps=deps, message_history=prior, usage_limits=LIMITS),
                timeout=RUN_TIMEOUT_S,
            )
            output, usage = result.output, result.usage
        except (asyncio.TimeoutError, APITimeoutError):
            stop_reason, error = "timeout", f"no answer within {RUN_TIMEOUT_S}s"
        except UsageLimitExceeded as e:
            # Budget hit (too many model calls / tool calls / tokens): stop and ask the shopper to narrow down.
            stop_reason, error = "usage_limit", str(e)
        except ModelHTTPError as e:
            if not _is_content_filter(e):
                stop_reason, error = "error", f"ModelHTTPError {e.status_code}"
                await _audit(message, deps, run_messages[len(prior):], stop_reason, None, None, started, error)
                raise
            # The provider's safety filter (e.g. jailbreak / prompt-injection detection) blocked the
            # message. Answer with an on-brand refusal instead of an error.
            stop_reason = "content_filter"
        except Exception as e:
            await _audit(message, deps, run_messages[len(prior):], "error", None, None, started, type(e).__name__)
            raise

    reply = (
        ChatReply(reply=TIMEOUT_REPLY) if stop_reason == "timeout"
        else ChatReply(reply=LIMIT_REPLY) if stop_reason == "usage_limit"
        else ChatReply(reply=BLOCKED_REPLY) if stop_reason == "content_filter"
        else None
    )
    if reply is None:
        # Cards come straight from the DB, so prices/stock on them can't be hallucinated.
        cards = product_cards(output.product_ids)
        page_results = None
        if output.results_heading and cards:
            page_results = PageResults(heading=output.results_heading, query=message, products=cards, total=len(cards))
        reply = ChatReply(reply=output.message, products=cards, page_results=page_results)

    await _audit(message, deps, run_messages[len(prior):], stop_reason, output, usage, started, error, reply)
    return reply


async def _audit(message, deps, new_messages, stop_reason, output, usage, started, error=None, reply=None) -> None:
    """Log one agent run to the server console and the append-only audit trail."""
    steps = audit_steps(new_messages)
    tools = [s["tool"] for s in steps if s["step"] == "tool_call"]
    ms = round((time.perf_counter() - started) * 1000)
    log.info(
        "chat user=%s stop=%s requests=%s tokens_in=%s (cached=%s) tokens_out=%s tools=%s ms=%d",
        deps.user_id or "guest", stop_reason,
        usage.requests if usage else "?", usage.input_tokens if usage else "?",
        usage.cache_read_tokens if usage else "?", usage.output_tokens if usage else "?",
        ",".join(tools) or "-", ms,
    )
    entry = {
        "user": f"user:{deps.user_id}" if deps.user_id else "guest",
        "page": deps.page_path,
        "viewing_product": deps.viewing_product_id,
        "message": short_text(message),
        "steps": steps,
        "tool_calls": len(tools),
        "guardrail_retries": sum(1 for s in steps if s["step"] == "guardrail_retry"),
        "model_requests": usage.requests if usage else None,
        "tokens": {"input": usage.input_tokens, "cached": usage.cache_read_tokens, "output": usage.output_tokens} if usage else None,
        "stop_reason": stop_reason,
        "needs_human_review": bool(output and output.needs_human_review),
        "review_reason": output.review_reason if output else None,
        "reply": short_text(reply.reply) if reply else None,
        "products_shown": [p.product_id for p in reply.products] if reply else [],
        "error": error,
        "ms": ms,
    }
    try:
        await record_audit(entry)
    except OSError:
        log.exception("Could not write audit trail")
