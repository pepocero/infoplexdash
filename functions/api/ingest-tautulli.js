/**
 * Ingesta de datos desde Tautulli (script / cron) hacia D1.
 * POST /api/ingest-tautulli
 * Header: Authorization: Bearer <INGEST_TOKEN> (secret en Cloudflare Pages)
 *
 * Body JSON:
 * {
 *   "timestamp": "YYYY-MM-DD HH:MM:SS",
 *   "movies": number,
 *   "shows": number,
 *   "episodes": number,
 *   "libraries": [ { "library_name": string, "count": number }, ... ]
 * }
 */

function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
  };
}

function getBearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1].trim() || null;
}

function isValidTimestamp(ts) {
  return typeof ts === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts);
}

function isNonNegInt(n) {
  return Number.isInteger(n) && n >= 0;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const bearer = getBearerToken(request);
    if (!env.INGEST_TOKEN || !bearer || bearer !== env.INGEST_TOKEN) {
      return json({ error: "Unauthorized" }, 401);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Body JSON inválido" }, 400);
    }

    const { timestamp, movies, shows, episodes, libraries } = payload || {};

    if (!isValidTimestamp(timestamp)) {
      return json(
        { error: "timestamp inválido. Usa formato YYYY-MM-DD HH:MM:SS" },
        400
      );
    }

    if (!isNonNegInt(movies) || !isNonNegInt(shows) || !isNonNegInt(episodes)) {
      return json(
        { error: "movies, shows y episodes deben ser enteros >= 0" },
        400
      );
    }

    if (!Array.isArray(libraries)) {
      return json({ error: "libraries debe ser un array" }, 400);
    }

    for (const item of libraries) {
      if (!item || typeof item.library_name !== "string" || !item.library_name.trim()) {
        return json({ error: "Cada elemento de libraries necesita library_name no vacío" }, 400);
      }
      if (!isNonNegInt(item.count)) {
        return json({ error: "Cada elemento de libraries necesita count entero >= 0" }, 400);
      }
    }

    const db = env.DB;
    if (!db) {
      return json({ error: "D1 no configurado" }, 503);
    }

    const statements = [];

    statements.push(
      db
        .prepare(
          "INSERT INTO plex_stats (movies, shows, episodes, timestamp) VALUES (?, ?, ?, ?)"
        )
        .bind(movies, shows, episodes, timestamp)
    );

    for (const item of libraries) {
      statements.push(
        db
          .prepare(
            "INSERT INTO plex_library_stats (library_name, count, timestamp) VALUES (?, ?, ?)"
          )
          .bind(item.library_name.trim(), item.count, timestamp)
      );
    }

    await db.batch(statements);

    return json({
      ok: true,
      inserted: {
        plex_stats: 1,
        plex_library_stats: libraries.length,
      },
    });
  } catch (err) {
    return json(
      { error: "Error al insertar datos", detail: err.message },
      500
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
