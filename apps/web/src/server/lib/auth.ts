import { supabaseAdmin } from "./supabase";

/**
 * Validates a Supabase access token and returns the associated user ID.
 *
 * @param accessToken - The Supabase access token.
 * @returns The user ID if the token is valid, otherwise `null`.
 */
export async function getUserFromAccessToken(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) {
    console.error("[Auth] getUserFromAccessToken: No access token provided.");
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error) {
      console.error(`[Auth] getUserFromAccessToken: Supabase authentication failed: ${error.message}`);
      return null;
    }
    if (!user) {
      console.error("[Auth] getUserFromAccessToken: No user found for the provided token.");
      return null;
    }

    return user.id;
  } catch (error) {
    console.error(`[Auth] getUserFromAccessToken: Unexpected error during token validation.`, error);
    return null;
  }
}

/**
 * Validates if a given user owns a specific session.
 *
 * @param sessionId - The ID of the session to validate.
 * @param userId - The ID of the user to check for ownership.
 * @returns `true` if the user owns the session, otherwise `false`.
 */
export async function validateSessionOwnership(sessionId: string, userId: string): Promise<boolean> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error(
        `[Auth] validateSessionOwnership: Supabase query failed for session ${sessionId}: ${error.message}`
      );
      return false;
    }
    if (!session) {
      console.error(`[Auth] validateSessionOwnership: Session ${sessionId} not found or not owned by user ${userId}.`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[Auth] validateSessionOwnership: Unexpected error during session ownership validation for session ${sessionId}.`,
      error
    );
    return false;
  }
}
