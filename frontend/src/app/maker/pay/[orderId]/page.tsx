import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Script from "next/script";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { buttonClass } from "@/components/ui/styles";
import { paymentTarget } from "@/lib/auth/checkout";
import { AcceptTermsForm } from "@/components/maker/accept-terms-form";
import { SERVICE_TERMS, SellerDetails } from "@/components/legal/legal-parts";
import { business } from "@/config/business";
import { formatPrice, pricing } from "@/lib/auth/integrations";
import { getCurrentUser, userApi } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Secure payment", robots: { index: false, follow: false } };

type Props = { params: Promise<{ orderId: string }> };

/**
 * Payment page: order review and agreement first, then the provider's own payment form (PayTR iframe, or a link to the
 * Lemon Squeezy hosted checkout). Card details go straight to the provider; we never see them.
 */
export default async function PayPage({ params }: Props) {
  const { orderId } = await params;
  if (!(await getCurrentUser())) redirect("/login?next=/maker");
  const order = await userApi<{ planKey: string; status: string; amountMinor: number; currency: string; termsAcceptedAt: string | null }>(
    `/api/v1/maker/orders/${encodeURIComponent(orderId)}`, { persist: false }).catch(() => null);
  const target = await paymentTarget(orderId);

  if (!order) redirect("/maker");
  if (order.status === "Paid") redirect(`/maker?purchase=${order.planKey}`);
  if (order.status !== "Pending" || !target) {
    return (
      <Container className="py-12">
        <EmptyState title="This payment link has expired" action={<Link href="/maker" className={buttonClass("primary", "sm", "mt-2")}>Back to Maker dashboard</Link>}>
          Start the purchase again from your dashboard. You have not been charged.
        </EmptyState>
      </Container>
    );
  }

  const total = formatPrice(order.amountMinor, order.currency);
  if (!order.termsAcceptedAt) {
    const plan = (await pricing()).plans.find((p) => p.key === order.planKey);
    const terms = SERVICE_TERMS[order.planKey];
    const row = "grid gap-1 py-3 sm:grid-cols-[10rem_1fr]";
    return (
      <Container className="py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Review your order</h1>
          <p className="mt-1 text-sm text-muted">Check the details below. You will enter your card details on the next step.</p>
          <dl className="mt-6 divide-y divide-border rounded-[10px] border border-border bg-surface px-4 text-sm">
            <div className={row}><dt className="text-muted">Service</dt><dd className="font-medium">{plan?.name ?? order.planKey}</dd></div>
            {terms && <div className={row}><dt className="text-muted">What you get</dt><dd>{terms.what}</dd></div>}
            {terms && <div className={row}><dt className="text-muted">Delivery</dt><dd>{terms.delivery}</dd></div>}
            <div className={row}>
              <dt className="text-muted">Total charged</dt>
              <dd>
                <span className="text-base font-semibold tabular-nums">{total}</span> <span className="text-muted">({order.currency}, one-time payment)</span>
                <span className="mt-0.5 block text-xs text-muted">{business.taxNote ?? "This is the total amount charged to your card."} No automatic renewal.</span>
              </dd>
            </div>
            <div className={row}><dt className="text-muted">Payment</dt><dd>Card payment processed by our licensed payment provider. Your card details go directly to the provider.</dd></div>
          </dl>
          <details className="mt-4 rounded-[10px] border border-border px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">Seller details</summary>
            <div className="mt-3"><SellerDetails /></div>
          </details>
          <div className="mt-6">
            <AcceptTermsForm orderId={orderId} amount={total} />
          </div>
          <p className="mt-6 text-xs text-muted">
            <Link href="/maker" className="underline">Cancel and go back</Link> — you have not been charged.
          </p>
        </div>
      </Container>
    );
  }

  if (target.provider === "freemius") {
    return (
      <Container className="py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-semibold">Secure payment</h1>
          <p className="mt-1 text-sm text-muted">
            Total: <strong className="text-foreground">{total}</strong> ({order.currency}), plus any sales tax shown at checkout. You pay on the
            secure checkout of our payment provider, Freemius, which acts as the merchant of record for this purchase. Your account e-mail is
            prefilled so the payment is matched to your order.
          </p>
          <a href={target.url} className={buttonClass("primary", "md", "mt-6")}>Continue to secure payment</a>
          <p className="mt-4 text-xs text-muted">
            Your purchase is applied automatically once the payment is confirmed. <Link href="/maker" className="underline">Cancel and go back</Link>
          </p>
        </div>
      </Container>
    );
  }

  if (target.provider === "lemonsqueezy") {
    return (
      <Container className="py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-semibold">Secure payment</h1>
          <p className="mt-1 text-sm text-muted">
            Total: <strong className="text-foreground">{total}</strong> ({order.currency}), plus any sales tax shown at checkout. You pay on the
            secure checkout of our payment provider, Lemon Squeezy, which acts as the merchant of record for this purchase.
          </p>
          <a href={target.url} className={buttonClass("primary", "md", "mt-6")}>Continue to secure payment</a>
          <p className="mt-4 text-xs text-muted">
            Your purchase is applied automatically once the payment is confirmed. <Link href="/maker" className="underline">Cancel and go back</Link>
          </p>
        </div>
      </Container>
    );
  }

  const token = target.token;
  return (
    <Container className="py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Secure payment</h1>
        <p className="mt-1 text-sm text-muted">
          Total: <strong className="text-foreground">{total}</strong> ({order.currency}). Payments are processed by our licensed payment provider;
          your card details go directly to the provider.
        </p>
        <div className="mt-6 overflow-hidden rounded-[10px] border border-border bg-white">
          <iframe
            src={`https://www.paytr.com/odeme/guvenli/${token}`}
            id="paytriframe"
            title="Secure payment"
            className="w-full"
            style={{ minHeight: 600, border: 0 }}
            allow="payment"
          />
        </div>
        <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
        <Script id="paytr-resize" strategy="afterInteractive">{`(function r(){if(window.iFrameResize){window.iFrameResize({},'#paytriframe')}else{setTimeout(r,200)}})();`}</Script>
        <p className="mt-4 text-xs text-muted">
          Your purchase is applied automatically once the payment is confirmed. <Link href="/maker" className="underline">Cancel and go back</Link>
        </p>
      </div>
    </Container>
  );
}
