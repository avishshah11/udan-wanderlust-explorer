// Reads the owner's spreadsheet of past quotes (saved as CSV) into rate-card
// samples. Every problem is reported with its line number; the desk imports
// nothing unless the whole file is clean.
//
// Columns (header row required, any order, case-insensitive):
//   destination     required  name or slug from the desk's destination list, e.g. Bali
//   travel_month    required  1-12, Mar, March, 2025-03 or a full date
//   hotel_tier      required  3, 4 or 5 (also "4 star", "4-star", "4*")
//   nights          required  1-90
//   adults          required  1-50
//   children        optional  0-20, default 0
//   land_total_inr  required  the price quoted for the whole party for hotel,
//                             transfers, sightseeing and meals, WITHOUT flights,
//                             visa and insurance; ₹ and commas are fine
//   quoted_on       optional  date the quote was sent: 2025-03-14 or 14/03/2025
//   note            optional  anything, up to 500 characters

import type { HotelTier } from "./domain";

export const RATE_IMPORT_COLUMNS = [
  "destination",
  "travel_month",
  "hotel_tier",
  "nights",
  "adults",
  "children",
  "land_total_inr",
  "quoted_on",
  "note",
] as const;

const REQUIRED = ["destination", "travel_month", "hotel_tier", "nights", "adults", "land_total_inr"] as const;
export const MAX_IMPORT_ROWS = 5000;

export interface RateSampleInput {
  destination_slug: string;
  travel_month: number;
  hotel_tier: HotelTier;
  nights: number;
  adults: number;
  children: number;
  land_total_inr: number;
  quoted_on: string | null;
  note: string | null;
  import_key: string;
}

export interface ImportProblem {
  line: number;
  message: string;
}

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF, a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseMonth(raw: string): number | null {
  const v = raw.trim().toLowerCase();
  if (/^\d{1,2}$/.test(v)) {
    const n = Number(v);
    return n >= 1 && n <= 12 ? n : null;
  }
  const iso = /^\d{4}-(\d{2})(?:-\d{2})?$/.exec(v);
  if (iso) return parseMonth(iso[1]!);
  const dmy = /^\d{1,2}[/-](\d{1,2})[/-]\d{4}$/.exec(v);
  if (dmy) return parseMonth(dmy[1]!);
  const idx = MONTH_NAMES.indexOf(v.slice(0, 3));
  return idx >= 0 && /^[a-z]+\.?$/.test(v) ? idx + 1 : null;
}

function parseTier(raw: string): HotelTier | null {
  const m = /^([345])\s*(?:[-_ ]?\s*star|\*)?$/i.exec(raw.trim());
  return m ? (`${m[1]}_star` as HotelTier) : null;
}

function parseInt0(raw: string, min: number, max: number): number | null {
  const v = raw.trim();
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

function parseRupees(raw: string): number | null {
  const v = raw.replace(/₹|rs\.?|inr|,|\s/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const n = Number(v);
  return n > 0 && n < 1e10 ? n : null;
}

function validDate(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD, or DD/MM/YYYY and DD-MM-YYYY as written in India. */
function parseDate(raw: string): string | null {
  const v = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v);
  if (dmy) return validDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  return null;
}

/**
 * Turns CSV text into samples. `destinations` is the desk's list; a row whose
 * destination is not on it is an error, because bands are keyed by it.
 */
export function parseRateSamples(
  text: string,
  destinations: readonly { slug: string; name: string }[],
): { samples: RateSampleInput[]; problems: ImportProblem[] } {
  const rows = parseCsv(text).map((r, i) => ({ line: i + 1, cells: r }));
  const nonEmpty = rows.filter((r) => r.cells.some((c) => c.trim() !== ""));
  const problems: ImportProblem[] = [];
  const samples: RateSampleInput[] = [];
  if (nonEmpty.length === 0) return { samples, problems: [{ line: 1, message: "The file is empty." }] };

  const [header, ...data] = nonEmpty;
  const names = header!.cells.map((c) => c.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (name: string) => names.indexOf(name);
  const missing = REQUIRED.filter((c) => col(c) < 0);
  if (missing.length > 0) {
    return {
      samples,
      problems: [{ line: header!.line, message: `The header row needs these columns: ${missing.join(", ")}. It has: ${names.filter(Boolean).join(", ") || "nothing"}.` }],
    };
  }
  if (data.length === 0) return { samples, problems: [{ line: header!.line, message: "The file has a header row but no quotes under it." }] };
  if (data.length > MAX_IMPORT_ROWS) {
    return { samples, problems: [{ line: header!.line, message: `Import at most ${MAX_IMPORT_ROWS} quotes at a time; this file has ${data.length}. Split it into smaller files.` }] };
  }

  const bySlug = new Map(destinations.map((d) => [d.slug.toLowerCase(), d.slug]));
  const byName = new Map(destinations.map((d) => [d.name.toLowerCase(), d.slug]));
  const seen = new Map<string, number>();

  for (const { line, cells } of data) {
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "").trim() : "");
    const errs: string[] = [];

    const destRaw = get("destination");
    const slug = bySlug.get(destRaw.toLowerCase()) ?? byName.get(destRaw.toLowerCase()) ?? null;
    if (!destRaw) errs.push("destination is empty");
    else if (!slug) errs.push(`"${destRaw}" is not on the desk's destination list`);

    const month = parseMonth(get("travel_month"));
    if (month === null) errs.push(`travel_month "${get("travel_month")}" is not a month (use 1-12, Mar, March or 2025-03)`);
    const tier = parseTier(get("hotel_tier"));
    if (tier === null) errs.push(`hotel_tier "${get("hotel_tier")}" must be 3, 4 or 5`);
    const nights = parseInt0(get("nights"), 1, 90);
    if (nights === null) errs.push(`nights "${get("nights")}" must be a whole number from 1 to 90`);
    const adults = parseInt0(get("adults"), 1, 50);
    if (adults === null) errs.push(`adults "${get("adults")}" must be a whole number from 1 to 50`);
    const children = get("children") === "" ? 0 : parseInt0(get("children"), 0, 20);
    if (children === null) errs.push(`children "${get("children")}" must be a whole number from 0 to 20`);
    const land = parseRupees(get("land_total_inr"));
    if (land === null) errs.push(`land_total_inr "${get("land_total_inr")}" must be an amount in rupees, e.g. 85000`);
    const quotedOn = get("quoted_on") === "" ? null : parseDate(get("quoted_on"));
    if (get("quoted_on") !== "" && quotedOn === null) errs.push(`quoted_on "${get("quoted_on")}" is not a date (use 2025-03-14 or 14/03/2025)`);
    const note = get("note") || null;
    if (note && note.length > 500) errs.push("note is longer than 500 characters");

    if (errs.length > 0) {
      problems.push({ line, message: errs.join("; ") });
      continue;
    }

    // The same trip quoted twice in one file stays two samples (#2); importing
    // the same file again matches every key and adds nothing.
    const base = [slug, month, tier, nights, adults, children, land, quotedOn ?? ""].join("|");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    samples.push({
      destination_slug: slug!,
      travel_month: month!,
      hotel_tier: tier!,
      nights: nights!,
      adults: adults!,
      children: children!,
      land_total_inr: land!,
      quoted_on: quotedOn,
      note,
      import_key: n === 1 ? base : `${base}#${n}`,
    });
  }
  return { samples: problems.length > 0 ? [] : samples, problems };
}
