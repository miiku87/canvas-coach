/**
 * Converts Canvas rich-content HTML into compact Markdown for the model.
 * Keeps what matters for reviewing a page: headings, lists, link texts and
 * targets, image alt texts (flagging missing ones), tables and embeds.
 */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = renderChildren(doc.body, { listDepth: 0 });
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Ctx {
  listDepth: number;
}

const BLOCK = new Set([
  "P", "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "ASIDE", "MAIN", "NAV",
  "BLOCKQUOTE", "FIGURE", "FIGCAPTION", "DETAILS", "SUMMARY", "PRE", "ADDRESS",
]);

function inline(text: string): string {
  return text.replace(/\s+/g, " ");
}

function renderChildren(node: Node, ctx: Ctx): string {
  let out = "";
  node.childNodes.forEach((child) => {
    out += renderNode(child, ctx);
  });
  return out;
}

function shortSrc(src: string): string {
  try {
    const url = new URL(src, "https://canvas.invalid");
    const file = url.pathname.split("/").filter(Boolean).pop() ?? "";
    return url.hostname === "canvas.invalid" ? url.pathname : `${url.hostname}/…/${file}`;
  } catch {
    return src.slice(0, 120);
  }
}

function renderNode(node: Node, ctx: Ctx): string {
  if (node.nodeType === 3 /* TEXT_NODE */) return inline(node.textContent ?? "");
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return "";
  const el = node as Element;
  const tag = el.tagName;

  switch (tag) {
    case "SCRIPT":
    case "STYLE":
    case "NOSCRIPT":
      return "";
    case "BR":
      return "\n";
    case "HR":
      return "\n\n---\n\n";
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6": {
      const level = Number(tag[1]);
      return `\n\n${"#".repeat(level)} ${renderChildren(el, ctx).trim()}\n\n`;
    }
    case "STRONG":
    case "B": {
      const text = renderChildren(el, ctx).trim();
      return text ? `**${text}** ` : "";
    }
    case "A": {
      const href = el.getAttribute("href") ?? "";
      const text = renderChildren(el, ctx).trim();
      const label = text || el.getAttribute("title") || "(ei linkkitekstiä)";
      return href ? `[${label}](${href})` : label;
    }
    case "IMG": {
      const alt = el.getAttribute("alt");
      const role = el.getAttribute("role");
      const src = shortSrc(el.getAttribute("src") ?? "");
      if (role === "presentation" || alt === "") return `![(koristekuva)](${src})`;
      return `![${alt ?? "(alt-teksti puuttuu)"}](${src})`;
    }
    case "IFRAME":
    case "VIDEO":
    case "AUDIO": {
      const title = el.getAttribute("title") ?? "";
      return `\n[Upotus${title ? `: ${title}` : ""} – ${shortSrc(el.getAttribute("src") ?? "")}]\n`;
    }
    case "UL":
    case "OL": {
      const ordered = tag === "OL";
      let i = 0;
      let out = "\n";
      el.childNodes.forEach((child) => {
        if ((child as Element).tagName !== "LI") return;
        i += 1;
        const bullet = ordered ? `${i}.` : "-";
        const body = renderChildren(child, { listDepth: ctx.listDepth + 1 }).trim();
        out += `${"  ".repeat(ctx.listDepth)}${bullet} ${body}\n`;
      });
      return ctx.listDepth === 0 ? `${out}\n` : out;
    }
    case "TABLE": {
      const rows = Array.from(el.querySelectorAll("tr")).map(
        (tr) =>
          "| " +
          Array.from(tr.children)
            .map((cell) => {
              const text = renderChildren(cell, ctx).replace(/\n+/g, " ").trim();
              return cell.tagName === "TH" ? `**${text}**` : text;
            })
            .join(" | ") +
          " |",
      );
      const caption = el.querySelector("caption")?.textContent?.trim();
      return `\n\n${caption ? `Taulukko: ${caption}\n` : ""}${rows.join("\n")}\n\n`;
    }
    default: {
      const body = renderChildren(el, ctx);
      return BLOCK.has(tag) ? `\n\n${body.trim()}\n\n` : body;
    }
  }
}
