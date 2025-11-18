"use client";

import { useState } from "react";
import UploadZone from "@/components/UploadZone";
import StatsCards from "@/components/StatsCards";
import CrowdDensityChart from "@/components/CrowdDensityChart";
import { Activity, Youtube } from "lucide-react";

interface AnalysisResult {
  timestamp: number;
  count: number;
}

export default function Home() {
  const [data, setData] = useState<AnalysisResult[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/analyze_video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Failed to analyze video. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl) return;

    setIsUploading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("http://localhost:8000/analyze_youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Failed to analyze YouTube video. Please check the URL.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
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
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-12">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Crowd Density Analytics
            </h1>
            <p className="text-gray-500 mt-1">
              Powered by Roboflow Inference & YOLO11
            </p>
          </div>
        </div>

        {/* Upload & Input Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Video Upload */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Upload Video File
            </h2>
            <UploadZone onUpload={handleUpload} isUploading={isUploading} />
          </div>

          {/* YouTube Input */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8 flex flex-col justify-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Youtube className="text-red-600" /> Analyze YouTube Video
            </h2>
            <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="youtube-url"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Video URL
                </label>
                <input
                  id="youtube-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <button
                type="submit"
                disabled={isUploading || !youtubeUrl}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all
                   ${
                     isUploading || !youtubeUrl
                       ? "bg-gray-300 cursor-not-allowed"
                       : "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100"
                   }`}
              >
                {isUploading ? "Processing..." : "Analyze YouTube Video"}
              </button>
            </form>
            <div className="mt-6 text-xs text-gray-400 text-center">
              Downloads and analyzes video automatically. Caches results to save
              credits.
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Dashboard */}
        {data && stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <StatsCards {...stats} />
            <CrowdDensityChart data={data} />
          </div>
        )}
      </div>
    </main>
  );
}
