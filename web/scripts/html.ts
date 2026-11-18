// Tiny HTML helpers for the build checks. Our own generated markup only, so
// regular expressions are enough.

export function meta(html: string, attr: "name" | "property", key: string): string | null {
  const re = new RegExp(`<meta[^>]*${attr}="${key.replace(/[:]/g, "\\:")}"[^>]*>`, "i");
  const tag = re.exec(html)?.[0];
  return tag ? (/content="([^"]*)"/i.exec(tag)?.[1] ?? null) : null;
}

export function title(html: string): string | null {
  return /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || null;
}

export function canonical(html: string): string | null {
  return /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html)?.[1] ?? null;
}

/** Visible text: drop scripts, styles, tags; decode a few entities. */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function h1Text(html: string): string | null {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return m ? visibleText(m[1]!) || null : null;
}
