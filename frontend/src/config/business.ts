/**
 * Seller (legal entity) details shown on legal pages and at checkout (server components only, read at runtime so
 * they can be set in the server's .env without a rebuild). They come only from environment variables:
 * nothing here is a default or a placeholder, so an unset field is simply not shown. Fill these in before
 * live payments are enabled (see docs/paytr-readiness.md).
 */
const env = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const business = {
  legalName: env(process.env.LEGAL_NAME),
  tradeName: env(process.env.LEGAL_TRADE_NAME),
  address: env(process.env.LEGAL_ADDRESS),
  taxOffice: env(process.env.LEGAL_TAX_OFFICE),
  taxNumber: env(process.env.LEGAL_TAX_NUMBER),
  mersisNumber: env(process.env.LEGAL_MERSIS),
  registryNumber: env(process.env.LEGAL_REGISTRY_NUMBER),
  kepAddress: env(process.env.LEGAL_KEP),
  email: env(process.env.SUPPORT_EMAIL),
  phone: env(process.env.SUPPORT_PHONE),
  /** How prices relate to tax, e.g. "Prices include 20% VAT (KDV)." Not shown until set. */
  taxNote: env(process.env.PRICE_TAX_NOTE),
  /** Legal name of the card payment provider, e.g. "İyzi Ödeme ve Elektronik Para Hizmetleri A.Ş. (iyzico)". */
  paymentProvider: env(process.env.PAYMENT_PROVIDER_NAME),
} as const;

/** The payment provider as named on legal pages; a neutral description until one is configured. */
export const paymentProvider = business.paymentProvider ?? "our licensed payment provider";

/** Version of the pre-contract information and distance sales agreement; stored with every order the buyer accepts. */
export const AGREEMENT_VERSION = "2026-10-26";
export const AGREEMENT_UPDATED = "October 26, 2026";

/** Business details present, as label/value rows (unset fields are skipped). */
export function businessRows(): [string, string][] {
  const rows: [string, string | null][] = [
    ["Legal name", business.legalName],
    ["Trade name", business.tradeName],
    ["Registered address", business.address],
    ["Tax office", business.taxOffice],
    ["Tax number", business.taxNumber],
    ["MERSIS number", business.mersisNumber],
    ["Trade registry number", business.registryNumber],
    ["KEP address", business.kepAddress],
    ["E-mail", business.email],
    ["Phone", business.phone],
  ];
  return rows.filter((r): r is [string, string] => r[1] !== null);
}
