/**
 * The row_quotas migration caps how many rows one owner can insert into each
 * user-owned table (e.g. 200 diary entries per day). Past the cap, the insert
 * fails with a check_violation whose message starts with "row_quota:<table>:".
 */
export function isRowQuotaViolation(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "23514" && (error.message ?? "").startsWith("row_quota:");
}
