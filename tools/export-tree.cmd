:: tools/export-tree.cmd
:: Runner per Windows: doppio click o esegui da qualsiasi cartella del progetto.
:: Usa la directory CORRENTE come root e genera reports\ nella root corrente.

@echo off
setlocal ENABLEDELAYEDEXPANSION

:: Rileva la cartella di questo script (tools\)
set SCRIPT_DIR=%~dp0

:: Root = cartella corrente da cui lanci
set ROOT=%CD%

:: Cartella report (nella root corrente)
set OUT=reports

:: Entry predefiniti (puoi modificarli qui se vuoi)
set ENTRIES=backend/index.js,backend/server.js,backend/src/index.js,src/main.jsx,src/index.jsx,src/main.tsx,src/index.tsx

:: Verifica Node nel PATH
where node >nul 2>nul
if errorlevel 1 (
  echo ❌ Node.js non trovato nel PATH. Installa Node o aggiungilo al PATH.
  pause
  exit /b 1
)

:: Esegui lo script Node (usa percorsi assoluti e parametri standardizzati)
node "%SCRIPT_DIR%export-tree.mjs" --root "%ROOT%" --out "%OUT%" --entries "%ENTRIES%"
set EXITCODE=%ERRORLEVEL%

if %EXITCODE% NEQ 0 (
  echo ❌ Operazione terminata con errore (codice %EXITCODE%).
  pause
  exit /b %EXITCODE%
)

echo 🏁 Completato. Report in "%ROOT%\%OUT%".
pause
endlocal
