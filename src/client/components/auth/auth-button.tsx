"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./logout-button";
import { useAuth } from "@/client/hooks/use-auth";

export function AuthButton() {
  const { user } = useAuth();

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"default"}>
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}
