/**
 * Comprueba que las Functions responden (sin usar D1).
 * GET /api/ping
 */
export function onRequestGet() {
  return Response.json({ ok: true, message: "pong" }, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
