"use client";

import { useSessions } from "@/client/hooks/use-sessions";
import { Button } from "@/client/components/ui/button";
import { ScrollArea } from "@/client/components/ui/scroll-area";
import { Plus, MessageSquare, FileText, MoreVertical, Trash2, Loader2, Sidebar } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/client/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Typography } from "@/client/components/ui/typography";
import { Badge } from "@/client/components/ui/badge";

export function AppSidebar() {
  const { sessions = [], isLoading } = useSessions();
  const params = useParams();
  const currentSessionId = params?.sessionId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleNewChat = () => {
    router.push("/dashboard");
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this session?")) return;

    setDeletingId(sessionId);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["sessions", "user"] });
        if (currentSessionId === sessionId) {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Failed to delete session", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-gray-50 border-r border-gray-200 flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out print:hidden",
          isCollapsed ? "w-16" : "w-80"
        )}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && (
            <Button
              onClick={handleNewChat}
              variant="brand"
              className="flex-1 mr-2 rounded-xl h-9"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", isCollapsed && "mx-auto")}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Sidebar className="w-4 h-4" />
          </Button>
        </div>

        {isCollapsed && (
          <div className="p-2 border-b border-gray-200 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleNewChat}
                  variant="brand"
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={10}
                className="rounded-xl bg-gray-900 text-white border-gray-800"
              >
                New Chat
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center p-8">
                <Typography variant="tiny" className="text-gray-400">
                  {isCollapsed ? "..." : "No sessions yet"}
                </Typography>
              </div>
            ) : (
              sessions.map((session) => (
                <Tooltip key={session.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/session/${session.id}`}
                      className={cn(
                        "group flex items-center p-2 rounded-xl text-sm transition-all duration-200",
                        currentSessionId === session.id
                          ? "bg-white shadow-sm border border-gray-200 text-gray-900 font-medium"
                          : "text-gray-600 hover:bg-yellow-50 hover:text-yellow-900",
                        isCollapsed ? "justify-center" : "justify-between"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 overflow-hidden",
                          isCollapsed && "justify-center w-full"
                        )}
                      >
                        <MessageSquare
                          className={cn(
                            "w-4 h-4 flex-shrink-0",
                            currentSessionId === session.id
                              ? "text-yellow-500"
                              : "text-gray-400 group-hover:text-gray-500"
                          )}
                        />
                        {!isCollapsed && (
                          <div className="flex flex-col overflow-hidden">
                            <Typography variant="small" className="truncate font-medium group-hover:text-brand-dark transition-colors">
                              {session.name}
                            </Typography>
                            <Typography variant="tiny" className="text-gray-400">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </Typography>
                          </div>
                        )}
                      </div>

                      {!isCollapsed && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={(e) => handleDelete(session.id, e)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent
                      side="right"
                      sideOffset={10}
                      className="flex flex-col gap-1 rounded-2xl bg-white text-gray-900 border-gray-200 shadow-2xl p-4"
                    >
                      <Typography variant="small" className="font-bold">{session.name}</Typography>
                      <Typography variant="tiny">{new Date(session.createdAt).toLocaleDateString()}</Typography>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-gray-200 bg-white">
          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xs flex-shrink-0">
              LA
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <Typography variant="small" className="font-bold truncate">Lattice User</Typography>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <Typography variant="tiny" className="font-bold text-gray-400 uppercase tracking-tighter">Pro Plan</Typography>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
