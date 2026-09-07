@echo off
chcp 65001 >nul

:: --- KONFIGURATION ---
set PROJECT_NAME=my-app
set PB_VERSION=0.22.20
set FRONTEND_DIR=frontend
set BACKEND_DIR=backend

echo [1/6] Erstelle Backend-Verzeichnis...
if not exist %BACKEND_DIR% mkdir %BACKEND_DIR%

:: --- BACKEND SETUP (PocketBase) ---
echo [2/6] Installiere PocketBase v%PB_VERSION%...
cd %BACKEND_DIR%
curl -L https://github.com/pocketbase/pocketbase/releases/download/v%PB_VERSION%/pocketbase_%PB_VERSION%_windows_amd64.zip -o pocketbase.zip
tar -xf pocketbase.zip
del pocketbase.zip
cd ..

:: --- FRONTEND SETUP (SvelteKit) ---
echo [3/6] Initialisiere SvelteKit (Svelte 5 Minimal Project)...
call npx sv create %FRONTEND_DIR% --template minimal --types jsdoc --no-add-ons --no-install
cd %FRONTEND_DIR%

echo [4/6] Installiere Abhaengigkeiten (Tailwind v4, PocketBase, PDFkit)...
call npm install
:: Tailwind v4 laeuft ueber Vite, PostCSS ist raus!
call npm install -D tailwindcss @tailwindcss/vite
call npm install pocketbase pdfkit

:: --- KONFIGURATIONSDATEIEN ERSTELLEN ---
echo [5/6] Konfiguriere Tailwind (v4) und Vite...

:: Vite-Konfiguration ueberschreiben fuer Tailwind v4 Plugin
echo import { sveltekit } from '@sveltejs/kit/vite'; > vite.config.js
echo import tailwindcss from '@tailwindcss/vite'; >> vite.config.js
echo import { defineConfig } from 'vite'; >> vite.config.js
echo. >> vite.config.js
echo export default defineConfig({ >> vite.config.js
echo     plugins: [tailwindcss(^), sveltekit(^)] >> vite.config.js
echo }^); >> vite.config.js

:: CSS Datei fuer Tailwind v4 (neue Syntax)
if not exist src mkdir src
echo @import "tailwindcss"; > src\app.css

:: PocketBase Service
if not exist src\lib mkdir src\lib
echo import PocketBase from 'pocketbase'; > src\lib\pocketbase.js
echo import { writable } from 'svelte/store'; >> src\lib\pocketbase.js
echo. >> src\lib\pocketbase.js
echo export const pb = new PocketBase('http://127.0.0.1:8090'^); >> src\lib\pocketbase.js
echo. >> src\lib\pocketbase.js
echo export const currentUser = writable(pb.authStore.model^); >> src\lib\pocketbase.js
echo. >> src\lib\pocketbase.js
echo pb.authStore.onChange((auth^) =^> { >> src\lib\pocketbase.js
echo     currentUser.set(pb.authStore.model^); >> src\lib\pocketbase.js
echo }^); >> src\lib\pocketbase.js

:: Root Layout (Svelte 5 Runes Syntax)
if not exist src\routes mkdir src\routes
echo ^<script^> > src\routes\+layout.svelte
echo   import "../app.css"; >> src\routes\+layout.svelte
echo   let { children } = $props(^); >> src\routes\+layout.svelte
echo ^</script^> >> src\routes\+layout.svelte
echo. >> src\routes\+layout.svelte
echo {@render children(^)} >> src\routes\+layout.svelte

:: --- STARTSEITE MIT LOGIN ERSTELLEN ---
echo [6/6] Erstelle Login-Startseite (Svelte 5)...
echo ^<script^> > src\routes\+page.svelte
echo   import { pb, currentUser } from '$lib/pocketbase'; >> src\routes\+page.svelte
echo   let email = $state(''^); >> src\routes\+page.svelte
echo   let password = $state(''^); >> src\routes\+page.svelte
echo. >> src\routes\+page.svelte
echo   async function login(e^) { >> src\routes\+page.svelte
echo     e.preventDefault(^); >> src\routes\+page.svelte
echo     try { >> src\routes\+page.svelte
echo       await pb.collection('users'^).authWithPassword(email, password^); >> src\routes\+page.svelte
echo     } catch (err^) { >> src\routes\+page.svelte
echo       alert('Fehler beim Login: ' + err.message^); >> src\routes\+page.svelte
echo     } >> src\routes\+page.svelte
echo   } >> src\routes\+page.svelte
echo. >> src\routes\+page.svelte
echo   function logout(^) { >> src\routes\+page.svelte
echo     pb.authStore.clear(^); >> src\routes\+page.svelte
echo   } >> src\routes\+page.svelte
echo ^</script^> >> src\routes\+page.svelte
echo. >> src\routes\+page.svelte
echo ^<div class="min-h-screen bg-gray-100 flex items-center justify-center p-4"^> >> src\routes\+page.svelte
echo   {#if $currentUser} >> src\routes\+page.svelte
echo     ^<div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center"^> >> src\routes\+page.svelte
echo       ^<h1 class="text-2xl font-bold mb-4"^>Willkommen, {$currentUser.email}!^</h1^> >> src\routes\+page.svelte
echo       ^<button onclick={logout} class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"^>Abmelden^</button^> >> src\routes\+page.svelte
echo     ^</div^> >> src\routes\+page.svelte
echo   {:else} >> src\routes\+page.svelte
echo     ^<div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full"^> >> src\routes\+page.svelte
echo       ^<h1 class="text-2xl font-bold mb-6 text-center"^>Secure Login^</h1^> >> src\routes\+page.svelte
echo       ^<form onsubmit={login} class="space-y-4"^> >> src\routes\+page.svelte
echo         ^<div^> >> src\routes\+page.svelte
echo           ^<label class="block text-sm font-medium text-gray-700"^>Email^</label^> >> src\routes\+page.svelte
echo           ^<input type="email" bind:value={email} class="mt-1 block w-full border rounded-md p-2" required /^> >> src\routes\+page.svelte
echo         ^</div^> >> src\routes\+page.svelte
echo         ^<div^> >> src\routes\+page.svelte
echo           ^<label class="block text-sm font-medium text-gray-700"^>Passwort^</label^> >> src\routes\+page.svelte
echo           ^<input type="password" bind:value={password} class="mt-1 block w-full border rounded-md p-2" required /^> >> src\routes\+page.svelte
echo         ^</div^> >> src\routes\+page.svelte
echo         ^<button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"^>Einloggen^</button^> >> src\routes\+page.svelte
echo       ^</form^> >> src\routes\+page.svelte
echo     ^</div^> >> src\routes\+page.svelte
echo   {/if} >> src\routes\+page.svelte
echo ^</div^> >> src\routes\+page.svelte

cd ..
echo.
echo [FERTIG] Installation abgeschlossen.
pause