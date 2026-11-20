// Plain, table-based HTML that renders in Gmail, Outlook and phone mail apps,
// plus a text version of every email. All interpolated values are escaped.

export const OFFICE = {
  name: "Udan Tours and Travels",
  established: "Established 1997",
  addressLines: [
    "714, Yashkamal Building, above Havmor Restaurant",
    "Opposite M.S. University, Sarod, Sayajiganj",
    "Vadodara, Gujarat 390005, India",
  ],
  phones: [
    { label: "Mobile", display: "+91 93762 14442", tel: "+919376214442" },
    { label: "Office", display: "0265 400 8999", tel: "+912654008999" },
  ],
  email: "udantravels.bdq@gmail.com",
  website: "https://udantravelsbdq.com",
  logoUrl: "https://udantravelsbdq.com/images/udan-logo.jpg",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escaped text with line breaks kept, for staff-written notes and instructions. */
export function textToHtml(value: string): string {
  return escapeHtml(value.trim()).replace(/\r?\n/g, "<br>");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface Block {
  html: string;
  text: string;
}

export const para = (text: string): Block => ({
  html: `<p style="margin:0 0 16px;line-height:1.55;">${escapeHtml(text)}</p>`,
  text,
});

export const button = (label: string, href: string): Block => ({
  html: `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="background:#FF8551;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;display:inline-block;">${escapeHtml(label)}</a></p>`,
  text: `${label}: ${href}`,
});

export const heading = (text: string): Block => ({
  html: `<h2 style="margin:24px 0 8px;font-size:16px;color:#2D2D2D;">${escapeHtml(text)}</h2>`,
  text: `\n${text.toUpperCase()}`,
});

export const preformatted = (text: string): Block => ({
  html: `<div style="margin:0 0 16px;padding:12px 16px;background:#F5F5F5;border-radius:8px;line-height:1.55;">${textToHtml(text)}</div>`,
  text: text.trim(),
});

export const rows = (items: readonly [string, string][]): Block => ({
  html:
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 16px;">` +
    items
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;">${escapeHtml(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#2D2D2D;">${escapeHtml(v)}</td></tr>`,
      )
      .join("") +
    `</table>`,
  text: items.map(([k, v]) => `${k}: ${v}`).join("\n"),
});

/** Days an emailed sign-in link stays valid (supabase/migrations/20261120000400_sign_in_links.sql). */
export const SIGN_IN_LINK_DAYS = 7;

/** Under every customer email whose account link signs them in. */
export const SIGN_IN_LINK_NOTE = `The account link in this email signs you in to your Udan account, so please don't forward this email. It works once and is valid for ${SIGN_IN_LINK_DAYS} days; after that, sign in with your email address.`;

const NOTE_SLOT = "<!--udan-note-->";
const TEXT_FOOTER = "\n\n--\n";

/** Adds a small note under an email's content, above the office footer. */
export function withNote(email: RenderedEmail, note: string): RenderedEmail {
  const html = `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#7A7A7A;">${escapeHtml(note)}</p>`;
  // The footer is the last "--" line; a staff message above may contain its own.
  const at = email.text.lastIndexOf(TEXT_FOOTER);
  const text = at < 0 ? `${email.text}\n${note}\n` : `${email.text.slice(0, at)}\n\n${note}${email.text.slice(at)}`;
  return { ...email, html: email.html.replace(NOTE_SLOT, html), text };
}

export function renderEmail(subject: string, greeting: string, blocks: readonly Block[]): RenderedEmail {
  const body = [para(greeting), ...blocks];
  const footerText = [
    "",
    "--",
    `${OFFICE.name}, ${OFFICE.established}`,
    ...OFFICE.addressLines,
    ...OFFICE.phones.map((p) => `${p.label}: ${p.display}`),
    OFFICE.website,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:Inter,Arial,Helvetica,sans-serif;color:#2D2D2D;font-size:15px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px;">
<tr><td><img src="${OFFICE.logoUrl}" alt="${OFFICE.name}" width="110" style="display:block;margin:0 0 20px;"></td></tr>
<tr><td>${body.map((b) => b.html).join("\n")}${NOTE_SLOT}</td></tr>
<tr><td style="padding-top:24px;border-top:1px solid #eee;font-size:13px;color:#7A7A7A;line-height:1.5;">
${escapeHtml(OFFICE.name)}, ${escapeHtml(OFFICE.established)}<br>
${OFFICE.addressLines.map(escapeHtml).join("<br>")}<br>
${OFFICE.phones.map((p) => `${escapeHtml(p.label)}: <a href="tel:${p.tel}" style="color:#7A7A7A;">${escapeHtml(p.display)}</a>`).join(" &middot; ")}<br>
<a href="${OFFICE.website}" style="color:#7A7A7A;">udantravelsbdq.com</a>
</td></tr>
</table></td></tr></table>
</body></html>`;

  return { subject, html, text: `${body.map((b) => b.text).join("\n\n")}\n${footerText}\n` };
}
