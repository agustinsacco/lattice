"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Trash2, MessageSquare, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { useSessions } from "@/client/hooks/use-sessions";

export function UserSessionsSection() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { sessions, isLoading, deleteSession, isDeleting } = useSessions();

  const handleRemove = (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this session? This action cannot be undone.")) {
      return;
    }
    setDeletingId(sessionId);
    deleteSession(sessionId, {
      onSettled: () => setDeletingId(null),
    });
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-4">Your Recent Sessions</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Continue where you left off with your CAD workspaces and design sessions.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.slice(0, 6).map((session) => (
            <Link
              key={session.id}
              href={`/session/${session.id}`}
              className="group relative block p-6 rounded-xl border border-gray-200 bg-white hover:border-yellow-400 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleRemove(session.id, e)}
                  disabled={isDeleting && deletingId === session.id}
                >
                  {isDeleting && deletingId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <h3 className="text-xl font-semibold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                {session.name || "Untitled Project"}
              </h3>

              <div className="flex items-center text-sm text-muted-foreground mt-4" suppressHydrationWarning>
                <Calendar className="h-4 w-4 mr-2" />
                {formatDistanceToNow(new Date(session.updatedAt || session.createdAt), { addSuffix: true })}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
