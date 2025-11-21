"use client";

import { useState, useRef } from "react";
import { Activity, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import StatsCards from "@/components/StatsCards";
import CrowdDensityChart from "@/components/CrowdDensityChart";
import AnalysisForm from "@/components/AnalysisForm";
import VideoPlayer, { VideoPlayerHandle } from "@/components/VideoPlayer";
import { DetectionPreview } from "@/components/DetectionPreview";
import { useVideoAnalysis } from "@/hooks/useVideoAnalysis";
import { extractVideoId } from "@/lib/youtube";
import { calculateStats } from "@/lib/stats";

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);

  const { data, isProcessing, error, progress, analyzeVideo, abortAnalysis } =
    useVideoAnalysis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedUrl = youtubeUrl.trim();
    if (!sanitizedUrl) return;

    const vidId = extractVideoId(sanitizedUrl);
    setVideoId(vidId);

    await analyzeVideo(sanitizedUrl);
  };

  const handleChartSeek = (timestamp: number) => {
    videoPlayerRef.current?.seekTo(timestamp);
  };

  const stats = data ? calculateStats(data) : null;
  const latestResult = data?.[0] ?? null;

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground transition-colors duration-300">
      <div className="relative z-10 max-w-7xl mx-auto p-8 space-y-12">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-4 pt-12 relative">
          <div className="absolute top-0 right-0 md:top-4 md:right-4 z-50">
            <ThemeToggle />
          </div>

          <div className="p-4 bg-card/50 backdrop-blur-sm rounded-2xl border border-border shadow-sm mb-4">
            <Activity className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-foreground pb-2">
            Crowd Flow Analytics
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl font-sans">
            Real-time crowd analytics powered by{" "}
            <span className="text-primary font-bold">Roboflow Rapid</span>.
            Paste a public YouTube link and we will download the full video,
            sample 1 frame every second, and track{" "}
            <span className="text-primary font-bold">men</span> vs.{" "}
            <span className="text-primary font-bold">women</span> counts without
            running SAM locally.
          </p>
        </header>

        {/* Analysis Form */}
        <AnalysisForm
          youtubeUrl={youtubeUrl}
          isProcessing={isProcessing}
          progress={progress}
          onUrlChange={setYoutubeUrl}
          onSubmit={handleSubmit}
          onAbort={abortAnalysis}
        />

        {/* Error Display */}
        {error && (
          <div className="max-w-3xl mx-auto p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-4 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 opacity-80" />
              <span className="text-lg">{error}</span>
              <p className="text-sm opacity-70 font-normal">
                Please try a different public YouTube video link.
              </p>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {data && stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <StatsCards {...stats} />

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-lg h-[500px]">
                <CrowdDensityChart data={data} onSeek={handleChartSeek} />
              </div>

              <div className="flex flex-col gap-6 lg:col-span-1">
                <div className="h-[260px]">
                  <VideoPlayer ref={videoPlayerRef} videoId={videoId} />
                </div>
                <DetectionPreview
                  result={latestResult}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
