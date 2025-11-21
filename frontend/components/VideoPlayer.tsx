import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useRef, useImperativeHandle, forwardRef } from "react";

interface VideoPlayerProps {
  videoId: string | null;
}

export interface VideoPlayerHandle {
  seekTo: (timestamp: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ videoId }, ref) => {
    const playerRef = useRef<YouTubePlayer | null>(null);

    useImperativeHandle(ref, () => ({
      seekTo: (timestamp: number) => {
        const player = playerRef.current;
        if (!player || typeof player.seekTo !== "function") {
          console.warn("Video player not ready for seeking");
          return;
        }
        player.seekTo(timestamp, true);
      },
    }));

    const onPlayerReady = (event: YouTubeEvent) => {
      playerRef.current = event.target;
    };

    if (!videoId) {
      return (
        <div className="bg-black rounded-xl overflow-hidden shadow-lg border border-border relative group flex items-center justify-center h-full">
          <div className="text-muted-foreground font-mono">No Video Loaded</div>
        </div>
      );
    }

    return (
      <div className="bg-black rounded-xl overflow-hidden shadow-lg border border-border relative group h-full">
        <YouTube
          videoId={videoId}
          opts={{
            height: "100%",
            width: "100%",
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              rel: 0,
            },
          }}
          className="absolute inset-0 w-full h-full"
          onReady={onPlayerReady}
        />
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
