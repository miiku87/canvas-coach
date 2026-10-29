import type { PageSnapshot, PageType } from "../../shared/api.js";
import {
  canvasGet,
  type CanvasAssignment,
  type CanvasCourse,
  type CanvasDiscussion,
  type CanvasModule,
  type CanvasPage,
  type CanvasQuiz,
  type CanvasTab,
} from "./canvas-api.js";
import { htmlToMarkdown } from "./html-to-markdown.js";
import type { PageContext } from "./page-context.js";

type Facts = Record<string, string>;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "ei asetettu";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("fi-FI", { dateStyle: "medium", timeStyle: "short" });
}

function yesNo(v: boolean | undefined): string {
  return v ? "kyllä" : "ei";
}

function rubricText(rubric: CanvasAssignment["rubric"]): string {
  if (!rubric?.length) return "ei arviointimatriisia";
  return rubric
    .map((c) => {
      const ratings = (c.ratings ?? []).map((r) => `${r.description} (${r.points} p)`).join("; ");
      return `${c.description} – ${c.points} p${c.long_description ? `: ${c.long_description}` : ""}${ratings ? ` [${ratings}]` : ""}`;
    })
    .join(" | ");
}

function assignmentFacts(a: CanvasAssignment, prefix = ""): Facts {
  return {
    [`${prefix}määräaika`]: formatDate(a.due_at),
    [`${prefix}saatavilla alkaen`]: formatDate(a.unlock_at),
    [`${prefix}suljetaan`]: formatDate(a.lock_at),
    [`${prefix}points_possible`]: String(a.points_possible ?? "ei asetettu"),
    [`${prefix}arviointityyppi`]: a.grading_type ?? "-",
    [`${prefix}submission_types`]: (a.submission_types ?? []).join(", ") || "-",
    ...(a.allowed_extensions?.length ? { [`${prefix}sallitut tiedostotyypit`]: a.allowed_extensions.join(", ") } : {}),
    [`${prefix}palautuskertoja`]: a.allowed_attempts && a.allowed_attempts > 0 ? String(a.allowed_attempts) : "rajoittamaton",
    [`${prefix}vertaisarviointi`]: yesNo(a.peer_reviews),
    [`${prefix}ryhmätehtävä`]: yesNo(a.group_category_id != null),
    [`${prefix}rubric`]: rubricText(a.rubric),
    [`${prefix}julkaistu`]: yesNo(a.published),
  };
}

function modulesMarkdown(modules: CanvasModule[]): string {
  return modules
    .map((m) => {
      const flags = [
        m.published === false ? "julkaisematon" : null,
        m.unlock_at ? `avautuu ${formatDate(m.unlock_at)}` : null,
        m.require_sequential_progress ? "edetään järjestyksessä" : null,
        m.prerequisite_module_ids?.length ? "edellytysmoduuleja" : null,
      ].filter(Boolean);
      const head = `## ${m.name}${flags.length ? ` (${flags.join(", ")})` : ""}`;
      if (!m.items) return `${head}\n- (${m.items_count ?? "?"} kohdetta, listaa ei saatu)`;
      if (!m.items.length) return `${head}\n- (tyhjä moduuli)`;
      const items = m.items.map((it) => {
        const extra = [
          it.published === false ? "julkaisematon" : null,
          it.completion_requirement ? `vaatimus: ${it.completion_requirement.type}` : null,
        ].filter(Boolean);
        return `${"  ".repeat(it.indent ?? 0)}- [${it.type}] ${it.title}${extra.length ? ` (${extra.join(", ")})` : ""}`;
      });
      return `${head}\n${items.join("\n")}`;
    })
    .join("\n\n");
}

/** Content of the rich content editor when the teacher is editing (unsaved draft). */
function readEditorDraft(): { html: string; title?: string } | null {
  const tinymce = (window as unknown as { tinymce?: { activeEditor?: { getContent(): string } } }).tinymce;
  const html = tinymce?.activeEditor?.getContent();
  if (html == null) return null;
  const titleInput = document.querySelector<HTMLInputElement>(
    "#assignment_name, #wikipage-title-input, input[name='title'], #quiz_title, #discussion-title",
  );
  return { html, title: titleInput?.value || undefined };
}

interface Loaded {
  pageType: PageType;
  title: string;
  html: string;
  content?: string;
  facts: Facts;
}

async function loadFrontPage(ctx: PageContext, course: CanvasCourse): Promise<Loaded> {
  const tabs = await canvasGet<CanvasTab[]>(`/api/v1/courses/${ctx.courseId}/tabs`).catch(() => []);
  const facts: Facts = {
    "kurssin etusivun tyyppi": course.default_view ?? "-",
    "kurssi alkaa": formatDate(course.start_at),
    "kurssi päättyy": formatDate(course.end_at),
    "näkyvät navigaatiolinkit": tabs.filter((t) => !t.hidden).map((t) => t.label).join(", ") || "-",
  };

  if (course.default_view === "wiki") {
    const page = await canvasGet<CanvasPage>(`/api/v1/courses/${ctx.courseId}/front_page`);
    return { pageType: "front_page", title: page.title, html: page.body ?? "", facts };
  }
  if (course.default_view === "modules") {
    const modules = await canvasGet<CanvasModule[]>(
      `/api/v1/courses/${ctx.courseId}/modules?include[]=items&per_page=100`,
    );
    return { pageType: "front_page", title: "Etusivu: moduulit", html: "", content: modulesMarkdown(modules), facts };
  }
  if (course.default_view === "syllabus") {
    return { pageType: "front_page", title: "Etusivu: syllabus", html: course.syllabus_body ?? "", facts };
  }
  return {
    pageType: "front_page",
    title: `Etusivu (${course.default_view ?? "tuntematon"})`,
    html: document.querySelector("#content")?.innerHTML ?? "",
    facts,
  };
}

async function load(ctx: PageContext, course: CanvasCourse): Promise<Loaded> {
  const base = `/api/v1/courses/${ctx.courseId}`;
  const id = encodeURIComponent(ctx.itemId ?? "");
  switch (ctx.pageType) {
    case "front_page":
      return loadFrontPage(ctx, course);
    case "syllabus":
      return { pageType: "syllabus", title: "Syllabus", html: course.syllabus_body ?? "", facts: {} };
    case "modules": {
      const modules = await canvasGet<CanvasModule[]>(`${base}/modules?include[]=items&per_page=100`);
      return { pageType: "modules", title: "Moduulit", html: "", content: modulesMarkdown(modules), facts: { moduuleja: String(modules.length) } };
    }
    case "wiki_page": {
      const page = await canvasGet<CanvasPage>(`${base}/pages/${id}`);
      return {
        pageType: page.front_page ? "front_page" : "wiki_page",
        title: page.title,
        html: page.body ?? "",
        facts: { julkaistu: yesNo(page.published), "päivitetty": formatDate(page.updated_at) },
      };
    }
    case "assignment": {
      const a = await canvasGet<CanvasAssignment>(`${base}/assignments/${id}`);
      return { pageType: "assignment", title: a.name, html: a.description ?? "", facts: assignmentFacts(a) };
    }
    case "discussion":
    case "announcement": {
      const d = await canvasGet<CanvasDiscussion>(`${base}/discussion_topics/${id}`);
      const facts: Facts = {
        julkaistu: yesNo(d.published),
        "vastattava ennen muiden viestien näkemistä": yesNo(d.require_initial_post),
        ketjutus: d.discussion_type ?? "-",
        "ajastettu julkaisu": formatDate(d.delayed_post_at),
        suljetaan: formatDate(d.lock_at),
        arvioitu: yesNo(!!d.assignment),
        ...(d.assignment ? assignmentFacts(d.assignment, "arviointi: ") : {}),
      };
      return { pageType: d.is_announcement ? "announcement" : "discussion", title: d.title, html: d.message ?? "", facts };
    }
    case "quiz": {
      const q = await canvasGet<CanvasQuiz>(`${base}/quizzes/${id}`);
      return {
        pageType: "quiz",
        title: q.title,
        html: q.description ?? "",
        facts: {
          tyyppi: q.quiz_type ?? "-",
          aikaraja: q.time_limit ? `${q.time_limit} min` : "ei aikarajaa",
          yritykset: q.allowed_attempts && q.allowed_attempts > 0 ? String(q.allowed_attempts) : "rajoittamaton",
          pisteet: String(q.points_possible ?? "-"),
          kysymyksiä: String(q.question_count ?? "-"),
          määräaika: formatDate(q.due_at),
          "saatavilla alkaen": formatDate(q.unlock_at),
          suljetaan: formatDate(q.lock_at),
          "vastaukset sekoitetaan": yesNo(q.shuffle_answers),
          "oikeat vastaukset näytetään": yesNo(q.show_correct_answers),
          "yksi kysymys kerrallaan": yesNo(q.one_question_at_a_time),
          julkaistu: yesNo(q.published),
        },
      };
    }
    default:
      return {
        pageType: "generic",
        title: document.title,
        html: document.querySelector("#content")?.innerHTML ?? "",
        facts: {},
      };
  }
}

export async function buildSnapshot(ctx: PageContext, course: CanvasCourse): Promise<PageSnapshot> {
  const loaded = await load(ctx, course);
  const draft = ctx.editing ? readEditorDraft() : null;
  const html = draft?.html ?? loaded.html;
  return {
    pageType: loaded.pageType,
    url: location.href,
    courseName: course.name,
    title: draft?.title ?? loaded.title,
    content: loaded.content ?? htmlToMarkdown(html),
    facts: Object.keys(loaded.facts).length ? loaded.facts : undefined,
    isDraft: draft ? true : undefined,
  };
}
