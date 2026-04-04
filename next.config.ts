import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "api.dicebear.com" },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jwtmpwqokepqudmrllij.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_I9HHYZcGIYw1DknSouCDsA_GmfB0bx8",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://oxford-world.vercel.app",
  },
};

export default nextConfig;
