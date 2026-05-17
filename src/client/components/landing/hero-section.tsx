"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfDropzone from "@/client/components/pdf-dropzone";

export function HeroSection() {
  const router = useRouter();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        return router.push("/login");
      }

      if (!response.ok) {
        throw new Error("Failed to upload PDF");
      }

      const { sessionId } = await response.json();

      // Redirect to session page
      router.push(`/session/${sessionId}`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-10 space-y-4">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 tracking-tight">
          Start a new{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600">
            conversation
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload a PDF to get started. Our AI will analyze it and help you fill it out in seconds.
        </p>
      </div>

      <PdfDropzone onFileUpload={handleFileUpload} uploadError={uploadError} isLoading={isLoading} />

      <p className="text-xs text-center mt-8 text-gray-400">
        By uploading a PDF, you agree to our{" "}
        <a href="#" className="underline hover:text-gray-900 transition-colors">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline hover:text-gray-900 transition-colors">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
