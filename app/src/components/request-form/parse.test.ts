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
  it("reads a one-way flight and ignores a stray return date", () => {
    const fd = new FormData();
    const year = new Date().getFullYear() + 1;
    fd.set("request_type", "flights");
    fd.set("trip_way", "one_way");
    fd.set("origin_city", "Vadodara");
    fd.set("destination", "Dubai");
    fd.set("start_date", `${year}-05-10`);
    fd.set("end_date", `${year}-05-17`);
    fd.set("cabin_class", "economy");
    const parsed = quoteRequestSchema.parse(formDataToRequestInput(fd));
    expect(parsed).toMatchObject({ request_type: "flights", origin_city: "Vadodara", cabin_class: "economy" });
    expect(parsed.end_date).toBeUndefined();
  });

  it("reads a hotel stay and keeps the preferred hotel as a requested item", () => {
    const fd = new FormData();
    const year = new Date().getFullYear() + 1;
    fd.set("request_type", "hotels");
    fd.set("destination", "Goa");
    fd.set("hotel_name", "A beach resort in Candolim");
    fd.set("start_date", `${year}-01-10`);
    fd.set("end_date", `${year}-01-14`);
    fd.set("rooms", "2");
    const parsed = quoteRequestSchema.parse(formDataToRequestInput(fd));
    expect(parsed).toMatchObject({ request_type: "hotels", nights: 4, rooms: 2 });
    expect(parsed.requested_items).toEqual([{ type: "hotel", description: "A beach resort in Candolim" }]);
  });
});
