export type EmailKind =
  | "booking_created"
  | "payment_completed"
  | "creator_message"
  | "customer_message"
  | "delivery_ready"
  | "revision_requested"
  | "redelivery_ready"
  | "approval_reminder"
  | "booking_approved"
  | "dispute_update";

export function bookingEmailTemplate(kind: EmailKind, context: { appUrl: string; bookingId: string; creatorName?: string }) {
  const link = `${context.appUrl}/bookings/${context.bookingId}`;
  const creator = context.creatorName || "your creator";
  const subjects: Record<EmailKind, string> = {
    booking_created: "Your ByTaste booking was created",
    payment_completed: "Your ByTaste payment is confirmed",
    creator_message: `${creator} sent you a message`,
    customer_message: "New customer message on ByTaste",
    delivery_ready: `${creator} delivered your styling work`,
    revision_requested: "Revision requested on ByTaste",
    redelivery_ready: `${creator} sent a revised delivery`,
    approval_reminder: "Your ByTaste approval window closes soon",
    booking_approved: "ByTaste booking approved",
    dispute_update: "ByTaste dispute update",
  };
  const bodies: Record<EmailKind, string> = {
    booking_created: `Your booking has been created. Open it here: ${link}`,
    payment_completed: `Payment is confirmed and held until delivery approval. Open your booking: ${link}`,
    creator_message: `${creator} sent a message on your booking. Open it here: ${link}`,
    customer_message: `A customer sent a message on ByTaste. Open the booking: ${link}`,
    delivery_ready: `${creator} delivered your styling work. You have 72 hours to approve, request the included revision, or report a problem: ${link}`,
    revision_requested: `A revision was requested. Open the booking: ${link}`,
    redelivery_ready: `${creator} sent a revised delivery. Open it here: ${link}`,
    approval_reminder: `Your approval window closes soon. Approve, request the included revision, or report a problem: ${link}`,
    booking_approved: `The booking has been approved. Open it here: ${link}`,
    dispute_update: `There is a dispute update. Open the booking: ${link}`,
  };
  return { subject: subjects[kind], text: bodies[kind] };
}
