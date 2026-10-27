import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/page-parts";
import { buttonClass } from "@/components/ui/styles";
import { apiBaseUrl } from "@/lib/api/client";

export const metadata: Metadata = { title: "Confirm your e-mail", robots: { index: false } };

type Props = { searchParams: Promise<{ userId?: string; code?: string; changedEmail?: string }> };

/** Target of the link in the confirmation e-mail: passes userId and code on to the API's confirmEmail endpoint. */
async function confirm({ userId, code, changedEmail }: Awaited<Props["searchParams"]>) {
  if (!userId || !code) return false;
  const q = new URLSearchParams({ userId, code });
  if (changedEmail) q.set("changedEmail", changedEmail);
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/confirmEmail?${q}`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function ConfirmEmailPage({ searchParams }: Props) {
  const ok = await confirm(await searchParams);
  return (
    <Container className="max-w-lg py-16 text-center">
      {ok ? (
        <>
          <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">E-mail confirmed</h1>
          <p className="mt-2 text-muted">Thanks. You can now submit products, write reviews and suggest alternatives.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/submit/new" className={buttonClass("primary", "md")}>Submit a product</Link>
            <Link href="/account" className={buttonClass("outline", "md")}>Your account</Link>
          </div>
        </>
      ) : (
        <>
          <XCircle className="mx-auto size-10 text-danger" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">This link is not valid</h1>
          <p className="mt-2 text-muted">
            It may have expired or already been used. Sign in and request a new confirmation link from your account page.
          </p>
          <Link href="/account" className={buttonClass("primary", "md", "mt-6")}>Go to your account</Link>
        </>
      )}
    </Container>
  );
}
