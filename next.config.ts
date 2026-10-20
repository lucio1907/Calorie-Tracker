import type { NextConfig } from "next";

// The E2E run sets EXPOSE_TESTING_API=1 so @next/playwright's instant() can
// hold back request-time content. It is needed for `next build` (the browser
// side is compiled in) and `next start`; never set it for a deployment.
const exposeTestingApi = process.env.EXPOSE_TESTING_API === "1";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
  },
  async redirects() {
    return [{ source: "/", destination: "/today", permanent: false }];
  },
};

export default nextConfig;
