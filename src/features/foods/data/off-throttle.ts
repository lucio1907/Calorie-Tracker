import "server-only";
import { createClient } from "@/lib/supabase/server";

/*
 * Per-user Open Food Facts throttle and barcode miss cache (migration
 * off_request_throttle). Every OFF request leaves from the deployment's shared
 * egress IPs, so all users share OFF's per-IP quota; these limits keep one
 * account from spending it. State lives in Postgres because serverless
 * instances share no memory. The RPCs act on the signed-in caller only.
 */

export type OffRequestKind = "product" | "search";

/** The user has no Open Food Facts requests left this minute; OFF was not called. */
export class OffRateLimitedError extends Error {
  constructor(kind: OffRequestKind) {
    super(`OFF ${kind} requests throttled for this user`);
    this.name = "OffRateLimitedError";
  }
}

/** Takes one OFF request slot for the caller. Throws OffRateLimitedError when none is left. */
export async function takeOffRequestSlot(kind: OffRequestKind): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_off_request", { request_kind: kind });
  if (error) throw new Error(`consume_off_request failed: ${error.message}`);
  if (!data) throw new OffRateLimitedError(kind);
}

/** True when OFF did not know this barcode for the caller in the last 24 hours. */
export async function isRecentOffMiss(barcode: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("off_barcode_recently_missed", { lookup_barcode: barcode });
  if (error) throw new Error(`off_barcode_recently_missed failed: ${error.message}`);
  return data;
}

/**
 * Remembers that OFF does not know this barcode. Call it only for a real "not
 * found" answer, never for network errors or 5xx. Best effort: a failure is
 * logged and the lookup still answers "not found".
 */
export async function recordOffMiss(barcode: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_off_barcode_miss", { lookup_barcode: barcode });
  if (error) console.error("[foods] record_off_barcode_miss failed", error.message);
}
