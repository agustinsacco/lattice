import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server";
import { supabaseAdmin } from "@/server/lib/supabase";
import { validateSessionOwnership } from "@/server/lib/auth";
import { SUPABASE_BUCKET_NAME } from "@/common/config";

/**
 * Generates a signed URL to download the STL model for a session.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Verify user owns the session
  const isOwner = await validateSessionOwnership(sessionId, userId);
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Generate a signed URL for model.stl
    const { data, error } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET_NAME)
      .createSignedUrl(`${sessionId}/model.stl`, 300); // 5 minutes validity

    if (error) {
      if (error.message === "Object not found") {
        return NextResponse.json({ url: null });
      }
      console.error("[ModelRoute] Failed to create signed URL:", error.message);
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    if (!data) {
      return NextResponse.json({ url: null });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err) {
    console.error("[ModelRoute] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
