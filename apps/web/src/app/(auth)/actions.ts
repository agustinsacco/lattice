"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/server/lib/supabase/server";

export async function passwordlessSignIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect(`/login?error=${error.message}`);
  }

  // Redirect to a page informing the user to check their email
  redirect("/login?message=Check your email for a login link");
}

export async function signInWithPassword(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${error.message}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect(`/login?error=${error.message}`);
  }

  redirect("/login?message=Check your email to confirm your account");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const redirectTo = String(formData.get("redirectTo") || "/dashboard");
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=${redirectTo}`,
    },
  });

  if (error) {
    redirect(`/login?error=${error.message}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}
