import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'pg' wird nur zur Laufzeit via DATABASE_URL geladen — nicht bundlen
  serverExternalPackages: ['pg'],
};

export default nextConfig;
