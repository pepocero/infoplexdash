#!/usr/bin/env bash
set -euo pipefail

# =========================
# Configuración requerida
# =========================
: "${TAUTULLI_URL:=http://127.0.0.1:8181}"
: "${TAUTULLI_API_KEY:?Falta TAUTULLI_API_KEY}"
: "${INGEST_TOKEN:?Falta INGEST_TOKEN}"

# URL de tu Pages publicado
: "${INGEST_ENDPOINT:=https://infoplexdash.pages.dev/api/ingest-tautulli}"

# =========================
# Dependencias
# =========================
command -v curl >/dev/null 2>&1 || { echo "Error: curl no instalado"; exit 1; }
command -v jq   >/dev/null 2>&1 || { echo "Error: jq no instalado"; exit 1; }

# =========================
# Helpers
# =========================
api_get() {
  local method="$1"
  curl -fsS "${TAUTULLI_URL}/api/v2?apikey=${TAUTULLI_API_KEY}&cmd=${method}"
}

# Timestamp UTC en formato esperado por tu endpoint
now_ts="$(date -u '+%Y-%m-%d %H:%M:%S')"

# =========================
# 1) Obtener librerías de Tautulli
# =========================
libraries_json="$(api_get "get_libraries")"

# Validar respuesta básica
result="$(echo "$libraries_json" | jq -r '.response.result // "error"')"
if [[ "$result" != "success" ]]; then
  echo "Error: Tautulli devolvió result=$result"
  echo "$libraries_json" | jq .
  exit 1
fi

# =========================
# 2) Totales para plex_stats
# =========================
# movies: suma count de section_type=movie
movies="$(echo "$libraries_json" | jq '[.response.data[] | select(.section_type=="movie") | (.count // 0)] | add // 0')"

# shows: suma count de section_type=show
shows="$(echo "$libraries_json" | jq '[.response.data[] | select(.section_type=="show") | (.count // 0)] | add // 0')"

# episodes: suma child_count de section_type=show
episodes="$(echo "$libraries_json" | jq '[.response.data[] | select(.section_type=="show") | (.child_count // 0)] | add // 0')"

# =========================
# 3) Detalle para plex_library_stats
# =========================
# library_name = section_name, count = count
libraries_payload="$(
  echo "$libraries_json" | jq '
    [
      .response.data[]
      | {
          library_name: (.section_name // "Sin nombre"),
          count: ((.count // 0) | tonumber)
        }
    ]
  '
)"

# =========================
# 4) Construir payload final
# =========================
payload="$(
  jq -n \
    --arg timestamp "$now_ts" \
    --argjson movies "$movies" \
    --argjson shows "$shows" \
    --argjson episodes "$episodes" \
    --argjson libraries "$libraries_payload" \
    '{
      timestamp: $timestamp,
      movies: $movies,
      shows: $shows,
      episodes: $episodes,
      libraries: $libraries
    }'
)"

echo "Payload a enviar:"
echo "$payload" | jq .

# =========================
# 5) Enviar a Cloudflare Pages
# =========================
response="$(
  curl -fsS -X POST "$INGEST_ENDPOINT" \
    -H "Authorization: Bearer ${INGEST_TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary "$payload"
)"

echo "Respuesta endpoint:"
echo "$response" | jq .
echo "OK: ingestión completada."