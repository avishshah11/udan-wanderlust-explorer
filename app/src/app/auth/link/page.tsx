import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContinueForm } from "./continue-form";

// Landing page for the sign-in link in a customer email (invisible sign-in).
// The link is only used by the POST this page sends, so mail scanners that
// fetch links before the customer clicks cannot use it up. Referrer
// "same-origin": the token never leaves for another site in a Referer header,
// and the POST still carries this site's Origin (with "no-referrer" browsers
// send Origin: null, which the POST refuses).
export const metadata: Metadata = {
  title: "Opening your account",
  referrer: "same-origin",
  robots: { index: false, follow: false },
};

export default async function SignInLinkPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  if (!t) redirect("/login");

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Opening your Udan account</CardTitle>
        </CardHeader>
        <CardContent>
          <ContinueForm token={t} />
        </CardContent>
      </Card>
    </div>
  );
}
