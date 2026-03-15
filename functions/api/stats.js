/**
 * API que devuelve las estadísticas de Plex desde D1.
 * GET /api/stats
 * Query: ?limit=100 (opcional, número de registros, por defecto 100)
 */
export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json(
        { error: "D1 no configurado" },
        { status: 503, headers: corsHeaders() }
      );
    }

    const url = new URL(context.request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100", 10), 1), 500);

    const ps = db.prepare(
      "SELECT id, movies, shows, episodes, timestamp FROM plex_stats ORDER BY timestamp DESC LIMIT ?"
    );
    const result = await ps.bind(limit).all();

    return Response.json(
      { data: result.results || [], meta: { count: (result.results || []).length } },
      { status: 200, headers: corsHeaders() }
    );
  } catch (err) {
    return Response.json(
      { error: "Error al leer estadísticas", detail: err.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60",
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
