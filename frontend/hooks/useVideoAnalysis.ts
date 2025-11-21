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

type AnalyzeStreamEvent =
    | {
        status: "info";
        message?: string;
    }
    | {
        status: "frames_ready";
        totalFrames?: number;
        truncated?: boolean;
    }
    | {
        status: "progress";
        processed: number;
        total: number;
    }
    | {
        status: "complete";
        timeline?: AnalysisResult[];
        framesProcessed?: number;
        truncated?: boolean;
    }
    | {
        status: "error";
        error?: string;
    }
    | {
        status?: string;
        [key: string]: unknown;
    };

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
        setProgress("Uploading video...");

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

            if (!response.body) {
                const text = await response.text().catch(() => "");
                throw new Error(text || "Analysis failed (empty response).");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let finalTimeline: AnalysisResult[] | null = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.trim()) continue;

                    let event: AnalyzeStreamEvent;
                    try {
                        event = JSON.parse(line) as AnalyzeStreamEvent;
                    } catch {
                        continue;
                    }

                    switch (event.status) {
                        case "info":
                            if (event.message) {
                                setProgress(String(event.message));
                            }
                            break;
                        case "frames_ready": {
                            const total = event.totalFrames;
                            const truncated = Boolean(event.truncated);
                            setProgress(
                                total
                                    ? `Processing ${total} frame(s)${truncated ? " (truncated to 10 minutes)" : ""}...`
                                    : "Processing frames...",
                            );
                            break;
                        }
                        case "progress":
                            if (
                                typeof event.processed === "number" &&
                                typeof event.total === "number"
                            ) {
                                setProgress(
                                    `Analyzing frame ${event.processed}/${event.total}...`,
                                );
                            }
                            break;
                        case "complete":
                            if (Array.isArray(event.timeline)) {
                                finalTimeline = event.timeline;
                            }
                            setProgress("");
                            break;
                        case "error":
                            throw new Error(
                                typeof event.error === "string"
                                    ? event.error
                                    : "Video analysis failed.",
                            );
                        default:
                            break;
                    }
                }
            }

            if (!finalTimeline || finalTimeline.length === 0) {
                throw new Error("No frames were analyzed. Try a different video.");
            }

            setData(finalTimeline);
        } catch (err) {
            const error = err as Partial<Error>;
            if (error?.name === "AbortError") {
                console.log("Video analysis aborted by user.");
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