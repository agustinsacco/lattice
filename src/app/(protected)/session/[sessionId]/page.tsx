"use client";

import { redirect } from "next/navigation";
import { SessionProviderWrapper } from "./session-provider-wrapper";
import { useSession, useMessages } from "@/client/hooks/use-session";
import { useAuth } from "@/client/hooks/use-auth";
import { useEffect, useState } from "react";
import { FullPageLoader } from "@/client/components/ui/full-page-loader";

export default function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  // This is a client component now, so we need to handle the async params differently
  // We'll use a wrapper component that can handle the async nature
  return <SessionPageContent params={params} />;
}

function SessionPageContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSessionId(p.sessionId));
  }, [params]);

  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: session, isLoading: isSessionLoading, error: sessionError } = useSession(sessionId || "");
  const { data: messages, isLoading: isMessagesLoading, error: messagesError } = useMessages(sessionId || "");

  // Handle authentication loading
  if (isAuthLoading) {
    return <FullPageLoader isLoading={true} message="Authenticating..." />;
  }

  // Handle unauthenticated user
  if (!user) {
    redirect("/login");
    return null;
  }

  // Handle loading states (including when sessionId is still being resolved)
  if (!sessionId || isSessionLoading || isMessagesLoading) {
    return <FullPageLoader isLoading={true} message="Loading session..." />;
  }

  // Handle errors
  if (sessionError || messagesError) {
    console.error("Session not found or error loading:", sessionError || messagesError);
    redirect("/");
    return null;
  }

  // Handle case where session data is not available
  if (!session) {
    console.error("Session data not available");
    redirect("/");
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-white print:h-auto print:overflow-visible">
      <SessionProviderWrapper
        sessionId={sessionId as string}
        initialMessages={messages || []}
        sessionMetadata={session}
      />
    </div>
  );
}
