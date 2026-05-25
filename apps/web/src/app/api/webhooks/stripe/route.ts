import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { addCredits } from "@/server/services/credit.service";

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}
const stripe = new Stripe(stripeKey, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature found");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId || session.client_reference_id;
      const credits = session.metadata?.credits;
      const packageId = session.metadata?.packageId;
      const paymentIntentId = session.payment_intent as string;

      if (!userId || !credits) {
        console.error("Missing userId or credits in session metadata:", session.id);
        // Still return 200 to acknowledge receipt
        return NextResponse.json({ received: true });
      }

      // Add credits with idempotency key (payment intent ID)
      try {
        await addCredits(
          userId,
          parseFloat(credits),
          "purchase",
          `Purchased ${packageId || "credits"} package`,
          paymentIntentId // Use as idempotency key
        );
        console.log(`Successfully added ${credits} credits to user ${userId}`);
      } catch (error) {
        // Log error but still return 200 to prevent Stripe retries
        console.error("Error adding credits:", error);
        // If it's a duplicate, that's fine - idempotency handled it
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    // Still return 200 to prevent endless Stripe retries
    return NextResponse.json({ received: true });
  }
}

// Disable body parsing to get raw body for signature verification
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
