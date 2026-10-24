import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Script from "next/script";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { buttonClass } from "@/components/ui/styles";
import { paymentToken } from "@/lib/auth/checkout";
import { formatPrice } from "@/lib/auth/integrations";
import { getCurrentUser, userApi } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Secure payment", robots: { index: false, follow: false } };

type Props = { params: Promise<{ orderId: string }> };

/** PayTR iFrame payment page. Card details are entered on PayTR's page inside the iframe; we never see them. */
export default async function PayPage({ params }: Props) {
  const { orderId } = await params;
  if (!(await getCurrentUser())) redirect("/login?next=/maker");
  const order = await userApi<{ planKey: string; status: string; amountMinor: number; currency: string }>(
    `/api/v1/maker/orders/${encodeURIComponent(orderId)}`, { persist: false }).catch(() => null);
  const token = await paymentToken(orderId);

  if (!order) redirect("/maker");
  if (order.status === "Paid") redirect(`/maker?purchase=${order.planKey}`);
  if (order.status !== "Pending" || !token) {
    return (
      <Container className="py-12">
        <EmptyState title="This payment link has expired" action={<Link href="/maker" className={buttonClass("primary", "sm", "mt-2")}>Back to Maker dashboard</Link>}>
          Start the purchase again from your dashboard. You have not been charged.
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Secure payment</h1>
        <p className="mt-1 text-sm text-muted">
          Total: <strong className="text-foreground">{formatPrice(order.amountMinor, order.currency)}</strong>. Payments are processed by PayTR;
          your card details go directly to PayTR.
        </p>
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-white">
          <iframe
            src={`https://www.paytr.com/odeme/guvenli/${token}`}
            id="paytriframe"
            title="PayTR secure payment"
            className="w-full"
            style={{ minHeight: 600, border: 0 }}
            allow="payment"
          />
        </div>
        <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
        <Script id="paytr-resize" strategy="afterInteractive">{`(function r(){if(window.iFrameResize){window.iFrameResize({},'#paytriframe')}else{setTimeout(r,200)}})();`}</Script>
        <p className="mt-4 text-xs text-muted">
          Your purchase is applied automatically once PayTR confirms the payment. <Link href="/maker" className="underline">Cancel and go back</Link>
        </p>
      </div>
    </Container>
  );
}
