import { Youtube, PlayCircle } from "lucide-react";

interface AnalysisFormProps {
  youtubeUrl: string;
  isProcessing: boolean;
  progress: string;
  onUrlChange: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAbort: () => void;
}

export default function AnalysisForm({
  youtubeUrl,
  isProcessing,
  progress,
  onUrlChange,
  onSubmit,
  onAbort,
}: AnalysisFormProps) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-card border border-border rounded-xl p-8 shadow-lg relative overflow-hidden transition-all duration-500">
        <form onSubmit={onSubmit} className="relative z-10 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="youtube-url"
              className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1"
            >
              YouTube Video URL
            </label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Youtube className="h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
              </div>
              <input
                id="youtube-url"
                type="url"
                placeholder="Paste a public YouTube link..."
                className="w-full pl-12 pr-4 py-4 bg-input/20 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground outline-none transition-all shadow-inner text-lg font-mono"
                value={youtubeUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                disabled={isProcessing}
              />
              <p className="mt-2 text-xs text-muted-foreground font-mono">
                We download the full video server-side and sample it at 1 frame
                per second.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isProcessing || !youtubeUrl}
              className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg tracking-wide shadow-md transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2
                   ${
                     isProcessing || !youtubeUrl
                       ? "bg-muted text-muted-foreground cursor-not-allowed"
                       : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                   }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  <span>Analyze Video</span>
                </>
              )}
            </button>

            {isProcessing && (
              <button
                type="button"
                onClick={onAbort}
                className="px-6 py-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-bold hover:bg-destructive/20 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </form>

        {/* Progress Indicator */}
        {isProcessing && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs font-medium text-primary">
              <span>Status</span>
              <span className="animate-pulse font-mono">{progress}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{
                  width: progress.includes("%")
                    ? progress.split(":")[1]
                    : "100%",
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
