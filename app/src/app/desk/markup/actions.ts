"use server";

import { LINE_TYPES, type LineType } from "@udan/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";

function back(params: Record<string, string>): never {
  revalidatePath("/desk/markup");
  redirect(`/desk/markup?${new URLSearchParams(params).toString()}`);
}

function parsePct(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) && n >= 0 && n <= 200 && Math.round(n * 100) / 100 === n ? n : null;
}

export async function saveRule(fd: FormData) {
  const { supabase, user } = await requireStaff("/desk/markup");
  const id = String(fd.get("rule_id") ?? "");
  const pct = parsePct(fd.get("markup_pct"));
  if (pct === null) back({ error: "Markup must be a number between 0 and 200, with up to two decimals." });
  const active = fd.get("active") === "on";

  if (id) {
    const { error } = await supabase.from("markup_rules").update({ markup_pct: pct!, active, updated_by: user.id }).eq("id", id);
    if (error) back({ error: error.message });
    back({ notice: "Rule updated." });
  }

  const group = String(fd.get("destination_group") ?? "").trim().toLowerCase() || null;
  const typeRaw = String(fd.get("product_type") ?? "");
  const type = typeRaw === "" ? null : (LINE_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as LineType) : undefined;
  if (type === undefined) back({ error: "Unknown product type." });
  if (group && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(group)) back({ error: "Destination groups are lower-case words joined by hyphens, e.g. south-east-asia." });
  const { error } = await supabase.from("markup_rules").insert({
    destination_group: group,
    product_type: type,
    markup_pct: pct!,
    note: String(fd.get("note") ?? "").trim() || null,
    updated_by: user.id,
  });
  if (error) back({ error: error.code === "23505" ? "A rule for that group and product type already exists; edit it instead." : error.message });
  back({ notice: "Rule added." });
}
