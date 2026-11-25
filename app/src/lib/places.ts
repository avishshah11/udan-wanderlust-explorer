// Countries and time zones by name, for forms that would otherwise ask for
// codes such as "IN" or "Asia/Kolkata".

export const COUNTRIES: [string, string][] = [
  ["IN", "India"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["SG", "Singapore"],
  ["SA", "Saudi Arabia"],
  ["QA", "Qatar"],
  ["OM", "Oman"],
  ["KW", "Kuwait"],
  ["BH", "Bahrain"],
  ["KE", "Kenya"],
];
export const TIME_ZONES: [string, string][] = [
  ["Asia/Kolkata", "India"],
  ["Asia/Dubai", "UAE and Oman"],
  ["Asia/Riyadh", "Saudi Arabia, Qatar, Kuwait and Bahrain"],
  ["Europe/London", "United Kingdom"],
  ["Europe/Paris", "Central Europe"],
  ["America/New_York", "US and Canada, Eastern"],
  ["America/Chicago", "US and Canada, Central"],
  ["America/Denver", "US and Canada, Mountain"],
  ["America/Los_Angeles", "US and Canada, Pacific"],
  ["Asia/Singapore", "Singapore"],
  ["Australia/Sydney", "Australia, Sydney and Melbourne"],
  ["Australia/Perth", "Australia, Perth"],
  ["Pacific/Auckland", "New Zealand"],
  ["Africa/Nairobi", "East Africa"],
];

/** A value saved earlier that is not listed stays selectable, so saving never changes it by accident. */
export function withSaved(options: [string, string][], saved: string | null | undefined): [string, string][] {
  return saved && !options.some(([value]) => value === saved) ? [...options, [saved, saved]] : options;
}
