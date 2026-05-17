"use client";

import { Button } from "@/client/components/ui/button";
import { signInWithGoogle } from "@/app/(auth)/actions";
import Image from "next/image";

interface SocialButtonProps {
  redirectTo?: string;
}

export default function SocialButton({ redirectTo = "/dashboard" }: SocialButtonProps) {
  return (
    <form action={signInWithGoogle} className="w-full">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button variant="outline" className="w-full flex items-center justify-center">
        <Image src="/google.jpeg" alt="Google logo" width={20} height={20} className="mr-2" />
        Google
      </Button>
    </form>
  );
}
