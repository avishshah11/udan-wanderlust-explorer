import Image from "next/image";
import Link from "next/link";
import { publicEnv } from "@/lib/env";

export function SiteHeader({ signedIn, staff }: { signedIn: boolean; staff: boolean }) {
  return (
    <header className="border-b bg-white">
      <div className="container flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
        <a href={publicEnv.siteUrl} className="flex items-center gap-3" aria-label="Udan Tours and Travels website">
          <Image src="/images/udan-logo.jpg" alt="Udan Tours and Travels" width={74} height={48} priority />
        </a>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base font-medium">
          {staff && (
            <Link href="/desk" className="text-udan-charcoal hover:text-udan-orange">
              Pricing desk
            </Link>
          )}
          {signedIn ? (
            <>
              {/* Staff see every customer's quotes on the desk; "My quotes" would
                  only list quotes they asked for themselves. */}
              {!staff && (
                <Link href="/account" className="text-udan-charcoal hover:text-udan-orange">
                  My quotes
                </Link>
              )}
              <Link href="/account/settings" className="text-udan-charcoal hover:text-udan-orange">
                Settings
              </Link>
              <form action="/auth/signout" method="post">
                <button className="text-udan-charcoal underline underline-offset-4 hover:text-udan-orange">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-udan-charcoal hover:text-udan-orange">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
