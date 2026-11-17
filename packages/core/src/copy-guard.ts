// Rule 1: no turnaround time is ever shown to a customer. Customer-facing
// copy (status text, email templates, MCP tool descriptions and responses,
// website pages) is run through this in tests and at build time.
//
// It flags promises about when something will happen ("within 2 hours",
// "by tomorrow", "24-hour turnaround", "ETA"). It does not flag trip facts
// such as "5 nights" or "valid for 3 days".

const PATTERNS: readonly { name: string; re: RegExp }[] = [
  {
    name: "within a period",
    re: /\bwithin\s+(?:the\s+)?(?:\d+|a|an|one|two|three|four|five|few|a few|couple of|24|48|72)\s*(?:-|\s)?\s*(?:minutes?|mins?|hours?|hrs?|days?|business days?|working days?|weeks?)\b/i,
  },
  { name: "hours promise", re: /\b(?:\d+|one|two|few|24|48|72)\s*(?:-|\s)?\s*(?:hours?|hrs?)\b/i },
  { name: "turnaround", re: /\bturn\s*-?\s*around\b/i },
  { name: "ETA", re: /\bETA\b/ },
  { name: "same day", re: /\bsame[-\s]day\b/i },
  { name: "by a time", re: /\bby\s+(?:tomorrow|tonight|end of (?:the )?(?:day|week)|EOD|close of business)\b/i },
  { name: "in a period", re: /\bin\s+(?:\d+|a|a few|a couple of|one|two)\s+(?:minutes|mins|hours|hrs|business days|working days)\b/i },
  { name: "response time", re: /\b(?:response|reply|quote)\s+time\b/i },
  { name: "expected by", re: /\bexpect(?:ed)?\s+(?:it|your quote|a reply|to hear)?\s*(?:by|within)\b/i },
  { name: "shortly/soon", re: /\b(?:shortly|very soon|in no time|right back to you)\b/i },
];

export interface TurnaroundMatch {
  rule: string;
  match: string;
}

export function findTurnaroundLanguage(text: string): TurnaroundMatch[] {
  const found: TurnaroundMatch[] = [];
  for (const { name, re } of PATTERNS) {
    const m = re.exec(text);
    if (m) found.push({ rule: name, match: m[0] });
  }
  return found;
}

/** Throws with every offending phrase; use in tests and build checks. */
export function assertNoTurnaroundLanguage(text: string, where: string): void {
  const found = findTurnaroundLanguage(text);
  if (found.length > 0) {
    const list = found.map((f) => `"${f.match}" (${f.rule})`).join(", ");
    throw new Error(`${where}: customer-facing copy promises a turnaround time: ${list}`);
  }
}
