export const IST = "Asia/Kolkata";

export function formatDate(iso: string | null | undefined, timeZone = IST): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone });
}

export function formatDateTime(iso: string | null | undefined, timeZone = IST): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

/** "Tue 14:05" in the customer's zone, so the desk knows whether to call. */
export function localTimeIn(timeZone: string | null | undefined, now = new Date()): string | null {
  if (!timeZone) return null;
  try {
    return now.toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone });
  } catch {
    return null;
  }
}

/** Request age for the desk queue: "45m", "5h", "2d 3h". Internal only. */
export function ageText(iso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

/** Default validity for a new quote: end of day (IST) three days out. Editable on the desk. */
export function defaultValidUntilInput(now = new Date()): string {
  const d = new Date(now.getTime() + 3 * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d);
}

/** A date input (YYYY-MM-DD, IST) to the end of that day as an ISO timestamp. */
export function endOfDayIst(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59+05:30`).toISOString();
}
