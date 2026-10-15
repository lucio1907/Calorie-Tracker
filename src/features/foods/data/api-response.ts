import "server-only";

/** JSON for the signed-in user only: never cached by shared caches. */
export function privateJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function errorJson(status: number, error: string): Response {
  return privateJson({ error }, status);
}
