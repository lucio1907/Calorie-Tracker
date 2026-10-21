import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/*
 * Per-IP sign-in throttle (migration sign_in_throttle). Auth limits sign-ins
 * per IP, but it only sees the deployment's shared egress IPs, so this
 * counts attempts per visitor IP before Auth is called. State lives in
 * Postgres because serverless instances share no memory.
 */

/** Bucket for requests without a client IP header (local development, tests). */
export const UNKNOWN_CLIENT_IP = "unknown";

/**
 * The visitor's IP. On Vercel `x-real-ip` and `x-forwarded-for` both carry the
 * client's public IP, and Vercel overwrites x-forwarded-for instead of
 * forwarding a client-supplied one, "to prevent IP spoofing"
 * (https://vercel.com/docs/headers/request-headers). Off Vercel (`next start`)
 * these headers are whatever the client sent, or the socket address Next.js
 * fills in for x-forwarded-for, so the throttle is only as strong as the host
 * in front of the app.
 */
export function clientIp(requestHeaders: Headers): string {
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || UNKNOWN_CLIENT_IP;
}

/** SHA-256 hex digest of the IP: the only form the IP is stored in. */
export function clientKey(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Takes one sign-in attempt for the visitor. False when the visitor's attempts
 * for this window are spent. Fails open: if the throttle itself errors, the
 * error is logged and the attempt is allowed, so an outage here never locks
 * the owner out (Auth keeps its own limits).
 */
export async function takeSignInAttempt(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_sign_in_attempt", {
    client_key: clientKey(clientIp(await headers())),
  });
  if (error) {
    console.error("[auth] consume_sign_in_attempt failed", error.message);
    return true;
  }
  return data;
}
