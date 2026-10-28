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
    related: ["stripe-alternatives-for-saas-founders-in-turkey", "payment-processors-for-non-us-founders"],
    updated: "2026-10-28",
    status: "published",
  },
  {
    slug: "stripe-alternatives-for-saas-founders-in-turkey",
    topicId: "payments-02",
    title: "Stripe alternatives for SaaS founders in Turkey",
    description:
      "Stripe is not available to businesses in Turkey. Compare subscription billing options a Turkish SaaS founder can actually use: recurring billing, tax handling, payouts and fees.",
    intro:
      "Most SaaS tutorials assume Stripe, but Stripe does not accept businesses registered in Turkey. For a subscription product the replacement has to do more than take a payment: it must bill customers every month, handle VAT and sales tax across countries, and still pay out to a Turkish bank account.",
    answer:
      "A merchant of record is the closest thing to Stripe Billing you can use from Turkey without a foreign company. Lemon Squeezy, Polar and Creem support recurring subscriptions and list Turkey for bank payouts; Paddle supports subscriptions and accepts Turkish businesses, but does not publish how it pays out to Turkey. All of them collect tax on your behalf, which Stripe would leave to you.",
    requirements: [
      { fact: "seller_tr", label: "Accepts SaaS businesses based in Turkey", hard: true },
      { fact: "payout_tr_bank", label: "Pays out to a Turkish bank account", hard: true },
      { fact: "subscriptions", label: "Recurring subscription billing", hard: true },
      { fact: "merchant_of_record", label: "Collects VAT and sales tax for you", hard: false },
    ],
    columns: [
      { fact: "subscriptions", label: "Subscriptions" },
      { fact: "merchant_of_record", label: "Handles tax" },
      { fact: "seller_tr", label: "Turkish sellers" },
      { fact: "payout_tr_bank", label: "Payout to Turkish bank" },
    ],
    products: ["lemon-squeezy", "paddle", "polar", "creem", "stripe"],
    limitations: [
      "Merchant-of-record platforms appear as the seller on the checkout and receipts; your customers see them, not you.",
      "Moving existing Stripe subscriptions to another platform is not automatic; plan how current subscribers will re-subscribe.",
      "Accounts are reviewed before live sales, and some product types (for example AI image generation or marketing services) get extra scrutiny.",
      "Payouts usually arrive in USD or EUR; your Turkish bank's conversion rate and fees come on top.",
    ],
    faqs: [
      {
        question: "Can I use Stripe from Turkey with a Turkish company?",
        answer: "No. Turkey is not on Stripe's list of supported countries, so a business registered in Turkey cannot open a Stripe account.",
      },
      {
        question: "Do I still need to register for VAT in other countries?",
        answer: "With a merchant of record, the platform is the seller to your customers and collects and remits VAT and sales tax for those sales. Your own tax obligations in Turkey on the payouts still apply.",
      },
      {
        question: "Which option is cheapest for a small SaaS?",
        answer: "Creem lists 3.9% + 40¢ per transaction but charges at least 7 EUR/USD per payout. Lemon Squeezy, Paddle and Polar list 5% + 50¢, and Polar adds Stripe's payout fees.",
      },
      {
        question: "Why is Paddle not marked as recommended?",
        answer: "Paddle accepts businesses in Turkey, but its public pages do not say how it pays out to Turkish bank accounts. We only recommend a provider when every required item is confirmed by an official source.",
      },
    ],
    related: ["paypal-alternatives-for-receiving-payments-in-turkey"],
    updated: "2026-10-28",
    status: "published",
  },
  {
    slug: "payment-processors-for-non-us-founders",
    topicId: "payments-03",
    title: "Payment processors for non-US founders",
    description:
      "Selling software from outside the US? Compare payment platforms that accept founders worldwide without a US company: country coverage, tax handling and fees, with sources.",
    intro:
      "Many payment guides quietly assume a US company. If you live elsewhere, the first question is not the fee but whether the provider will accept a business from your country at all and pay out to a local bank. Coverage varies a lot: Stripe lists about fifty countries, while the merchant-of-record platforms below cover far more.",
    answer:
      "If you sell software or digital products, a merchant of record is usually the simplest option outside the US: Lemon Squeezy, Polar and Creem pay out to bank accounts in many countries, and Paddle works with software businesses worldwide except sanctioned countries. If your country is one of Stripe's supported countries, Stripe is cheaper per transaction but leaves sales tax to you.",
    requirements: [
      { fact: "non_us_seller", label: "Accepts founders outside the US without a US company", hard: true },
      { fact: "international_cards", label: "Charges customers worldwide by card", hard: true },
      { fact: "merchant_of_record", label: "Handles VAT and sales tax for you", hard: false },
      { fact: "subscriptions", label: "Supports subscriptions", hard: false },
    ],
    columns: [
      { fact: "non_us_seller", label: "Non-US founders" },
      { fact: "merchant_of_record", label: "Handles tax" },
      { fact: "subscriptions", label: "Subscriptions" },
    ],
    products: ["lemon-squeezy", "paddle", "polar", "creem", "stripe"],
    limitations: [
      "Country lists change. Check the provider's current list for your country before building on it.",
      "Supporting your country for sign-up and supporting payouts to your bank are separate checks; confirm both.",
      "Stripe availability depends on where your business is registered, not where you live.",
    ],
    faqs: [
      {
        question: "Do I need a US LLC to sell software online?",
        answer: "No. Merchant-of-record platforms such as Lemon Squeezy, Polar, Creem and Paddle accept founders from many countries. A US company mainly matters if you want Stripe and live in a country Stripe does not support.",
      },
      {
        question: "What is the difference between Stripe and a merchant of record?",
        answer: "With Stripe you are the seller and handle sales tax and VAT yourself. A merchant of record sells to your customer in its own name, handles tax, and pays you the remainder, for a higher fee.",
      },
      {
        question: "How many countries do these providers pay out to?",
        answer: "From their own pages at the time of checking: Lemon Squeezy lists 119 bank payout countries, Creem 87, Stripe about 51 supported countries, and Paddle works everywhere except a published list of sanctioned countries.",
      },
    ],
    related: ["paypal-alternatives-for-receiving-payments-in-turkey", "payment-providers-for-freelancers-in-pakistan", "payment-platforms-for-creators-in-nigeria"],
    updated: "2026-10-28",
    status: "published",
  },
  {
    slug: "payment-providers-for-freelancers-in-pakistan",
    topicId: "payments-05",
    title: "Payment providers for freelancers in Pakistan",
    description:
      "Stripe does not support Pakistan. Compare platforms that pay out to Pakistani bank accounts for selling software and digital products abroad, with sources and fees.",
    intro:
      "Freelancers and indie makers in Pakistan often hit the same wall: Stripe does not support Pakistan, and many guides recommend services without checking whether they pay out there. This page looks at providers that sell your digital products to foreign customers and send the money to a Pakistani bank account.",
    answer:
      "For selling software, templates or other digital products, Lemon Squeezy and Polar list Pakistan for bank payouts and handle tax as merchant of record. Creem supports Pakistan but warns payouts may be restricted, and Paddle accepts Pakistani businesses without publishing its payout method. Stripe is not available in Pakistan.",
    requirements: [
      { fact: "seller_pk", label: "Accepts sellers based in Pakistan", hard: true },
      { fact: "payout_pk_bank", label: "Pays out to a Pakistani bank account", hard: true },
      { fact: "international_cards", label: "Charges customers worldwide by card", hard: false },
      { fact: "merchant_of_record", label: "Handles VAT and sales tax for you", hard: false },
    ],
    columns: [
      { fact: "seller_pk", label: "Sellers in Pakistan" },
      { fact: "payout_pk_bank", label: "Payout to Pakistani bank" },
      { fact: "merchant_of_record", label: "Handles tax" },
    ],
    products: ["lemon-squeezy", "polar", "creem", "paddle", "payoneer", "stripe", "paypal", "paystack"],
    limitations: [
      "These platforms are for selling products. Client invoicing for service work may not be accepted; check each provider's acceptable-use rules.",
      "Creem marks Pakistan as a country where payouts may be restricted, for example to personal accounts only.",
      "Incoming foreign payments are subject to your bank's conversion and State Bank of Pakistan rules.",
    ],
    faqs: [
      {
        question: "Is Stripe available in Pakistan?",
        answer: "No. Pakistan is not on Stripe's list of supported countries.",
      },
      {
        question: "Can I use Lemon Squeezy from Pakistan?",
        answer: "Lemon Squeezy lists Pakistan among the countries it pays out to by bank transfer. Your store still goes through Lemon Squeezy's account review.",
      },
      {
        question: "What about PayPal and Payoneer?",
        answer: "We could not confirm from their official pages what they offer to people in Pakistan for receiving payments, so they are marked as not verified rather than recommended.",
      },
    ],
    related: ["payment-processors-for-non-us-founders"],
    updated: "2026-10-28",
    status: "published",
  },
  {
    slug: "payment-platforms-for-creators-in-nigeria",
    topicId: "payments-06",
    title: "Payment platforms for creators in Nigeria",
    description:
      "Compare payment platforms that work for Nigerian creators selling digital products: Paystack, merchant-of-record platforms and what Stripe and PayPal offer, with fees and sources.",
    intro:
      "Nigerian creators selling courses, templates, software or other digital products need two things: a checkout that foreign customers can pay with, and payouts that reach a Nigerian bank. Stripe serves Nigeria through Paystack rather than its own accounts, and merchant-of-record platforms offer a second route that also handles foreign tax.",
    answer:
      "If you have a registered Nigerian business, Paystack accepts local and international cards and settles to Nigerian bank accounts, in naira or USD. If you sell digital products to buyers abroad and want tax handled for you, Lemon Squeezy, Polar and Creem list Nigeria for bank payouts.",
    requirements: [
      { fact: "seller_ng", label: "Accepts sellers based in Nigeria", hard: true },
      { fact: "payout_ng_bank", label: "Pays out to a Nigerian bank account", hard: true },
      { fact: "international_cards", label: "Accepts cards from customers abroad", hard: false },
      { fact: "merchant_of_record", label: "Handles foreign VAT and sales tax", hard: false },
    ],
    columns: [
      { fact: "seller_ng", label: "Sellers in Nigeria" },
      { fact: "payout_ng_bank", label: "Payout to Nigerian bank" },
      { fact: "international_cards", label: "Foreign cards" },
      { fact: "merchant_of_record", label: "Handles tax" },
    ],
    products: ["paystack", "lemon-squeezy", "polar", "creem", "paddle", "stripe", "paypal", "payoneer"],
    limitations: [
      "Paystack requires a business registered in Nigeria (or Ghana, South Africa or Kenya); international payments need compliance approval.",
      "Paystack USD settlement requires a USD domiciliary account at a supported bank.",
      "Merchant-of-record platforms only accept digital products and software, not physical goods or most services.",
    ],
    faqs: [
      {
        question: "Can I use Stripe in Nigeria?",
        answer: "Stripe lists Nigeria as part of its extended network through Paystack. Nigerian businesses sign up with Paystack rather than opening a Stripe account.",
      },
      {
        question: "What does Paystack charge for international payments?",
        answer: "Paystack's help centre lists 3.9% for USD card payments and 3.9% + NGN 100 for naira card payments for Nigerian businesses.",
      },
      {
        question: "Do I need a registered business?",
        answer: "Paystack serves registered businesses. Merchant-of-record platforms review each store and may accept individuals; check their requirements for your situation.",
      },
    ],
    related: ["payment-processors-for-non-us-founders"],
    updated: "2026-10-28",
    status: "published",
  },
];

export const solutionPage = (slug: string) => SOLUTION_PAGES.find((p) => p.slug === slug && p.status === "published");
export const publishedSolutions = () => SOLUTION_PAGES.filter((p) => p.status === "published");
