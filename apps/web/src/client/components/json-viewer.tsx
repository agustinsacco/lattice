"use client";

import React from "react";

interface JsonViewerProps {
  data: unknown;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  const formattedJson = JSON.stringify(data, null, 2);

  return (
    <pre className="bg-muted/50 p-3 rounded-md text-xs text-left whitespace-pre-wrap break-all">
      <code>{formattedJson}</code>
    </pre>
  );
};

export default JsonViewer;
