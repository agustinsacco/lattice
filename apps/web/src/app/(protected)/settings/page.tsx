import { redirect } from "next/navigation";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server";
import React from "react";
import { SettingsContent } from "@/client/components/settings/settings-content";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  try {
    await getAuthenticatedUserId();
  } catch (error) {
    console.error("Unauthorized access to settings page:", error);
    redirect("/login"); // Redirect to login if not authenticated
  }

  return <SettingsContent />;
}
