# Technical Analysis: E2E Test Execution Harness & Mocking Architecture

**Track**: E2E Testing Track (Milestone E2E-1)  
**Author**: Explorer 1  
**Timestamp**: 2026-11-11T08:37:00Z  
**Target Project**: OrgaFlow Hybrid App ("Seniorenassistenz", Capacitor 7, SvelteKit)

---

## 1. Executive Summary

This investigation establishes the technical foundation for the automated E2E test suite covering the 6 native hybrid app features of OrgaFlow without physical device hardware.

Key findings:
1. **Execution Environment**: The machine runs **Node.js v25.9.0** and **npm 11.12.1**. Node 25 provides built-in native TypeScript execution (`--experimental-strip-types`), native module mocking (`--experimental-test-module-mocks`), built-in test runner (`node:test`, `node:assert`), and modern Web APIs (`fetch`, `Blob`, `crypto.subtle`, `TextEncoder`).
2. **Current Project State**: `frontend/package.json` contains no existing test runner (`vitest` is not installed; `tsx` is available via `npx tsx` or can be added to devDependencies). `frontend/tsconfig.json` extends `.svelte-kit/tsconfig.json`, where path aliases `"$lib/*": ["../src/lib/*"]` and include paths `../tests/**/*.ts` are already configured.
3. **Runner Recommendation**: A lightweight TypeScript test harness using **Node 25's `node:test` + `npx tsx`** (or a dedicated `tests/runner.ts`) provides zero-overhead execution (sub-100ms test startup), native TypeScript and `$lib` path alias resolution, and seamless mock injection without requiring heavy bundlers or browser automation tools.
4. **Capacitor Mocking**: Capacitor plugins (`@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/screen-orientation`, `@capacitor/preferences`, `@capacitor/app`, `@capacitor/core`) can be mocked cleanly via Node 25's `mock.module` or via a centralized `mockCapacitorBridge.ts` module with stateful in-memory stores and event emitters.
5. **Browser Globals Shim**: In Node 25, `globalThis.navigator` is a non-writable getter property, requiring `Object.defineProperty(globalThis.navigator, ...)` to mock `onLine`, `geolocation`, and `mediaDevices`. DOM globals (`window`, `document`, `matchMedia`, `HTMLCanvasElement`) require a lightweight headless DOM shim. Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) require global shims for importing `.svelte.ts` service modules in Node.

---

## 2. Codebase & Environment Inspection

### 2.1 Package Configuration (`frontend/package.json`)
- **Node & Svelte Ecosystem**: Svelte `^5.55.2`, Vite `^8.0.7`, `@sveltejs/kit` `^2.57.0`, TypeScript `^6.0.2`.
- **Capacitor 7 Dependencies**:
  - `@capacitor/core`: `^7.6.10`
  - `@capacitor/android`: `^7.6.10`
  - `@capacitor/camera`: `^7.0.5`
  - `@capacitor/geolocation`: `^7.1.8`
  - `@capacitor/screen-orientation`: `^7.0.4`
  - `@capacitor/preferences`: `^7.0.4`
  - `@capacitor/app`: `^7.1.2`
  - `@capacitor/network`: `^7.0.4`
  - `@capacitor/push-notifications`: `^7.0.7`
  - `@capacitor/splash-screen`: `^7.0.5`
  - `@capacitor/status-bar`: `^7.0.6`
- **Other Notable Dependencies**:
  - `pdf-lib`: `^1.17.1` (used for in-memory PDF bundling in `documentScannerService.ts`)
  - `pocketbase`: `^0.26.8`
  - `dexie`: `^4.4.6`
- **Missing Test Dependencies**:
  - No `vitest`, `jest`, or `mocha` installed.
  - Running `npx vitest` attempts to download `vitest@4.1.12` from npm over the network.
  - `npx tsx` is present in npm cache (v4.23.15) and runs instantly with zero network requests.

### 2.2 TypeScript & Module Resolution (`frontend/tsconfig.json`)
`frontend/tsconfig.json` extends `./.svelte-kit/tsconfig.json`:
- `paths`:
  - `"$lib"` -> `["../src/lib"]`
  - `"$lib/*"` -> `["../src/lib/*"]`
- `include`:
  - `"../tests/**/*.js"`, `"../tests/**/*.ts"`, `"../tests/**/*.svelte"`
- `tsx` automatically reads `compilerOptions.paths` and resolves `$lib/services/...` without extra configuration.

---

## 3. Analysis of the 6 Native Features

| # | Feature | Key Source Files | Imported Plugins | Required Browser/Node Globals |
|---|---------|-------------------|------------------|-------------------------------|
| 1 | **Document Scanner Service** | `src/lib/services/documentScannerService.ts` | `@capacitor/camera`, `@capacitor/core`, `pdf-lib` | `fetch` (for `data:` URLs to Blob), `Blob`, `navigator.mediaDevices.getUserMedia` |
| 2 | **Location & Reverse Geocoding** | `src/lib/services/locationService.ts` | `@capacitor/geolocation`, `@capacitor/core` | `window`, `navigator.onLine`, `navigator.geolocation`, `fetch` (Nominatim API) |
| 3 | **Fullscreen Signature Modal** | `src/lib/components/app/FullscreenSignatureModal.svelte`, `src/lib/services/backButtonHandler.ts` | `@capacitor/screen-orientation`, `@capacitor/core`, `@capacitor/app` | `HTMLCanvasElement`, `CanvasRenderingContext2D`, `window.devicePixelRatio`, `document.querySelectorAll` |
| 4 | **Biometric & PIN Security** | `src/lib/services/biometricService.ts` (`biometricService.svelte.ts`), `src/lib/components/app/NativeAppManager.svelte` | `@capacitor/preferences`, `@capacitor/app`, `@capacitor/core` | `crypto.subtle.digest`, `TextEncoder`, `window`, Svelte 5 `$state` |
| 5 | **App Update Banner** | `src/lib/components/app/AppUpdateBanner.svelte` | `@capacitor/app`, `@capacitor/core` | `window.open`, `fetch` (`version.json`) |
| 6 | **PWA Installation Button** | `src/lib/components/app/PwaInstallButton.svelte` | `@capacitor/core` | `window.addEventListener('beforeinstallprompt')`, `window.matchMedia`, `navigator.standalone` |

### Detailed Feature Mechanics

#### Feature 1: Document Scanner Service
- Line 27: `Camera.getPhoto({ quality: 85, resultType: CameraResultType.DataUrl, source: CameraSource.Camera, ... })`
- Line 40: `fetch(photo.dataUrl)` -> converts data URL directly to `Blob`. Tested in Node 25: native `fetch` supports `data:image/png;base64,...` seamlessly.
- Line 49: Graceful cancellation check: `error?.message?.includes('User cancelled') || error === 'User cancelled photos app'` returns `null`.
- Line 53: Failure throws localized error: `'Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.'`.
- Line 60: `bundleToPdf(pages, documentTitle)`: embeds PNG/JPG via `pdf-lib`, scales to DIN A4 (595.28 x 841.89 points), returns `{ pdfBlob, fileName: 'Beleg_YYYY-MM-DD.pdf', pageCount, pages }`.
- Line 61: If `pages` is empty, throws `'Es wurden keine Seiten zum Erstellen des PDFs ausgewählt.'`.

#### Feature 2: Location & Reverse Geocoding Service
- Line 22: `Capacitor.isNativePlatform()` branches to `Geolocation.checkPermissions()` and `Geolocation.requestPermissions()`. On web, checks `'geolocation' in navigator`.
- Line 48: `Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 })`.
- Line 72: Catches errors: if message includes 'Timeout' or `error?.code === 3`, throws `'Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten.'`.
- Line 83: `reverseGeocode(lat, lon)`: checks `typeof window === 'undefined' || !navigator.onLine`. Calls Nominatim API with German accept-language header and extracts street, house number, postal code, and city. Resilient fallback: if reverse geocode fails, `getCurrentPosition` still returns coordinates without crashing.

#### Feature 3: Fullscreen Signature Modal & Orientation
- Line 44: On modal open: `ScreenOrientation.lock({ orientation: 'landscape' })`.
- Line 52: On modal close / unmount: `ScreenOrientation.unlock()`.
- Line 30: Registers with `backButtonHandler.register(() => { closeModal(); return true; })`.
- Line 118: Empty signature check: `if (!canvas || !hasSignature) return;` prevents saving blank signatures.
- Line 119: Generates `canvas.toDataURL('image/png')` and passes to `onSave(dataUrl)`.

#### Feature 4: Biometric Authentication & Resume Lock
- Line 21: Reads `PREF_BIOMETRIC_KEY` from `@capacitor/preferences`.
- Line 31: `App.addListener('appStateChange', (state) => { if (!state.isActive && this.isEnabled) this.isLockedState = true; })`.
- Line 65: PIN hashing using `crypto.subtle.digest('SHA-256', data)` stored in `orga_app_pin_hash`.
- Line 74: `verifyPin(pin)` compares SHA-256 hex hash. If matching, sets `isLockedState = false` and returns `true`.
- Line 83: If mismatch, returns `false` and remains locked.

#### Feature 5: App Update Banner
- Line 13: Only runs when `Capacitor.isNativePlatform()` is `true`.
- Line 21: `App.getInfo()` retrieves `info.version`.
- Line 25: Fetches version manifest from `https://www.ihre-seniorenassistenz.com/api/mobile/version.json`.
- Line 31: Compares `remoteVersion !== appVersion`. If update available, displays banner with version badge.
- Line 42: `handleDownload()` opens `window.open(downloadUrl, '_system')` and sets `isDismissed = true`.

#### Feature 6: PWA Installation Button
- Line 17: Checks `!Capacitor.isNativePlatform()` and `!window.matchMedia('(display-mode: standalone)').matches` and `!(navigator as any).standalone`.
- Line 28: Listens for `window.addEventListener('beforeinstallprompt', handlePrompt)`.
- Line 29: Listens for `window.addEventListener('appinstalled', handleInstalled)`.
- Line 41: `installPwa()` invokes `deferredPrompt.prompt()`, awaits `deferredPrompt.userChoice`, and if `outcome === 'accepted'`, hides the button.

---

## 4. Test Execution Harness Evaluation

Three options were evaluated:

| Criterion | Option A: `vitest` | Option B: Node 25 Native (`node:test`) | Option C: `npx tsx` + `node:test` Runner |
|-----------|-------------------|----------------------------------------|------------------------------------------|
| **Installation** | Requires external download (`npm i vitest`) | Zero dependencies (built into Node 25) | Uses cached `tsx` or lightweight devDep |
| **Execution Speed** | Moderate (~1.5s Vite startup overhead) | Instantaneous (<10ms test execution) | Instantaneous (<25ms execution) |
| **TypeScript Support** | Native via Vite | Native type-stripping in Node 25 | Native via esbuild |
| **`$lib` Path Aliases** | Configured in `vite.config` | Requires loader hook or symlink | Automatic from `tsconfig.json` |
| **ESM Module Mocking** | `vi.mock` | `node:test` `mock.module` (built-in) | `node:test` `mock.module` (built-in) |
| **Svelte Runes Compatibility** | Requires `@sveltejs/vite-plugin-svelte` | Requires global shim for runes | Requires global shim for runes |
| **CLI Reporting** | Vitest reporter | `node:test` spec/tap/dot reporters | Custom summary with Tier breakdown |

### Recommendation: Option C (`npx tsx` + `node:test` Runner)
- **Why**:
  1. `tsx` handles TypeScript transpilation and automatically resolves `$lib/*` path aliases from `tsconfig.json`.
  2. `node:test` is built into Node 25, requiring no heavy test framework dependencies.
  3. A custom runner entry point (`frontend/tests/runner.ts`) can run all test suites across Tiers 1-4, format results clearly according to the Interface Contract, and exit with status code 0 on pass or 1 on failure.
  4. The command can be bound directly in `frontend/package.json` scripts:
     `"test": "tsx tests/runner.ts"` and `"test:e2e": "tsx tests/runner.ts"`.

---

## 5. Capacitor & Browser Globals Mocking Strategy

### 5.1 Capacitor Plugin Mock Architecture (`mockCapacitorBridge.ts`)

A stateful mock environment provides deterministic control:

```typescript
// Structure of mockCapacitorBridge.ts
export interface MockCapacitorState {
    platform: 'android' | 'ios' | 'web';
    isNative: boolean;
    camera: {
        photoDataUrl: string | null;
        shouldFail: boolean;
        failError: Error | string | null;
    };
    geolocation: {
        coords: { latitude: number; longitude: number; accuracy: number };
        permissionStatus: 'granted' | 'denied' | 'prompt';
        shouldTimeout: boolean;
    };
    screenOrientation: {
        currentOrientation: string;
        lockedOrientation: string | null;
    };
    preferences: Map<string, string>;
    app: {
        version: string;
        eventListeners: Map<string, Array<(data: any) => void>>;
        exitAppCalls: number;
    };
}
```

### 5.2 Browser Globals Shim (`setupBrowserMocks.ts`)

1. **`window` Shim**:
   - `EventTarget` based event handling for `beforeinstallprompt`, `appinstalled`.
   - `window.devicePixelRatio = 2`.
   - `window.location = { pathname: '/dashboard' }`.
   - `window.matchMedia = (query) => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })`.
   - `window.open = (url, target) => { lastOpenedUrl = url; }`.

2. **`navigator` Quirks & Solution in Node 25**:
   - In Node 25, `globalThis.navigator` exists as a getter-only property on `globalThis`. Directly assigning `globalThis.navigator = ...` throws `TypeError: Cannot set property navigator of #<Object> which has only a getter`.
   - **Verified Fix**:
     ```typescript
     Object.defineProperty(globalThis.navigator, 'onLine', {
         value: true,
         writable: true,
         configurable: true
     });
     Object.defineProperty(globalThis.navigator, 'geolocation', {
         value: mockGeolocation,
         writable: true,
         configurable: true
     });
     Object.defineProperty(globalThis.navigator, 'mediaDevices', {
         value: { getUserMedia: async () => ({}) },
         writable: true,
         configurable: true
     });
     ```

3. **`document` & Canvas Shim**:
   - `document.querySelectorAll` returns mock elements with `querySelector` to simulate modal closing in `backButtonHandler.ts`.
   - Canvas mock returns a functional 2D context implementing:
     - `scale`, `beginPath`, `moveTo`, `lineTo`, `stroke`, `clearRect`.
     - `canvas.toDataURL('image/png')` returns a deterministic 1x1 transparent PNG data URL.

4. **Svelte 5 Runes Shim**:
   - Global shims defined before module loading:
     ```typescript
     (globalThis as any).$state = (v: any) => v;
     (globalThis as any).$derived = (fn: any) => typeof fn === 'function' ? fn() : fn;
     (globalThis as any).$effect = (fn: any) => { fn(); return () => {}; };
     (globalThis as any).$props = () => ({});
     (globalThis as any).$bindable = (v: any) => v;
     ```

---

## 6. Verification & Feasibility Proofs

All core operations have been tested and verified live in the actual project directory:

1. **Document Scanner Capture & PDF Bundling**:
   - Mocked `@capacitor/camera` with base64 PNG data URL.
   - Called `documentScannerService.capturePage()`. Verified output: `page.blob.size = 70`, `type = 'image/png'`.
   - Called `documentScannerService.bundleToPdf([page], 'TestBeleg')`. Verified output: `fileName = 'TestBeleg_2026-11-11.pdf'`, `pageCount = 1`, `pdfBlob.size = 1165 bytes`.
2. **Location Service & Reverse Geocoding**:
   - Mocked `@capacitor/geolocation` returning Berlin coordinates (52.5200, 13.4050).
   - Mocked Nominatim endpoint response with `Musterstraße 42, 10115 Berlin`.
   - Called `locationService.getCurrentPosition()`. Verified output: coordinates and `address = 'Musterstraße 42, 10115 Berlin'` cleanly formatted.
3. **Biometric Security & Resume Lock**:
   - Mocked `@capacitor/preferences` with in-memory storage.
   - Tested PIN setting with SHA-256 digest, verification of correct PIN (`true`), and incorrect PIN (`false`).
   - Simulated background resume event (`appStateChange` with `isActive: false`), verified `isLockActive` automatically transitioned to `true`.
4. **Execution Performance**:
   - Single test suite runs in **< 15ms**.
   - Full 75-test suite estimated execution time: **< 1.5 seconds**.

---

## 7. Recommended Directory Structure for `frontend/tests/`

```
frontend/tests/
├── setup.ts                           # Global initialization (runes, globals, mock bridge)
├── runner.ts                          # Master test runner with Tier breakdown & exit codes
├── mocks/
│   ├── mockCapacitorBridge.ts         # Stateful mock Capacitor plugin implementation
│   └── mockBrowserGlobals.ts          # Window, navigator, document, canvas mocks
├── tier1_feature_coverage/
│   ├── documentScanner.test.ts        # >=5 tests
│   ├── locationService.test.ts        # >=5 tests
│   ├── signatureModal.test.ts         # >=5 tests
│   ├── biometricSecurity.test.ts      # >=5 tests
│   ├── updateBanner.test.ts           # >=5 tests
│   └── pwaInstall.test.ts             # >=5 tests
├── tier2_boundaries_corners/
│   ├── documentScanner.corner.test.ts # >=5 tests
│   ├── locationService.corner.test.ts # >=5 tests
│   ├── signatureModal.corner.test.ts  # >=5 tests
│   ├── biometricSecurity.corner.test.ts# >=5 tests
│   ├── updateBanner.corner.test.ts    # >=5 tests
│   └── pwaInstall.corner.test.ts      # >=5 tests
├── tier3_cross_feature/
│   └── crossFeature.test.ts           # >=10 tests
└── tier4_real_world/
    └── workflows.test.ts              # >=5 tests
```

Total planned tests: **30 (Tier 1) + 30 (Tier 2) + 10 (Tier 3) + 5 (Tier 4) = 75 tests minimum**.
