/**
 * API que devuelve estadísticas por biblioteca (plex_library_stats) desde D1.
 * GET /api/library-stats
 * Query: ?limit=100 (opcional)
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
      "SELECT id, library_name, count, timestamp FROM plex_library_stats ORDER BY timestamp DESC LIMIT ?"
    );
    const result = await ps.bind(limit).all();

    return Response.json(
      { data: result.results || [], meta: { count: (result.results || []).length } },
      { status: 200, headers: corsHeaders() }
    );
  } catch (err) {
    return Response.json(
      { error: "Error al leer estadísticas de bibliotecas", detail: err.message },
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
