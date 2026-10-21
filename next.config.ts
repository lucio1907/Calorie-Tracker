import type { NextConfig } from "next";

// The E2E run sets EXPOSE_TESTING_API=1 so @next/playwright's instant() can
// hold back request-time content. It is needed for `next build` (the browser
// side is compiled in) and `next start`; never set it for a deployment.
const exposeTestingApi = process.env.EXPOSE_TESTING_API === "1";

// The testing API must never reach users (exposeTestingApiInProductionBuild
// doc: "Do not enable this option for a user-facing production deployment").
// Vercel sets VERCEL_ENV for builds and functions; CI and the E2E run do not.
if (exposeTestingApi && process.env.VERCEL_ENV === "production") {
  throw new Error("EXPOSE_TESTING_API=1 is set for a Vercel production deployment. Remove it from the project settings.");
}

const isDev = process.env.NODE_ENV === "development";

/*
 * Static Content Security Policy, set here rather than per request in the
 * proxy. A nonce-based policy needs every page rendered per request, and the
 * CSP guide says that is incompatible with partial prerendering (cacheComponents
 * + partialPrefetching): the prerendered shell's scripts cannot carry the
 * nonce. So scripts use the guide's "without nonces" policy: 'self' plus
 * 'unsafe-inline' for Next's inline bootstrap and RSC payload scripts, and
 * 'unsafe-eval' only in development (React's dev error overlay uses eval).
 * Styles need 'unsafe-inline' for server-rendered style attributes. Images
 * allow data: for the two-factor QR code, an SVG data URI from Supabase Auth
 * (an <img> never runs an SVG's scripts).
 * The browser only talks to this origin: Supabase and Open Food Facts are
 * called server-side, and the fonts are self-hosted by next/font.
 * Docs: node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Superseded by frame-ancestors, kept for browsers that ignore CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), midi=(), " +
      "accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [{ source: "/", destination: "/today", permanent: false }];
  },
};

export default nextConfig;
