import { useRef, useState } from "react";

import type { AnalysisResult } from "@/lib/stats";

interface UseVideoAnalysisReturn {
    data: AnalysisResult[] | null;
    isProcessing: boolean;
    error: string | null;
    progress: string;
    analyzeVideo: (input: string) => Promise<void>;
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

    const analyzeVideo = async (input: string) => {
        if (!input) {
            setError("Please paste a valid YouTube URL.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setData(null);
        setProgress("Downloading video and extracting frames (1 FPS)...");

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: input }),
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