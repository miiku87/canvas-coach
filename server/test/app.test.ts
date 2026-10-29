import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { createApp } from "../src/app.js";
import { Coach, type MessagesClient } from "../src/coach.js";
import { loadConfig } from "../src/config.js";
import type { PageSnapshot, Review } from "../../shared/api.js";

const ORIGIN = "https://school.instructure.com";

const page: PageSnapshot = {
  pageType: "assignment",
  url: `${ORIGIN}/courses/1/assignments/2`,
  courseName: "Ohjelmoinnin perusteet",
  title: "Essee",
  content: "Kirjoita essee.",
  facts: { määräaika: "ei asetettu" },
};

const review: Review = {
  summary: "Tehtävänanto on lyhyt.",
  findings: [
    { severity: "critical", category: "Aikataulu", title: "Ei määräaikaa", detail: "Määräaika puuttuu.", suggestion: "" },
  ],
  questions: ["Mitä opiskelijan pitäisi oppia?"],
};

function fakeClient(response: Partial<Anthropic.Beta.BetaMessage>) {
  const create = vi.fn().mockResolvedValue({
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    stop_details: null,
    content: [],
    ...response,
  });
  return { client: { beta: { messages: { create } } } as unknown as MessagesClient, create };
}

function setup(response: Partial<Anthropic.Beta.BetaMessage>, env: Record<string, string> = {}) {
  const config = loadConfig({ ALLOWED_ORIGINS: ORIGIN, ...env });
  const { client, create } = fakeClient(response);
  const app = createApp(config, new Coach(client, config));
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN, ...headers },
      body: JSON.stringify(body),
    });
  return { app, post, create };
}

describe("POST /api/review", () => {
  it("returns the structured review and sends page, rubric and brand to Claude", async () => {
    const { post, create } = setup({ content: [{ type: "text", text: JSON.stringify(review), citations: null }] });
    const res = await post("/api/review", { page });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(await res.json()).toEqual({ review, model: "claude-opus-5-5" });

    const params = create.mock.calls[0]![0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.fallbacks).toBe("default");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.system[0].text).toContain("Arviointi"); // assignment rubric
    expect(params.system[0].text).toContain("<brandiohje>");
    expect(params.messages[0].content[0].text).toContain("<sivu>");
    expect(params.messages[0].content[0].text).toContain("Kirjoita essee.");
  });

  it("rejects invalid input", async () => {
    const { post, create } = setup({});
    const res = await post("/api/review", { page: { ...page, pageType: "nope" } });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects too long content instead of truncating", async () => {
    const { post } = setup({}, { COACH_MAX_CONTENT_CHARS: "10" });
    const res = await post("/api/review", { page });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("liian pitkä");
  });

  it("maps a model refusal to 422", async () => {
    const { post } = setup({
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: null, explanation: "Ei voi." } as Anthropic.Beta.BetaMessage["stop_details"],
    });
    const res = await post("/api/review", { page });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("Ei voi.");
  });

  it("requires the access token when configured", async () => {
    const { post } = setup({ content: [{ type: "text", text: JSON.stringify(review), citations: null }] }, {
      COACH_ACCESS_TOKEN: "s3cret",
    });
    expect((await post("/api/review", { page })).status).toBe(401);
    expect((await post("/api/review", { page }, { "X-Coach-Token": "s3cret" })).status).toBe(200);
  });

  it("rate limits per client", async () => {
    const { post } = setup({ content: [{ type: "text", text: JSON.stringify(review), citations: null }] }, {
      COACH_RATE_LIMIT: "2",
    });
    const h = { "X-Forwarded-For": "10.0.0.1" };
    expect((await post("/api/review", { page }, h)).status).toBe(200);
    expect((await post("/api/review", { page }, h)).status).toBe(200);
    expect((await post("/api/review", { page }, h)).status).toBe(429);
  });
});

describe("CORS", () => {
  it("does not allow unknown origins", async () => {
    const { app } = setup({});
    const res = await app.request("/api/review", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("POST /api/chat", () => {
  it("sends page, earlier review and history; returns the reply", async () => {
    const { post, create } = setup({ content: [{ type: "text", text: "Lisää määräaika.", citations: null }] });
    const res = await post("/api/chat", {
      page,
      review,
      history: [{ role: "user", content: "Mitä korjaan ensin?" }],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).reply).toBe("Lisää määräaika.");
    const params = create.mock.calls[0]![0];
    expect(params.messages[0].content[1].text).toContain("<aiempi_palaute>");
    expect(params.messages.at(-1)).toEqual({ role: "user", content: "Mitä korjaan ensin?" });
    expect(params.output_config.format).toBeUndefined();
  });

  it("requires the last turn to be the teacher's", async () => {
    const { post } = setup({});
    const res = await post("/api/chat", { page, history: [{ role: "assistant", content: "Hei" }] });
    expect(res.status).toBe(400);
  });
});
