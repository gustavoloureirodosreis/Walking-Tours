import fsPromises from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

import type { FrameSummary, RoboflowDetection } from "@/lib/analysis";
import type { AnalysisResult } from "@/lib/stats";

const WORKFLOW_URL =
    "https://serverless.roboflow.com/gustavos-training-workspace/workflows/find-men-and-women";
const FRAMES_PER_SECOND = 1;
const MAX_FRAMES = 600; // ~10 minutes
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

type WorkflowResponse = {
    outputs?: Array<{
        predictions?: {
            image?: { width?: number; height?: number };
            predictions?: unknown;
        };
        visualization?: { value?: string | null };
    }>;
};

function countDetections(detections: RoboflowDetection[], target: string): number {
    const normalizedTarget = target.toLowerCase();
    return detections.filter((det) =>
        det.class?.toLowerCase().includes(normalizedTarget),
    ).length;
}

function sanitizeDetections(value: unknown): RoboflowDetection[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(
        (det): det is RoboflowDetection =>
            det && typeof det === "object" && ("class" in det || "confidence" in det),
    );
}

function pickFrameSummary(data: WorkflowResponse, dataUrl: string): FrameSummary {
    const workflowOutput = data?.outputs?.[0] ?? {};
    const predictionsBlock = workflowOutput?.predictions ?? {};
    const detections = sanitizeDetections(predictionsBlock?.predictions);
    const visualizationBase64 = workflowOutput?.visualization?.value;

    return {
        sourceImageUrl: dataUrl,
        annotatedImage: visualizationBase64
            ? `data:image/png;base64,${visualizationBase64}`
            : null,
        detections,
        image: predictionsBlock?.image,
    };
}

async function extractFrames(videoPath: string, outputDir: string) {
    return new Promise<string[]>((resolve, reject) => {
        ffmpeg(videoPath)
            .outputOptions(["-vf", `fps=${FRAMES_PER_SECOND}`])
            .output(path.join(outputDir, "frame-%06d.png"))
            .on("end", async () => {
                try {
                    const files = await fsPromises.readdir(outputDir);
                    const frames = files
                        .filter((file) => file.endsWith(".png"))
                        .sort()
                        .map((file) => path.join(outputDir, file));
                    resolve(frames);
                } catch (err) {
                    reject(err);
                }
            })
            .on("error", reject)
            .run();
    });
}

type WorkflowEnvelope = WorkflowResponse & {
    error?: string;
    message?: string;
};

async function callRoboflow(apiKey: string, base64Image: string) {
    const response = await fetch(WORKFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
            api_key: apiKey,
            inputs: {
                image: {
                    type: "base64",
                    value: base64Image,
                },
            },
        }),
    });

    const raw = await response.text();
    let data: WorkflowEnvelope | null = null;
    try {
        data = raw ? (JSON.parse(raw) as WorkflowEnvelope) : null;
    } catch {
        data = null;
    }

    if (!response.ok || !data) {
        const snippet = raw ? raw.slice(0, 200) : "";
        const message =
            data?.error ||
            data?.message ||
            `Roboflow responded with HTTP ${response.status} ${response.statusText}. ${snippet}`;
        throw new Error(message.trim());
    }

    return data as WorkflowResponse;
}

async function readFrameAsBase64(framePath: string) {
    return fsPromises.readFile(framePath, { encoding: "base64" });
}

async function cleanupDirectory(dirPath: string | null) {
    if (!dirPath) return;
    await fsPromises.rm(dirPath, { recursive: true, force: true }).catch(() => {
        // best-effort cleanup
    });
}

function buildTimelineEntry(
    timestamp: number,
    men: number,
    women: number,
    total: number,
    frame?: FrameSummary,
): AnalysisResult {
    return {
        timestamp,
        men,
        women,
        total,
        frame,
    };
}

function sanitizeFileName(filename: string): string {
    return (
        path.basename(filename).replace(/[^\w.-]/g, "_") || `upload-${Date.now()}.mp4`
    );
}

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let tempDir: string | null = null;

            const send = (payload: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
            };

            const bail = async (message: string) => {
                send({ status: "error", error: message });
                controller.close();
            };

            try {
                const contentType = request.headers.get("content-type") || "";
                if (!contentType.includes("multipart/form-data")) {
                    await bail("Expected multipart/form-data with a video file.");
                    return;
                }

                const formData = await request.formData();
                const file = formData.get("video");

                if (!file || !(file instanceof File)) {
                    await bail("Please upload a valid video file (MP4/MOV/WEBM/AVI).");
                    return;
                }

                if (file.size === 0) {
                    await bail("Uploaded file is empty. Please try again.");
                    return;
                }

                if (file.size > MAX_UPLOAD_BYTES) {
                    await bail(
                        "Video is too large. Please upload a file smaller than 500 MB (~10 minutes).",
                    );
                    return;
                }

                const apiKey = process.env.ROBOFLOW_API_KEY;
                if (!apiKey) {
                    await bail("ROBOFLOW_API_KEY is not configured on the server.");
                    return;
                }

                send({ status: "info", message: "Uploading video..." });

                tempDir = path.join(os.tmpdir(), `rf-video-${crypto.randomUUID()}`);
                const framesDir = path.join(tempDir, "frames");
                const videoPath = path.join(
                    tempDir,
                    sanitizeFileName(file.name || "upload.mp4"),
                );
                await fsPromises.mkdir(framesDir, { recursive: true });

                const buffer = Buffer.from(await file.arrayBuffer());
                await fsPromises.writeFile(videoPath, buffer);

                send({ status: "info", message: "Extracting frames (1 FPS)..." });
                const frames = await extractFrames(videoPath, framesDir);

                if (frames.length === 0) {
                    throw new Error("Unable to extract frames from the provided video.");
                }

                const framesToProcess = frames.slice(0, MAX_FRAMES);
                const truncated = frames.length > framesToProcess.length;
                send({
                    status: "frames_ready",
                    totalFrames: framesToProcess.length,
                    truncated,
                });

                const timeline: AnalysisResult[] = [];

                for (const [index, framePath] of framesToProcess.entries()) {
                    const base64Image = await readFrameAsBase64(framePath);
                    const rfData = await callRoboflow(apiKey, base64Image);
                    const frameSummary = pickFrameSummary(
                        rfData,
                        `data:image/png;base64,${base64Image}`,
                    );

                    const men = countDetections(frameSummary.detections, "man");
                    const women = countDetections(frameSummary.detections, "woman");
                    const total =
                        frameSummary.detections.length > 0
                            ? frameSummary.detections.length
                            : men + women;

                    timeline.push(
                        buildTimelineEntry(
                            index,
                            men,
                            women,
                            total,
                            index === 0 ? frameSummary : undefined,
                        ),
                    );

                    send({
                        status: "progress",
                        processed: index + 1,
                        total: framesToProcess.length,
                    });
                }

                send({
                    status: "complete",
                    timeline,
                    framesProcessed: timeline.length,
                    fps: FRAMES_PER_SECOND,
                    truncated,
                });

                controller.close();
            } catch (error) {
                console.error("Analyze API error", error);
                const message =
                    error instanceof Error
                        ? error.message
                        : "Unable to analyze the supplied video.";
                send({ status: "error", error: message });
                controller.close();
            } finally {
                await cleanupDirectory(tempDir);
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-store",
        },
    });
}

