import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessToken } from "@/server/lib/auth";
import { getUserCredits, getCreditTransactions } from "@/server/services/credit.service";

export async function GET(request: NextRequest) {
  // Get user from session/token
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  let userId: string | null = null;

  if (token) {
    userId = await getUserFromAccessToken(token);
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credits = await getUserCredits(userId);
  const transactions = await getCreditTransactions(userId, 50); // Limit to 50 transactions

  return NextResponse.json({
    credits,
    transactions,
  });
}
