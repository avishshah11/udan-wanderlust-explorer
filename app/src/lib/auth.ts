import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export async function requireUser(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

export async function requireStaff(next: string) {
  const { supabase, user } = await requireUser(next);
  const { data: staff } = await supabase
    .from("staff")
    .select("user_id, name, role, active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!staff?.active) redirect("/account?notice=not-staff");
  return { supabase, user, staff };
}

export async function isStaff(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_staff");
  return data === true;
}
