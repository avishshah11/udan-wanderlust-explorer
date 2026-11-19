"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function decide(fd: FormData, approve: boolean) {
  const id = String(fd.get("authorization_id") ?? "");
  const supabase = await createClient();
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true });
  if (error || !data?.redirect_url) redirect(`/oauth/consent?authorization_id=${encodeURIComponent(id)}&error=1`);
  redirect(data.redirect_url);
}

export async function approve(fd: FormData) {
  await decide(fd, true);
}

export async function deny(fd: FormData) {
  await decide(fd, false);
}
