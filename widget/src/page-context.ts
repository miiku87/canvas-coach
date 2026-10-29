import type { PageType } from "../../shared/api.js";

export interface PageContext {
  courseId: string;
  pageType: PageType;
  /** Id or slug of the item (assignment id, page slug, ...), when the URL has one. */
  itemId?: string;
  /** True on an edit view, where the open editor may hold an unsaved draft. */
  editing: boolean;
}

const ROUTES: Array<{ pattern: RegExp; pageType: PageType }> = [
  { pattern: /^\/courses\/(\d+)\/?$/, pageType: "front_page" },
  { pattern: /^\/courses\/(\d+)\/wiki\/?$/, pageType: "front_page" },
  { pattern: /^\/courses\/(\d+)\/assignments\/syllabus\/?$/, pageType: "syllabus" },
  { pattern: /^\/courses\/(\d+)\/modules\/?$/, pageType: "modules" },
  { pattern: /^\/courses\/(\d+)\/pages\/([^/]+)(\/edit)?\/?$/, pageType: "wiki_page" },
  { pattern: /^\/courses\/(\d+)\/assignments\/(\d+)(\/edit)?\/?$/, pageType: "assignment" },
  { pattern: /^\/courses\/(\d+)\/discussion_topics\/(\d+)(\/edit)?\/?$/, pageType: "discussion" },
  { pattern: /^\/courses\/(\d+)\/announcements\/(\d+)(\/edit)?\/?$/, pageType: "announcement" },
  { pattern: /^\/courses\/(\d+)\/quizzes\/(\d+)(\/edit)?\/?$/, pageType: "quiz" },
];

/** Maps a Canvas URL path to the kind of page the teacher is on, or null if unsupported. */
export function detectPage(pathname: string): PageContext | null {
  for (const { pattern, pageType } of ROUTES) {
    const m = pathname.match(pattern);
    if (!m) continue;
    const [, courseId, second, third] = m;
    // Routes without an item capture the optional "/edit" in neither group.
    const hasItem = pageType !== "front_page" && pageType !== "syllabus" && pageType !== "modules";
    return {
      courseId: courseId!,
      pageType,
      itemId: hasItem ? decodeURIComponent(second!) : undefined,
      editing: hasItem ? third === "/edit" : false,
    };
  }
  return null;
}
