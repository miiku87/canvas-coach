import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, "..");
export const REPO_ROOT = path.resolve(SERVER_ROOT, "..");

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface Config {
  port: number;
  /** Canvas origins allowed to call the API, e.g. https://school.instructure.com */
  allowedOrigins: string[];
  /** Optional shared token required in the X-Coach-Token header. */
  accessToken?: string;
  model: string;
  effort: Effort;
  /** Language the coach answers in. */
  language: string;
  /** Requests per IP per minute. */
  rateLimitPerMinute: number;
  maxContentChars: number;
  configDir: string;
  widgetBundlePath: string;
}

function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match as unknown as [string, string, string];
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  if (env === process.env) loadDotEnv(path.join(SERVER_ROOT, ".env"));

  const effort = (env.COACH_EFFORT ?? "medium") as Effort;
  if (!["low", "medium", "high", "xhigh", "max"].includes(effort)) {
    throw new Error(`COACH_EFFORT must be low|medium|high|xhigh|max, got "${effort}"`);
  }

  return {
    port: Number(env.PORT ?? 8787),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter(Boolean),
    accessToken: env.COACH_ACCESS_TOKEN || undefined,
    model: env.COACH_MODEL ?? "claude-opus-5-5",
    effort,
    language: env.COACH_LANGUAGE ?? "suomi",
    rateLimitPerMinute: Number(env.COACH_RATE_LIMIT ?? 20),
    maxContentChars: Number(env.COACH_MAX_CONTENT_CHARS ?? 150_000),
    configDir: env.COACH_CONFIG_DIR ?? path.join(SERVER_ROOT, "config"),
    widgetBundlePath: path.join(REPO_ROOT, "widget", "dist", "canvas-coach.js"),
  };
}
