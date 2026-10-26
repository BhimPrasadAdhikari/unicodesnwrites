# Razorpay setup for unicodesnwrites.tech

unicodesnwrites.tech is a **Lagnever product**. It takes payments through Lagnever's
existing Razorpay merchant account and follows Lagnever's business model: prices in INR,
payments final and non-refundable except confirmed duplicate charges, undeliverable orders or
where the law requires, parent approval for minors, Indian law with Jammu & Kashmir courts.
Stripe is no longer used.

Seller details on the site match the Razorpay account (checked in the dashboard on
2026-10-26: Account & Settings → Business details and Customer support details):

| | |
|---|---|
| Razorpay business | Individual: Business Name "SHAKEELA BEGUM", Brand Name "LAGNEVER" |
| Shown on the site | LAGNEVER (proprietor: Shakeela Begum) |
| Support email | support@lagnevertech.com |
| Support phone | +91 96226 85834 |
| Address | Rajouri, Jammu & Kashmir, India |

Razorpay's website checklist requires the business name on the site and policy pages to
match the account. The Lagnever AI app itself shows "Lagnever Technologies Private Limited";
if the company is later registered with Razorpay, update `BUSINESS_LEGAL_NAME`.

Already on the account: `app.lagnever.ai` (approved), `www.threadlytics.me` (verified), live
API keys, webhooks for `api.lagnevertech.com` and `threadlytics.me`. Cards (Visa, Mastercard,
RuPay), UPI and UPI Autopay are activated.

Everything below is done by the account owner in the Razorpay dashboard. Do it in **Test
Mode first**, then repeat the key and webhook steps in **Live Mode**.

## 1. Add the website to the Lagnever account

Account & Settings → **Business website details** → add website/app.

| Field | Value |
|---|---|
| Website URL | `https://unicodesnwrites.tech` (exact origin checkout opens on; no redirecting domain) |
| Relationship | Same business (LAGNEVER) as app.lagnever.ai, already approved on this account |
| Business category | Education → E-learning / digital goods |
| What is sold | Downloadable digital products (templates, tools, e-books, course material). Courses are free. Prices in INR. |
| Delivery | Instant digital download plus email link. Nothing shipped. |
| Refunds | Final sale, as on Lagnever AI; refunds only for confirmed duplicates, non-delivery or where required by law |
| Test login | Not needed: products and checkout are public; no sign-in required to buy |

Paste this description when asked what the site is:

> unicodesnwrites.tech is a technical publication and digital product store operated by
> LAGNEVER (proprietor: Shakeela Begum), the business behind Lagnever AI (lagnever.ai). It
> sells downloadable developer tools, templates and e-books priced in Indian rupees,
> delivered instantly by download and email.

Policy pages Razorpay checks (all live once this branch is deployed):

| Page | URL |
|---|---|
| Contact us (address, email, phone) | https://unicodesnwrites.tech/contact |
| Terms and conditions | https://unicodesnwrites.tech/terms |
| Privacy policy | https://unicodesnwrites.tech/privacy |
| Refund and cancellation policy | https://unicodesnwrites.tech/refund-policy |
| Shipping and delivery policy | https://unicodesnwrites.tech/shipping-policy |
| Pricing (INR) | https://unicodesnwrites.tech/products |

Until the domain is approved, live payments from it fail with **"Business – Website
Mismatch"** and UPI apps show **"Receiver's UPI ID or VPA is not available"**.

## 2. Business and support details

These already match the Lagnever account if it was set up with the details above; check them.

- **Postal address**: `Rajouri, Jammu & Kashmir, India`. If the Razorpay account has a fuller
  registered address, set the same text in `NEWSLETTER_POSTAL_ADDRESS` (Vercel) so the site,
  newsletter and Razorpay agree.
- **Support email**: `support@lagnevertech.com`.
- **Support phone**: `+91 96226 85834`, the customer support number on the account (the
  site default; override with `BUSINESS_SUPPORT_PHONE` only if Razorpay's changes).

## 3. Checkout settings

- Payment methods (Account & Settings → Payment methods): UPI, Cards, Netbanking, Wallets
  show **Activated** in live mode.
- Payment capture: automatic capture on. (The server also captures `authorized` payments.)
- Checkout Features → **Message banner**: neutral copy such as "Secure checkout" or off.
- Notification emails for payments, refunds, disputes and webhook failures.

## 4. API keys → Vercel

Account & Settings → API keys. In Vercel (Production) set:

```
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...      # from step 5
```

Remove `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
Only the key id reaches the browser.

## 5. Webhook

Account & Settings → Webhooks → Add new webhook (once in test mode, once in live mode):

- URL: `https://unicodesnwrites.tech/api/webhooks/razorpay`
- Secret: a new random string → `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`,
  `refund.processed`, `refund.failed`, `payment.dispute.created`
- Alert email: your ops address

The webhook is the source of truth; the checkout callback and the success page are fallbacks.
Each event id is processed once. Events for orders this site didn't create (other Lagnever
products on the same account) are acknowledged and ignored. Likewise, Lagnever's own webhook
will now also receive unicodesnwrites events and must ignore orders it doesn't recognise.

## 6. Database migration

Before the first live order, against production (dry run first):

```
npm run migrate:razorpay
npm run migrate:razorpay -- --usd-inr-rate=<rate> --apply
```

It drops the old Stripe unique indexes, gives legacy purchases a placeholder order id, and
converts USD product prices to INR (or lists them so you can re-price in the dashboard).

## 7. Live check

1. Create a ₹1 product (price `100` paise), publish it.
2. Buy it with UPI on https://unicodesnwrites.tech.
3. Check: Transactions → Payments shows **Captured**; Webhooks → delivery log shows **200**;
   the success page shows the download; Dashboard → Purchases lists it.
4. Refund it from the Razorpay dashboard and confirm the purchase flips to refunded.
