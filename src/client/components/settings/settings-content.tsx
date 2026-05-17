"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { ProfileForm } from "./profile-form";
import { SignaturePad } from "./signature-pad";
import { MemoryManager } from "@/client/components/memory/memory-manager";
import { useCredits } from "@/client/hooks/use-credits";
import { useCreditsModal } from "@/client/providers/credits-modal";
import { Button } from "@/client/components/ui/button";
import { Coins, User, PenTool, Brain } from "lucide-react";

export function SettingsContent() {
  const { data: credits, isLoading: isLoadingCredits } = useCredits();
  const { openModal } = useCreditsModal();

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-heading">Settings</h1>
        <p className="text-muted-foreground mt-2 font-sans">
          Manage your account settings, preferences, and AI memory.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="signature">Signature</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription className="font-sans">
                Update your personal information and how you appear to others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <PenTool className="h-5 w-5" />
                Digital Signature
              </CardTitle>
              <CardDescription className="font-sans">
                Create and manage your digital signature for signing documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignaturePad />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <Coins className="h-5 w-5" />
                Credits & Billing
              </CardTitle>
              <CardDescription className="font-sans">View your credit balance and transaction history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-yellow-50 rounded-xl border border-yellow-100">
                <div>
                  <p className="text-sm font-medium text-yellow-800 font-sans">Current Balance</p>
                  <h3 className="text-3xl font-bold text-yellow-900 mt-1 font-heading">
                    {isLoadingCredits ? "..." : (credits?.toFixed(2) ?? "0.00")}
                  </h3>
                </div>
                <Button
                  onClick={openModal}
                  className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-xl shadow-lg shadow-yellow-400/20 hover:scale-105 transition-all duration-300 font-sans font-medium"
                >
                  Add Credits
                </Button>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Transaction History</h4>
                <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  No transactions yet.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Memory Bank
              </CardTitle>
              <CardDescription>View and manage what the AI remembers about you.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden min-h-0">
              <MemoryManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
