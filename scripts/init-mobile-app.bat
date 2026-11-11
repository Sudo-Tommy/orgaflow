@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Seniorenassistenz - Mobile App Build & Sync
echo ===================================================
echo.

cd /d "%~dp0..\frontend"

echo [1/4] Frontend wird fuer Produktion gebaut...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Frontend-Build fehlgeschlagen.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Pruefe Capacitor Android-Projekt...
if not exist "android" (
    echo Erstelle neues Android-Projekt mit Capacitor...
    call npx cap add android
    if %ERRORLEVEL% NEQ 0 (
        echo [FEHLER] npx cap add android fehlgeschlagen.
        pause
        exit /b %ERRORLEVEL%
    )
) else (
    echo Android-Projekt existiert bereits.
)

echo.
echo [3/4] Synchronisiere Web-Assets und native Plugins...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] npx cap sync fehlgeschlagen.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo [4/4] Erfolgreich synchronisiert!
echo.
echo Option 1: In Android Studio oeffnen:
echo   npx cap open android
echo.
echo Option 2: Direkt als Debug-APK bauen (sofern Gradle/Java installiert):
echo   cd android ^&^& gradlew assembleDebug
echo.
echo Option 3: Direkt als Release-APK bauen:
echo   cd android ^&^& gradlew assembleRelease
echo.
echo Fertige APK liegt anschliessend unter:
echo   frontend\android\app\build\outputs\apk\
echo ===================================================
echo.
pause
