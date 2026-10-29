// Real Canvas Coach server app with a fake Claude client, for end-to-end tests.
import { serve } from "@hono/node-server";
import { createApp } from "../server/src/app.js";
import { Coach, type MessagesClient } from "../server/src/coach.js";
import { loadConfig } from "../server/src/config.js";
import type { Review } from "../shared/api.js";

const review: Review = {
  summary: "Tehtävänanto kertoo mitä tehdään, mutta palautusmuoto ja arviointi jäävät epäselviksi.",
  findings: [
    { severity: "good", category: "Tavoite", title: "Selkeä tavoite", detail: "Tehtävän tarkoitus on kerrottu heti alussa.", suggestion: "" },
    {
      severity: "critical",
      category: "Arviointi",
      title: "Arviointikriteerit puuttuvat",
      detail: "Tehtävä on 10 pisteen arvoinen, mutta kriteereitä ei kerrota eikä arviointimatriisia ole liitetty.",
      suggestion: "Arviointi (10 p):\n- Argumentaatio 4 p\n- Lähteiden käyttö 3 p\n- Rakenne ja kieli 3 p",
    },
    { severity: "improve", category: "Saavutettavuus", title: "Kuvalta puuttuu alt-teksti", detail: "Sivun kaaviokuvalla ei ole vaihtoehtoista tekstiä.", suggestion: "Lisää alt-teksti, joka kertoo kaavion pääviestin." },
    { severity: "idea", category: "Brändi", title: "Käytä sinä-muotoa", detail: "Ohjeessa on passiivia (\"tulee palauttaa\").", suggestion: "Palauta essee PDF-tiedostona." },
  ],
  questions: ["Mitä haluat opiskelijan osaavan tämän tehtävän jälkeen?", "Saako esseessä käyttää tekoälyä?"],
};

const requests: unknown[] = [];
const client = {
  beta: {
    messages: {
      create: async (params: { output_config?: { format?: unknown } }) => {
        requests.push(params);
        const text = params.output_config?.format
          ? JSON.stringify(review)
          : "Aloittaisin **arviointikriteereistä**:\n\n- Lisää matriisi\n- Kerro pisteytys tekstissä";
        return { model: "fake-model", stop_reason: "end_turn", stop_details: null, content: [{ type: "text", text }] };
      },
    },
  },
} as unknown as MessagesClient;

const port = Number(process.env.PORT ?? 8799);
const config = loadConfig({ ALLOWED_ORIGINS: "https://school.instructure.com", PORT: String(port) });
const app = createApp(config, new Coach(client, config));
app.get("/__requests", (c) => c.json(requests));
serve({ fetch: app.fetch, port }, () => console.log(`mock coach server on ${port}`));
