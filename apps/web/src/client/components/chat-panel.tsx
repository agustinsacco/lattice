"use client";

import { Card, ScrollArea, Input, Button } from "@lattice/ui";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

const ChatPanel = ({ messages, isLoading, onSendMessage }: ChatPanelProps) => {
  return (
    <Card className="flex-1 p-4 flex flex-col">
      <ScrollArea className="flex-1 mb-4">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-muted-foreground text-center">Start chatting!</div>
          ) : (
            messages.map((msg: ChatMessage, index: number) => (
              <div
                key={index}
                className={`p-2 rounded-lg ${
                  msg.role === "user" ? "bg-blue-500 text-white self-end" : "bg-gray-200 text-gray-800 self-start"
                }`}
              >
                <strong>{msg.role === "user" ? "You" : "Agent"}:</strong> {msg.content}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Type your message..."
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              onSendMessage(e.currentTarget.value);
              e.currentTarget.value = "";
            }
          }}
        />
        <Button onClick={() => onSendMessage("Simulated message")}>Send</Button>
      </div>
      {isLoading && <div className="text-sm text-muted-foreground mt-2">Agent is typing...</div>}
    </Card>
  );
};

export default ChatPanel;
