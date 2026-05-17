import React from "react";
import { FileText, X } from "lucide-react";
import type { ChatMessageAttachment } from "@/common/types";

interface AttachmentPreviewProps {
  attachment: File | ChatMessageAttachment;
  onRemove?: (filename: string) => void;
  isInteractive?: boolean; // For previews in the input area
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment, onRemove, isInteractive = false }) => {
  const isFile = (att: File | ChatMessageAttachment): att is File => {
    return (att as File).lastModified !== undefined;
  };

  const mediaType = isFile(attachment) ? attachment.type : attachment.mediaType;
  const filename = isFile(attachment) ? attachment.name : attachment.filename;
  const src = isFile(attachment)
    ? URL.createObjectURL(attachment)
    : `data:${attachment.mediaType};base64,${attachment.data}`;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (isFile(attachment)) {
      URL.revokeObjectURL(e.currentTarget.src);
    }
  };

  return (
    <div className="relative group h-[40px] w-[40px] rounded-md overflow-hidden bg-muted/50 flex items-center justify-center">
      {mediaType.startsWith("image/") ? (
        <img src={src} alt={filename} className="h-full w-full object-cover" onLoad={handleImageLoad} />
      ) : (
        <FileText className="h-5 w-5 text-muted-foreground" />
      )}
      {isInteractive && onRemove && (
        <button
          onClick={() => onRemove(filename!)}
          className="absolute -top-1 -right-1 bg-black text-white rounded-full h-4 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default AttachmentPreview;
