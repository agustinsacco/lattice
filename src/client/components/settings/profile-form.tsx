"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/client/hooks/use-auth";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { supabase } from "@/client/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/client/components/ui/avatar";

export function ProfileForm() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) {
        throw error;
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.user_metadata?.avatar_url} />
          <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-gray-500">Profile Picture</p>
          <p className="text-xs text-gray-400">Managed via your auth provider (e.g. Google)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="email" className="font-sans">
            Email
          </Label>
          <Input id="email" value={user.email} disabled className="bg-gray-50 font-sans" />
          <p className="text-xs text-gray-400 font-sans">Email cannot be changed</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName" className="font-sans">
            Display Name
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your name"
            className="font-sans focus:ring-2 focus:ring-yellow-400/50"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-xl shadow-lg shadow-yellow-400/20 hover:scale-105 transition-all duration-300 font-sans font-medium"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </div>
  );
}
