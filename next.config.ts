import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Marketing photography is hotlinked from Unsplash's CDN — see
    // src/lib/images.ts, which is the only place those urls are written.
    // next/image refuses any host not listed here, so adding a photo from
    // somewhere else means adding its host too.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
