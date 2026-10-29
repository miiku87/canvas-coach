import type {
  ChatRequest,
  ChatResponse,
  ErrorResponse,
  PageSnapshot,
  ReviewResponse,
} from "../../shared/api.js";
import { getConfig } from "./config.js";

async function post<T>(path: string, body: unknown): Promise<T> {
  const { serverUrl, token } = getConfig();
  let res: Response;
  try {
    res = await fetch(`${serverUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "X-Coach-Token": token } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`Coach-palvelimeen (${serverUrl}) ei saatu yhteyttä.`);
  }
  const data = (await res.json().catch(() => null)) as T | ErrorResponse | null;
  if (!res.ok) {
    throw new Error((data as ErrorResponse | null)?.error ?? `Palvelinvirhe ${res.status}`);
  }
  return data as T;
}

export const requestReview = (page: PageSnapshot) => post<ReviewResponse>("/api/review", { page });

export const requestChat = (req: ChatRequest) => post<ChatResponse>("/api/chat", req);
