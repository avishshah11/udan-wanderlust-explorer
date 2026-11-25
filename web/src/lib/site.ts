// Facts about the business, used by every page, the footer and the
// TravelAgency structured data. One founding claim everywhere: established 1997.

export const SITE = {
  name: "Udan Tours and Travels",
  url: "https://udantravelsbdq.com",
  founded: 1997,
  foundedText: "Established 1997",
  travellers: "10,000+",
  appUrl: (import.meta.env?.PUBLIC_APP_URL ?? "https://app.udantravelsbdq.com").replace(/\/$/, ""),
  mcpUrl: "https://mcp.udantravelsbdq.com/mcp",
  email: "udantravels.bdq@gmail.com",
  phones: [
    { label: "Mobile", display: "+91 93762 14442", tel: "+919376214442" },
    { label: "Office", display: "0265 400 8999", tel: "+912654008999" },
  ],
  whatsapp: "https://wa.me/919376214442",
  /** Udan's own social profiles: linked in the footer and listed as sameAs for search engines. */
  social: [{ label: "Instagram", handle: "@udantoursandtravels", url: "https://www.instagram.com/udantoursandtravels/" }],
  address: {
    lines: [
      "714, Yashkamal Building, above Havmor Restaurant",
      "Opposite M.S. University, Sarod, Sayajiganj",
      "Vadodara, Gujarat 390005",
    ],
    street: "714, Yashkamal Building, above Havmor Restaurant, Opposite M.S. University, Sarod, Sayajiganj",
    locality: "Vadodara",
    region: "Gujarat",
    postalCode: "390005",
    country: "IN",
  },
  geo: { latitude: 22.3087788, longitude: 73.1870284 },
  hours: [
    { days: "Monday to Saturday", opens: "09:30", closes: "19:30", schema: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
    { days: "Sunday", opens: "11:00", closes: "16:00", schema: ["Sunday"] },
  ],
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3691.1866736885286!2d73.18702840000002!3d22.30877880000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395fc89428d49e59%3A0x8f3010e90a528a89!2sUdan%20Tours%20And%20Travels!5e0!3m2!1sen!2sin!4v1746263644302!5m2!1sen!2sin",
  ogImage: "https://udantravelsbdq.com/images/og-default.jpg",
  logo: "https://udantravelsbdq.com/images/udan-logo.jpg",
  /** Google search for the business: opens the Maps listing with its reviews. */
  googleListing: "https://www.google.com/maps/search/?api=1&query=Udan+Tours+And+Travels+Sayajiganj+Vadodara",
} as const;

/** Whole years since the founding year, counted from the build date: 29 in 2026, 30 in 2027. */
export function yearsInBusiness(now = new Date()): number {
  return now.getFullYear() - SITE.founded;
}

/**
 * Our experience in words: "nearly 30 years" in the two years before a round
 * number (2025 and 2026), otherwise the exact count ("30 years" in 2027,
 * "31 years" in 2028). The build check allows only this and the exact count.
 */
export function experienceText(now = new Date()): string {
  const years = yearsInBusiness(now);
  const round = Math.ceil(years / 10) * 10;
  return round > years && round - years <= 2 ? `nearly ${round} years` : `${years} years`;
}

/** The owner's promise to new clients (November 2026). */
export const PROMISE = {
  headline: "Prices lower than you imagined.",
  accent: "Quality you deserve.",
  short: "Prices lower than you imagined, with the quality you deserve.",
  /** Why: the owner's words (26 Nov 2026). */
  direct: "We deal directly with hotels, airlines and suppliers, with no middlemen, so the same trip costs you less than on other travel websites.",
  /** The promise and its honest limit, together wherever the promise is made. */
  compare: "Seen a price on another travel website? Send it to us: we give you the same thing for less, and if we ever cannot, we tell you honestly.",
} as const;

/**
 * Registrations and memberships shown on /trust, exactly as printed on the
 * certificate, e.g. { label: "GSTIN", value: "…" }. Only the owner can supply
 * these; the section stays hidden while the list is empty.
 */
export const REGISTRATIONS: readonly { label: string; value: string }[] = [];

/**
 * The name on the bank account customers pay into. When the owner confirms
 * it, /trust tells customers to pay only an account in this name.
 */
export const PAYEE_NAME: string | null = null;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "October to March" for [10,11,12,1,2,3]; falls back to a list. */
export function monthRange(months: number[]): string {
  if (months.length === 0) return "";
  const sorted = [...months];
  // keep the given (seasonal) order if it is consecutive across the year end
  const consecutive = sorted.every((m, i) => i === 0 || m === (sorted[i - 1]! % 12) + 1);
  if (consecutive && sorted.length > 1) return `${MONTHS[sorted[0]! - 1]} to ${MONTHS[sorted[sorted.length - 1]! - 1]}`;
  return sorted.map((m) => MONTHS[m - 1]).join(", ");
}

export function travelAgencyJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${SITE.url}/#agency`,
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    image: SITE.ogImage,
    foundingDate: String(SITE.founded),
    email: SITE.email,
    telephone: SITE.phones[0].tel,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: SITE.geo.latitude, longitude: SITE.geo.longitude },
    openingHoursSpecification: SITE.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.schema,
      opens: h.opens,
      closes: h.closes,
    })),
    contactPoint: SITE.phones.map((p) => ({ "@type": "ContactPoint", telephone: p.tel, contactType: "customer service", areaServed: "Worldwide" })),
    sameAs: SITE.social.map((s) => s.url),
    slogan: PROMISE.short,
    description: `Family-run travel agency in Vadodara, India, since 1997. ${PROMISE.direct} Holiday packages, hotels, flights and visas for travellers in India and worldwide.`,
    areaServed: "Worldwide",
  };
}

/**
 * Cloudflare Web Analytics (the owner's site, 21 Nov 2026): counts page views
 * without cookies or personal data. The token is public by design (it is in
 * every page). Production builds of this website only; never the app, whose
 * URLs can carry sign-in links and quote references.
 */
export const CF_WEB_ANALYTICS = {
  script: "https://static.cloudflareinsights.com/beacon.min.js",
  token: "2b41893498f04071b804f09ad8d9f0a2",
} as const;
