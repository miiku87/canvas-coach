import { canvasGet, type CanvasCourse } from "./canvas-api.js";
import { getConfig } from "./config.js";
import { detectPage, type PageContext } from "./page-context.js";
import { CoachPanel } from "./panel.js";

const STAFF_ENROLLMENTS = new Set(["teacher", "ta", "designer"]);
const ADMIN_ROLES = new Set(["admin", "root_admin"]);

function isStaff(course: CanvasCourse): boolean {
  if (getConfig().showForAll) return true;
  if (window.ENV?.current_user_roles?.some((r) => ADMIN_ROLES.has(r))) return true;
  return (course.enrollments ?? []).some((e) => STAFF_ENROLLMENTS.has(e.type.toLowerCase()));
}

const courseCache = new Map<string, Promise<CanvasCourse>>();

function loadCourse(courseId: string): Promise<CanvasCourse> {
  let course = courseCache.get(courseId);
  if (!course) {
    course = canvasGet<CanvasCourse>(`/api/v1/courses/${courseId}?include[]=syllabus_body`);
    courseCache.set(courseId, course);
  }
  return course;
}

let panel: CoachPanel | null = null;
let panelCourseId: string | null = null;
let lastPath = "";

async function sync(): Promise<void> {
  if (location.pathname === lastPath) return;
  lastPath = location.pathname;
  const ctx: PageContext | null = detectPage(location.pathname);

  if (!ctx) {
    panel?.unmount();
    panel = null;
    panelCourseId = null;
    return;
  }
  if (panel && panelCourseId === ctx.courseId) {
    panel.setContext(ctx);
    return;
  }

  panel?.unmount();
  panel = null;
  try {
    const course = await loadCourse(ctx.courseId);
    if (!isStaff(course) || location.pathname !== lastPath) return;
    panel = new CoachPanel(ctx, course);
    panelCourseId = ctx.courseId;
    panel.mount();
  } catch (err) {
    console.warn("[Canvas Coach] could not load course", err);
  }
}

function start(): void {
  const w = window as unknown as { __canvasCoachLoaded?: boolean };
  if (w.__canvasCoachLoaded || window.top !== window) return; // once, and not inside iframes
  w.__canvasCoachLoaded = true;
  void sync();
  // Parts of Canvas navigate without a full page load.
  window.addEventListener("popstate", () => void sync());
  setInterval(() => void sync(), 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
