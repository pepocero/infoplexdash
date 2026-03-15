/**
 * Worker para desarrollo local y producción (workers.dev).
 * Sirve estáticos desde ASSETS y maneja /api/ping y /api/stats.
 */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60",
  };
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }

      if (url.pathname === "/api/ping") {
        return Response.json(
          { ok: true, message: "pong" },
          { status: 200, headers: { ...corsHeaders(), "Cache-Control": "no-store" } }
        );
      }

      if (url.pathname === "/api/stats" && request.method === "GET") {
        const db = env.DB;
        if (!db) {
          return Response.json(
            { error: "D1 no configurado" },
            { status: 503, headers: corsHeaders() }
          );
        }
        const limitParam = url.searchParams.get("limit") || "100";
        const limit = Math.min(Math.max(parseInt(limitParam, 10), 1), 500);
        const ps = db.prepare(
          "SELECT id, movies, shows, episodes, timestamp FROM plex_stats ORDER BY timestamp DESC LIMIT ?"
        );
        const result = await ps.bind(limit).all();
        const data = result.results || [];
        return Response.json(
          { data, meta: { count: data.length } },
          { status: 200, headers: corsHeaders() }
        );
      }

      if (url.pathname === "/api/library-stats" && request.method === "GET") {
        const db = env.DB;
        if (!db) {
          return Response.json(
            { error: "D1 no configurado" },
            { status: 503, headers: corsHeaders() }
          );
        }
        const limitParam = url.searchParams.get("limit") || "100";
        const limit = Math.min(Math.max(parseInt(limitParam, 10), 1), 500);
        const ps = db.prepare(
          "SELECT id, library_name, count, timestamp FROM plex_library_stats ORDER BY timestamp DESC LIMIT ?"
        );
        const result = await ps.bind(limit).all();
        const data = result.results || [];
        return Response.json(
          { data, meta: { count: data.length } },
          { status: 200, headers: corsHeaders() }
        );
      }

      if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
        return env.ASSETS.fetch(request);
      }
      return new Response("Assets no configurados", { status: 503, headers: { "Content-Type": "text/plain" } });
    } catch (err) {
      return Response.json(
        { error: "Error interno", detail: err.message },
        { status: 500, headers: corsHeaders() }
      );
    }
  },
};
