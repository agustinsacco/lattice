import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/server/lib/supabase/server";
import { grantWelcomeCredits } from "@/server/services/credit.service";
import { getUserFromAccessToken } from "@/server/lib/auth";

/**
 * GET /api/welcome-credits
 *
 * Checks if the user should receive welcome credits and grants them atomically.
 * This endpoint is idempotent - calling it multiple times will not grant duplicate credits.
 *
 * Returns:
 * - shouldShow: boolean - whether the welcome dialog should be displayed
 * - creditsGranted: boolean - whether credits were just granted
 * - balance: number - current credit balance
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    let userId: string | null = null;

    if (token) {
      userId = await getUserFromAccessToken(token);
    }

    if (!userId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Attempt to grant welcome credits
    const result = await grantWelcomeCredits(userId);

    return NextResponse.json({
      shouldShow: result.granted,
      creditsGranted: result.granted,
      balance: result.balance,
    });
  } catch (error) {
    console.error("Error in welcome credits endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
