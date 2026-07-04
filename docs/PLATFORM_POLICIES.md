# FitCheck Platform Policies

These are the product decisions for the launch version. They are implemented as business rules for product copy and payment planning, but must still be reviewed by counsel before accepting real money.

## Platform Take Rate

- Standard creator take rate: **18%** of the service price.
- Founding Creator / Pro take rate: **12%** of the service price.
- Payment processing fees are passed through before creator payout.
- Capsule Build affiliate revenue split: **70% creator / 30% FitCheck**.
- No creator subscription is required at launch. A paid Pro tier can be introduced after the first active creator cohort.

## Refund And Revision Window

- Every paid service includes **one revision round**.
- Customer has **72 hours after delivery** to approve, request revision, or open a dispute.
- If the customer takes no action within 72 hours, the booking auto-approves.
- A customer may cancel for a full refund before creator work starts or within **2 hours of booking**, whichever comes first.
- After creator work starts, refunds are handled by revision first, then dispute review.
- Disputes must be opened within **7 days of delivery**.

## Creator Payout Rules

- Funds become releasable after customer approval or 72-hour auto-approval.
- Creator payouts are batched weekly on **Friday** through Stripe Connect.
- New creators have a **7-day payout hold** for their first 5 completed bookings.
- Established creators move to weekly payout with no extra hold after a clean first 5 bookings.
- Disputed bookings are held until resolved.
- If a refund is granted before payout, no creator payout is made for the refunded portion.

## Trust And Safety Rules

- Booking uploads are private by default.
- Creators may only use customer photos to complete the booked service.
- Before/after transformations require explicit customer permission before public posting.
- Creator verification is a quality signal only; it does not buy algorithmic preference.
- Admins can suspend creators for missed deliveries, privacy violations, or repeated low-quality disputes.
