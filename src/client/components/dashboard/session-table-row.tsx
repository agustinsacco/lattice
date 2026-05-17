"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  FileText, 
  MoreVertical, 
  Trash2, 
  ExternalLink,
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

interface SessionTableRowProps {
  session: Session;
}

export function SessionTableRow({ session }: SessionTableRowProps) {
  const { deleteSession } = useSessions();
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
    <tr className="group hover:bg-gray-50/50 transition-all cursor-pointer relative">
      <td className="py-4 pl-4">
        <Link href={`/session/${session.id}`} className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-all">
            <FileText className="w-5 h-5" />
          </div>
          <span className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
            {session.originalFilename}
          </span>
        </Link>
      </td>
      <td className="py-4">
        <span className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
        </span>
      </td>
      <td className="py-4">
        <span className="text-sm text-gray-500">{fileSizeMB} MB</span>
      </td>
      <td className="py-4">
        <span className="text-sm text-gray-500">{session.numPages} pages</span>
      </td>
      <td className="py-4 pr-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link href={`/session/${session.id}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-400 hover:text-gray-900">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl p-2">
              <DropdownMenuItem 
                className="text-red-500 focus:text-red-600 focus:bg-red-50 rounded-lg cursor-pointer"
                onClick={handleDelete}
                disabled={isDeletingThis}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
      
      {isDeletingThis && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in">
          <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
        </div>
      )}
    </tr>
  );
}
