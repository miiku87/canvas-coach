import Anthropic from "@anthropic-ai/sdk";
import type { ChatRequest, PageSnapshot, Review } from "../../shared/api.js";
import type { Config } from "./config.js";
import {
  buildSystemPrompt,
  CHAT_INSTRUCTION,
  loadGuidance,
  renderPage,
  renderReviewContext,
  REVIEW_INSTRUCTION,
  REVIEW_SCHEMA,
} from "./prompts.js";

/** The slice of the Anthropic client the coach uses; lets tests inject a fake. */
export type MessagesClient = Pick<Anthropic, "beta">;

/** An error whose message is safe and meaningful to show to the teacher. */
export class CoachError extends Error {}

/** Raised when the model declines the request (stop_reason "refusal"). */
export class CoachRefusalError extends CoachError {}

export class Coach {
  constructor(
    private readonly client: MessagesClient,
    private readonly config: Config,
  ) {}

  private request(page: PageSnapshot, messages: Anthropic.Beta.BetaMessageParam[]) {
    const { rubric, brand } = loadGuidance(this.config.configDir, page.pageType);
    const system = buildSystemPrompt({
      language: this.config.language,
      pageType: page.pageType,
      rubric,
      brand,
    });
    return {
      model: this.config.model,
      max_tokens: 16000,
      // Re-run on Anthropic's recommended model if a safety classifier declines.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default" as const,
      system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
      messages,
    };
  }

  private static text(response: Anthropic.Beta.BetaMessage): string {
    if (response.stop_reason === "refusal") {
      throw new CoachRefusalError(
        response.stop_details?.explanation ?? "Malli kieltäytyi käsittelemästä tätä sivua.",
      );
    }
    return response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }

  async review(page: PageSnapshot): Promise<{ review: Review; model: string }> {
    const response = await this.client.beta.messages.create({
      ...this.request(page, [
        {
          role: "user",
          content: [
            { type: "text", text: renderPage(page) },
            { type: "text", text: REVIEW_INSTRUCTION },
          ],
        },
      ]),
      output_config: {
        effort: this.config.effort,
        format: { type: "json_schema", schema: REVIEW_SCHEMA as unknown as Record<string, unknown> },
      },
    });
    if (response.stop_reason === "max_tokens") {
      throw new CoachError("Palaute katkesi kesken. Yritä uudelleen.");
    }
    const review = JSON.parse(Coach.text(response)) as Review;
    return { review, model: response.model };
  }

  async chat(req: ChatRequest): Promise<{ reply: string; model: string }> {
    const context: Anthropic.Beta.BetaContentBlockParam[] = [
      { type: "text", text: renderPage(req.page) },
    ];
    if (req.review) context.push({ type: "text", text: renderReviewContext(req.review) });
    context.push({ type: "text", text: CHAT_INSTRUCTION });

    const response = await this.client.beta.messages.create({
      ...this.request(req.page, [
        { role: "user", content: context },
        ...req.history.map((t) => ({ role: t.role, content: t.content })),
      ]),
      output_config: { effort: this.config.effort },
    });
    return { reply: Coach.text(response), model: response.model };
  }
}
