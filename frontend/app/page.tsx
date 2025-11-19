"use client";

import { useState, useRef, useEffect } from "react";
import StatsCards from "@/components/StatsCards";
import CrowdDensityChart from "@/components/CrowdDensityChart";
import { Activity, Youtube, PlayCircle, AlertCircle } from "lucide-react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AnalysisResult {
  timestamp: number;
  count: number;
}

export default function Home() {
  const [data, setData] = useState<AnalysisResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [progress, setProgress] = useState<string>("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      setProgress("");
      setError("Analysis cancelled by user.");
    }
  };

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl) return;

    setIsProcessing(true);
    setError(null);
    setData(null);
    setProgress("Initializing analysis...");

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let vidId = "";
    try {
      const urlObj = new URL(youtubeUrl);
      if (urlObj.hostname.includes("youtube.com")) {
        vidId = urlObj.searchParams.get("v") || "";
      } else if (urlObj.hostname.includes("youtu.be")) {
        vidId = urlObj.pathname.slice(1);
      }
      setVideoId(vidId);
    } catch (e) {
      console.error("Invalid URL", e);
    }

    try {
      const response = await fetch(
        "http://localhost:8000/analyze_youtube_stream",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: youtubeUrl }),
          signal: abortController.signal,
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Analysis failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.status === "hashing") setProgress("Preparing video...");
            if (event.status === "checking_url")
              setProgress("Verifying video availability...");
            if (event.status === "downloading")
              setProgress("Downloading video...");
            if (event.status === "cached") setProgress("Loading from cache...");
            if (event.status === "analyzing") {
              setProgress(`Processing: ${event.progress}%`);
            }
            if (event.status === "complete") {
              setData(event.data);
              setProgress("");
            }
            if (event.status === "error") {
              throw new Error(event.error);
            }
          } catch (e) {
            console.error("Error parsing stream", e);
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Request aborted");
      } else {
        setError(err.message || "Failed to analyze YouTube video.");
        console.error(err);
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        setIsProcessing(false);
      }
    }
  };

  const handleChartSeek = (timestamp: number) => {
    const player = playerRef.current;
    if (!player || typeof player.seekTo !== "function") {
      console.warn("Video player not ready for seeking");
      return;
    }
    player.seekTo(timestamp, true);
  };

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
  };

  const getStats = () => {
    if (!data || data.length === 0) return null;

    const counts = data.map((d) => d.count);
    const maxCount = Math.max(...counts);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const peakIndex = counts.indexOf(maxCount);
    const peakTimeData = data[peakIndex];
    const duration = data[data.length - 1].timestamp;

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return {
      maxCount,
      avgCount,
      peakTime: formatTime(peakTimeData.timestamp),
      duration: formatTime(duration),
    };
  };

  const stats = getStats();

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
            Real-time AI crowd density analysis powered by{" "}
            <span className="text-primary font-bold">Roboflow Inference</span>{" "}
            using a{" "}
            <span className="text-primary font-bold">People Detection</span>{" "}
            model.
          </p>
        </header>

        {/* Input Section */}
        <div className="max-w-3xl mx-auto w-full">
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg relative overflow-hidden transition-all duration-500">
            <form
              onSubmit={handleYoutubeSubmit}
              className="relative z-10 space-y-6"
            >
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
                    placeholder="Paste YouTube link here..."
                    className="w-full pl-12 pr-4 py-4 bg-input/20 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground outline-none transition-all shadow-inner text-lg font-mono"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={isProcessing}
                  />
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
                      <span>Run Analysis</span>
                    </>
                  )}
                </button>

                {isProcessing && (
                  <button
                    type="button"
                    onClick={handleAbort}
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

        {/* Dashboard Grid */}
        {data && stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <StatsCards {...stats} />

            <div className="grid lg:grid-cols-3 gap-8 h-[500px]">
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-lg">
                <CrowdDensityChart data={data} onSeek={handleChartSeek} />
              </div>

              {/* Video Player */}
              <div className="lg:col-span-1 bg-black rounded-xl overflow-hidden shadow-lg border border-border relative group">
                {videoId ? (
                  <YouTube
                    videoId={videoId}
                    opts={{
                      height: "100%",
                      width: "100%",
                      playerVars: {
                        autoplay: 0,
                        controls: 1,
                        modestbranding: 1,
                        rel: 0,
                      },
                    }}
                    className="absolute inset-0 w-full h-full"
                    onReady={onPlayerReady}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground font-mono">
                    No Video Loaded
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
