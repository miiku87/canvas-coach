import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "../src/html-to-markdown.js";

describe("htmlToMarkdown", () => {
  it("keeps headings, paragraphs and lists", () => {
    const md = htmlToMarkdown(
      "<h2>Ohjeet</h2><p>Lue   materiaali.</p><ol><li>Kirjoita</li><li>Palauta <strong>pdf</strong></li></ol><ul><li>a<ul><li>b</li></ul></li></ul>",
    );
    expect(md).toBe("## Ohjeet\n\nLue materiaali.\n\n1. Kirjoita\n2. Palauta **pdf**\n\n- a\n  - b");
  });

  it("renders links with their targets and flags empty link text", () => {
    expect(htmlToMarkdown('<p><a href="/courses/1/modules">Moduulit</a> ja <a href="https://x.fi"></a></p>')).toBe(
      "[Moduulit](/courses/1/modules) ja [(ei linkkitekstiä)](https://x.fi)",
    );
  });

  it("flags images without alt text but not decorative ones", () => {
    const md = htmlToMarkdown(
      '<img src="/courses/1/files/2/preview"><img src="/a.png" alt=""><img src="https://cdn.example.com/x/kuva.jpg" alt="Kaavio">',
    );
    expect(md).toContain("![(alt-teksti puuttuu)](/courses/1/files/2/preview)");
    expect(md).toContain("![(koristekuva)](/a.png)");
    expect(md).toContain("![Kaavio](cdn.example.com/…/kuva.jpg)");
  });

  it("renders tables and embeds, drops scripts", () => {
    const md = htmlToMarkdown(
      '<table><caption>Aikataulu</caption><tr><th>Vko</th><th>Aihe</th></tr><tr><td>1</td><td>Intro</td></tr></table><iframe title="Video" src="https://www.youtube.com/embed/abc"></iframe><script>alert(1)</script>',
    );
    expect(md).toContain("Taulukko: Aikataulu\n| **Vko** | **Aihe** |\n| 1 | Intro |");
    expect(md).toContain("[Upotus: Video – www.youtube.com/…/abc]");
    expect(md).not.toContain("alert");
  });
});
