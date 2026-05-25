"use client";

import { useMemo } from "react";
import { ChatMessage } from "@lattice/shared/types";
import { cn } from "@lattice/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, AlertCircle } from "lucide-react";
import { ToolExecutionMessage, type ToolMessage } from "./tool-message";

interface LatticeChatMessageProps {
  message: ChatMessage;
  onImageClick: (src: string) => void;
  onRetry: (message: ChatMessage) => void;
  isLastMessage: boolean;
  isLoading: boolean;
}

export function LatticeChatMessage({
  message,
  onImageClick,
  onRetry,
  isLastMessage,
  isLoading,
}: LatticeChatMessageProps) {
  const isOutgoing = message.role === "user";

  const contentToRender = useMemo(() => {
    const contentArray = message.content;

    if (Array.isArray(contentArray)) {
      const hasRenderableParts = contentArray.some(
        (part) => part.type === "text" || part.type === "image" || part.type === "file"
      );

      if (hasRenderableParts) {
        return (
          <div className="space-y-2">
            {contentArray.map((part, i) => {
              const partRecord = part as unknown as Record<string, unknown>;
              if (part.type === "text" && part.text) {
                return (
                  <div key={i} className="break-words [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:mb-4 [&>ol]:mb-4 [&>ul:last-child]:mb-0 [&>ol:last-child]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                  </div>
                );
              }
              if (part.type === "image" || part.type === "file") {
                const src = partRecord.image || partRecord.data;
                if (!src) return null;

                const mimeType = (partRecord.mediaType as string) || "image/jpeg";
                const dataUrl = typeof src === "string" && src.startsWith("data:") ? src : `data:${mimeType};base64,${src}`;

                return (
                  <div key={i} className="mt-2">
                    <img
                      src={dataUrl}
                      alt="attachment"
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: "200px" }}
                      onClick={() => onImageClick(dataUrl)}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }
    } else if (typeof contentArray === "string" && contentArray.trim().startsWith("[") && contentArray.trim().endsWith("]")) {
      try {
        const parsed = JSON.parse(contentArray);
        if (Array.isArray(parsed)) {
          const hasRenderableParts = parsed.some(
            (part: Record<string, unknown>) => part.type === "text" || part.type === "image" || part.type === "file"
          );

          if (hasRenderableParts) {
            return (
              <div className="space-y-2">
                {parsed.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <div key={i} className="break-words [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:mb-4 [&>ol]:mb-4 [&>ul:last-child]:mb-0 [&>ol:last-child]:mb-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                      </div>
                    );
                  }
                  if (part.type === "image" || part.type === "file") {
                    const src = part.image || part.data;
                    if (!src) return null;

                    const mimeType = part.mediaType || "image/jpeg";
                    const dataUrl = typeof src === "string" && src.startsWith("data:") ? src : `data:${mimeType};base64,${src}`;

                    return (
                      <div key={i} className="mt-2">
                        <img
                          src={dataUrl}
                          alt="attachment"
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: "200px" }}
                          onClick={() => onImageClick(dataUrl)}
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            );
          }
        }
      } catch {
        // Not JSON, fall through to string rendering
      }
    }

    // Fallback for simple string content
    const stringContent = typeof message.content === 'string' ? message.content : '';
    if (!stringContent || stringContent.trim() === '') {
      return null;
    }

    return (
      <div className="break-words [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:mb-4 [&>ol]:mb-4 [&>ul:last-child]:mb-0 [&>ol:last-child]:mb-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{stringContent}</ReactMarkdown>
      </div>
    );
  }, [message.content, onImageClick]);

  if (message.type === "grouped-tool") {
    return <ToolExecutionMessage toolCall={message.toolCall as ToolMessage} toolResult={message.toolResult as ToolMessage | null} status={message.status as "pending" | "complete"} />;
  }

  // Don't render empty messages unless they have attachments
  if (!contentToRender && (!message.attachments || message.attachments.length === 0)) {
    return null;
  }

  return (
    <div className={cn("flex w-full mb-4", isOutgoing ? "justify-end" : "justify-start")}>
      <div className="flex items-end max-w-[85%] gap-2">
        {/* Retry Button - Only for last user message if not loading */}
        {isOutgoing && isLastMessage && !isLoading && (
          <button
            onClick={() => onRetry(message)}
            className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-muted mb-1"
            title="Retry message"
          >
            <RefreshCw size={14} />
          </button>
        )}

        {/* Error Icon - If message status is failed */}
        {message.status === "failed" && (
          <div className="text-destructive mb-2" title="Message failed to send">
            <AlertCircle size={16} />
          </div>
        )}

        <div
          className={cn(
            "px-4 py-3 shadow-sm relative group",
            isOutgoing
              ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
              : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm"
          )}
        >
          {contentToRender}

          {/* Render top-level attachments if any (legacy support) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((att, i) => (
                <div key={i}>
                  {att.type === "image" && (
                    <img
                      src={`data:${att.mediaType};base64,${att.data}`}
                      alt={att.filename}
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: "200px" }}
                      onClick={() => onImageClick(`data:${att.mediaType};base64,${att.data}`)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div
            className={cn(
              "text-[9px] mt-1.5 flex opacity-60",
              isOutgoing ? "justify-end text-primary-foreground" : "justify-start text-muted-foreground"
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  );
}
