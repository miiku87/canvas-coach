import Anthropic from "@anthropic-ai/sdk";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { Coach } from "./coach.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

if (config.allowedOrigins.length === 0) {
  console.warn(
    "⚠️  Canvasin osoitetta (ALLOWED_ORIGINS) ei ole asetettu, joten selain estää Coachin kutsut.\n" +
      "   Aja asennus uudelleen (Asenna) tai lisää rivi server/.env-tiedostoon, esim.\n" +
      "   ALLOWED_ORIGINS=https://koulu.instructure.com\n",
  );
}
if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.warn("⚠️  API-avainta (ANTHROPIC_API_KEY) ei löytynyt. Aja asennus uudelleen (Asenna).\n");
}

// Credentials resolve from ANTHROPIC_API_KEY (or an `ant auth login` profile).
const coach = new Coach(new Anthropic(), config);
const app = createApp(config, coach);

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`\n✅ Canvas Coach on käynnissä: http://localhost:${info.port}`);
  console.log(`   Canvas-osoite: ${config.allowedOrigins.join(", ") || "-"}`);
  console.log(`   Malli: ${config.model} (effort ${config.effort})`);
  console.log("   Pidä tämä ikkuna auki niin kauan kuin käytät Coachia. Sulje painamalla Ctrl+C.\n");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌ Portti ${config.port} on jo käytössä. Coach on luultavasti jo käynnissä toisessa ikkunassa.\n`,
    );
    process.exit(1);
  }
  throw err;
});
