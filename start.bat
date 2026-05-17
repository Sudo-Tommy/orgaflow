@echo off
setlocal EnableDelayedExpansion

:: Interne Sub-Prozesse abfangen (Wird fuer den Traffic-Monitor genutzt)
if "%~1"=="TRAFFIC_MONITOR_PROC" goto traffic_monitor_loop

title OrgaFlow - Server Management Tool

:: --- CONFIGURATION ---
set "PROJECT_ROOT=%~dp0"
set "VERSION_FILE=%PROJECT_ROOT%version.txt"
set "BACKUP_DIR=%PROJECT_ROOT%..\OrgaFlow_Backups"
set "NGINX_DIR=S:\nginx-1.30.0"

:: Stelle sicher, dass das Skript im Projektverzeichnis ausgefuehrt wird (wichtig bei Admin-Rechten)
cd /d "%PROJECT_ROOT%"

:: --- INIT VERSION ---
if not exist "%VERSION_FILE%" > "%VERSION_FILE%" echo 1.0.0
set /p APP_VERSION=<"%VERSION_FILE%"

:menu
cls
echo ========================================================
echo   OrgaFlow Server Management Tool v!APP_VERSION!
echo ========================================================
echo.
echo  [ DEV MODUS ]
echo   1) DEV-Modus STARTEN (Backend + Svelte + Mailer)
echo   2) DEV-Modus BEENDEN
echo   D1) Nur Svelte Dev-Server zuschalten (Live-Test)
echo   D2) Svelte Dev-Server beenden
echo.
echo  [ LIVE MODUS ]
echo   3) LIVE-Modus STARTEN (pb_public + Mailer + Nginx)
echo   4) LIVE-Modus BEENDEN
echo.
echo  [ BUILD ^& DEPLOY ]
echo   5) Frontend Builden ^& in Backend (pb_public) kopieren
echo.
echo  [ UPDATES ]
echo   6) Komplettes Update (PB + Svelte + Node) ^& Version++
echo   7) Nur PocketBase Update
echo   8) Nur Frontend (Svelte) Update
echo   9) Nur Microservice (Node) Update
echo.
echo  [ SYSTEM ]
echo   B) 1:1 Projekt-Backup erstellen (Mirror)
echo   V) Version manuell erhoehen
echo   R) Windows Ressourcenmonitor (Live-Graphen) oeffnen
echo   T) Traffic ^& Connection Monitor oeffnen
echo   X) ALLE Server beenden (Not-Aus)
echo.
echo  [ NGINX STEUERUNG ]
echo   N1) Nginx starten
echo   N2) Nginx Config neu laden (reload)
echo   N3) Nginx beenden (quit)
echo   0) Beenden
echo ========================================================
set /p choice="Waehle eine Option: "

if "%choice%"=="1" goto start_dev
if "%choice%"=="2" goto stop_dev
if /i "%choice%"=="D1" goto start_svelte_dev
if /i "%choice%"=="D2" goto stop_svelte_dev
if "%choice%"=="3" goto start_live
if "%choice%"=="4" goto stop_live
if "%choice%"=="5" goto build
if "%choice%"=="6" goto update_all
if "%choice%"=="7" goto update_pb
if "%choice%"=="8" goto update_front
if "%choice%"=="9" goto update_micro
if /i "%choice%"=="B" goto backup
if /i "%choice%"=="R" goto resmon
if /i "%choice%"=="T" goto traffic_monitor
if /i "%choice%"=="V" goto bump_version
if /i "%choice%"=="X" goto kill_all
if /i "%choice%"=="N1" goto nginx_start
if /i "%choice%"=="N2" goto nginx_reload
if /i "%choice%"=="N3" goto nginx_stop
if "%choice%"=="0" exit

goto menu

:start_dev
echo Starte Backend (Dev)...
start "PocketBase Backend" cmd /k "cd backend && pocketbase.exe serve ihre-seniorenassistenz.com"
echo Starte Microservice (Dev)...
start "Email Microservice" cmd /k "cd microservice && npm run dev"
echo Starte Frontend (Dev)...
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --host --open"
goto menu

:stop_dev
echo ==========================================
echo Beende DEV-Server Prozesse...
taskkill /F /FI "WINDOWTITLE eq PocketBase Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Email Microservice*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq SvelteKit Frontend*" /T >nul 2>&1
echo DEV-Server erfolgreich beendet!
pause
goto menu

:start_svelte_dev
echo Starte SvelteKit Frontend im Dev-Modus...
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --host --open"
goto menu

:stop_svelte_dev
echo Beende SvelteKit Frontend (Dev)...
taskkill /F /FI "WINDOWTITLE eq SvelteKit Frontend*" /T >nul 2>&1
echo Frontend Dev-Server beendet!
pause
goto menu

:start_live
echo Starte LIVE Backend (PocketBase auf Port 8090)...
start "OrgaFlow PB (LIVE)" cmd /k "cd backend && pocketbase.exe serve --http=127.0.0.1:8090"
echo Starte LIVE Microservice...
start "OrgaFlow Mailer (LIVE)" cmd /k "cd microservice && node index.js"
echo Starte Nginx Proxy...
cd /d "%NGINX_DIR%"
start "" nginx.exe
cd /d "%PROJECT_ROOT%"
goto menu

:stop_live
echo ==========================================
echo Beende LIVE-Server Prozesse...
taskkill /F /FI "WINDOWTITLE eq OrgaFlow PB (LIVE)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq OrgaFlow Mailer (LIVE)*" /T >nul 2>&1
echo Beende Nginx Proxy...
cd /d "%NGINX_DIR%"
nginx.exe -s quit >nul 2>&1
taskkill /F /IM nginx.exe >nul 2>&1
cd /d "%PROJECT_ROOT%"
echo LIVE-Server erfolgreich beendet!
pause
goto menu

:kill_all
echo ==========================================
echo Beende alle laufenden Server-Prozesse...
:: Schliesst die Konsolenfenster anhand ihrer Titel
taskkill /F /FI "WINDOWTITLE eq PocketBase Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Email Microservice*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq SvelteKit Frontend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq OrgaFlow PB (LIVE)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq OrgaFlow Mailer (LIVE)*" /T >nul 2>&1

echo Beende Nginx Proxy...
cd /d "%NGINX_DIR%"
nginx.exe -s quit >nul 2>&1
taskkill /F /IM nginx.exe >nul 2>&1
cd /d "%PROJECT_ROOT%"

echo Alle Server wurden erfolgreich beendet!
pause
goto menu

:build
echo ==========================================
echo Erstelle Frontend-Build...
cd /d "%PROJECT_ROOT%frontend"
call npm run build
cd /d "%PROJECT_ROOT%"
echo.
echo Loesche alten pb_public Ordner im Backend...
if exist "backend\pb_public" rmdir /s /q "backend\pb_public"
mkdir "backend\pb_public"

echo Kopiere neue Build-Dateien 1:1 nach backend\pb_public...
if exist "frontend\build" (
    xcopy "frontend\build\*" "backend\pb_public\" /E /I /Y /H /C
) else if exist "frontend\pb_public" (
    xcopy "frontend\pb_public\*" "backend\pb_public\" /E /I /Y /H /C
) else (
    echo [FEHLER] Konnte keinen Build-Ordner finden!
)
echo.
echo Build und Kopiervorgang erfolgreich!
echo.
echo ==========================================
echo Starte Live-Server nach Build neu...
taskkill /F /FI "WINDOWTITLE eq OrgaFlow PB (LIVE)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq OrgaFlow Mailer (LIVE)*" /T >nul 2>&1
cd /d "%NGINX_DIR%"
nginx.exe -s quit >nul 2>&1
taskkill /F /IM nginx.exe >nul 2>&1
cd /d "%PROJECT_ROOT%"
start "OrgaFlow PB (LIVE)" cmd /k "cd backend && pocketbase.exe serve --http=127.0.0.1:8090"
start "OrgaFlow Mailer (LIVE)" cmd /k "cd microservice && node index.js"
cd /d "%NGINX_DIR%"
start "" nginx.exe
cd /d "%PROJECT_ROOT%"
echo Alle Live-Server erfolgreich neu gestartet!
pause
goto menu

:update_all
echo ==========================================
echo [1/3] PocketBase Update...
cd /d "%PROJECT_ROOT%backend" && call pocketbase update
echo [2/3] SvelteKit Update...
cd /d "%PROJECT_ROOT%frontend" && call npm update
echo [3/3] Microservice Update...
cd /d "%PROJECT_ROOT%microservice" && call npm update
cd /d "%PROJECT_ROOT%"
call :set_version
echo ==========================================
echo Alle Updates abgeschlossen!
pause
goto menu

:update_pb
cd /d "%PROJECT_ROOT%backend" && call pocketbase update && cd /d "%PROJECT_ROOT%"
pause
goto menu

:update_front
cd /d "%PROJECT_ROOT%frontend" && call npm update && cd /d "%PROJECT_ROOT%"
pause
goto menu

:update_micro
cd /d "%PROJECT_ROOT%microservice" && call npm update && cd /d "%PROJECT_ROOT%"
pause
goto menu

:backup
echo ==========================================
echo Erstelle 1:1 Mirror Backup...
:: Sichere Zeitformatierung fuer Dateinamen erstellen (auch fuer deutsche Windows-Versionen)
set "HH=%time:~0,2%"
if "%HH:~0,1%"==" " set "HH=0%HH:~1,1%"
set "TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%HH%-%time:~3,2%-%time:~6,2%"

set "CURRENT_BACKUP_DIR=%BACKUP_DIR%\OrgaFlow_Backup_%TIMESTAMP%"
mkdir "%CURRENT_BACKUP_DIR%"

echo Spiegel Projekt nach: %CURRENT_BACKUP_DIR%
:: Robocopy erstellt einen exakten Spiegel. Temporaere Build/Node-Ordner werden ausgelassen.
robocopy "%PROJECT_ROOT:~0,-1%" "%CURRENT_BACKUP_DIR%" /MIR /XD "node_modules" ".svelte-kit" "build" /R:1 /W:1
echo.
echo Backup erfolgreich gespeichert!
pause
goto menu

:resmon
echo Oeffne Windows Ressourcenmonitor...
start resmon.exe
goto menu

:traffic_monitor
echo Oeffne Traffic Monitor in neuem Fenster...
start "OrgaFlow Traffic Monitor" "%~f0" TRAFFIC_MONITOR_PROC
goto menu

:bump_version
call :set_version
pause
goto menu

:set_version
echo.
echo Aktuelle Version: !APP_VERSION!
set /p NEW_VERSION="Gib die neue Versionsnummer ein (z.B. 1.0.2 oder 2.0 Beta, leer lassen fuer keine Aenderung): "
if not "!NEW_VERSION!"=="" (
    set "APP_VERSION=!NEW_VERSION!"
    > "%VERSION_FILE%" echo !APP_VERSION!
    :: Kopiere die version.txt direkt in den statischen Frontend-Ordner, damit Svelte sie ueber /version.txt laden kann
    copy /Y "%VERSION_FILE%" "%PROJECT_ROOT%frontend\static\version.txt" >nul
    echo Version wurde auf !APP_VERSION! geaendert!
) else (
    echo Version wurde nicht geaendert.
)
exit /b

:nginx_start
echo Starte Nginx...
cd /d "%NGINX_DIR%" && start nginx.exe
cd /d "%PROJECT_ROOT%"
goto menu

:: --- Sub-Prozess fuer den Traffic Monitor ---
:traffic_monitor_loop
title OrgaFlow Traffic Monitor
color 0A
mode con: cols=85 lines=35
:loop
cls
echo =================================================================================
echo                      ORGAFLOW TRAFFIC ^& SYSTEM MONITOR (Live)
echo =================================================================================
echo.
echo   [ NETZWERK TRAFFIC (Gesamt in Bytes: Empfangen / Gesendet) ]
echo   -----------------------------------------------------------------------------
netstat -e | findstr /i "bytes"
echo.
echo   [ AKTIVE SERVER-VERBINDUNGEN (Port 80, 443, 8090, 3000) ]
echo   -----------------------------------------------------------------------------
netstat -ano | findstr /R ":80\> :443\> :8090\> :3000\>"
echo.
echo   [ RESSOURCEN-VERBRAUCH (Arbeitsspeicher ^& Prozess-IDs) ]
echo   -----------------------------------------------------------------------------
tasklist /FI "IMAGENAME eq nginx.exe" /NH 2>nul
tasklist /FI "IMAGENAME eq pocketbase.exe" /NH 2>nul
tasklist /FI "IMAGENAME eq node.exe" /NH 2>nul
echo.
echo =================================================================================
echo Aktualisiert alle 3 Sekunden... (Fenster schliessen zum Beenden)
timeout /t 3 >nul
goto loop

:nginx_reload
echo Lade Nginx Konfiguration neu...
cd /d "%NGINX_DIR%"
nginx.exe -t
if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] Deine nginx.conf hat einen Syntax-Fehler! Nginx wurde NICHT neu geladen.
    pause
    cd /d "%PROJECT_ROOT%"
    goto menu
)
nginx.exe -s reload
echo Nginx erfolgreich neu geladen!
cd /d "%PROJECT_ROOT%"
pause
goto menu

:nginx_stop
echo Beende Nginx sicher...
cd /d "%NGINX_DIR%" && nginx.exe -s quit
cd /d "%PROJECT_ROOT%"
goto menu