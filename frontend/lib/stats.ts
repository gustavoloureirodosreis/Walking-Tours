import { FrameSummary } from "@/lib/analysis";

export interface AnalysisResult {
    timestamp: number;
    men: number;
    women: number;
    total: number;
    frame?: FrameSummary;
}

export interface VideoStats {
    peakTotal: number;
    peakTotalTime: string;
    peakMen: number;
    peakMenTime: string;
    peakWomen: number;
    peakWomenTime: string;
    avgTotal: number;
    avgMen: number;
    avgWomen: number;
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

    const menCounts = data.map((d) => d.men);
    const womenCounts = data.map((d) => d.women);
    const totalCounts = data.map((d) =>
        typeof d.total === "number" ? d.total : d.men + d.women
    );

    const avg = (values: number[]) =>
        values.reduce((sum, value) => sum + value, 0) / values.length;

    const peakWithIndex = (values: number[]) => {
        const peakValue = Math.max(...values);
        return {
            value: peakValue,
            time: formatTime(data[values.indexOf(peakValue)].timestamp),
        };
    };

    const duration = formatTime(data[data.length - 1].timestamp);

    const peakTotal = peakWithIndex(totalCounts);
    const peakMen = peakWithIndex(menCounts);
    const peakWomen = peakWithIndex(womenCounts);

    return {
        peakTotal: peakTotal.value,
        peakTotalTime: peakTotal.time,
        peakMen: peakMen.value,
        peakMenTime: peakMen.time,
        peakWomen: peakWomen.value,
        peakWomenTime: peakWomen.time,
        avgTotal: avg(totalCounts),
        avgMen: avg(menCounts),
        avgWomen: avg(womenCounts),
        duration,
    };
}

