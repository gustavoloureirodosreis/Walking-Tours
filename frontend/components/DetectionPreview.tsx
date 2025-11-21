"use client";

import Link from "next/link";

import type { AnalysisResult } from "@/lib/stats";

interface DetectionPreviewProps {
  result: AnalysisResult | null;
  isProcessing: boolean;
}

export function DetectionPreview({
  result,
  isProcessing,
}: DetectionPreviewProps) {
  const frame = result?.frame;
  const previewSrc = frame?.annotatedImage || frame?.sourceImageUrl || null;
  const detections = frame?.detections ?? [];
  const canOpenSource =
    typeof frame?.sourceImageUrl === "string" &&
    frame.sourceImageUrl.startsWith("http");

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold text-card-foreground">
          Detection Preview
        </h3>
        {canOpenSource && frame?.sourceImageUrl && (
          <Link
            href={frame.sourceImageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-primary hover:underline"
          >
            Open source frame
          </Link>
        )}
      </div>

      <div className="relative w-full aspect-video overflow-hidden rounded-lg border border-border bg-muted/30 flex items-center justify-center">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt="Roboflow detection preview"
            className="absolute inset-0 h-full w-full object-contain bg-black/70"
          />
        ) : (
          <div className="text-sm text-muted-foreground text-center px-6">
            {isProcessing
              ? "Creating annotated frame…"
              : "Run an analysis to see the annotated frame returned by Roboflow Rapid."}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Top detections
        </p>
        {detections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isProcessing
              ? "Awaiting detections…"
              : "No detections were returned for this frame."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detections.slice(0, 6).map((det) => (
              <span
                key={det.detection_id ?? `${det.class}-${det.x}-${det.y}`}
                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono"
              >
                {det.class ?? "unknown"}
                {typeof det.confidence === "number"
                  ? ` ${(det.confidence * 100).toFixed(0)}%`
                  : ""}
              </span>
            ))}
            {detections.length > 6 && (
              <span className="px-3 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground">
                +{detections.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
