import type { ChatTurn, Finding, PageSnapshot, Review, Severity } from "../../shared/api.js";
import type { CanvasCourse } from "./canvas-api.js";
import { requestChat, requestReview } from "./coach-client.js";
import type { PageContext } from "./page-context.js";
import { escapeHtml, renderMarkdown } from "./render.js";
import { buildSnapshot } from "./snapshot.js";
import { STYLES } from "./styles.js";

const PAGE_LABELS: Record<string, string> = {
  assignment: "Tehtävä",
  front_page: "Kurssin etusivu",
  wiki_page: "Sisältösivu",
  discussion: "Keskustelu",
  quiz: "Tentti",
  syllabus: "Syllabus",
  modules: "Moduulit",
  announcement: "Tiedote",
  generic: "Sivu",
};

const SEVERITY: Record<Severity, { label: string; order: number }> = {
  critical: { label: "Korjaa", order: 0 },
  improve: { label: "Paranna", order: 1 },
  idea: { label: "Idea", order: 2 },
  good: { label: "Toimii", order: 3 },
};

const ICON_SPARK = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

interface State {
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  snapshot?: PageSnapshot;
  review?: Review;
  history: ChatTurn[];
  chatPending: boolean;
}

function storageKey(): string {
  return `canvasCoach:${location.pathname}`;
}

function loadState(): State | null {
  try {
    const raw = sessionStorage.getItem(storageKey());
    return raw ? ({ ...JSON.parse(raw), chatPending: false } as State) : null;
  } catch {
    return null;
  }
}

function saveState(state: State): void {
  try {
    if (state.status !== "ready") return;
    const { snapshot, review, history } = state;
    sessionStorage.setItem(storageKey(), JSON.stringify({ status: "ready", snapshot, review, history }));
  } catch {
    // Storage unavailable (private mode, quota): the panel works without it.
  }
}

export class CoachPanel {
  private readonly host = document.createElement("div");
  private readonly shadow = this.host.attachShadow({ mode: "open" });
  private launcher!: HTMLButtonElement;
  private panel!: HTMLElement;
  private body!: HTMLElement;
  private footer!: HTMLElement;
  private subtitle!: HTMLElement;
  private state: State = { status: "idle", history: [], chatPending: false };

  constructor(
    private ctx: PageContext,
    private readonly course: CanvasCourse,
  ) {
    this.host.id = "canvas-coach-root";
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="root">
        <button class="launcher" type="button" aria-haspopup="dialog" aria-expanded="false">
          ${ICON_SPARK}<span>Coach</span>
        </button>
        <aside class="panel" role="dialog" aria-modal="false" aria-labelledby="cc-title">
          <header>
            <div class="titles">
              <h2 id="cc-title">Canvas Coach</h2>
              <div class="sub"></div>
            </div>
            <button class="icon-btn close" type="button" aria-label="Sulje Coach">${ICON_CLOSE}</button>
          </header>
          <div class="body" aria-live="polite"></div>
          <footer></footer>
        </aside>
      </div>`;
    this.launcher = this.shadow.querySelector(".launcher")!;
    this.panel = this.shadow.querySelector(".panel")!;
    this.body = this.shadow.querySelector(".body")!;
    this.footer = this.shadow.querySelector("footer")!;
    this.subtitle = this.shadow.querySelector(".sub")!;

    this.launcher.addEventListener("click", () => this.toggle());
    this.shadow.querySelector(".close")!.addEventListener("click", () => this.close());
    this.panel.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Escape") this.close();
    });
    this.restore();
  }

  mount(): void {
    document.body.appendChild(this.host);
  }

  unmount(): void {
    this.host.remove();
  }

  /** Called when Canvas navigates client-side to another supported page. */
  setContext(ctx: PageContext): void {
    this.ctx = ctx;
    this.restore();
  }

  get isOpen(): boolean {
    return this.panel.classList.contains("open");
  }

  open(): void {
    this.panel.classList.add("open");
    this.launcher.setAttribute("aria-expanded", "true");
    this.launcher.hidden = true;
    (this.shadow.querySelector(".primary, textarea, .close") as HTMLElement | null)?.focus();
  }

  close(): void {
    this.panel.classList.remove("open");
    this.launcher.setAttribute("aria-expanded", "false");
    this.launcher.hidden = false;
    this.launcher.focus();
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private restore(): void {
    this.state = loadState() ?? { status: "idle", history: [], chatPending: false };
    this.render();
  }

  private setState(patch: Partial<State>): void {
    this.state = { ...this.state, ...patch };
    saveState(this.state);
    this.render();
  }

  async runReview(): Promise<void> {
    this.setState({ status: "loading", error: undefined, review: undefined, history: [] });
    try {
      const snapshot = await buildSnapshot(this.ctx, this.course);
      this.setState({ snapshot });
      const { review } = await requestReview(snapshot);
      review.findings.sort((a, b) => SEVERITY[a.severity].order - SEVERITY[b.severity].order);
      this.setState({ status: "ready", review });
    } catch (err) {
      this.setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  async sendChat(text: string): Promise<void> {
    const { snapshot, review } = this.state;
    if (!snapshot || !text.trim() || this.state.chatPending) return;
    const history: ChatTurn[] = [...this.state.history, { role: "user", content: text.trim() }];
    this.setState({ history, chatPending: true, error: undefined });
    try {
      const { reply } = await requestChat({ page: snapshot, review, history });
      this.setState({ history: [...history, { role: "assistant", content: reply }], chatPending: false });
    } catch (err) {
      // Drop the unanswered question so the conversation stays well-formed.
      this.setState({
        history: history.slice(0, -1),
        chatPending: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private render(): void {
    const s = this.state;
    const label = PAGE_LABELS[s.snapshot?.pageType ?? this.ctx.pageType] ?? "Sivu";
    this.subtitle.textContent = `${label} · ${this.course.name}`;

    let html = "";
    if (s.status === "idle" || (s.status === "error" && !s.review)) {
      html += `<div class="intro">
        <p>Hei! Luen tämän sivun ja annan palautetta sen selkeydestä, rakenteesta ja saavutettavuudesta opiskelijan näkökulmasta${this.ctx.pageType === "front_page" ? " sekä ehdotan, mitä linkkejä kannattaa nostaa esiin" : ""}.</p>
        ${this.ctx.editing ? `<div class="draft-note">Olet muokkaustilassa: tarkistan editorissa olevan, vielä tallentamattoman version.</div>` : ""}
        <button class="primary" type="button" data-action="review">Tarkista sivu</button>
      </div>`;
    }
    if (s.status === "loading") {
      html += `<div class="loading" role="status"><div class="spinner"></div>Luen sivua ja mietin palautetta…</div>`;
    }
    if (s.error) html += `<div class="error" role="alert">${escapeHtml(s.error)}</div>`;
    if (s.review) html += this.renderReview(s.review, s.snapshot);
    if (s.history.length || s.chatPending) {
      html += `<div class="section-title">Keskustelu</div><div class="chat">`;
      for (const turn of s.history) {
        html += `<div class="msg ${turn.role}">${turn.role === "assistant" ? renderMarkdown(turn.content) : `<p>${escapeHtml(turn.content)}</p>`}</div>`;
      }
      if (s.chatPending) html += `<div class="loading" role="status"><div class="spinner"></div>Mietin…</div>`;
      html += `</div>`;
    }
    this.body.innerHTML = html;
    this.bindBody();

    this.footer.innerHTML = s.review
      ? `<form class="composer">
          <label class="sr-only" for="cc-input">Kysy Coachilta lisää</label>
          <textarea id="cc-input" rows="1" placeholder="Kysy lisää…" ${s.chatPending ? "disabled" : ""}></textarea>
          <button class="primary" type="submit" style="width:auto" ${s.chatPending ? "disabled" : ""}>Lähetä</button>
        </form>
        <div class="disclaimer">Sivun sisältö lähetetään tekoälypalveluun. Tekoäly voi erehtyä – sinä päätät muutoksista.</div>`
      : `<div class="disclaimer">Sivun sisältö lähetetään tekoälypalveluun vasta, kun painat "Tarkista sivu".</div>`;
    this.bindFooter();

    if (s.history.length) this.body.scrollTop = this.body.scrollHeight;
  }

  private renderReview(review: Review, snapshot?: PageSnapshot): string {
    const findings = review.findings.map((f) => this.renderFinding(f)).join("");
    const questions = review.questions
      .map((q) => `<li><button type="button" data-ask="${escapeHtml(q)}">${escapeHtml(q)}</button></li>`)
      .join("");
    return `
      ${snapshot?.isDraft ? `<div class="draft-note">Palaute koskee tallentamatonta luonnosta.</div>` : ""}
      <div class="summary">${escapeHtml(review.summary)}</div>
      ${findings ? `<div class="section-title">Huomiot</div>${findings}` : ""}
      ${questions ? `<div class="section-title">Pohdittavaksi</div><ul class="questions">${questions}</ul>` : ""}
      <div class="row">
        <span class="cat">Klikkaa kysymystä jatkaaksesi keskustelua.</span>
        <button class="secondary" type="button" data-action="review">Tarkista uudelleen</button>
      </div>`;
  }

  private renderFinding(f: Finding): string {
    const sev = SEVERITY[f.severity] ?? SEVERITY.idea;
    const suggestion = f.suggestion.trim()
      ? `<div class="suggestion">${escapeHtml(f.suggestion)}</div>
         <div class="suggestion-actions"><button class="secondary" type="button" data-copy="${escapeHtml(f.suggestion)}">Kopioi ehdotus</button></div>`
      : "";
    return `<article class="finding sev-${f.severity}">
      <div class="meta"><span class="badge">${sev.label}</span><span class="cat">${escapeHtml(f.category)}</span></div>
      <h3>${escapeHtml(f.title)}</h3>
      <p>${escapeHtml(f.detail)}</p>
      ${suggestion}
    </article>`;
  }

  private bindBody(): void {
    this.body.querySelectorAll<HTMLButtonElement>("[data-action=review]").forEach((b) => {
      b.disabled = this.state.status === "loading";
      b.addEventListener("click", () => void this.runReview());
    });
    this.body.querySelectorAll<HTMLButtonElement>("[data-ask]").forEach((b) =>
      b.addEventListener("click", () => void this.sendChat(b.dataset.ask ?? "")),
    );
    this.body.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.copy ?? "");
          b.textContent = "Kopioitu ✓";
        } catch {
          b.textContent = "Kopiointi ei onnistunut";
        }
      }),
    );
  }

  private bindFooter(): void {
    const form = this.footer.querySelector<HTMLFormElement>("form");
    const input = this.footer.querySelector<HTMLTextAreaElement>("textarea");
    if (!form || !input) return;
    const submit = () => {
      const text = input.value;
      input.value = "";
      void this.sendChat(text);
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
    });
  }
}
