"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSessionVersions, restoreSessionVersion } from "@/client/api/session.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";

interface RestoreSessionDialogProps {
  sessionId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function RestoreSessionDialog({ sessionId, isOpen, onOpenChange }: RestoreSessionDialogProps) {
  const queryClient = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: ["sessionVersions", sessionId],
    queryFn: () => fetchSessionVersions(sessionId),
    enabled: isOpen, // Only fetch when the dialog is open
  });

  const restoreMutation = useMutation({
    mutationFn: (targetVersion: number) => restoreSessionVersion(sessionId, targetVersion),
    onSuccess: () => {
      toast.success("Session restored successfully!");
      // Invalidate queries to refetch messages, session data, etc.
      queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to restore session.");
    },
  });

  const handleRestore = (versionNumber: number) => {
    if (
      confirm(
        `Are you sure you want to restore to version ${versionNumber}? This will delete all messages and edits created after this version.`
      )
    ) {
      restoreMutation.mutate(versionNumber);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Restore PDF Version</DialogTitle>
          <DialogDescription>
            Select a previous version to restore your PDF session. This will remove all changes made after the selected
            version.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No version history available.</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {versions.map((version) => (
                <div
                  key={version.versionNumber}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Version {version.versionNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(version.versionNumber)}
                    disabled={restoreMutation.isPending}
                  >
                    {restoreMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      "Restore"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
