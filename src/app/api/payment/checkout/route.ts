import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessToken } from "@/server/lib/auth";
import Stripe from "stripe";
import { PRICING_CONFIG } from "@/common/config";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Credit package definitions
const CREDIT_PACKAGES = {
  starter: { credits: 5 * PRICING_CONFIG.CREDITS_PER_USD, priceUsd: 5 },
  basic: { credits: 10 * PRICING_CONFIG.CREDITS_PER_USD, priceUsd: 10 },
  popular: { credits: 25 * PRICING_CONFIG.CREDITS_PER_USD, priceUsd: 20 },
  pro: { credits: 60 * PRICING_CONFIG.CREDITS_PER_USD, priceUsd: 50 },
  enterprise: { credits: 150 * PRICING_CONFIG.CREDITS_PER_USD, priceUsd: 100 },
} as const;

type PackageId = keyof typeof CREDIT_PACKAGES;

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];
    const userId = token ? await getUserFromAccessToken(token) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { packageId } = body as { packageId: string };

    // Validate package ID
    if (!packageId || !(packageId in CREDIT_PACKAGES)) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    const pkg = CREDIT_PACKAGES[packageId as PackageId];
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${pkg.credits} Lattice Credits`,
              description: `Purchase ${pkg.credits} credits for Lattice`,
            },
            unit_amount: pkg.priceUsd * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packageId,
        credits: pkg.credits.toString(),
      },
      client_reference_id: userId,
      success_url: `${appUrl}/dashboard?payment=success`,
      cancel_url: `${appUrl}/dashboard?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
