import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@ffmpeg-installer/ffmpeg",
      "fluent-ffmpeg",
      "@distube/ytdl-core",
    ],
  },
};

export default nextConfig;
