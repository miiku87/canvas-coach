import Anthropic from "@anthropic-ai/sdk";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { Coach } from "./coach.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

if (config.allowedOrigins.length === 0) {
  console.warn(
    "ALLOWED_ORIGINS is empty: browsers on Canvas will be blocked by CORS. " +
      "Set it to your Canvas URL, e.g. ALLOWED_ORIGINS=https://school.instructure.com",
  );
}

// Credentials resolve from ANTHROPIC_API_KEY (or an `ant auth login` profile).
const coach = new Coach(new Anthropic(), config);
const app = createApp(config, coach);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Canvas Coach server listening on http://localhost:${info.port}`);
  console.log(`Model: ${config.model} (effort ${config.effort}), origins: ${config.allowedOrigins.join(", ") || "-"}`);
});
