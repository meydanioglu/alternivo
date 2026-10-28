import type { SolutionProduct } from "./types";

/**
 * Fact sheets used by solution pages. Every fact cites the page it was read from and the date it was checked.
 * When an official source could not confirm something, the value is "unknown" with a note; never guess.
 */
const CHECKED = "2026-10-28";

export const SOLUTION_PRODUCTS: SolutionProduct[] = [
  {
    id: "paypal",
    name: "PayPal",
    website: "https://www.paypal.com",
    kind: "Payment account",
    facts: {
      seller_tr: {
        value: false,
        detail: "PayPal stopped operating in Turkey in June 2016; Turkish accounts cannot send or receive payments.",
        source: "https://www.paypal.com/tr/home",
        verified: CHECKED,
      },
      payout_tr_bank: { value: false, detail: "No withdrawals to Turkish bank accounts.", source: "https://www.paypal.com/tr/home", verified: CHECKED },
    },
    pros: ["Widely recognised by buyers worldwide"],
    cons: ["Not available to people or businesses in Turkey"],
  },
  {
    id: "stripe",
    name: "Stripe",
    website: "https://stripe.com",
    catalogSlug: "stripe-billing",
    kind: "Payment processor",
    facts: {
      seller_tr: {
        value: false,
        detail: "Turkey is not on Stripe's list of supported business countries.",
        source: "https://stripe.com/global",
        verified: CHECKED,
      },
      payout_tr_bank: { value: false, detail: "No Stripe account for Turkish businesses.", source: "https://stripe.com/global", verified: CHECKED },
    },
    pricing: { summary: "Not available for Turkish businesses", source: "https://stripe.com/global", verified: CHECKED },
    pros: ["Developer-friendly APIs, used by many merchant-of-record platforms behind the scenes"],
    cons: ["Cannot be opened directly by a business registered in Turkey"],
  },
  {
    id: "lemon-squeezy",
    name: "Lemon Squeezy",
    website: "https://www.lemonsqueezy.com",
    kind: "Merchant of record",
    facts: {
      seller_tr: {
        value: true,
        detail: "Turkey is on the list of countries eligible for bank payouts.",
        source: "https://docs.lemonsqueezy.com/help/getting-started/supported-countries",
        verified: CHECKED,
      },
      payout_tr_bank: {
        value: true,
        detail: "Bank payouts; PayPal payouts do not help in Turkey.",
        source: "https://docs.lemonsqueezy.com/help/getting-started/supported-countries",
        verified: CHECKED,
      },
      international_cards: { value: true, detail: "Sells to customers worldwide as merchant of record.", source: "https://www.lemonsqueezy.com/pricing", verified: CHECKED },
      merchant_of_record: { value: true, detail: "Handles sales tax and VAT as the seller of record.", source: "https://www.lemonsqueezy.com/pricing", verified: CHECKED },
      digital_products: { value: true, source: "https://www.lemonsqueezy.com/pricing", verified: CHECKED },
      subscriptions: { value: true, source: "https://www.lemonsqueezy.com/pricing", verified: CHECKED },
    },
    pricing: { summary: "5% + 50¢ per transaction", source: "https://www.lemonsqueezy.com/pricing", verified: CHECKED },
    pros: ["Tax and VAT handled for you", "Checkout, subscriptions, licence keys and affiliates built in"],
    cons: ["Every store goes through an account review before live sales", "Higher fee than a direct processor"],
    bestFor: "Solo founders selling SaaS, software licences or digital downloads",
  },
  {
    id: "paddle",
    name: "Paddle",
    website: "https://www.paddle.com",
    kind: "Merchant of record",
    facts: {
      seller_tr: {
        value: true,
        detail: "Paddle works with software businesses worldwide; Turkey is not on its unsupported-country list.",
        source: "https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle",
        verified: CHECKED,
      },
      payout_tr_bank: {
        value: "unknown",
        detail: "The country page does not describe payout methods for Turkey; confirm during onboarding.",
        source: "https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle",
        verified: CHECKED,
      },
      international_cards: { value: true, source: "https://www.paddle.com/pricing", verified: CHECKED },
      merchant_of_record: { value: true, source: "https://www.paddle.com/pricing", verified: CHECKED },
      digital_products: { value: true, detail: "Software and SaaS only.", source: "https://www.paddle.com/pricing", verified: CHECKED },
      subscriptions: { value: true, source: "https://www.paddle.com/pricing", verified: CHECKED },
    },
    pricing: { summary: "5% + 50¢ per checkout transaction", source: "https://www.paddle.com/pricing", verified: CHECKED },
    pros: ["Tax and VAT handled for you", "Strong subscription billing for SaaS"],
    cons: ["Focused on software; other digital products may not be accepted", "Turkish payout method not stated publicly"],
    bestFor: "SaaS companies with recurring subscriptions",
  },
  {
    id: "polar",
    name: "Polar",
    website: "https://polar.sh",
    kind: "Merchant of record",
    facts: {
      seller_tr: {
        value: true,
        detail: "Turkey is on Polar's payout country list.",
        source: "https://polar.sh/docs/merchant-of-record/supported-countries",
        verified: CHECKED,
      },
      payout_tr_bank: {
        value: true,
        detail: "Payouts through Stripe Connect Express.",
        source: "https://polar.sh/docs/merchant-of-record/supported-countries",
        verified: CHECKED,
      },
      international_cards: { value: true, source: "https://polar.sh/docs/merchant-of-record/fees", verified: CHECKED },
      merchant_of_record: { value: true, source: "https://polar.sh/docs/merchant-of-record/fees", verified: CHECKED },
      digital_products: { value: true, source: "https://polar.sh/docs/merchant-of-record/fees", verified: CHECKED },
      subscriptions: { value: true, source: "https://polar.sh/docs/merchant-of-record/fees", verified: CHECKED },
    },
    pricing: {
      summary: "5% + 50¢ per transaction; payouts 0.25% + $0.25 plus $2 per active payout month (charged by Stripe)",
      source: "https://polar.sh/docs/merchant-of-record/fees",
      verified: CHECKED,
    },
    pros: ["Tax handled as merchant of record", "Developer-focused, open-source platform"],
    cons: ["Payout fees on top of the transaction fee"],
    bestFor: "Developers selling software, subscriptions or access to repositories",
  },
  {
    id: "creem",
    name: "Creem",
    website: "https://www.creem.io",
    kind: "Merchant of record",
    facts: {
      seller_tr: {
        value: true,
        detail: "Turkey is on Creem's supported country list.",
        source: "https://docs.creem.io/merchant-of-record/supported-countries",
        verified: CHECKED,
      },
      payout_tr_bank: {
        value: true,
        detail: "Local bank transfer; payout fee 7 EUR/USD or 1%, whichever is higher.",
        source: "https://docs.creem.io/merchant-of-record/supported-countries",
        verified: CHECKED,
      },
      international_cards: { value: true, source: "https://www.creem.io/pricing", verified: CHECKED },
      merchant_of_record: { value: true, source: "https://www.creem.io/pricing", verified: CHECKED },
      digital_products: { value: true, source: "https://www.creem.io/pricing", verified: CHECKED },
      subscriptions: { value: true, source: "https://www.creem.io/pricing", verified: CHECKED },
    },
    pricing: { summary: "3.9% + 40¢ per transaction; no monthly fee", source: "https://www.creem.io/pricing", verified: CHECKED },
    pros: ["Lowest listed transaction fee in this comparison", "Tax handled as merchant of record"],
    cons: [
      "Advertising, marketing services and generative-AI products face extra review",
      "Payout fee of at least 7 EUR/USD",
    ],
    bestFor: "Software products that want the lowest per-sale fee",
  },
  {
    id: "payoneer",
    name: "Payoneer",
    website: "https://www.payoneer.com",
    kind: "Cross-border receiving account",
    facts: {
      seller_tr: { value: "unknown", detail: "Not confirmed on an official Turkey page we could access.", source: "https://www.payoneer.com/receiving-accounts/", verified: CHECKED },
      payout_tr_bank: { value: "unknown", detail: "TRY withdrawals are reported by users but not confirmed on Payoneer's pricing page.", source: "https://www.payoneer.com/pricing/", verified: CHECKED },
      international_cards: { value: "unknown", source: "https://www.payoneer.com/receiving-accounts/", verified: CHECKED },
      merchant_of_record: { value: false, detail: "A receiving account, not a seller of record; you handle tax yourself.", source: "https://www.payoneer.com/receiving-accounts/", verified: CHECKED },
    },
    pros: ["Receiving accounts in USD, EUR, GBP and other currencies"],
    cons: ["Turkey details could not be confirmed from official pages"],
  },
  {
    id: "wise",
    name: "Wise",
    website: "https://wise.com",
    kind: "Multi-currency account",
    facts: {
      seller_tr: {
        value: "unknown",
        detail: "Wise's account-country article lists Turkey only as a destination for sending money.",
        source: "https://wise.com/help/articles/2571942/what-countries-and-regions-can-i-open-a-wise-account-in",
        verified: CHECKED,
      },
      payout_tr_bank: { value: true, detail: "Can send TRY to Turkish bank accounts.", source: "https://wise.com/help/articles/2571942/what-countries-and-regions-can-i-open-a-wise-account-in", verified: CHECKED },
      merchant_of_record: { value: false, source: "https://wise.com/help/articles/2571942/what-countries-and-regions-can-i-open-a-wise-account-in", verified: CHECKED },
    },
    pros: ["Low-cost transfers into Turkish lira"],
    cons: ["Whether people or businesses in Turkey can open an account to receive money is not confirmed"],
  },
];

export const solutionProduct = (id: string) => SOLUTION_PRODUCTS.find((p) => p.id === id);
