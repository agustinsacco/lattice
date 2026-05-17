"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/client/components/ui/button";
import { supabase } from "@/client/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, Save } from "lucide-react";
import { useAuth } from "@/client/hooks/use-auth";

export function SignaturePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.user_metadata?.signature_url) {
      // Load existing signature if available
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          setHasSignature(true);
        };
        img.src = user.user_metadata.signature_url;
      }
    }
  }, [user]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.closePath();
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsLoading(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");

      // Save to user metadata
      const { error } = await supabase.auth.updateUser({
        data: { signature_url: dataUrl },
      });

      if (error) throw error;

      toast.success("Signature saved successfully");
    } catch (error) {
      console.error("Error saving signature:", error);
      toast.error("Failed to save signature");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-xl p-4 bg-white shadow-sm inline-block">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="border border-gray-200 rounded-lg cursor-crosshair touch-none bg-gray-50"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={clearSignature}
          disabled={isLoading}
          className="rounded-xl border-2 border-gray-200 hover:border-gray-900 font-sans"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
        <Button
          onClick={saveSignature}
          disabled={!hasSignature || isLoading}
          className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-xl shadow-lg shadow-yellow-400/20 hover:scale-105 transition-all duration-300 font-sans font-medium"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Signature
        </Button>
      </div>
      <p className="text-xs text-gray-500">Sign above. This signature can be used to sign documents.</p>
    </div>
  );
}
