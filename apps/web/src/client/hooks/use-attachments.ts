"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { ChatMessageAttachment } from "@lattice/shared/types";

export function useAttachments() {
  const [attachments, setAttachments] = useState<ChatMessageAttachment[]>([]);
  const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);

  const optimizeImage = async (file: File): Promise<{ data: string; mediaType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      reader.onerror = reject;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as JPEG with 0.8 quality
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          const base64Data = dataUrl.split(",")[1];
          resolve({ data: base64Data, mediaType: "image/jpeg" });
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };

      img.onerror = reject;

      reader.readAsDataURL(file);
    });
  };

  const processFile = useCallback(async (file: File) => {
    setIsProcessingAttachments(true);
    try {
      if (file.type.startsWith("image/")) {
        const { data, mediaType } = await optimizeImage(file);
        const attachment: ChatMessageAttachment = {
          type: "image",
          data,
          mediaType,
          filename: file.name,
        };
        setAttachments((prev) => [...prev, attachment]);
      } else {
        toast.error("Only image attachments are supported");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file");
    } finally {
      setIsProcessingAttachments(false);
    }
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(processFile);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/*": [],
    },
  });

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
          }
        }
      }
    },
    [processFile]
  );

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  return {
    attachments,
    isProcessingAttachments,
    getRootProps,
    getInputProps,
    isDragActive,
    handlePaste,
    removeAttachment,
    clearAttachments,
  };
}
