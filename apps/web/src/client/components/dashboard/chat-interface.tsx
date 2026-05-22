"use client";

import type React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Send, MessageSquare, Loader2, Paperclip, X } from "lucide-react";
import type { ChatMessage, ChatMessageAttachment } from "@lattice/shared/types";
import { Button, Textarea, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Typography, Badge } from "@lattice/ui";
import { useCreditTransactions, useCredits } from "@/client/hooks/use-credits";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCreditsModal } from "@/client/providers/credits-modal";
import { useAttachments } from "@/client/hooks/use-attachments";
import { useChatMessages } from "@/client/hooks/use-chat-messages";
import { LatticeChatMessage } from "./chat/chat-message";
import { ProgressiveThinking } from "./chat/thinking-indicator";
import { PRICING_CONFIG } from "@lattice/shared/config";

interface ChatInterfaceProps {
  sessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSocketReady: boolean;
  onSendMessage: (message: string, attachments?: ChatMessageAttachment[]) => void;
  onToggleCustomerInfo: () => void;
  sessionCost: number;
}

export function ChatInterface({
  sessionId,
  messages,
  isLoading,
  isSocketReady,
  onSendMessage,
  sessionCost,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Custom hooks
  const {
    attachments,
    isProcessingAttachments,
    getRootProps,
    getInputProps,
    isDragActive,
    handlePaste,
    removeAttachment,
    clearAttachments,
  } = useAttachments();

  const processedMessages = useChatMessages(messages);

  // Fetch user credits for validation
  const { data: credits, isLoading: isLoadingCredits } = useCredits();
  const { openModal } = useCreditsModal();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [processedMessages, isLoading]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!message.trim() && attachments.length === 0) || isLoading || !isSocketReady) return;

    if (isLoadingCredits) {
      toast.info("Checking credits...", { duration: 1000 });
      return;
    }

    if (!credits || credits <= 0) {
      toast.error("Insufficient credits", {
        description: "Please purchase more credits to continue chatting.",
        action: {
          label: "Add Credits",
          onClick: () => openModal(),
        },
      });
      return;
    }

    onSendMessage(message, attachments);
    setMessage("");
    clearAttachments();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRetry = (message: ChatMessage) => {
    let textContent = "";
    let messageAttachments: ChatMessageAttachment[] = [];

    if (typeof message.content === "string") {
      if (message.content.trim().startsWith("[") && message.content.trim().endsWith("]")) {
        try {
          const parsed = JSON.parse(message.content);
          if (Array.isArray(parsed)) {
            parsed.forEach((part: any) => {
              if (part.type === "text") textContent += part.text;
              if (part.type === "image" || part.type === "file") {
                messageAttachments.push({
                  type: part.type,
                  data: part.image || part.data,
                  mediaType: part.mediaType,
                  filename: part.filename,
                });
              }
            });
          }
        } catch {
          textContent = message.content;
        }
      } else {
        textContent = message.content;
      }
    } else if (Array.isArray(message.content)) {
      message.content.forEach((part: any) => {
        if (part.type === "text") textContent += part.text;
        if (part.type === "image" || part.type === "file") {
          messageAttachments.push({
            type: part.type,
            data: part.image || part.data,
            mediaType: part.mediaType,
            filename: part.filename,
          });
        }
      });
    }

    if (message.attachments && message.attachments.length > 0) {
      messageAttachments = [...messageAttachments, ...message.attachments];
    }

    queryClient.setQueryData(["messages", sessionId], (old: { messages: ChatMessage[] } | undefined) => {
      if (!old || !old.messages) return old;

      const messageId = message.id;
      // Check if the ID exists in the cache
      const existsInCache = old.messages.some((m) => m.id === messageId);

      if (existsInCache) {
        return {
          ...old,
          messages: old.messages.filter((m) => m.id !== messageId),
        };
      }

      // Fallback: Filter by timestamp and content if ID match fails
      // This handles cases where the message in cache might not have an ID or has a different one
      return {
        ...old,
        messages: old.messages.filter((m) => {
          const isSameTimestamp = m.timestamp === message.timestamp;
          const isSameRole = m.role === message.role;
          const isSameContent = JSON.stringify(m.content) === JSON.stringify(message.content);

          return !(isSameTimestamp && isSameRole && isSameContent);
        }),
      };
    });

    onSendMessage(textContent, messageAttachments);
  };

  const [isSessionLogOpen, setIsSessionLogOpen] = useState(false);
  const { data: sessionTransactions = [], isLoading: isLoadingLog } = useCreditTransactions(sessionId || undefined, {
    enabled: !!sessionId,
  });

  const tokenUsageDisplay = useMemo(() => {
    let currentMessagesInputTokens = 0;
    let currentMessagesOutputTokens = 0;
    let modelName = "N/A";

    processedMessages.forEach((msg) => {
      if (msg && msg.tokenUsage) {
        currentMessagesInputTokens += msg.tokenUsage.inputTokens;
        currentMessagesOutputTokens += msg.tokenUsage.outputTokens;
        if (msg.tokenUsage.modelName && msg.tokenUsage.modelName !== "N/A") {
          modelName = msg.tokenUsage.modelName;
        }
      }
    });
    const totalTokens = currentMessagesInputTokens + currentMessagesOutputTokens;

    let costDisplay = "0.00 Credits";
    if (sessionTransactions.length > 0) {
      const totalCredits = sessionTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      costDisplay = `${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Credits`;
    } else {
      const estimatedCredits = (sessionCost ?? 0) * PRICING_CONFIG.CREDITS_PER_USD;
      costDisplay = `${estimatedCredits.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Credits`;
    }

    return (
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <Typography variant="tiny">Model:</Typography>
          <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px]">{modelName}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Typography variant="tiny">Tokens:</Typography>
            <Typography variant="small" className="font-bold text-[10px]">{totalTokens.toLocaleString()}</Typography>
          </div>
          <div className="flex items-center gap-1.5">
            <Typography variant="tiny">Cost:</Typography>
            <Typography variant="small" className="font-bold text-[10px] text-brand-secondary">{costDisplay}</Typography>
          </div>
          <button onClick={() => setIsSessionLogOpen(true)} className="text-[10px] font-bold text-brand-primary hover:text-brand-secondary transition-colors uppercase tracking-wider">
            View Log
          </button>
        </div>
      </div>
    );
  }, [processedMessages, sessionCost, sessionTransactions]);

  return (
    <div className="flex flex-col h-full relative" {...getRootProps()}>
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-primary m-4 rounded-xl">
          <div className="text-center">
            <Paperclip className="w-12 h-12 mx-auto text-primary mb-2" />
            <p className="text-lg font-medium text-primary">Drop images here</p>
          </div>
        </div>
      )}
      <input {...getInputProps()} />

      {sessionId ? (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-white pt-4" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
              {processedMessages.length === 0 ? (
                <div className="text-center py-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare size={40} className="text-blue-500 opacity-50" />
                  </div>
                  <Typography variant="h3" className="mb-2">
                    {isLoading ? "Spinning up sandbox..." : "Ready to Model"}
                  </Typography>
                  <Typography variant="muted" className="mb-8 max-w-[280px] mx-auto">
                    {isLoading 
                      ? "Please wait while the AI agent initializes the secure container environment."
                      : "Describe what you want to build (e.g., 'A customized mounting bracket' or 'A hexagonal pen cup') to start modeling."}
                  </Typography>
                  <div className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <Badge variant="brand" className="px-4 py-2 gap-2 h-auto text-sm">
                        <Loader2 size={18} className="animate-spin" />
                        Initializing Sandbox...
                      </Badge>
                    ) : (
                      <Button
                        onClick={() =>
                          onSendMessage("Design a mounting bracket for a 2020 V-slot extrusion with a 5mm hole and 3mm fillets.")
                        }
                        variant="brand"
                        className="h-12 px-8 rounded-xl"
                      >
                        Try a Bracket Design
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {processedMessages.map((msg, index) => (
                    <LatticeChatMessage
                      key={msg.id}
                      message={msg}
                      onImageClick={setSelectedImage}
                      onRetry={handleRetry}
                      isLastMessage={index === processedMessages.length - 1}
                      isLoading={isLoading}
                    />
                  ))}
                  {isLoading &&
                    !(
                      processedMessages.length > 0 &&
                      processedMessages[processedMessages.length - 1].type === "grouped-tool" &&
                      (processedMessages[processedMessages.length - 1] as any).status === "pending"
                    ) && (
                      <ProgressiveThinking />
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-background/95 backdrop-blur-sm">
            {tokenUsageDisplay}

            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto py-2">
                {attachments.map((att, index) => (
                  <div key={index} className="relative group flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                      {att.mediaType.startsWith("image/") && (
                        <img
                          src={`data:${att.mediaType};base64,${att.data}`}
                          alt={att.filename}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    <div className="text-[10px] truncate max-w-[64px] mt-1 text-center text-muted-foreground">
                      {att.filename}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-start space-x-2">
              <div className="relative flex-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    isProcessingAttachments
                      ? "Processing image..."
                      : isSocketReady
                        ? "Describe your 3D design concept (paste or drag reference images)"
                        : "Connecting..."
                  }
                  className="w-full bg-muted/50 min-h-[80px] max-h-48 resize-none"
                  rows={2}
                  disabled={isLoading || !isSocketReady || isProcessingAttachments}
                />
                {isProcessingAttachments && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-md">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Optimizing image...</span>
                    </div>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                size="icon"
                variant="brand"
                className="rounded-xl h-11 w-11 flex-shrink-0 shadow-lg shadow-blue-500/20"
                disabled={
                  isLoading ||
                  (!message.trim() && attachments.length === 0) ||
                  !isSocketReady ||
                  isProcessingAttachments
                }
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col p-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <MessageSquare size={24} className="text-muted-foreground" />
          </div>
          <p className="text-center">Select or create a design session to start modeling</p>
        </div>
      )}

      {/* Session Log Dialog */}
      <Dialog open={isSessionLogOpen} onOpenChange={setIsSessionLogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Cost Log</DialogTitle>
            <DialogDescription>Detailed breakdown of credit usage for this session.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoadingLog ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sessionTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions found for this session.</p>
            ) : (
              <Table>
                <TableHeader className="sticky top-0">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">{new Date(tx.createdAt).toLocaleTimeString()}</TableCell>
                      <TableCell>{tx.description || "Usage"}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {Math.abs(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-1 bg-transparent border-none shadow-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Full size preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
