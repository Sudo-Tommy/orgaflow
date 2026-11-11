@echo off
setlocal EnableDelayedExpansion

:: --- CONFIGURATION (Muss vor allen Spruengen initialisiert werden) ---
set "PROJECT_ROOT=%~dp0"
set "VERSION_FILE=%PROJECT_ROOT%version.txt"
set "BACKUP_DIR=%PROJECT_ROOT%..\OrgaFlow_Backups"
set "NGINX_DIR=S:\nginx-1.30.0"

:: Stelle sicher, dass das Skript im Projektverzeichnis ausgefuehrt wird
cd /d "%PROJECT_ROOT%"

:: Interne Sub-Prozesse abfangen (Wird fuer den Traffic-Monitor genutzt)
if "%~1"=="TRAFFIC_MONITOR_PROC" goto traffic_monitor_loop

:: Direkte CLI-Argumente unterstuetzen (z.B. "start.bat build", "start.bat update", "start.bat stop")
if /i "%~1"=="build" goto build
if /i "%~1"=="5" goto build
if /i "%~1"=="update" goto update_all
if /i "%~1"=="6" goto update_all
if /i "%~1"=="live" goto start_live
if /i "%~1"=="dev" goto start_dev
if /i "%~1"=="stop" goto kill_all

title OrgaFlow - Server Management Tool

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
echo   2) DEV-Modus BEENDEN (Fenster schliessen)
echo   D1) Nur Svelte Dev-Server zuschalten (Live-Test)
echo   D2) Svelte Dev-Server beenden
echo.
echo  [ LIVE MODUS ]
echo   3) LIVE-Modus STARTEN (pb_public + Mailer + Nginx)
echo   4) LIVE-Modus BEENDEN (Fenster schliessen)
echo.
echo  [ BUILD, DEPLOY ^& RESTART ]
echo   5) Frontend builden, ins Backend laden ^& Server neustarten
echo.
echo  [ UPDATES ]
echo   6) Komplettes Update (PB + Svelte + Node), Build ^& Neustart
echo   7) Nur PocketBase Update
echo   8) Nur Frontend (Svelte) Update
echo   9) Nur Microservice (Node) Update
echo.
echo  [ SYSTEM ]
echo   B) 1:1 Projekt-Backup erstellen (Mirror)
echo   V) Version manuell erhoehen
echo   R) Windows Ressourcenmonitor (Live-Graphen) oeffnen
echo   T) Traffic ^& Connection Monitor oeffnen
echo   X) ALLE Server und Fenster beenden (Not-Aus ^& Port-Freigabe)
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

:close_all_windows
echo ========================================================
echo   Schliesse alle Server-Fenster und beende Prozesse...
echo ========================================================
:: 1. Taskkill ueber bekannte Fenstertitel
taskkill /F /FI "WINDOWTITLE eq OrgaFlow PB (LIVE)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Microservice (LIVE)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq PocketBase Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Email Microservice*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq SvelteKit Frontend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq OrgaFlow Traffic Monitor*" /T >nul 2>&1

:: 2. PowerShell: Ermittle alle Prozesse auf den Ports 3000, 8090, 5173
::    und beende sowohl den Port-Inhaber als auch dessen uebergeordnetes CMD-Fenster (ParentProcessId)!
powershell -NoProfile -Command "$ports = 3000, 8090, 5173; foreach ($p in $ports) { Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { $id = $_; try { $parent = (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $id)).ParentProcessId; if ($parent) { Stop-Process -Id $parent -Force -ErrorAction SilentlyContinue } } catch {}; Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } }; Get-CimInstance Win32_Process -Filter 'Name=''cmd.exe''' | Where-Object { $_.CommandLine -like '*pocketbase*' -or $_.CommandLine -like '*microservice*' -or $_.CommandLine -like '*node index.js*' -or $_.CommandLine -like '*vite dev*' -or $_.CommandLine -like '*npm run dev*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-Process pocketbase -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1

:: 3. Nginx sauber beenden
if exist "%NGINX_DIR%\nginx.exe" (
    cd /d "%NGINX_DIR%"
    nginx.exe -s quit >nul 2>&1
    taskkill /F /IM nginx.exe >nul 2>&1
    cd /d "%PROJECT_ROOT%"
)
echo [OK] Alle alten Server-Fenster und Hintergrund-Prozesse wurden geschlossen.
exit /b

:start_live_procs
echo Starte LIVE Backend (PocketBase auf Port 8090)...
start "OrgaFlow PB (LIVE)" cmd /k "cd backend && pocketbase.exe serve --http=0.0.0.0:8090"
echo Starte LIVE Microservice (Port 3000)...
start "Microservice (LIVE)" cmd /k "cd microservice && node index.js"
echo Starte Nginx Proxy...
cd /d "%NGINX_DIR%"
start "" nginx.exe
cd /d "%PROJECT_ROOT%"
exit /b

:start_dev
echo Starte Backend (Dev)...
start "PocketBase Backend" cmd /k "cd backend && pocketbase.exe serve ihre-seniorenassistenz.com"
echo Starte Microservice (Dev)...
start "Email Microservice" cmd /k "cd microservice && npm run dev"
echo Starte Frontend (Dev)...
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --host --open"
goto menu

:stop_dev
call :close_all_windows
echo DEV-Server und Fenster erfolgreich beendet!
pause
goto menu

:start_svelte_dev
echo Starte SvelteKit Frontend im Dev-Modus...
start "SvelteKit Frontend" cmd /k "cd frontend && npm run dev -- --host --open"
goto menu

:stop_svelte_dev
echo Beende SvelteKit Frontend (Dev)...
taskkill /F /FI "WINDOWTITLE eq SvelteKit Frontend*" /T >nul 2>&1
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { $id = $_.OwningProcess; try { $parent = (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $id)).ParentProcessId; if ($parent) { Stop-Process -Id $parent -Force -ErrorAction SilentlyContinue } } catch {}; Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }" >nul 2>&1
echo Frontend Dev-Server beendet!
pause
goto menu

:start_live
echo ==========================================
echo Bereite LIVE-Server Start vor...
call :close_all_windows
call :start_live_procs
echo LIVE-Server erfolgreich gestartet!
pause
goto menu

:stop_live
call :close_all_windows
echo LIVE-Server erfolgreich beendet!
pause
goto menu

:kill_all
call :close_all_windows
echo Alle Server und Konsolenfenster wurden erfolgreich beendet und alle Ports freigegeben!
pause
goto menu

:build
echo.
echo ========================================================
echo   [1/4] Beende bestehende Live-Server ^& schliesse Fenster...
echo ========================================================
call :close_all_windows

echo.
echo ========================================================
echo   [2/4] Erstelle Frontend-Produktions-Build...
echo ========================================================
cd /d "%PROJECT_ROOT%frontend"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] Frontend-Build ist mit Fehlern abgebrochen!
    echo Server werden nicht neu gestartet.
    cd /d "%PROJECT_ROOT%"
    pause
    goto menu
)
cd /d "%PROJECT_ROOT%"

echo.
echo ========================================================
echo   [3/4] Synchronisiere Build nach backend\pb_public...
echo ========================================================
if not exist "backend\pb_public" mkdir "backend\pb_public"

if exist "frontend\pb_public" (
    robocopy "frontend\pb_public" "backend\pb_public" /MIR /NFL /NDL /NJH /NJS /nc /ns /np
    echo [OK] frontend\pb_public erfolgreich nach backend\pb_public gespiegelt.
) else if exist "frontend\build" (
    robocopy "frontend\build" "backend\pb_public" /MIR /NFL /NDL /NJH /NJS /nc /ns /np
    echo [OK] frontend\build erfolgreich nach backend\pb_public gespiegelt.
) else (
    echo [FEHLER] Konnte keinen Build-Ordner finden!
    pause
    goto menu
)

echo.
echo ========================================================
echo   [4/4] Starte alle Server sauber neu...
echo ========================================================
call :start_live_procs

echo.
echo ========================================================
echo   ERFOLG: Frontend gebaut, ins Backend geladen und
echo   PocketBase, Microservice und Nginx frisch gestartet!
echo ========================================================
pause
goto menu

:update_all
echo ========================================================
echo   [1/6] Schliesse alle laufenden Server-Fenster...
echo ========================================================
call :close_all_windows

echo.
echo ========================================================
echo   [2/6] PocketBase Update...
echo ========================================================
cd /d "%PROJECT_ROOT%backend" && call pocketbase.exe update
cd /d "%PROJECT_ROOT%"

echo.
echo ========================================================
echo   [3/6] SvelteKit Frontend Update...
echo ========================================================
cd /d "%PROJECT_ROOT%frontend" && call npm update
cd /d "%PROJECT_ROOT%"

echo.
echo ========================================================
echo   [4/6] Microservice Update...
echo ========================================================
cd /d "%PROJECT_ROOT%microservice" && call npm update
cd /d "%PROJECT_ROOT%"

echo.
echo ========================================================
echo   [5/6] Version aktualisieren...
echo ========================================================
call :set_version

echo.
echo ========================================================
echo   [6/6] Frontend neu bauen ^& Server frisch starten...
echo ========================================================
goto build

:update_pb
call :close_all_windows
cd /d "%PROJECT_ROOT%backend" && call pocketbase.exe update && cd /d "%PROJECT_ROOT%"
echo PocketBase Update abgeschlossen. Starte Server neu...
call :start_live_procs
pause
goto menu

:update_front
call :close_all_windows
cd /d "%PROJECT_ROOT%frontend" && call npm update && cd /d "%PROJECT_ROOT%"
goto build

:update_micro
call :close_all_windows
cd /d "%PROJECT_ROOT%microservice" && call npm update && cd /d "%PROJECT_ROOT%"
echo Microservice Update abgeschlossen. Starte Server neu...
call :start_live_procs
pause
goto menu

:backup
echo ==========================================
echo Erstelle 1:1 Mirror Backup...
set "HH=%time:~0,2%"
if "%HH:~0,1%"==" " set "HH=0%HH:~1,1%"
set "TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%HH%-%time:~3,2%-%time:~6,2%"

set "CURRENT_BACKUP_DIR=%BACKUP_DIR%\OrgaFlow_Backup_%TIMESTAMP%"
mkdir "%CURRENT_BACKUP_DIR%"

echo Spiegel Projekt nach: %CURRENT_BACKUP_DIR%
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