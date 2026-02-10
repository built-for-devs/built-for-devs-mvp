"use client";

interface ClarityFlowEmbedProps {
  embedUrl: string;
}

export function ClarityFlowEmbed({ embedUrl }: ClarityFlowEmbedProps) {
  return (
    <div>
      <iframe
        src={embedUrl}
        style={{ width: "100%", minHeight: "500px", border: "none" }}
        allow="camera; microphone; display-capture"
      />
    </div>
  );
}
