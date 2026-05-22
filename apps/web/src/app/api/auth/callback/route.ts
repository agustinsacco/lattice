import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/server/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");

  const supabase = await createClient();

  // Handle PKCE code flow (Standard for Newer Supabase/Magic Links)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      revalidatePath(next, "layout");
      return NextResponse.redirect(redirectTo);
    }
  }

  // Handle token_hash flow (Standard for OTP)
  if (token_hash && type === "email") {
    const { error } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash,
    });
    if (!error) {
      revalidatePath(next, "layout");
      return NextResponse.redirect(redirectTo);
    }
  }

  // return the user to an error page with some instructions
  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "Could not verify email.");
  return NextResponse.redirect(redirectTo);
}
