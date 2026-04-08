@echo off
cd /d "%~dp0"
echo Actualizando estadísticas desde Tautulli...
node generar-dashboard.js
echo Enviando datos a Cloudflare (ingest_tautulli.sh)...
bash ingest_tautulli.sh
if errorlevel 1 (
  echo ERROR: Fallo al ejecutar ingest_tautulli.sh
) else (
  echo OK: Ingesta completada.
)
if exist dashboard.html start "" "dashboard.html"
