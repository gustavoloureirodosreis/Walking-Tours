
export interface AnalysisResult {
    timestamp: number;
    count: number;
}

export interface VideoStats {
    maxCount: number;
    avgCount: number;
    peakTime: string;
    duration: string;
}

/**
 * Format seconds into MM:SS format.
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate statistics from analysis data.
 */
export function calculateStats(data: AnalysisResult[]): VideoStats | null {
    if (!data || data.length === 0) return null;

    const counts = data.map((d) => d.count);
    const maxCount = Math.max(...counts);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const peakIndex = counts.indexOf(maxCount);
    const peakTimeData = data[peakIndex];
    const duration = data[data.length - 1].timestamp;

    return {
        maxCount,
        avgCount,
        peakTime: formatTime(peakTimeData.timestamp),
        duration: formatTime(duration),
    };
}

