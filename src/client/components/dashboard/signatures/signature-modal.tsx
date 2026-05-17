"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { useSignatures } from "@/client/hooks/use-signatures";
import { Trash2, Plus, Loader2 } from "lucide-react";

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignatureModal({ open, onOpenChange }: SignatureModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("My Signature");
  const sigPad = useRef<SignatureCanvas>(null);
  const { signatures, isLoading, createSignature, deleteSignature } = useSignatures();

  const handleSave = () => {
    if (sigPad.current?.isEmpty()) return;
    
    const imageData = sigPad.current?.getTrimmedCanvas().toDataURL("image/png");
    if (imageData) {
      createSignature.mutate({ name, imageData }, {
        onSuccess: () => {
          setIsCreating(false);
          setName("My Signature");
        }
      });
    }
  };

  const handleClear = () => {
    sigPad.current?.clear();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Signatures</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isCreating ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="group relative border rounded-xl p-4 bg-gray-50 hover:bg-white hover:border-yellow-400 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center min-h-[120px]"
                  >
                    <img
                      src={sig.image_data}
                      alt={sig.name}
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSignature.mutate(sig.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-2 truncate w-full text-center">
                      {sig.name}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => setIsCreating(true)}
                  className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-yellow-500 hover:border-yellow-400 hover:bg-yellow-50 transition-all min-h-[120px]"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Add New</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-medium">Signature Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Official Signature"
                />
              </div>
              <div className="border rounded-xl bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigPad}
                  penColor="black"
                  canvasProps={{
                    className: "w-full h-48 cursor-crosshair",
                  }}
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleClear}>
                  Clear
                </Button>
                <div className="space-x-2">
                  <Button variant="ghost" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={createSignature.isPending}
                    className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold"
                  >
                    {createSignature.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save Signature"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
