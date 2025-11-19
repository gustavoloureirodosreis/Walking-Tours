"use client";

import { useState, useRef, useEffect } from "react";
import StatsCards from "@/components/StatsCards";
import CrowdDensityChart from "@/components/CrowdDensityChart";
import { Activity, Youtube, PlayCircle } from "lucide-react";
import YouTube, { YouTubeEvent } from "react-youtube";

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
  const playerRef = useRef<YouTube | null>(null);
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

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Extract Video ID
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
            console.log("Event:", event); // Debug log

            if (event.status === "hashing") setProgress("Checking cache...");
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
      // Only set processing to false if we didn't abort (abort handles its own state)
      if (abortControllerRef.current === abortController) {
        setIsProcessing(false);
      }
    }
  };

  // Chart Click Handler
  const onChartClick = (data: any) => {
    if (data && data.activePayload && playerRef.current) {
      const timestamp = data.activePayload[0].payload.timestamp;
      // seekTo expects seconds
      playerRef.current.internalPlayer.seekTo(timestamp, true);
    }
  };

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
  };

  // Calculate stats from data
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
    <main className="min-h-screen bg-slate-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8 space-y-12">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-4 pt-12">
          <div className="p-4 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl mb-4">
            <Activity className="w-12 h-12 text-purple-400" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent pb-2">
            Crowd Flow Analytics
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Real-time AI crowd density analysis powered by{" "}
            <span className="text-white font-semibold">Roboflow Inference</span>{" "}
            & <span className="text-white font-semibold">YOLO11</span>.
          </p>
        </header>

        {/* Input Section */}
        <div className="max-w-3xl mx-auto w-full">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <form
              onSubmit={handleYoutubeSubmit}
              className="relative z-10 space-y-6"
            >
              <div className="space-y-2">
                <label
                  htmlFor="youtube-url"
                  className="text-sm font-bold text-slate-300 uppercase tracking-wider ml-1"
                >
                  YouTube Video URL
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Youtube className="h-5 w-5 text-slate-500 group-focus-within/input:text-red-500 transition-colors" />
                  </div>
                  <input
                    id="youtube-url"
                    type="url"
                    placeholder="Paste YouTube link here (e.g. https://youtube.com/watch?v=...)"
                    className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 outline-none transition-all shadow-inner text-lg"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !youtubeUrl}
                className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg tracking-wide shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                    ${
                      isProcessing || !youtubeUrl
                        ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-500/25"
                    }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                  className="px-6 py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition-colors"
                >
                  Stop
                </button>
              )}
            </form>

            {/* Progress Indicator */}
            {isProcessing && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs font-medium text-purple-300">
                  <span>Status</span>
                  <span className="animate-pulse text-white">{progress}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300 ease-out"
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
          <div className="max-w-3xl mx-auto p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-4">
            {error}
          </div>
        )}

        {/* Dashboard Grid */}
        {data && stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <StatsCards {...stats} />

            <div className="grid lg:grid-cols-3 gap-8 h-[500px]">
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                <CrowdDensityChart data={data} onClick={onChartClick} />
              </div>

              {/* Video Player */}
              <div className="lg:col-span-1 bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group">
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
                  <div className="flex items-center justify-center h-full text-slate-500">
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
