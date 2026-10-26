# PayTR merchant readiness

Status: **not approved yet.** Live payments must stay off until PayTR approves the merchant account and live
credentials are entered in Admin → Integrations (test mode off).

## Seller data to provide (server `.env`, read at runtime by the web container)

Nothing is filled in by default; unset fields are hidden. None of these may be guessed.

| Variable | Content |
|---|---|
| `LEGAL_NAME` | Registered legal name (company title or sole trader name) |
| `LEGAL_TRADE_NAME` | Trade name, if different |
| `LEGAL_ADDRESS` | Registered address |
| `LEGAL_TAX_OFFICE` / `LEGAL_TAX_NUMBER` | Tax office and number (VKN / TCKN for sole traders) |
| `LEGAL_MERSIS` / `LEGAL_REGISTRY_NUMBER` | MERSIS and trade registry numbers (companies) |
| `LEGAL_KEP` | KEP address, if any |
| `SUPPORT_EMAIL` / `SUPPORT_PHONE` | Customer support contact |
| `PRICE_TAX_NOTE` | e.g. "Prices include 20% VAT (KDV)." — confirm with your accountant |

After editing `.env`: `docker compose up -d web`. Pages pick the values up within 5 minutes.

## Checklist

- [ ] Seller data above filled in and visible on /about, /contact, /distance-sales-agreement and the checkout review step
- [ ] Legal review (Turkish counsel) of /distance-sales-agreement, /refund-policy, /delivery-policy, /terms, /privacy;
      confirm the withdrawal-right exception wording for instantly performed electronic services and whether a Turkish version is required
- [ ] Confirm support commitments stated on the pages: reply within 2 business days (contact), refund answer within 3 business days,
      activation issue reported after 1 hour (delivery)
- [ ] Decide currency and tax treatment (USD vs TL, KDV); set prices in Admin → Integrations to match /pricing
- [ ] KVKK: VERBIS registration if required; privacy notice reviewed
- [ ] PayTR application: website URL, these legal page URLs, sample product description ("digital promotional services, no third-party software resale")
- [ ] PayTR panel: notification URL `https://alternivo.com/bff/billing/paytr` and the server IP if requested
- [ ] `user_phone` is sent as `0000000000` and `user_address` as a fixed digital-service text — ask PayTR whether this is acceptable or collect real values
- [ ] Test-mode end-to-end run (success, failure, duplicate notification) before switching to live
- [ ] Refund procedure: refund in the PayTR panel, then record it in Admin (`POST /api/v1/admin/payments/{id}/refund`), which ends the service

## What the code guarantees

- Price and eligibility are decided server-side (`PricingCatalog` + admin prices); the client only sends a plan key.
- The buyer sees service, total, currency, tax note, delivery terms and seller details, and ticks two acknowledgements
  before the PayTR form is shown; acceptance time and agreement version are stored on the order.
- Notifications: HMAC verified (constant-time); state machine in `PayTrGateway.Classify` — paid once, duplicates only
  re-derive, underpayment and test-mode payments for live orders never grant service, refunded orders never change,
  a late success for a failed order is applied and audit-logged (`payment.late-paid`).
- One entitlement per order (unique index), so repeated notifications cannot grant twice.
- Refunds are tracked on the order (amount, time, reason; Refunded / PartiallyRefunded).
