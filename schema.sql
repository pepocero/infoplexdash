-- Tabla de estadísticas Plex (D1).
-- Ejecutar una vez contra la base remota: npm run db:init

CREATE TABLE IF NOT EXISTS plex_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movies INTEGER NOT NULL DEFAULT 0,
  shows INTEGER NOT NULL DEFAULT 0,
  episodes INTEGER NOT NULL DEFAULT 0,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Índice para consultas por fecha
CREATE INDEX IF NOT EXISTS idx_plex_stats_timestamp ON plex_stats (timestamp DESC);
