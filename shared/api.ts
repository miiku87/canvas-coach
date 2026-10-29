// Types shared by the widget (browser) and the server.

export const PAGE_TYPES = [
  "assignment",
  "front_page",
  "wiki_page",
  "discussion",
  "quiz",
  "syllabus",
  "modules",
  "announcement",
  "generic",
] as const;

export type PageType = (typeof PAGE_TYPES)[number];

/** A page's content, extracted in the browser and sent to the server. */
export interface PageSnapshot {
  pageType: PageType;
  url: string;
  courseName?: string;
  title: string;
  /** Main content as lightweight Markdown (headings, lists, links, image alts). */
  content: string;
  /** Page-type specific facts: due dates, points, rubric, submission types, ... */
  facts?: Record<string, string>;
  /** True when content was read from an open editor (unsaved draft). */
  isDraft?: boolean;
}

export type Severity = "critical" | "improve" | "idea" | "good";

export interface Finding {
  severity: Severity;
  /** Short category label, e.g. "Arviointi", "Saavutettavuus", "Brändi". */
  category: string;
  title: string;
  detail: string;
  /** Concrete suggestion or rewritten example text. Empty string if none. */
  suggestion: string;
}

export interface Review {
  summary: string;
  findings: Finding[];
  /** Questions back to the teacher to spark reflection. */
  questions: string[];
}

export interface ReviewRequest {
  page: PageSnapshot;
}

export interface ReviewResponse {
  review: Review;
  model: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  page: PageSnapshot;
  /** The initial review, so the follow-up stays grounded in it. */
  review?: Review;
  /** Conversation so far; last turn must be the teacher's ("user"). */
  history: ChatTurn[];
}

export interface ChatResponse {
  reply: string;
  model: string;
}

export interface ErrorResponse {
  error: string;
}
