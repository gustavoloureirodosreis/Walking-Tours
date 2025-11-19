import { useState, useRef } from "react";

interface AnalysisResult {
    timestamp: number;
    count: number;
}

interface UseVideoAnalysisReturn {
    data: AnalysisResult[] | null;
    isProcessing: boolean;
    error: string | null;
    progress: string;
    analyzeVideo: (url: string) => Promise<void>;
    abortAnalysis: () => void;
}

const API_URL = "http://localhost:8000/analyze_youtube_stream";

/**
 * Custom hook to handle video analysis with streaming updates.
 */
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

    const analyzeVideo = async (url: string) => {
        setIsProcessing(true);
        setError(null);
        setData(null);
        setProgress("Initializing analysis...");

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
                body: JSON.stringify({ url }),
                signal: abortController.signal,
            });

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
                        handleStreamEvent(event, setProgress, setData);
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

    return {
        data,
        isProcessing,
        error,
        progress,
        analyzeVideo,
        abortAnalysis,
    };
}

/**
 * Handle individual stream events and update state accordingly.
 */
function handleStreamEvent(
    event: any,
    setProgress: (progress: string) => void,
    setData: (data: AnalysisResult[]) => void
) {
    switch (event.status) {
        case "hashing":
            setProgress("Preparing video...");
            break;
        case "checking_url":
            setProgress("Verifying video availability...");
            break;
        case "downloading":
            setProgress("Downloading video...");
            break;
        case "cached":
            setProgress("Loading from cache...");
            break;
        case "analyzing":
            setProgress(`Processing: ${event.progress}%`);
            break;
        case "complete":
            setData(event.data);
            setProgress("");
            break;
        case "error":
            throw new Error(event.error);
    }
}

