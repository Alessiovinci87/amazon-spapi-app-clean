@echo off
REM =====================================================
REM Script per rigenerare inventario.db da schema.sql
REM =====================================================

set DB_NAME=inventario.db
set BACKUP_NAME=inventario_backup.db
set SCHEMA_FILE=schema.sql

echo -----------------------------------------------------
echo 1. Backup del database attuale (se esiste)...
if exist %DB_NAME% (
    echo Rinomino %DB_NAME% in %BACKUP_NAME%
    del %BACKUP_NAME% >nul 2>&1
    ren %DB_NAME% %BACKUP_NAME%
) else (
    echo Nessun inventario.db trovato, si procede...
)

echo -----------------------------------------------------
echo 2. Creazione nuovo %DB_NAME% da %SCHEMA_FILE% ...
sqlite3 %DB_NAME% ".read %SCHEMA_FILE%"

echo -----------------------------------------------------
echo 3. Verifica rapido contenuto tabella prodotti:
sqlite3 %DB_NAME% "SELECT * FROM prodotti;"

echo -----------------------------------------------------
echo Reset completato!
pause
