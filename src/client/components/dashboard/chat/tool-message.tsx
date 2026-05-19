"use client";

import { Loader2, CheckCircle2, Wrench, FileText, BrainCircuit } from "lucide-react";
import { ChatMessage } from "@/common/types";

interface ToolMessage extends ChatMessage {
  toolName: string;
  toolInput?: unknown;
  toolOutput?: unknown;
}

const toolDisplayConfig: { [key: string]: { label: string; activeLabel: string; icon: any } } = {
  write_file: { 
    label: "Generated CAD code", 
    activeLabel: "Writing Python design code...", 
    icon: Wrench 
  },
  view_file: { 
    label: "Inspected design code", 
    activeLabel: "Reading design file...", 
    icon: FileText 
  },
  bash: { 
    label: "Rendered 3D geometry", 
    activeLabel: "Executing CAD engine...", 
    icon: BrainCircuit 
  },
  run_command: { 
    label: "Executed design test", 
    activeLabel: "Running validation tests...", 
    icon: BrainCircuit 
  },
};

interface ToolExecutionMessageProps {
  toolCall: ToolMessage;
  toolResult: ToolMessage | null;
  status?: "pending" | "complete";
}

export function ToolExecutionMessage({ toolCall, toolResult, status = "complete" }: ToolExecutionMessageProps) {
  const toolName = toolCall.toolName || "unknown";
  const config = toolDisplayConfig[toolName] || { 
    label: `Ran tool: ${toolName}`, 
    activeLabel: `Running tool: ${toolName}...`, 
    icon: Wrench 
  };
  
  const isPending = status === "pending" || !toolResult;

  return (
    <div className="flex justify-start w-full my-2">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-300 ${
        isPending 
          ? "bg-blue-50/80 border-blue-200 text-blue-800 shadow-sm" 
          : "bg-gray-50 border-gray-100 text-gray-500"
      }`}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500 opacity-80" />
        )}
        <span>{isPending ? config.activeLabel : config.label}</span>
      </div>
    </div>
  );
}
