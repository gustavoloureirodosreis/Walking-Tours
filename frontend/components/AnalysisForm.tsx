import UploadZone from "@/components/UploadZone";

interface AnalysisFormProps {
  isProcessing: boolean;
  progress: string;
  selectedFileName?: string | null;
  onUpload: (file: File) => void;
  onAbort: () => void;
}

export default function AnalysisForm({
  isProcessing,
  progress,
  selectedFileName,
  onUpload,
  onAbort,
}: AnalysisFormProps) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-card border border-border rounded-xl p-8 shadow-lg space-y-8">
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Upload a Local Video
          </p>
          <p className="text-sm text-muted-foreground">
            We sample the video at{" "}
            <span className="font-semibold">1 frame per second</span> (up to 10
            minutes / 600 frames) and run each frame through Roboflow Rapid.
            Supported formats: MP4, MOV, WEBM, AVI.
          </p>
          {selectedFileName && (
            <p className="text-xs font-mono text-muted-foreground">
              Selected file: {selectedFileName}
            </p>
          )}
        </div>

        <UploadZone onUpload={onUpload} isUploading={isProcessing} />

        <div className="space-y-4">
          {isProcessing && (
            <div className="bg-muted/40 px-4 py-3 rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-medium text-primary">
                <span>Status</span>
                <span className="animate-pulse font-mono">{progress}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300 ease-out w-full" />
              </div>
            </div>
          )}

          {isProcessing && (
            <button
              type="button"
              onClick={onAbort}
              className="w-full px-4 py-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-bold hover:bg-destructive/20 transition-colors"
            >
              Stop Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
