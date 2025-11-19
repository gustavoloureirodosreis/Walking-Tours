
/**
 * Extract video ID from YouTube URL.
 * Supports both youtube.com and youtu.be formats.
 */
export function extractVideoId(url: string): string {
    try {
        const urlObj = new URL(url);

        if (urlObj.hostname.includes("youtube.com")) {
            return urlObj.searchParams.get("v") || "";
        } else if (urlObj.hostname.includes("youtu.be")) {
            return urlObj.pathname.slice(1);
        }

        return "";
    } catch (e) {
        console.error("Invalid YouTube URL", e);
        return "";
    }
}

