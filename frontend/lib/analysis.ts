export interface RoboflowDetection {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    confidence?: number;
    class?: string;
    class_id?: number;
    detection_id?: string;
    parent_id?: string;
}

export interface FrameSummary {
    sourceImageUrl: string;
    annotatedImage?: string | null;
    detections: RoboflowDetection[];
    image?: {
        width?: number;
        height?: number;
    };
}

