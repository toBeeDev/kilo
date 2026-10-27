import type { NextConfig } from "next";

/** 빌드마다 바뀌는 값. 서비스 워커 캐시 버전에 쓴다. Vercel은 커밋 SHA, 로컬 빌드는 시각. */
const swVersion = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 10) || String(Date.now());

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_SW_VERSION: swVersion },
  async headers() {
    return [
      {
        // 서비스 워커는 항상 최신으로 받아야 새 배포가 바로 반영된다
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
