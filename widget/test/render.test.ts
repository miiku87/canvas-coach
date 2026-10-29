import { describe, expect, it } from "vitest";
import { escapeHtml, renderMarkdown } from "../src/render.js";

describe("renderMarkdown", () => {
  it("escapes HTML from the model", () => {
    expect(renderMarkdown("<img src=x onerror=alert(1)>")).toBe("<p>&lt;img src=x onerror=alert(1)&gt;</p>");
  });

  it("renders lists, bold and paragraphs", () => {
    expect(renderMarkdown("Hei **opettaja**\n\n- yksi\n- kaksi\n\n1. a")).toBe(
      "<p>Hei <strong>opettaja</strong></p><ul><li>yksi</li><li>kaksi</li></ul><ol><li>a</li></ol>",
    );
  });

  it("escapes quotes for attributes", () => {
    expect(escapeHtml(`"'`)).toBe("&quot;&#39;");
  });
});
