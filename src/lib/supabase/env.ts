/**
 * Public Supabase settings. These are inlined into the browser bundle, so
 * they must be referenced as literal `process.env.NEXT_PUBLIC_*` expressions.
 * The service role key is deliberately absent: it never reaches app code.
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.",
    );
  }

  return { url, publishableKey };
}
