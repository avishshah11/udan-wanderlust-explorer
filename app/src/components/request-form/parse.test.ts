import { describe, expect, it } from "vitest";
import { quoteRequestSchema } from "@udan/core";
import { formDataToRequestInput, parseItineraryText } from "./parse";

describe("parseItineraryText", () => {
  it("reads type prefixes and keeps other lines", () => {
    expect(parseItineraryText("Hotel: Ubud, 3 nights\nflights: BOM-DPS return\nDinner cruise\n\n")).toEqual([
      { type: "hotel", description: "Ubud, 3 nights" },
      { type: "flight", description: "BOM-DPS return" },
      { type: "other", description: "Dinner cruise" },
    ]);
  });
});

describe("formDataToRequestInput", () => {
  it("produces input the shared schema accepts", () => {
    const fd = new FormData();
    const year = new Date().getFullYear() + 1;
    fd.set("destination", "Bali");
    fd.set("travel_month", `${year}-05`);
    fd.set("nights", "5");
    fd.set("adults", "2");
    fd.set("children", "1");
    fd.set("child_ages", "7");
    fd.set("budget_max", "1,50,000");
    fd.append("inclusions_wanted", "hotel");
    fd.append("inclusions_wanted", "transfers");
    fd.set("ota_name", "Example OTA");
    fd.set("ota_product", "Ubud resort");
    fd.set("ota_price", "150000");
    const parsed = quoteRequestSchema.safeParse(formDataToRequestInput(fd));
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ budget_max: 150000, child_ages: [7], inclusions_wanted: ["hotel", "transfers"], ota_comparison: { price: 150000 } });
  });

  it("lets the schema report non-numbers instead of dropping them", () => {
    const fd = new FormData();
    fd.set("destination", "Goa");
    fd.set("travel_month", "2099-01");
    fd.set("nights", "five");
    expect(quoteRequestSchema.safeParse(formDataToRequestInput(fd)).success).toBe(false);
  });
});
