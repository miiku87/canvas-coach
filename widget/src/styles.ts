// Styles live inside the shadow root, isolated from Canvas CSS.
// --ic-brand-primary is Canvas's own brand colour custom property.
export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.root {
  --accent: var(--ic-brand-primary, #0374b5);
  --text: #273540;
  --muted: #6a7883;
  --line: #e1e5e8;
  --bg: #ffffff;
  --soft: #f5f7f8;
  --critical: #c23c0d;
  --improve: #b66a00;
  --idea: #0374b5;
  --good: #03893d;
  font-family: "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
}
button { font: inherit; cursor: pointer; }
button:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.launcher {
  position: fixed; right: 20px; bottom: 20px; z-index: 10000;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px; border: 0; border-radius: 999px;
  background: var(--accent); color: #fff; font-weight: 700;
  box-shadow: 0 4px 14px rgba(0,0,0,.2);
}
.launcher:hover { filter: brightness(1.08); }
.launcher svg { width: 18px; height: 18px; }

.panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 10001;
  width: min(420px, 100vw); background: var(--bg);
  border-left: 1px solid var(--line); box-shadow: -8px 0 24px rgba(0,0,0,.12);
  display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform .2s ease;
  visibility: hidden;
}
.panel.open { transform: none; visibility: visible; }
@media (prefers-reduced-motion: reduce) { .panel { transition: none; } }

header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-bottom: 1px solid var(--line);
}
header .titles { flex: 1; min-width: 0; }
header h2 { margin: 0; font-size: 16px; }
header .sub { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.icon-btn { border: 0; background: transparent; padding: 6px; border-radius: 6px; color: var(--muted); }
.icon-btn:hover { background: var(--soft); color: var(--text); }

.body { flex: 1; overflow-y: auto; padding: 16px; }
.intro p { margin: 0 0 12px; }
.primary {
  border: 0; border-radius: 6px; padding: 10px 14px;
  background: var(--accent); color: #fff; font-weight: 700; width: 100%;
}
.primary[disabled] { opacity: .6; cursor: progress; }
.secondary {
  border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px;
  background: var(--bg); color: var(--text); font-size: 13px;
}
.secondary:hover { background: var(--soft); }

.draft-note { background: #fff8e5; border: 1px solid #f3d37a; border-radius: 6px; padding: 8px 10px; font-size: 13px; margin-bottom: 12px; }
.error { background: #fdeeea; border: 1px solid #f2b8a6; color: #8a2a09; border-radius: 6px; padding: 10px; margin: 12px 0; }

.loading { display: flex; align-items: center; gap: 10px; color: var(--muted); padding: 12px 0; }
.spinner { width: 18px; height: 18px; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.summary { background: var(--soft); border-radius: 8px; padding: 12px; margin-bottom: 14px; }
.section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 18px 0 8px; }

.finding { border: 1px solid var(--line); border-left: 4px solid var(--sev); border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }
.finding .meta { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; flex-wrap: wrap; }
.badge { font-size: 11px; font-weight: 700; color: #fff; background: var(--sev); border-radius: 4px; padding: 1px 6px; }
.cat { font-size: 12px; color: var(--muted); }
.finding h3 { font-size: 14px; margin: 0 0 4px; }
.finding p { margin: 0; }
.suggestion { margin-top: 8px; background: var(--soft); border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; font-size: 13px; }
.suggestion-actions { margin-top: 6px; text-align: right; }
.sev-critical { --sev: var(--critical); }
.sev-improve { --sev: var(--improve); }
.sev-idea { --sev: var(--idea); }
.sev-good { --sev: var(--good); }

.questions { margin: 0; padding-left: 18px; }
.questions li { margin-bottom: 6px; }
.questions button { display: block; border: 0; background: none; color: var(--accent); text-align: left; padding: 0; text-decoration: underline; }

.chat .msg { margin: 10px 0; padding: 10px 12px; border-radius: 8px; }
.chat .msg.user { background: #e8f2fa; margin-left: 32px; }
.chat .msg.assistant { background: var(--soft); margin-right: 16px; }
.chat .msg p { margin: 0 0 8px; } .chat .msg p:last-child { margin-bottom: 0; }
.chat .msg ul, .chat .msg ol { margin: 4px 0 8px; padding-left: 20px; }
.chat .msg h4 { margin: 8px 0 4px; font-size: 14px; }
code { background: rgba(0,0,0,.06); padding: 0 4px; border-radius: 3px; font-size: 12px; }

footer { border-top: 1px solid var(--line); padding: 12px 16px; }
.composer { display: flex; gap: 8px; align-items: flex-end; }
.composer textarea {
  flex: 1; resize: none; min-height: 40px; max-height: 140px;
  border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font: inherit; color: var(--text);
}
.composer button { flex: none; }
.disclaimer { margin-top: 8px; font-size: 11px; color: var(--muted); }
.row { display: flex; gap: 8px; justify-content: space-between; align-items: center; margin-top: 16px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`;
