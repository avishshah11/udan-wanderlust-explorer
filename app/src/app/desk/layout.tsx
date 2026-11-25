import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff("/desk");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-udan-charcoal">Pricing desk</h1>
        <nav className="flex flex-wrap gap-2 text-base">
          {[
            ["/desk", "To price"],
            ["/desk?view=sent", "Quotes sent"],
            ["/desk?view=payment", "Payments and documents"],
            ["/desk?view=all", "All requests"],
            ["/desk/new", "New request"],
            ["/desk/metrics", "Metrics"],
            ["/desk/markup", "Markup rules"],
            ["/desk/rate-card", "Rate card"],
          ].map(([href, label]) => (
            <Link key={href} href={href!} className="rounded-full bg-white px-4 py-2 font-medium text-udan-charcoal shadow-sm hover:text-udan-orange">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="text-sm text-udan-gray">
        Signed in as {staff.name} ({staff.role}). Every customer&apos;s requests are on these pages, and everyone on the Udan team sees the same ones.
        Internal only: nothing here is shown to customers.
      </p>
      {children}
    </div>
  );
}
