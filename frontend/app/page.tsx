"use client";

import { useState } from "react";
import { Activity, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import StatsCards from "@/components/StatsCards";
import CrowdDensityChart from "@/components/CrowdDensityChart";
import AnalysisForm from "@/components/AnalysisForm";
import { DetectionPreview } from "@/components/DetectionPreview";
import { useVideoAnalysis } from "@/hooks/useVideoAnalysis";
import { calculateStats } from "@/lib/stats";

export default function Home() {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const { data, isProcessing, error, progress, analyzeVideo, abortAnalysis } =
    useVideoAnalysis();

  const handleUpload = async (file: File) => {
    setSelectedFileName(file.name);
    await analyzeVideo(file);
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
            Upload any local video and we will sample{" "}
            <span className="text-primary font-bold">1 frame per second</span>{" "}
            to track <span className="text-primary font-bold">men</span> vs.{" "}
            <span className="text-primary font-bold">women</span> counts—no GPU
            or SAM installation required.
          </p>
        </header>

        {/* Analysis Form */}
        <AnalysisForm
          isProcessing={isProcessing}
          progress={progress}
          selectedFileName={selectedFileName}
          onUpload={handleUpload}
          onAbort={abortAnalysis}
        />

        {/* Error Display */}
        {error && (
          <div className="max-w-3xl mx-auto p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-4 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 opacity-80" />
              <span className="text-lg">{error}</span>
              <p className="text-sm opacity-70 font-normal">
                Please try a different video file.
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
                <CrowdDensityChart data={data} />
              </div>

              <div className="lg:col-span-1">
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
