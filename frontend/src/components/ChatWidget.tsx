import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import { fetchChatHistory, fetchProduct, formatPrice, PageContext, Product, sendChat } from "../api";
import { useAuth } from "../AuthContext";
import { useChatResults } from "../ChatResultsContext";
import HandsomeDan from "./HandsomeDan";
import Secret from "./Secret";

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  onPage?: boolean; // these products were also put on the page as results
}

const GREETING: Message = {
  role: "assistant",
  content: "Good day. I am **Sir Handsome Dan**, keeper of the Campus Customs collection. Every hoodie, crewneck, and tee here is known to me, down to the last size on the shelf. How may I be of service?",
};
const GUEST_HISTORY_TURNS = 10;
const LICK_MS = 900; // Dan licks the screen, then the chat opens
export const OPEN_CHAT_EVENT = "cc:open-chat"; // window event other components fire to open the chat

// Suggested questions, chosen by page. Product-page ones rely on page context ("this" = viewed item).
const PRODUCT_SUGGESTIONS = ["What sizes are in stock?", "What colors does it come in?", "Show me similar items"];
const GENERAL_SUGGESTIONS = ["Show me hoodies", "Gifts under $40", "What's in stock in size M?", "Cheapest crewneck?"];
const INLINE_CARDS = 4; // the rest are on the page

// Renders the agent's light markdown (**bold** and "- " bullets) as React elements (no raw HTML).
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

function FormattedText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={blocks.length}>
          {bullets.map((b, i) => (
            <li key={i}>{renderInline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    if (bullet) {
      bullets.push(bullet[1]);
    } else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}>{renderInline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

function ChatProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.product_id}`} className="chat-card">
      <img src={product.image_url} alt={product.name} />
      <div>
        <div className="chat-card-name">{product.name}</div>
        <div className="chat-card-price">{formatPrice(product.price)}</div>
      </div>
    </Link>
  );
}

// Floating chat panel, backed by the PydanticAI agent at POST /api/chat.
export default function ChatWidget() {
  const { user } = useAuth();
  const { showResults, goToResults } = useChatResults();
  const location = useLocation();
  const viewingId = matchPath("/products/:productId", location.pathname)?.params.productId ?? null;
  const [viewingName, setViewingName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [licking, setLicking] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Logged-in shoppers see their saved conversation; logging in/out resets the panel.
  useEffect(() => {
    setMessages([GREETING]);
    if (!user) return;
    fetchChatHistory()
      .then((history) => {
        if (history.length) setMessages([GREETING, ...history]);
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Name of the product page the shopper is on, for the "Asking about" chip.
  useEffect(() => {
    setViewingName(null);
    if (!viewingId) return;
    fetchProduct(viewingId)
      .then((p) => setViewingName(p.name))
      .catch(() => {});
  }, [viewingId]);

  useEffect(() => {
    // "Summon Handsome Dan" / "Ask about this item" buttons: Dan licks first, then the chat opens.
    const openChat = () => {
      setLicking(true);
      window.setTimeout(() => {
        setLicking(false);
        setOpen(true);
      }, LICK_MS);
    };
    window.addEventListener(OPEN_CHAT_EVENT, openChat);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, openChat);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await send(input);
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;
    // Guests: send the recent conversation so the agent can follow up ("this one", "in pink?").
    const guestHistory = user
      ? []
      : messages
          .slice(1)
          .slice(-GUEST_HISTORY_TURNS)
          .map((m) => ({
            role: m.role,
            content: m.products?.length
              ? `${m.content}\n[Products shown: ${m.products
                  .slice(0, 8)
                  .map((p) => `${p.product_id} (${p.name})`)
                  .join(", ")}${m.products.length > 8 ? ` and ${m.products.length - 8} more` : ""}]`
              : m.content,
          }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const page: PageContext = { path: location.pathname, product_id: viewingId };
      const res = await sendChat(text, guestHistory, page);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.reply, products: res.products, onPage: !!res.page_results },
      ]);
      if (res.page_results) showResults(res.page_results);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      setMessages((m) => [
        ...m,
        { role: "assistant", content: detail || "Sorry, I couldn't reach the server. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function summonDan() {
    if (licking) return;
    setLicking(true);
    window.setTimeout(() => {
      setLicking(false);
      setOpen(true);
    }, LICK_MS);
  }

  if (!open) {
    return (
      <>
        {licking && (
          <div className="lick-overlay" aria-hidden="true">
            <span className="lick-streak" />
            <span className="heart h1">✦</span>
            <span className="heart h2">✧</span>
            <span className="heart h3">✦</span>
          </div>
        )}
        <button
          className={`dan-launcher ${licking ? "is-licking" : ""}`}
          onClick={summonDan}
          aria-label="Chat with Sir Handsome Dan, your shopping assistant"
        >
          <span className="dan-bubble">Click me to chat! I can find sizes, colours &amp; stock</span>
          <HandsomeDan size={92} licking={licking} />

        </button>
      </>
    );
  }

  return (
    <div className="chat-panel" role="dialog" aria-label="Campus Customs chat">
      <div className="chat-header">
        <div className="chat-header-id">
          <button
            className="chat-avatar"
            onClick={() => {
              setLicking(true);
              window.setTimeout(() => setLicking(false), LICK_MS);
            }}
            aria-label="Pat Sir Handsome Dan"
            title="Pat Sir Handsome Dan"
          >
            <HandsomeDan size={40} variant="head" licking={licking} />
          </button>
          <div>
            <span className="chat-title">
              Sir Handsome Dan <Secret id="frisbee" className="header-secret" />
            </span>
            <div className="chat-subtitle">
              Your Campus Customs shopping guide ·{" "}
              {user ? `at your service, ${user.first_name}` : "log in to be remembered"}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close chat">
          ×
        </button>
      </div>
      {viewingId && viewingName && (
        <div className="chat-context" title="The assistant knows which product page you're on">
          👀 Asking about: <strong>{viewingName}</strong>
        </div>
      )}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-row ${m.role}`}>
            <div className={`chat-msg ${m.role}`}>
              {m.role === "assistant" ? <FormattedText text={m.content} /> : m.content}
            </div>
            {m.products && m.products.length > 0 && (
              <div className="chat-cards">
                {m.products.slice(0, INLINE_CARDS).map((p) => (
                  <ChatProductCard key={p.product_id} product={p} />
                ))}
              </div>
            )}
            {m.onPage && m.products && (
              <button className="chat-see-all" onClick={goToResults}>
                See all {m.products.length} on the page →
              </button>
            )}
          </div>
        ))}
        {sending && (
          <div className="chat-msg assistant typing">
            <span className="paws">🐾</span> Dan is sniffing the shelves…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {!sending && (
        <div className="chat-suggestions" aria-label="Suggested questions">
          {(viewingId ? PRODUCT_SUGGESTIONS : GENERAL_SUGGESTIONS).map((q) => (
            <button key={q} className="suggestion" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      <form className="chat-input" onSubmit={onSubmit}>
        <input
          value={input}
          maxLength={1000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Sir Handsome Dan about sizes, colours, stock…"
        />
        <button type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
