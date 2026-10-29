// End-to-end test: fake Canvas pages in real Chromium, loading the widget via
// the theme loader from the real server app (with a fake Claude client).
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright puuttuu: npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8799;
const COACH = `http://localhost:${PORT}`;
const CANVAS = "https://school.instructure.com";
const shotsDir = path.join(root, "e2e", "screenshots");
mkdirSync(shotsDir, { recursive: true });

const loader = readFileSync(path.join(root, "theme", "canvas-coach-loader.js"), "utf8").replace(
  "https://coach.example.fi",
  COACH,
);

function canvasHtml(roles, body) {
  return `<!doctype html><html lang="fi"><head><meta charset="utf-8"><title>Canvas</title>
  <style>:root{--ic-brand-primary:#00577d} body{font-family:Lato,Arial,sans-serif;margin:0}
  #header{position:fixed;left:0;top:0;bottom:0;width:84px;background:#00577d}
  #content{margin-left:120px;padding:24px;max-width:760px}</style>
  <script>window.ENV = { current_user_roles: ${JSON.stringify(roles)} };</script>
  <script>${loader}</script></head>
  <body><div id="header"></div><div id="content">${body}</div></body></html>`;
}

const assignment = {
  name: "Essee: tekoäly opetuksessa",
  description:
    '<h2>Tavoite</h2><p>Pohdit tekoälyn roolia opetuksessa.</p><p>Essee tulee palauttaa määräaikaan mennessä.</p><img src="/courses/1/files/5/preview">',
  due_at: "2026-11-20T14:00:00Z",
  points_possible: 10,
  grading_type: "points",
  submission_types: ["online_upload"],
  allowed_extensions: ["pdf"],
  allowed_attempts: -1,
  published: true,
};

async function setupRoutes(page, { enrollment }) {
  await page.route(`${CANVAS}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (data) => route.fulfill({ contentType: "application/json", body: `while(1);${JSON.stringify(data)}` });
    if (url.pathname === "/api/v1/courses/1") {
      return json({ id: 1, name: "Pedagogiikan perusteet", default_view: "wiki", enrollments: [{ type: enrollment }] });
    }
    if (url.pathname === "/api/v1/courses/1/assignments/2") return json(assignment);
    if (url.pathname === "/api/v1/courses/1/front_page") {
      return json({ title: "Tervetuloa", body: '<h2>Tervetuloa!</h2><p><a href="/courses/1/modules">Klikkaa tästä</a></p>', front_page: true });
    }
    if (url.pathname === "/api/v1/courses/1/tabs") return json([{ id: "home", label: "Etusivu" }, { id: "modules", label: "Moduulit" }]);
    const roles = enrollment === "student" ? ["user", "student"] : ["user", "teacher"];
    return route.fulfill({ contentType: "text/html", body: canvasHtml(roles, `<h1>${assignment.name}</h1>`) });
  });
}

const server = spawn(process.execPath, ["--import", "tsx", "e2e/mock-server.ts"], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "inherit"] });
await new Promise((resolve, reject) => {
  server.stdout.on("data", (d) => String(d).includes("mock coach server") && resolve());
  server.on("exit", (code) => reject(new Error(`mock server exited ${code}`)));
});

// Chrome asks the user before a public site may reach localhost ("local network
// access"); headless Chromium cannot answer that prompt, so the check is disabled.
const browser = await chromium.launch({ args: ["--disable-features=LocalNetworkAccessChecks"] });
let failed = false;
try {
  // 1. Teacher on an assignment page: review + follow-up chat.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    page.on("pageerror", (e) => console.error("pageerror:", e));
    await setupRoutes(page, { enrollment: "teacher" });
    await page.goto(`${CANVAS}/courses/1/assignments/2`);
    const launcher = page.locator("#canvas-coach-root").locator("button.launcher");
    await launcher.waitFor();
    await launcher.click();
    await page.getByRole("button", { name: "Tarkista sivu" }).click();
    await page.getByText("Arviointikriteerit puuttuvat").waitFor();

    const reqs = await (await fetch(`${COACH}/__requests`)).json();
    const userText = reqs[0].messages[0].content[0].text;
    assert.match(userText, /Sivutyyppi: Tehtävä/);
    assert.match(userText, /Kurssi: Pedagogiikan perusteet/);
    assert.match(userText, /points_possible: 10/);
    assert.match(userText, /submission_types: online_upload/);
    assert.match(userText, /rubric: ei arviointimatriisia/);
    assert.match(userText, /!\[\(alt-teksti puuttuu\)\]/);
    assert.match(reqs[0].system[0].text, /Tehtävä/);
    await page.screenshot({ path: path.join(shotsDir, "assignment-review.png") });

    await page.getByRole("button", { name: "Saako esseessä käyttää tekoälyä?" }).click();
    await page.getByText("arviointikriteereistä").waitFor();
    const chatReq = (await (await fetch(`${COACH}/__requests`)).json())[1];
    assert.equal(chatReq.messages.at(-1).content, "Saako esseessä käyttää tekoälyä?");
    await page.screenshot({ path: path.join(shotsDir, "assignment-chat.png") });

    // Review survives a reload (sessionStorage).
    await page.reload();
    await page.locator("#canvas-coach-root button.launcher").click();
    await page.getByText("Arviointikriteerit puuttuvat").waitFor();
    console.log("✓ teacher: assignment review, chat, persistence");
    await page.close();
  }

  // 2. Teacher on the course home (wiki front page).
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    await setupRoutes(page, { enrollment: "teacher" });
    await page.goto(`${CANVAS}/courses/1`);
    await page.locator("#canvas-coach-root button.launcher").click();
    await page.getByText("mitä linkkejä kannattaa nostaa").waitFor();
    await page.getByRole("button", { name: "Tarkista sivu" }).click();
    await page.getByText("Arviointikriteerit puuttuvat").waitFor();
    const reqs = await (await fetch(`${COACH}/__requests`)).json();
    const text = reqs.at(-1).messages[0].content[0].text;
    assert.match(text, /Sivutyyppi: Kurssin etusivu/);
    assert.match(text, /\[Klikkaa tästä\]\(\/courses\/1\/modules\)/);
    assert.match(text, /näkyvät navigaatiolinkit: Etusivu, Moduulit/);
    console.log("✓ teacher: front page review");
    await page.close();
  }

  // 3. Students never see the coach.
  {
    const page = await browser.newPage();
    await setupRoutes(page, { enrollment: "student" });
    await page.goto(`${CANVAS}/courses/1/assignments/2`);
    await page.waitForTimeout(1500);
    assert.equal(await page.locator("#canvas-coach-root").count(), 0);
    console.log("✓ student: coach hidden");
    await page.close();
  }

  // 4. Mobile width: panel fits the screen.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    await setupRoutes(page, { enrollment: "teacher" });
    await page.goto(`${CANVAS}/courses/1/assignments/2`);
    await page.locator("#canvas-coach-root button.launcher").click();
    await page.getByRole("button", { name: "Tarkista sivu" }).click();
    await page.getByText("Arviointikriteerit puuttuvat").waitFor();
    const width = await page.locator("#canvas-coach-root").evaluate((h) => h.shadowRoot.querySelector(".panel").getBoundingClientRect().width);
    assert.ok(width <= 390, `panel width ${width}`);
    await page.screenshot({ path: path.join(shotsDir, "mobile.png") });
    console.log("✓ mobile layout");
    await page.close();
  }
} catch (err) {
  failed = true;
  console.error(err);
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
