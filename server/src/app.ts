import { existsSync, readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { PAGE_TYPES } from "../../shared/api.js";
import type { ChatResponse, ErrorResponse, ReviewResponse } from "../../shared/api.js";
import { Coach, CoachError, CoachRefusalError } from "./coach.js";
import type { Config } from "./config.js";

function schemas(maxContentChars: number) {
  const page = z.object({
    pageType: z.enum(PAGE_TYPES),
    url: z.string().max(2000),
    courseName: z.string().max(500).optional(),
    title: z.string().max(1000),
    content: z.string().max(maxContentChars, {
      message: `Sivun sisältö on liian pitkä (yli ${maxContentChars} merkkiä).`,
    }),
    facts: z.record(z.string(), z.string().max(20_000)).optional(),
    isDraft: z.boolean().optional(),
  });
  const finding = z.object({
    severity: z.enum(["critical", "improve", "idea", "good"]),
    category: z.string(),
    title: z.string(),
    detail: z.string(),
    suggestion: z.string(),
  });
  const review = z.object({
    summary: z.string(),
    findings: z.array(finding).max(50),
    questions: z.array(z.string()).max(20),
  });
  const turn = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) });
  return {
    review: z.object({ page }),
    chat: z.object({
      page,
      review: review.optional(),
      history: z
        .array(turn)
        .min(1)
        .max(40)
        .refine((h) => h.at(-1)?.role === "user", "Viimeisen viestin pitää olla opettajan."),
    }),
  };
}

/** Fixed-window per-IP rate limiter; good enough for a single instance. */
function rateLimiter(perMinute: number) {
  const hits = new Map<string, { windowStart: number; count: number }>();
  return (key: string): boolean => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [k, e] of hits) if (now - e.windowStart > 60_000) hits.delete(k);
    }
    const entry = hits.get(key);
    if (!entry || now - entry.windowStart > 60_000) {
      hits.set(key, { windowStart: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= perMinute;
  };
}

function clientKey(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    // @hono/node-server exposes the socket on env.incoming
    (c.env as { incoming?: { socket?: { remoteAddress?: string } } })?.incoming?.socket
      ?.remoteAddress ||
    "unknown"
  );
}

function errorStatus(err: unknown): { status: 422 | 429 | 502; message: string } {
  if (err instanceof CoachRefusalError) return { status: 422, message: err.message };
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "Tekoälypalvelu on ruuhkautunut. Yritä hetken päästä uudelleen." };
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 502, message: "Palvelimen API-avain puuttuu tai on virheellinen." };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: 502, message: `Tekoälypalvelun virhe (${err.status ?? "verkko"}).` };
  }
  if (err instanceof CoachError) return { status: 502, message: err.message };
  return { status: 502, message: "Palvelimella tapahtui virhe. Ylläpitäjä löytää lisätiedot palvelimen lokista." };
}

export function createApp(config: Config, coach: Coach) {
  const app = new Hono();
  const { review: reviewSchema, chat: chatSchema } = schemas(config.maxContentChars);
  const allow = rateLimiter(config.rateLimitPerMinute);

  app.use(
    "/api/*",
    cors({
      origin: (origin) => (config.allowedOrigins.includes(origin) ? origin : null),
      allowHeaders: ["Content-Type", "X-Coach-Token"],
      allowMethods: ["POST", "OPTIONS"],
      maxAge: 600,
    }),
  );

  app.use("/api/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next();
    if (config.accessToken && c.req.header("x-coach-token") !== config.accessToken) {
      return c.json<ErrorResponse>({ error: "Virheellinen tai puuttuva käyttöoikeustunnus." }, 401);
    }
    if (!allow(clientKey(c))) {
      return c.json<ErrorResponse>({ error: "Liian monta pyyntöä. Odota hetki." }, 429);
    }
    return next();
  });

  app.get("/health", (c) => c.json({ ok: true, model: config.model }));

  // Serves the built widget so Canvas theme JS only needs a tiny loader.
  app.get("/widget.js", (c) => {
    if (!existsSync(config.widgetBundlePath)) {
      return c.text("// widget not built: run `npm run build -w widget`", 404);
    }
    c.header("Content-Type", "application/javascript; charset=utf-8");
    c.header("Cache-Control", "public, max-age=300");
    c.header("Access-Control-Allow-Origin", "*");
    return c.body(readFileSync(config.widgetBundlePath, "utf8"));
  });

  app.post("/api/review", async (c) => {
    const parsed = reviewSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json<ErrorResponse>({ error: parsed.error.issues[0]?.message ?? "Virheellinen pyyntö." }, 400);
    }
    const { pageType, title } = parsed.data.page;
    console.log(`${new Date().toLocaleTimeString("fi-FI")}  Tarkistetaan: ${pageType} "${title}"`);
    try {
      return c.json<ReviewResponse>(await coach.review(parsed.data.page));
    } catch (err) {
      console.error("review failed:", err);
      const { status, message } = errorStatus(err);
      return c.json<ErrorResponse>({ error: message }, status);
    }
  });

  app.post("/api/chat", async (c) => {
    const parsed = chatSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json<ErrorResponse>({ error: parsed.error.issues[0]?.message ?? "Virheellinen pyyntö." }, 400);
    }
    console.log(`${new Date().toLocaleTimeString("fi-FI")}  Jatkokysymys: "${parsed.data.page.title}"`);
    try {
      return c.json<ChatResponse>(await coach.chat(parsed.data));
    } catch (err) {
      console.error("chat failed:", err);
      const { status, message } = errorStatus(err);
      return c.json<ErrorResponse>({ error: message }, status);
    }
  });

  return app;
}
