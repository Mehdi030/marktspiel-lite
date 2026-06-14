import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // 'pg' wird nur zur Laufzeit via DATABASE_URL geladen — nicht bundlen
  serverExternalPackages: ['pg'],
};

export default nextConfig;
