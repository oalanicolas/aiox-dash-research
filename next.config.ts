import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const appRoot = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  turbopack: {
    root: appRoot,
  },
  outputFileTracingRoot: appRoot,
  outputFileTracingIncludes: {
    "/research/**": ["./src/data/snapshot/**"],
    "/research": ["./src/data/snapshot/**"],
    "/observatory/**": ["./src/data/snapshot/**"],
    "/observatory": ["./src/data/snapshot/**"],
    "/": ["./src/data/snapshot/**"],
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.claude/**",
        "**/outputs/**",
        "**/squads/**",
        "**/src/data/snapshot/**",
      ],
    }
    return config
  },
}

export default nextConfig
