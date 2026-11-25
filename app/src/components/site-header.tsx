import { Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { publicEnv } from "@/lib/env";

const link = "rounded-md px-1 py-1 text-udan-charcoal hover:text-udan-orange";

function NavLinks({ signedIn, staff }: { signedIn: boolean; staff: boolean }) {
  if (!signedIn) {
    return (
      <Link href="/login" className={link}>
        Sign in
      </Link>
    );
  }
  return (
    <>
      {/* Staff see every customer's quotes on the desk; "My quotes" would
          only list quotes they asked for themselves. */}
      {staff ? (
        <Link href="/desk" className={link}>
          Pricing desk
        </Link>
      ) : (
        <Link href="/account" className={link}>
          My quotes
        </Link>
      )}
      <Link href="/account/settings" className={link}>
        Settings
      </Link>
      <form action="/auth/signout" method="post">
        <button className={`${link} underline underline-offset-4`}>Sign out</button>
      </form>
    </>
  );
}

export function SiteHeader({ signedIn, staff }: { signedIn: boolean; staff: boolean }) {
  return (
    <header className="border-b bg-white">
      <div className="container py-2">
        <div className="flex min-h-14 items-center justify-between gap-4">
          <a href={publicEnv.siteUrl} className="flex items-center gap-3" aria-label="Udan Tours and Travels website">
            <Image src="/images/udan-logo.jpg" alt="Udan Tours and Travels" width={74} height={48} priority />
          </a>
          <div className="flex items-center gap-5 text-base font-medium">
            {!staff && (
              <a
                href="tel:+919376214442"
                className="flex items-center gap-2 rounded-full bg-udan-lightGray px-4 py-2 font-semibold text-udan-charcoal hover:text-udan-orange"
                aria-label="Call Udan on +91 93762 14442"
              >
                <Phone aria-hidden className="size-4" />
                <span className="hidden sm:inline">+91 93762 14442</span>
                <span className="sm:hidden">Call us</span>
              </a>
            )}
            <nav aria-label="Main" className="hidden items-center gap-5 sm:flex">
              <NavLinks signedIn={signedIn} staff={staff} />
            </nav>
          </div>
        </div>
        {/* Phones: the menu on its own row, evenly spaced. */}
        <nav aria-label="Main" className="mt-1 flex items-center justify-around border-t pt-1 text-base font-medium sm:hidden">
          <NavLinks signedIn={signedIn} staff={staff} />
        </nav>
      </div>
    </header>
  );
}
