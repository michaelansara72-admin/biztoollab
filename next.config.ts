import type { NextConfig } from "next";
import { wwwHostRedirects } from "./src/lib/wwwHostRedirects";

const nextConfig: NextConfig = {
  async redirects() {
    return wwwHostRedirects();
  },
};

export default nextConfig;
