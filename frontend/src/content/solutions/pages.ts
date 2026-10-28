import type { SolutionPage } from "./types";

/**
 * Editorial solution pages. A topic from topics.json becomes a page only when it has an entry here with
 * status "published" and every recommended product has sourced facts for the page's requirements.
 */
export const SOLUTION_PAGES: SolutionPage[] = [
  {
    slug: "paypal-alternatives-for-receiving-payments-in-turkey",
    topicId: "payments-01",
    title: "PayPal alternatives for receiving payments in Turkey",
    description:
      "PayPal does not work in Turkey. Compare providers that accept sellers in Turkey and pay out to a Turkish bank account: eligibility, fees and limits, with sources.",
    intro:
      "PayPal closed its Turkish operations in 2016, so a person or business in Turkey cannot receive money with it at all. If you sell software, subscriptions or digital products to customers abroad, you need a provider that both accepts sellers based in Turkey and can pay out to a Turkish bank account. Those are two separate checks, and many tools pass only one.",
    answer:
      "For selling software or digital products internationally from Turkey, merchant-of-record platforms are the most practical PayPal replacement: Lemon Squeezy, Polar and Creem list Turkey for bank payouts, and Paddle accepts businesses in Turkey. They charge the customer, handle sales tax and VAT, and pay you out. Stripe is not available to businesses in Turkey.",
    requirements: [
      { fact: "seller_tr", label: "Accepts sellers based in Turkey", hard: true },
      { fact: "payout_tr_bank", label: "Pays out to a Turkish bank account", hard: true },
      { fact: "international_cards", label: "Charges customers worldwide by card", hard: false },
      { fact: "merchant_of_record", label: "Handles sales tax and VAT (merchant of record)", hard: false },
    ],
    columns: [
      { fact: "seller_tr", label: "Sellers in Turkey" },
      { fact: "payout_tr_bank", label: "Payout to Turkish bank" },
      { fact: "merchant_of_record", label: "Merchant of record" },
      { fact: "subscriptions", label: "Subscriptions" },
    ],
    products: ["lemon-squeezy", "polar", "creem", "paddle", "payoneer", "wise", "stripe", "paypal"],
    limitations: [
      "Every merchant-of-record platform reviews your business before live payments; approval is never guaranteed and depends on what you sell.",
      "Most platforms are built for software and digital products. Physical goods and many services are not accepted.",
      "Fees are charged on top of currency conversion by your bank when payouts arrive in USD or EUR.",
      "Tax obligations in Turkey still apply to the income you receive; ask an accountant how payouts from a merchant of record are invoiced.",
    ],
    faqs: [
      {
        question: "Can I use PayPal in Turkey?",
        answer:
          "No. PayPal stopped its Turkish operations in June 2016. Accounts registered in Turkey cannot send or receive payments, and payments to them fail.",
      },
      {
        question: "Can a Turkish company open a Stripe account?",
        answer:
          "No. Turkey is not on Stripe's list of supported countries. Some founders register a company abroad to use Stripe, but that is a separate legal and tax decision.",
      },
      {
        question: "What is a merchant of record?",
        answer:
          "A merchant of record sells your product to the customer in its own name, collects payment, handles sales tax and VAT, and pays you the rest. Lemon Squeezy, Paddle, Polar and Creem work this way.",
      },
      {
        question: "Which option has the lowest fee?",
        answer:
          "Of the providers checked here, Creem lists the lowest transaction fee (3.9% + 40¢), but its payouts cost at least 7 EUR/USD. Lemon Squeezy, Paddle and Polar list 5% + 50¢ per transaction.",
      },
      {
        question: "Why are Payoneer and Wise marked as not verified?",
        answer:
          "We could not confirm from their official pages whether people or businesses in Turkey can use them to receive customer payments. We only mark a requirement as met when an official source says so.",
      },
    ],
    related: [],
    updated: "2026-10-28",
    status: "published",
  },
];

export const solutionPage = (slug: string) => SOLUTION_PAGES.find((p) => p.slug === slug && p.status === "published");
export const publishedSolutions = () => SOLUTION_PAGES.filter((p) => p.status === "published");
