import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modules natifs / WASM chargés tels quels par Node plutôt que bundlés.
  serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2", "sharp", "pg"],
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;
