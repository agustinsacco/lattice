"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  LayoutGrid, 
  List, 
  Plus, 
  FileText, 
  MessageSquare, 
  Clock, 
  SearchX,
  ArrowUpRight,
  Filter
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
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { useSessions } from "@/client/hooks/use-sessions";
import { SessionCard } from "./session-card";
import { SessionTableRow } from "./session-table-row";
import PdfDropzone from "@/client/components/pdf-dropzone";
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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => 
      s.originalFilename.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions, searchQuery]);

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        return router.push("/login");
      }

      if (!response.ok) {
        throw new Error("Failed to upload PDF");
      }

      const { sessionId } = await response.json();
      router.push(`/session/${sessionId}`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
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
            Manage your PDF documents and AI conversations
          </Typography>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl px-6 h-12 transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40">
                <Plus className="w-5 h-5 mr-2" />
                Upload New PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-3xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center mb-4">Upload your PDF</DialogTitle>
              </DialogHeader>
              <PdfDropzone 
                onFileUpload={handleFileUpload} 
                uploadError={uploadError} 
                isLoading={isUploading} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <Typography variant="muted">Total Files</Typography>
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
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <Typography variant="muted">Recently Updated</Typography>
            <Typography variant="h3">{stats.recentlyUpdated}</Typography>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-yellow-400 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-all">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <Typography variant="muted">Smart Filter</Typography>
              <Typography variant="small" className="font-bold">All Files</Typography>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-yellow-500 transition-all" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
        {/* Controls */}
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by filename..." 
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
                      <th className="pb-4 pl-4">Filename</th>
                      <th className="pb-4">Last Activity</th>
                      <th className="pb-4">Size</th>
                      <th className="pb-4">Pages</th>
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
              <h3 className="text-xl font-semibold text-gray-900">No sessions found</h3>
              <p className="text-gray-500 max-w-xs mt-2">
                {searchQuery ? `We couldn't find any sessions matching "${searchQuery}"` : "Get started by uploading your first PDF document."}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-6 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl"
                >
                  Upload New PDF
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
