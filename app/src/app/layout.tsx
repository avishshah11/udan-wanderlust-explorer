import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Udan Tours and Travels", template: "%s | Udan Tours and Travels" },
  description: "Your Udan quotes, bookings and travel documents.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let staff = false;
  if (user) {
    const { data } = await supabase.rpc("is_staff");
    staff = data === true;
  }

  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="min-h-screen bg-udan-lightGray font-sans">
        <SiteHeader signedIn={Boolean(user)} staff={staff} />
        <main className="container py-8">{children}</main>
        <footer className="container pb-10 pt-4 text-xs text-udan-gray">
          Udan Tours and Travels, established 1997 · 714 Yashkamal Building, Sayajiganj, Vadodara ·{" "}
          <a href="tel:+919376214442" className="underline">
            +91 93762 14442
          </a>{" "}
          ·{" "}
          <a href="mailto:udantravels.bdq@gmail.com" className="underline">
            udantravels.bdq@gmail.com
          </a>
        </footer>
      </body>
    </html>
  );
}
