import { useRef, useState } from "react";

import type { AnalysisResult } from "@/lib/stats";

interface UseVideoAnalysisReturn {
    data: AnalysisResult[] | null;
    isProcessing: boolean;
    error: string | null;
    progress: string;
    analyzeVideo: (file: File) => Promise<void>;
    abortAnalysis: () => void;
}

const API_URL = "/api/analyze";

export function useVideoAnalysis(): UseVideoAnalysisReturn {
    const [data, setData] = useState<AnalysisResult[] | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);

    const abortAnalysis = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsProcessing(false);
            setProgress("");
            setError("Analysis cancelled by user.");
        }
    };

    const analyzeVideo = async (file: File) => {
        if (!file) {
            setError("Please choose a video file.");
            return;
        }

        if (!file.type.startsWith("video/")) {
            setError("Only video files are supported.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setData(null);
        setProgress("Uploading video and extracting frames (1 FPS)...");

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const formData = new FormData();
            formData.append("video", file);

            const response = await fetch(API_URL, {
                method: "POST",
                body: formData,
                signal: abortController.signal,
            });

            const payload = (await response.json().catch(() => null)) as
                | {
                    timeline?: AnalysisResult[];
                    framesProcessed?: number;
                    truncated?: boolean;
                    error?: string;
                }
                | null;

            if (!response.ok || !payload || "error" in payload) {
                const message =
                    (payload && "error" in payload && payload.error) ||
                    "Analysis failed. Please try again.";
                throw new Error(message);
            }

            if (!payload.timeline || payload.timeline.length === 0) {
                throw new Error("No frames were analyzed. Try a different video.");
            }

            setData(payload.timeline);
            setProgress("");
        } catch (err) {
            const error = err as Partial<Error>;
            if (error?.name === "AbortError") {
                console.log("Roboflow request aborted");
            } else if (error?.message) {
                setError(error.message);
                console.error(err);
            } else {
                setError("Failed to analyze the video.");
                console.error(err);
            }
            setProgress("");
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        data,
        isProcessing,
        error,
        progress,
        analyzeVideo,
        abortAnalysis,
    };
}