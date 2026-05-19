"use client";

import { Star, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Button } from "@/client/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/client/components/ui/avatar";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useAuth } from "@/client/hooks/use-auth";

export function UserNav() {
  const { user, logOut, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return (
      <Button
        asChild
        className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all duration-200"
      >
        <a href="/login" className="flex items-center space-x-2">
          <Star size={16} />
          <span>Login</span>
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-transparent">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
              alt="User avatar"
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-0">
          <div className="flex flex-col items-center space-y-1 p-2 text-center">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {user.email === "saccoagustin@hotmail.com" && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/admin")}>
              <ShieldAlert className="mr-2 h-4 w-4" />
              <span>Admin Dashboard</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings")}>
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={logOut}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
