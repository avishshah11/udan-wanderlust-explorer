"use server";

import { parseRateSamples } from "@udan/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";

export interface ImportState {
  ok: boolean;
  message: string;
  problems?: { line: number; message: string }[];
}

const MAX_FILE_BYTES = 2_000_000;

function rebuiltText(r: unknown): string {
  const x = (r ?? {}) as { bands?: number; public_bands?: number };
  return `Ranges rebuilt: ${x.public_bands ?? 0} public, ${(x.bands ?? 0) - (x.public_bands ?? 0)} still waiting for 5 quotes.`;
}

/** Reads the uploaded CSV; imports every row or none. */
export async function importSamples(_prev: ImportState | null, fd: FormData): Promise<ImportState> {
  const { supabase, user } = await requireStaff("/desk/rate-card");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file first." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, message: "That file is over 2 MB. Split it into smaller files and import them one at a time." };

  const { data: destinations } = await supabase.from("destinations").select("slug, name");
  const { samples, problems } = parseRateSamples(await file.text(), destinations ?? []);
  if (problems.length > 0) {
    return {
      ok: false,
      message: `Nothing was imported. Fix ${problems.length === 1 ? "this line" : `these ${problems.length} lines`} in the file and upload it again.`,
      problems: problems.slice(0, 100),
    };
  }

  const batch = crypto.randomUUID();
  const { data: inserted, error } = await supabase
    .from("rate_samples")
    .upsert(
      samples.map((s) => ({ ...s, source: "import" as const, import_batch: batch, created_by: user.id })),
      { onConflict: "import_key", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return { ok: false, message: `Nothing was imported: ${error.message}` };

  const added = inserted?.length ?? 0;
  const already = samples.length - added;
  const { data: rebuilt, error: rebuildError } = await supabase.rpc("refresh_rate_card");
  revalidatePath("/desk/rate-card");
  return {
    ok: true,
    message: [
      `Imported ${added} past quote${added === 1 ? "" : "s"}${already > 0 ? `; ${already} ${already === 1 ? "was" : "were"} already here and skipped` : ""}.`,
      rebuildError ? `The ranges could not be rebuilt (${rebuildError.message}); they will rebuild tonight.` : rebuiltText(rebuilt),
    ].join(" "),
  };
}

function back(params: Record<string, string>): never {
  revalidatePath("/desk/rate-card");
  redirect(`/desk/rate-card?${new URLSearchParams(params).toString()}`);
}

export async function rebuildNow() {
  const { supabase } = await requireStaff("/desk/rate-card");
  const { data, error } = await supabase.rpc("refresh_rate_card");
  if (error) back({ error: error.message });
  back({ notice: rebuiltText(data) });
}

export async function removeImport(fd: FormData) {
  const { supabase } = await requireStaff("/desk/rate-card");
  const batch = String(fd.get("batch") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(batch)) back({ error: "That import was not found." });
  const { data, error } = await supabase.from("rate_samples").delete().eq("import_batch", batch).select("id");
  if (error) back({ error: error.message });
  const { data: rebuilt } = await supabase.rpc("refresh_rate_card");
  back({ notice: `Removed ${data?.length ?? 0} imported quotes. ${rebuiltText(rebuilt)}` });
}
