import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages resolve their native binary / entry points with dynamic
  // `require()` calls that the bundler can't statically analyze — keep them
  // as real Node `require`s at runtime instead of bundling them.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg", "sharp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
