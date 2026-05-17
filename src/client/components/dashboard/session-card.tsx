"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  FileText, 
  MoreVertical, 
  Trash2, 
  ArrowRight, 
  Calendar, 
  Database,
  Loader2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/client/components/ui/dropdown-menu";
import { Button } from "@/client/components/ui/button";
import { Session } from "@/common/types/index";
import { useSessions } from "@/client/hooks/use-sessions";
import { useState } from "react";
import { cn } from "@/client/utils";
import { Typography } from "@/client/components/ui/typography";
import { Badge } from "@/client/components/ui/badge";

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const { deleteSession, isDeleting } = useSessions();
  const [isDeletingThis, setIsDeletingThis] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this session?")) {
      setIsDeletingThis(true);
      deleteSession(session.id, {
        onSettled: () => setIsDeletingThis(false)
      });
    }
  };

  const fileSizeMB = (session.fileSize / (1024 * 1024)).toFixed(1);

  return (
    <Link 
      href={`/session/${session.id}`}
      className="group relative bg-white border border-gray-100 rounded-3xl p-6 transition-all duration-300 hover:border-yellow-400 hover:shadow-2xl hover:shadow-yellow-500/10 hover:-translate-y-1 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl transition-all group-hover:bg-yellow-500/10" />
      
      <div className="flex items-start justify-between mb-6 relative">
        <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-yellow-500 group-hover:text-black transition-all duration-300">
          <FileText className="w-8 h-8" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-400 hover:text-gray-900">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[160px]">
            <DropdownMenuItem 
              className="text-red-500 focus:text-red-600 focus:bg-red-50 rounded-xl cursor-pointer"
              onClick={handleDelete}
              disabled={isDeletingThis}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 mb-6">
        <Typography variant="h4" className="line-clamp-1 group-hover:text-yellow-600 transition-colors">
          {session.originalFilename}
        </Typography>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <Typography variant="muted" as="span">
              {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
            </Typography>
          </span>
          <span className="w-1 h-1 bg-gray-200 rounded-full" />
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            <Typography variant="muted" as="span">{fileSizeMB} MB</Typography>
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400">
                P{i}
              </div>
            ))}
          </div>
          <Typography variant="tiny">{session.numPages} pages</Typography>
        </div>

        <div className="flex items-center text-yellow-500 font-bold text-sm group-hover:translate-x-1 transition-transform">
          Open
          <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </div>

      {isDeletingThis && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-3xl animate-in fade-in">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      )}
    </Link>
  );
}
