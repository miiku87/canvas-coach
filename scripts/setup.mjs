// Guided setup for testing Canvas Coach locally: installs dependencies, asks
// for the API key and Canvas address, writes server/.env and builds the
// browser extension. Uses only Node built-ins until dependencies are installed.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, "server", ".env");
const MIN_NODE = 22;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q) => (await rl.question(q)).trim();

function title(text) {
  console.log(`\n=== ${text} ===\n`);
}

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  rl.close();
  process.exit(1);
}

function run(args) {
  const res = spawnSync("npm", args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  return res.status === 0;
}

function readEnv() {
  const source = existsSync(envFile) ? envFile : path.join(root, "server", ".env.example");
  return readFileSync(source, "utf8");
}

function getEnvValue(content, key) {
  return content.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
}

function setEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
}

/** Accepts "koulu.instructure.com/courses/1" etc. and returns "https://koulu.instructure.com". */
function normalizeCanvasUrl(input) {
  let value = input.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    return url.hostname.includes(".") ? url.origin : null;
  } catch {
    return null;
  }
}

async function askCanvasUrl(current) {
  console.log("Kirjoita Canvasinne osoite, esim. https://koulu.instructure.com");
  console.log("(Voit myös kopioida minkä tahansa Canvas-sivun osoitteen selaimen osoiteriviltä.)");
  for (;;) {
    const hint = current ? ` [Enter = ${current}]` : "";
    const answer = await ask(`Canvasin osoite${hint}: `);
    if (!answer && current) return current;
    const url = normalizeCanvasUrl(answer);
    if (url) return url;
    console.log("  Osoite ei näytä oikealta. Yritä uudelleen.");
  }
}

async function checkApiKey(key) {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 20_000 });
    await client.models.retrieve("claude-opus-5-5");
    return "ok";
  } catch (err) {
    const status = err?.status;
    if (status === 401) return "invalid";
    if (status === 403 || status === 404) return "no-model";
    return "unknown";
  }
}

async function askApiKey(current) {
  console.log("Liitä Anthropicin API-avain (alkaa sk-ant-). Avain näkyy ruudulla vain tässä ikkunassa.");
  for (let attempt = 0; ; attempt++) {
    const hint = current ? " [Enter = käytä aiemmin tallennettua avainta]" : "";
    const answer = await ask(`API-avain${hint}: `);
    const key = answer || current;
    if (!key) {
      console.log("  Avain tarvitaan. Ohjeessa kerrotaan, mistä sen saa.");
      continue;
    }
    if (!key.startsWith("sk-ant-")) {
      console.log("  Avaimen pitäisi alkaa sk-ant-. Tarkista, että kopioit koko avaimen.");
      continue;
    }
    process.stdout.write("  Tarkistetaan avainta… ");
    const result = await checkApiKey(key);
    if (result === "ok") {
      console.log("✅ avain toimii.");
      return key;
    }
    if (result === "invalid") {
      console.log("❌ avain ei kelpaa. Kopioi avain uudelleen Claude Consolesta.");
      current = "";
      continue;
    }
    if (result === "no-model") {
      console.log("⚠️  avain toimii, mutta Claude Opus 5.5 -malli ei ole tilillä käytössä. Tallennetaan silti.");
      return key;
    }
    console.log("⚠️  avainta ei voitu tarkistaa (ei verkkoyhteyttä?). Tallennetaan silti.");
    return key;
  }
}

title("Canvas Coach – asennus testikäyttöön");

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < MIN_NODE) {
  fail(`Node.js on liian vanha (${process.versions.node}). Asenna uusin LTS-versio osoitteesta https://nodejs.org ja aja asennus uudelleen.`);
}

title("Vaihe 1/3: Ladataan tarvittavat osat (voi kestää pari minuuttia)");
if (!run(["install", "--no-audit", "--no-fund"])) {
  fail("Osien lataus epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.");
}

title("Vaihe 2/3: Asetukset");
let env = readEnv();
// Offer earlier answers as defaults, but never the placeholders of .env.example.
const saved = existsSync(envFile) ? env : "";
const canvasUrl = await askCanvasUrl(getEnvValue(saved, "ALLOWED_ORIGINS").split(",")[0]);
console.log();
const apiKey = await askApiKey(getEnvValue(saved, "ANTHROPIC_API_KEY"));
env = setEnvValue(env, "ALLOWED_ORIGINS", canvasUrl);
env = setEnvValue(env, "ANTHROPIC_API_KEY", apiKey);
writeFileSync(envFile, env);
console.log(`\n  Asetukset tallennettu tiedostoon server/.env`);

title("Vaihe 3/3: Rakennetaan selainlaajennus");
if (!run(["run", "build:extension"])) {
  fail("Laajennuksen rakentaminen epäonnistui.");
}

rl.close();
const extensionDir = path.join(root, "extension", "build");
console.log(`
✅ Asennus valmis!

Seuraavaksi:
  1. Käynnistä Coach tuplaklikkaamalla tiedostoa "Kaynnista" (Windows: Kaynnista.bat, Mac: Kaynnista.command).
  2. Lisää laajennus Chromeen (chrome://extensions → Kehittäjätila → Lataa pakkaamaton) ja valitse tämä kansio:
     ${extensionDir}
  3. Avaa Canvasissa testikurssisi tehtävä ja paina oikean alakulman Coach-painiketta.
`);
