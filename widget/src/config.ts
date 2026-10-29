export interface CoachConfig {
  /** Base URL of the Canvas Coach server, e.g. https://coach.school.fi */
  serverUrl: string;
  /** Optional shared token, sent as X-Coach-Token. */
  token?: string;
  /** Show the coach to every user (development); default: teachers and admins only. */
  showForAll?: boolean;
}

declare global {
  interface Window {
    CANVAS_COACH_CONFIG?: Partial<CoachConfig>;
    ENV?: { current_user_roles?: string[]; current_user_id?: string };
  }
}

// Captured at load time: when loaded via the theme loader, the script's own
// origin is the coach server.
const scriptOrigin = (() => {
  try {
    const src = (document.currentScript as HTMLScriptElement | null)?.src;
    return src ? new URL(src).origin : undefined;
  } catch {
    return undefined;
  }
})();

/**
 * Resolved on every call so the browser extension's options (written to
 * <html data-canvas-coach-*> by its bridge script) apply without a reload.
 */
export function getConfig(): CoachConfig {
  const fromWindow = window.CANVAS_COACH_CONFIG ?? {};
  const data = document.documentElement.dataset;
  const serverUrl =
    fromWindow.serverUrl ?? data.canvasCoachServer ?? scriptOrigin ?? "http://localhost:8787";
  return {
    serverUrl: serverUrl.replace(/\/$/, ""),
    token: fromWindow.token ?? data.canvasCoachToken ?? undefined,
    showForAll: fromWindow.showForAll ?? data.canvasCoachShowForAll === "true",
  };
}
