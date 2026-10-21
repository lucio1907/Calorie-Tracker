/**
 * Safety helpers shared by the operator scripts (create-user, import-argenfoods).
 */

/** Hostnames of the local Supabase stack (`npm run db:start`). */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * @param {string} url Supabase API URL.
 * @returns {boolean}
 */
export function isLocalSupabaseUrl(url) {
  return LOCAL_HOSTS.has(new URL(url).hostname);
}

/**
 * Writes to anything but the local stack need an explicit `--yes`.
 * @param {string} url Supabase API URL.
 * @param {boolean} confirmed Whether `--yes` was passed.
 * @returns {string | null} Why the write is refused, or null to go ahead.
 */
export function remoteWriteRefusal(url, confirmed) {
  if (confirmed || isLocalSupabaseUrl(url)) return null;
  return `${new URL(url).host} is not the local stack; pass --yes to write to it.`;
}

/**
 * Reads a secret piped on stdin (e.g. `--password-stdin`), so it never shows
 * up in the process list or shell history. Drops one trailing line break.
 * @param {AsyncIterable<string | Uint8Array>} stream
 * @returns {Promise<string>}
 */
export async function readSecret(stream) {
  const decoder = new TextDecoder();
  let text = "";
  for await (const chunk of stream) {
    text += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
  }
  text += decoder.decode();
  return text.replace(/\r?\n$/, "");
}
