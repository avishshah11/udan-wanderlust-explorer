"use server";

import { isDisplayCurrency } from "@udan/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function saveSettings(fd: FormData) {
  const { supabase, user } = await requireUser("/account/settings");
  const text = (k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max) || null;
  const currency = String(fd.get("display_currency") ?? "INR");
  const country = text("country", 2)?.toUpperCase() ?? null;
  const timeZone = text("time_zone", 64);
  if (!isDisplayCurrency(currency)) redirect("/account/settings?error=currency");
  if (country && !/^[A-Z]{2}$/.test(country)) redirect("/account/settings?error=country");
  if (timeZone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone });
    } catch {
      redirect("/account/settings?error=timezone");
    }
  }
  const { error } = await supabase
    .from("customers")
    .update({
      name: text("name", 200),
      phone: text("phone", 40),
      country,
      time_zone: timeZone,
      display_currency: currency,
      alert_whatsapp: fd.get("alert_whatsapp") === "on",
      alert_sms: fd.get("alert_sms") === "on",
    })
    .eq("user_id", user.id);
  if (error) redirect("/account/settings?error=save");
  revalidatePath("/account", "layout");
  redirect("/account/settings?saved=1");
}
