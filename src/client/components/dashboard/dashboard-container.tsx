"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  LayoutGrid, 
  List, 
  Plus, 
  Box, 
  MessageSquare, 
  Clock, 
  SearchX,
  ArrowUpRight,
  Filter,
  Loader2
} from "lucide-react";
import { Input } from "@/client/components/ui/input";
import { Button } from "@/client/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/client/components/ui/dialog";
import { useSessions } from "@/client/hooks/use-sessions";
import { SessionCard } from "./session-card";
import { SessionTableRow } from "./session-table-row";
import { useRouter } from "next/navigation";
import { cn } from "@/client/utils";
import { User } from "@supabase/supabase-js";
import { Typography } from "@/client/components/ui/typography";
import { Badge } from "@/client/components/ui/badge";

export function DashboardContainer({ user }: { user: User | null }) {
  const router = useRouter();
  const { sessions, isLoading } = useSessions();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions, searchQuery]);

  const handleCreateSession = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newSessionName.trim() || "Untitled Project" }),
      });

      if (response.status === 401) {
        return router.push("/login");
      }

      if (!response.ok) {
        throw new Error("Failed to create design session");
      }

      const session = await response.json();
      router.push(`/session/${session.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Creation failed");
    } finally {
      setIsCreating(false);
    }
  };

  const stats = useMemo(() => {
    if (!sessions) return { total: 0, recentlyUpdated: 0 };
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return {
      total: sessions.length,
      recentlyUpdated: sessions.filter(s => s.updatedAt > oneDayAgo).length
    };
  }, [sessions]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <Typography variant="h1">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}!
          </Typography>
          <Typography variant="muted" className="mt-1">
            Manage your Generative CAD modeling workspace and AI agents
          </Typography>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-6 h-12 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
                <Plus className="w-5 h-5 mr-2" />
                New Design Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 bg-white border border-gray-100">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center mb-4">Create New Design Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSession} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="projectName" className="text-sm font-medium text-gray-700">Project Name</label>
                  <Input 
                    id="projectName"
                    placeholder="e.g. Hexagonal Pen Cup" 
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    disabled={isCreating}
                    className="h-12 bg-gray-50/50 border-gray-100 rounded-xl"
                  />
                </div>

                {createError && (
                  <p className="text-sm text-red-500 text-center">{createError}</p>
                )}

                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Workspace...
                    </>
                  ) : (
                    "Initialize CAD Workspace"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <Typography variant="muted">Total Models</Typography>
            <Typography variant="h3">{stats.total}</Typography>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <Typography variant="muted">Active Sessions</Typography>
            <Typography variant="h3">{stats.total}</Typography>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <Typography variant="muted">Recently Updated</Typography>
            <Typography variant="h3">{stats.recentlyUpdated}</Typography>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-blue-400 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <Typography variant="muted">Smart Filter</Typography>
              <Typography variant="small" className="font-bold">All Models</Typography>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-all" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
        {/* Controls */}
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by project name..." 
              className="pl-10 h-11 bg-gray-50/50 border-gray-100 focus:bg-white transition-all rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
            <Button 
              variant={viewMode === "grid" ? "outline" : "ghost"} 
              size="icon" 
              className={cn("h-9 w-9 rounded-lg transition-all bg-transparent border-transparent", viewMode === "grid" && "bg-white shadow-sm border-gray-100")}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "outline" : "ghost"} 
              size="icon" 
              className={cn("h-9 w-9 rounded-lg transition-all bg-transparent border-transparent", viewMode === "list" && "bg-white shadow-sm border-gray-100")}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sessions List/Grid */}
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredSessions.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                      <th className="pb-4 pl-4">Project Name</th>
                      <th className="pb-4">Last Activity</th>
                      <th className="pb-4">Credits Used</th>
                      <th className="pb-4">Cost</th>
                      <th className="pb-4 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSessions.map((session) => (
                      <SessionTableRow key={session.id} session={session} />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="py-20 flex flex-col items-center text-center">
              <div className="p-6 bg-gray-50 rounded-full mb-6">
                <SearchX className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">No design sessions found</h3>
              <p className="text-gray-500 max-w-xs mt-2">
                {searchQuery ? `We couldn't find any design sessions matching "${searchQuery}"` : "Get started by initializing your first Generative CAD design workspace."}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  Create New Workspace
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
