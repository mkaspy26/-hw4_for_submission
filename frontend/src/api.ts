export interface InventoryItem {
  size: string;
  quantity: number;
}

export interface Product {
  product_id: string;
  name: string;
  garment_type: string;
  description: string;
  colors: string[];
  search_tags: string[];
  image_url: string;
  price: number;
  total_stock: number;
  inventory?: InventoryItem[];
}

// Chat -> page contract: when the agent sets a results heading, the backend sends these
// and the website renders them as a product grid on the Products page.
export interface PageResults {
  heading: string;
  query: string;
  products: Product[];
  total: number;
}

export interface ChatResponse {
  reply: string;
  products: Product[];
  page_results: PageResults | null;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    // FastAPI puts error messages in `detail`; surface them to the form.
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `${res.status} ${res.statusText}`;
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

const postJson = <T>(url: string, data: unknown) =>
  getJson<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const fetchMe = () => getJson<User>("/api/auth/me");

export const login = (email: string, password: string) =>
  postJson<User>("/api/auth/login", { email, password });

export const signup = (data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}) => postJson<User>("/api/auth/signup", data);

export const logout = () => postJson<{ ok: boolean }>("/api/auth/logout", {});

export const fetchProducts = () => getJson<Product[]>("/api/products");

export const fetchProduct = (id: string) =>
  getJson<Product>(`/api/products/${encodeURIComponent(id)}`);

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatHistoryMessage extends ChatTurn {
  products: Product[];
  created_at: string;
}

// Where the shopper is when they send a message, so "do you have this in pink?" can be resolved.
export interface PageContext {
  path: string;
  product_id: string | null;
}

// `history` is only used by the backend for guests; logged-in history comes from the DB.
export const sendChat = (message: string, history: ChatTurn[] = [], page?: PageContext) =>
  postJson<ChatResponse>("/api/chat", { message, history, page });

export const fetchChatHistory = () => getJson<ChatHistoryMessage[]>("/api/chat/history");

export const formatPrice = (p: number) => `$${p.toFixed(2)}`;
