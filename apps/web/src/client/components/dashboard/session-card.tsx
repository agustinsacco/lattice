"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  Box, 
  MoreVertical, 
  Trash2, 
  ArrowRight, 
  Calendar, 
  Cpu,
  Loader2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  Button, Typography, Badge
} from "@lattice/ui";
import { Session } from "@lattice/shared/types/index";
import { useSessions } from "@/client/hooks/use-sessions";
import { useState } from "react";

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const { deleteSession, isDeleting: __isDeleting } = useSessions();
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

  return (
    <Link 
      href={`/session/${session.id}`}
      className="group relative bg-white border border-gray-100 rounded-3xl p-6 transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl transition-all group-hover:bg-blue-500/10" />
      
      <div className="flex items-start justify-between mb-6 relative">
        <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
          <Box className="w-8 h-8" />
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
        <Typography variant="h4" className="line-clamp-1 group-hover:text-blue-600 transition-colors">
          {session.name || "Untitled Project"}
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
            <Cpu className="w-3.5 h-3.5" />
            <Typography variant="muted" as="span">
              {(session.credits_used ?? 0).toFixed(0)} credits
            </Typography>
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-gray-200 text-xs py-1 rounded-lg">
            CAD Design
          </Badge>
          <Typography variant="tiny">Cost: ${(session.cost_usd ?? 0).toFixed(2)}</Typography>
        </div>

        <div className="flex items-center text-blue-500 font-bold text-sm group-hover:translate-x-1 transition-transform">
          Open Canvas
          <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </div>

      {isDeletingThis && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-3xl animate-in fade-in">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}
    </Link>
  );
}
