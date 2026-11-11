# Specification Mining Report: OrgaFlow Native Features (E2E Testing Track)

**Target Milestone**: E2E-2 / E2E Testing Track  
**Author**: Spec Miner 2  
**Date**: 2026-11-11  
**Authoritative Sources**:
- `s:\OrgaFlow_Alpha\ORIGINAL_REQUEST.md`
- `s:\OrgaFlow_Alpha\PROJECT.md`
- `s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_e2e\SCOPE.md`
- Source code in `s:\OrgaFlow_Alpha\frontend\src\`

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Native Hardware / Camera | Document Scanner Service (`documentScannerService.ts`) | Captures single/multi-page receipt photos via device camera/gallery and bundles them into an A4 PDF document directly on device. | `capturePage()`: None<br>`bundleToPdf(pages: ScannedPage[], documentTitle?: string)`: Array of `{ dataUrl, blob }`, optional string title | `capturePage()`: `Promise<ScannedPage \| null>`<br>`bundleToPdf()`: `Promise<DocumentScanResult>` (`{ pdfBlob, fileName, pageCount, pages }`)<br>`isCameraAvailable()`: `boolean` | On user cancel: returns `null`. On camera/permission error: throws `'Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.'`. On empty pages in bundle: throws `'Es wurden keine Seiten zum Erstellen des PDFs ausgewählt.'`. | `documentScannerService.ts`, `PROJECT.md` §44 |
| 2 | Common UI Triggers | Document Scan Button (`DocumentScanButton.svelte`) | Reusable trigger button that initiates document scan workflow and returns compiled PDF File object to parent. | `onScanComplete: (file: File) => void`<br>`label?: string` (default: "Dokument scannen")<br>`variant?: 'primary' \| 'secondary' \| 'compact' \| 'icon'`<br>`disabled?: boolean` | Emits `File` (MIME: `application/pdf`, filename: `Beleg_YYYY-MM-DD.pdf`) via callback | Disables button during capture; shows error feedback on hardware/permission rejection; cancels cleanly without emitting file if user aborts. | `PROJECT.md` §44-50, §Code Layout |
| 3 | Native Hardware / Geolocation | Location Service (`locationService.ts`) | Single-shot GPS position acquisition with 10s timeout and reverse geocoding via OpenStreetMap Nominatim. | `checkOrRequestPermissions()`: None<br>`getCurrentPosition()`: None<br>`reverseGeocode(lat: number, lon: number)`: lat/lon floats | `checkOrRequestPermissions()`: `Promise<boolean>`<br>`getCurrentPosition()`: `Promise<LocationCoordinates>` (`{ latitude, longitude, accuracy, timestamp, address? }`)<br>`reverseGeocode()`: `Promise<string \| null>` | If permission denied: throws `'Der Standortzugriff wurde abgelehnt...'`. If GPS timeout (code 3 / 'Timeout'): throws `'Standort-Signal zu schwach...'`. On other GPS errors: throws `'Der aktuelle Standort konnte nicht erfasst werden.'`. If offline or Nominatim fails: coordinates are returned without address (fails gracefully). | `locationService.ts`, `PROJECT.md` §52 |
| 4 | Common UI Triggers | GPS Address Button (`GpsAddressButton.svelte`) | 1-click location capture button that triggers locationService, displays acquisition spinner, and feeds address + coordinates to parent mask. | `onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void`<br>`label?: string` (default: "Standort erfassen")<br>`variant?: 'button' \| 'icon'` | Passes formatted address string (or coordinate string fallback) and `{ latitude, longitude }` to callback | Displays acquisition spinner, disables button while acquiring; on failure shows toast error and restores idle state. | `PROJECT.md` §52-58, §Code Layout |
| 5 | Native UI / Signature | Fullscreen Signature Modal (`FullscreenSignatureModal.svelte`) | Fullscreen landscape touch/pen signature pad with device orientation lock, Android back-button interception, and empty save prevention. | `isOpen: boolean` ($bindable)<br>`title?: string` (default: "Unterschrift erfassen")<br>`signerName?: string`<br>`onSave: (dataUrl: string) => void`<br>`onCancel?: () => void` | Calls `onSave(dataUrl: string)` (PNG data URL) on confirm; calls `onCancel()` on close/dismiss | Prevent empty save: "Bestätigen" and "Löschen" buttons are disabled until drawing detected (`hasSignature === true`). On close: restores screen orientation unlock and unregisters back-button handler. | `FullscreenSignatureModal.svelte`, `PROJECT.md` §59-66 |
| 6 | Native Security / Biometrics | Biometric Service (`biometricService.ts` / `biometricService.svelte.ts`) | App resume lock and SHA-256 PIN security using `@capacitor/preferences` and `@capacitor/app` state change lifecycle. | `init()`: None<br>`setEnabled(enabled: boolean)`: boolean<br>`setPin(pin: string)`: numeric string<br>`verifyPin(pin: string)`: numeric string<br>`unlock()`: None | `isLockActive: boolean`<br>`isConfigured: boolean`<br>`verifyPin()`: `Promise<boolean>` | If no PIN configured, `verifyPin()` returns true. Wrong PIN returns `false`. Preferences read failure logs warning and defaults to unlocked. | `biometricService.ts`, `PROJECT.md` §68-79 |
| 7 | Native Security UI | Native App Manager (`NativeAppManager.svelte`) | Root manager component mounted in `+layout.svelte`; hosts biometric lock overlay (z-10000), back button initialization, update banner, and onboarding modal. | `isLoggedIn: boolean` | Shows full-screen lock screen when `isLockActive === true`; registers push token when `isLoggedIn === true` | Rejects invalid PIN with visual feedback ("Ungültiger PIN. Bitte erneut versuchen."); limits PIN input to 6 digits numeric. | `NativeAppManager.svelte`, `+layout.svelte` §183 |
| 8 | Native App Lifecycle | App Update Banner (`AppUpdateBanner.svelte`) | Checks remote `version.json` on native platform startup and displays non-intrusive update notification with APK download link. | None (reads remote endpoint `https://www.ihre-seniorenassistenz.com/api/mobile/version.json`) | Renders `<aside>` banner (`z-[9980]`) if remote version != app version | Only runs on native platform (`Capacitor.isNativePlatform()`). Fails silently if offline or endpoint unreachable. Dismissable via "X" or "Laden". | `AppUpdateBanner.svelte` |
| 9 | PWA Installation | PWA Install Button (`PwaInstallButton.svelte`) | Captures browser `beforeinstallprompt` event and presents 1-click installation trigger for desktop/browser users. | `variant?: 'compact' \| 'full'` (default: `'compact'`) | Calls browser installation prompt; hides button upon successful install (`appinstalled`) | Hides button completely if native (`Capacitor.isNativePlatform()`), if standalone PWA (`display-mode: standalone`), or if browser lacks prompt support. | `PwaInstallButton.svelte`, `PROJECT.md` §27 |
| 10 | Native Navigation | Back Button Handler (`backButtonHandler.ts`) | Android hardware back button and swipe gesture manager; handles layered modal dismissal, history navigation, and double-press app exit. | `register(handler: () => boolean): () => void` | Executes top-most registered handler, or triggers close on `[data-modal-open="true"]`, or navigates history back, or exits app | 2000ms debounce for app exit: first press shows toast warning, second press within 2s triggers `App.exitApp()`. | `backButtonHandler.ts` |
| 11 | Native Notifications | Push Notification Service (`pushNotificationService.ts`) | Manages native (FCM/APNS) and Web Push tokens, persists them to PocketBase collection `push_subscriptions`, and routes action deep links. | `registerDevice(): Promise<boolean>` | Saves `{ user, token, platform }` to PocketBase; navigates on notification tap | Returns `false` if permission denied or unsupported platform. Catches registration errors without application crash. | `pushNotificationService.ts` |
| 12 | Window Management | Layer Stack Service (`layerStackService.ts`) | Dynamic z-index manager ensuring active dialogs and overlays stack sequentially above base content (starts at 100000). | DOM Mutation / `HTMLDialogElement.prototype.showModal` interception | Injects dynamic inline `z-index` | Exempts `#global-toast-container` and `#feedback-widget-button` from suppression. | `layerStackService.ts` |
| 13 | Mobile Onboarding | Mobile Onboarding Modal (`MobileOnboardingModal.svelte`) | First-run permissions setup modal displayed once on native login; requests Camera, Geolocation, and Push permissions sequentially. | None (reads `orga_mobile_onboarded_v1` from Preferences) | Triggers permission dialogs and persists completion flag | Permission rejections do not block progression; persists `onboarded` flag on dismiss or grant. | `MobileOnboardingModal.svelte` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| E1 | Document Scanner Service | User opens camera and cancels capture (e.g. presses back or cancel in photos app) | `Camera.getPhoto` throws error containing `'User cancelled'`. Service catches this, recognizes cancellation, and returns `null` instead of throwing an error. |
| E2 | Document Scanner Service | Camera permission denied by user or OS | `Camera.getPhoto` throws error. Service logs error and throws `Error('Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.')`. |
| E3 | Document Scanner Service | `bundleToPdf` called with empty array `[]` | Immediately throws `Error('Es wurden keine Seiten zum Erstellen des PDFs ausgewählt.')` before invoking `pdf-lib`. |
| E4 | Document Scanner Service | PNG image supplied instead of JPEG | Detects `page.blob.type === 'image/png'` and executes `pdfDoc.embedPng(imageBytes)` instead of `embedJpg(imageBytes)`. |
| E5 | Document Scanner Service | High resolution image larger than A4 page (595.28 x 841.89 pt) | Proportional scale factor calculated: `Math.min(a4Width / width, a4Height / height, 1)`. Downscales image to fit within A4 boundaries and centers it horizontally and vertically. |
| E6 | Document Scanner Service | Small image smaller than A4 page | Scale factor is `1` (does not upscale low-res images). Centers image on A4 page with whitespace borders. |
| E7 | Location Service | Location permission rejected by user or OS | `checkOrRequestPermissions()` returns `false`. `getCurrentPosition()` immediately throws `Error('Der Standortzugriff wurde abgelehnt. Bitte in den Geräteeinstellungen aktivieren.')` without calling GPS hardware. |
| E8 | Location Service | GPS satellite signal timeout (indoors / underground) | `Geolocation.getCurrentPosition` exceeds 10000ms timeout or returns error code 3. Service catches error and throws `Error('Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten.')`. |
| E9 | Location Service | Device is offline during reverse geocoding (`navigator.onLine === false`) | `reverseGeocode()` returns `null` immediately. `getCurrentPosition()` retains valid coordinates (`latitude`, `longitude`, `accuracy`, `timestamp`), omits `address` property, and completes successfully. |
| E10 | Location Service | Nominatim reverse geocode server returns HTTP 500 or timeout | Swallowed by internal try-catch in `getCurrentPosition()`. Coordinates are returned to caller without crashing. |
| E11 | Location Service | Address lacks specific fields (e.g. no house number or no road name in rural area) | Extracts available components (`street`, `houseNo`, `postcode`, `city`). If road/city missing, falls back to `data.display_name`. If both missing, returns `null`. |
| E12 | Fullscreen Signature Modal | User attempts to click "Bestätigen" or "Löschen" with blank canvas | Buttons have `disabled={!hasSignature}` attribute. `handleSave()` has explicit guard `if (!canvas || !hasSignature) return;`. Empty signature cannot be submitted. |
| E13 | Fullscreen Signature Modal | User opens modal on High-DPI / Retina device | Canvas width and height are scaled by `window.devicePixelRatio`. Context scale `ctx.scale(dpr, dpr)` is applied. Strokes render smoothly without pixelation. |
| E14 | Fullscreen Signature Modal | Android hardware back button pressed while modal is active | Intercepted by `backButtonHandler` stack. Executes `closeModal()`, which unlocks screen orientation, sets `isOpen = false`, and fires `onCancel?.()`. Does not exit application or trigger history back. |
| E15 | Fullscreen Signature Modal | User leaves canvas boundary during active drawing (`mouseleave` / touch cancel) | Triggers `stopDrawing()`. `isDrawing` resets to `false`. Re-entering the canvas will not create unintentional connecting strokes. |
| E16 | Fullscreen Signature Modal | Orientation lock unsupported or rejected by web browser | Wrapped in try-catch `try { await ScreenOrientation.lock(...) } catch (e) {}`. Fails silently without crashing the application. |
| E17 | Biometric Service | Cold start with `orga_biometric_lock_enabled === 'true'` | `init()` sets `isLockedState = true`. In `NativeAppManager`, `isLocked = biometricService.isLockActive` evaluates to `true`. Fullscreen lock screen renders immediately on app launch. |
| E18 | Biometric Service | Application minimized to background and resumed (`appStateChange`) | On native platform, `App.addListener('appStateChange')` receives `state.isActive === false`. If `isEnabled === true`, sets `isLockedState = true`. App is immediately locked when resumed. |
| E19 | Biometric Service | Incorrect PIN entered by user | Computes SHA-256 hex string. Compares with stored hash in Preferences. On mismatch, returns `false`. `NativeAppManager` displays "Ungültiger PIN. Bitte erneut versuchen.", clears input, and maintains lock. |
| E20 | Biometric Service | Correct PIN entered by user | SHA-256 hex string matches stored preference. Sets `isLockedState = false` and returns `true`. `NativeAppManager` clears `isLocked = false`, clearing modal. |
| E21 | Biometric Service | PIN verification attempted when no PIN hash exists in Preferences | `verifyPin()` checks `if (!value) return true;`. Allows access without locking user out permanently. |
| E22 | App Update Banner | Non-native platform (Web browser or desktop PWA) | `if (!Capacitor.isNativePlatform()) return;` aborts check in `onMount`. Banner is never rendered in browser environments. |
| E23 | App Update Banner | App version matches remote version (`data.version === appVersion`) | `availableVersion` remains `null`. Banner remains unmounted. |
| E24 | App Update Banner | Device is offline or update endpoint returns 404/500 | Network fetch failure is caught in empty catch block. Fails silently without user interruption or error alert. |
| E25 | App Update Banner | User clicks "X" ("Später erinnern") | Sets `isDismissed = true`. Banner unmounts immediately for current session. |
| E26 | PWA Install Button | Accessed within native mobile app (Capacitor) | `if (Capacitor.isNativePlatform()) return;` aborts in `onMount`. Button is never displayed in native apps. |
| E27 | PWA Install Button | App already running as installed standalone PWA | Checked via `window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone`. Aborts in `onMount`. Button is hidden. |
| E28 | PWA Install Button | Browser does not support `beforeinstallprompt` (Firefox Desktop, Safari iOS) | Event never fires. `canInstall` remains `false`. Button remains hidden, preventing non-functional UI elements. |
| E29 | PWA Install Button | User accepts browser install prompt (`outcome === 'accepted'`) | `canInstall` set to `false`, `deferredPrompt` set to `null`. Button disappears immediately upon acceptance. |
| E30 | Back Button Handler | User presses hardware back button twice within 2000ms on home/dashboard | Calculates `Date.now() - this.lastBackPress < 2000`. If `< 2000ms`, calls `App.exitApp()`. If first press, updates timestamp and displays toast "Noch einmal tippen zum Beenden der App.". |

---

## Detailed Feature Specifications & Interfaces

### 1. Document Scanner Service (`documentScannerService.ts`) & `DocumentScanButton.svelte`

#### Interface Definitions
```typescript
export interface ScannedPage {
    dataUrl: string;
    blob: Blob;
}

export interface DocumentScanResult {
    pdfBlob: Blob;
    fileName: string;
    pageCount: number;
    pages: ScannedPage[];
}

export interface DocumentScannerServiceInterface {
    capturePage(): Promise<ScannedPage | null>;
    bundleToPdf(pages: ScannedPage[], documentTitle?: string): Promise<DocumentScanResult>;
    isCameraAvailable(): boolean;
}
```

#### `DocumentScanButton.svelte` Component Contract
- **Path**: `frontend/src/lib/components/common/DocumentScanButton.svelte`
- **Props**:
  - `onScanComplete: (file: File) => void` (required callback)
  - `label?: string` (default: `"Dokument scannen"`)
  - `variant?: 'primary' | 'secondary' | 'compact' | 'icon'` (default: `'secondary'`)
  - `disabled?: boolean` (default: `false`)
- **State Machine**:
  1. `IDLE`: Button enabled, awaiting user click.
  2. `CAPTURING`: Button disabled/spinner active. Calls `documentScannerService.capturePage()`.
  3. `PAGE_CAPTURED`: Page received. Prompts user or automatically proceeds. Multi-page workflow accumulates pages into `pages: ScannedPage[]`.
  4. `BUNDLING`: Calls `documentScannerService.bundleToPdf(pages, title)`.
  5. `COMPLETED`: Wraps `result.pdfBlob` into `new File([result.pdfBlob], result.fileName, { type: 'application/pdf' })`, invokes `onScanComplete(file)`, resets to `IDLE`.
  6. `CANCELLED`: If `capturePage()` returns `null` on first page, returns to `IDLE` without firing callback.
  7. `ERROR`: If camera throws error, catches exception, shows toast warning, returns to `IDLE`.

---

### 2. Location Service (`locationService.ts`) & `GpsAddressButton.svelte`

#### Interface Definitions
```typescript
export interface LocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    address?: string;
}

export interface LocationServiceInterface {
    checkOrRequestPermissions(): Promise<boolean>;
    getCurrentPosition(): Promise<LocationCoordinates>;
    reverseGeocode(lat: number, lon: number): Promise<string | null>;
}
```

#### `GpsAddressButton.svelte` Component Contract
- **Path**: `frontend/src/lib/components/common/GpsAddressButton.svelte`
- **Props**:
  - `onAddressCaptured: (address: string, coords: { latitude: number; longitude: number }) => void`
  - `label?: string` (default: `"Standort erfassen"`)
  - `variant?: 'button' | 'icon'` (default: `'button'`)
- **State Machine**:
  1. `IDLE`: Displays map pin icon + label.
  2. `ACQUIRING`: Loading spinner displayed, button disabled. Calls `locationService.getCurrentPosition()`.
  3. `SUCCESS`: Receives `LocationCoordinates`. If `address` present, uses `address`. If offline/no address, formats fallback string `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`. Calls `onAddressCaptured(address, { latitude, longitude })`. Returns to `IDLE`.
  4. `ERROR`: If permission denied or GPS timeout occurs, catches error message, shows toast error, returns to `IDLE`.

---

### 3. Fullscreen Signature Modal (`FullscreenSignatureModal.svelte`)

#### Interface Definitions
```typescript
export interface FullscreenSignatureModalProps {
    isOpen: boolean; // $bindable
    title?: string; // default: "Unterschrift erfassen"
    signerName?: string; // default: ""
    onSave: (dataUrl: string) => void;
    onCancel?: () => void;
}
```

#### State Machine & Lifecycle Transitions
```
                [isOpen becomes true]
                         │
                         ▼
        ┌───────────────────────────────────┐
        │        OPENING / SETUP            │
        │ - ScreenOrientation.lock('land')  │
        │ - backButtonHandler.register()    │
        │ - canvas size * devicePixelRatio  │
        │ - hasSignature = false            │
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │        AWAITING SIGNATURE         │
        │ - Empty prompt visible            │
        │ - Bestätigen button: DISABLED     │
        │ - Löschen button: DISABLED        │
        └───────────────┬───▲───────────────┘
  touchstart/mousedown  │   │  clear() (Löschen)
                        ▼   │
        ┌───────────────────┴───────────────┐
        │        SIGNING / SIGNED           │
        │ - Stroke recorded on 2D context   │
        │ - hasSignature = true             │
        │ - Bestätigen button: ENABLED      │
        │ - Löschen button: ENABLED         │
        └───────────────┬───────────────────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
[Bestätigen]       [X / Cancel]     [Back Button]
       │                │                │
       ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ handleSave() │ │ closeModal() │ │ closeModal() │
│ - toDataURL()│ │ - unlock()   │ │ - unlock()   │
│ - onSave()   │ │ - onCancel() │ │ - onCancel() │
│ - closeModal │ └──────────────┘ └──────────────┘
└──────────────┘
```

#### Key Implementation Note (Lifecycle Fix per PROJECT.md Milestone 3)
- In the existing codebase (`FullscreenSignatureModal.svelte` line 28), lifecycle is placed in `onMount(() => { if (!isOpen) return; ... })`. When the component mounts while `isOpen` is `false`, orientation lock and back-button registration are skipped.
- Per `PROJECT.md` line 23 & line 66, lifecycle must be reactive via Svelte 5 `$effect(() => { if (isOpen) { setup(); return () => cleanup(); } })`.

---

### 4. Biometric Service (`biometricService.ts` / `biometricService.svelte.ts`) & `NativeAppManager.svelte`

#### Interface Definitions
```typescript
export interface BiometricServiceInterface {
    isLockActive: boolean;
    isConfigured: boolean;
    init(): Promise<void>;
    setEnabled(enabled: boolean): Promise<void>;
    setPin(pin: string): Promise<void>;
    verifyPin(pin: string): Promise<boolean>;
    unlock(): void;
}

// Svelte 5 Reactive Specification (PROJECT.md §68-79)
export interface BiometricServiceReactiveInterface {
    isLockActive: boolean; // Svelte 5 $state
    isEnabled: boolean;    // Svelte 5 $state
    init(): Promise<void>;
    enable(pin: string): Promise<boolean>;
    disable(pin: string): Promise<boolean>;
    verifyPin(pin: string): Promise<boolean>;
    lock(): void;
    unlock(pin: string): Promise<boolean>;
}
```

#### State Machine & Resume Security
```
                 [App Start / init()]
                          │
            ┌─────────────┴─────────────┐
     isEnabled == true           isEnabled == false
            │                           │
            ▼                           ▼
    isLockedState = true        isLockedState = false
   (Show PIN Lock Screen)           (Normal App)
            │                           │
            │ PIN verified              │ App backgrounded
            ▼                           ▼
      Normal App <──────────────── appStateChange
                                (state.isActive == false)
                                 -> isLockedState = true
```

#### `NativeAppManager.svelte` UI Stacking
- Layer priority: `z-[10000]`
- Elements: Lock icon, title "Seniorenassistenz", subtitle "App ist durch Sicherheits-PIN gesperrt", numeric password input (maxlength 6), error label "Ungültiger PIN. Bitte erneut versuchen.", "Entsperren" button.

---

### 5. App Update Banner (`AppUpdateBanner.svelte`)

#### Interface Definitions
```typescript
export interface VersionResponse {
    version: string;
    apkUrl?: string;
}

export interface AppUpdateBannerState {
    availableVersion: string | null;
    downloadUrl: string;
    isDismissed: boolean;
}
```

#### Execution Logic
1. `onMount`: Evaluates `Capacitor.isNativePlatform()`. If `false`, terminates immediately.
2. Reads `App.getInfo().version`, falls back to `CURRENT_VERSION = '1.0.0'`.
3. Fetches `https://www.ihre-seniorenassistenz.com/api/mobile/version.json` with `{ cache: 'no-store' }`.
4. If `data.version !== appVersion`:
   - `availableVersion = data.version`
   - If `data.apkUrl`, sets `downloadUrl = data.apkUrl`.
5. Renders `<aside class="fixed top-3 ... z-[9980] bg-indigo-600 ...">`.
6. "Laden" button calls `window.open(downloadUrl, '_system')` and sets `isDismissed = true`.
7. "X" button sets `isDismissed = true`.

---

### 6. PWA Installation Button (`PwaInstallButton.svelte`)

#### Interface Definitions
```typescript
export interface PwaInstallButtonProps {
    variant?: 'compact' | 'full'; // default: 'compact'
}
```

#### State Machine
```
   [Browser Page Load]
            │
  Native or Standalone? ─── YES ───► TERMINATE (Never renders)
            │ NO
            ▼
 [Listen for beforeinstallprompt]
            │
   Event fired ─── NO ─────────────► canInstall = false (Hidden)
            │ YES
            ▼
  canInstall = true (Renders button)
            │
     User clicks button
            │
   prompt() & await userChoice
            │
   outcome == 'accepted'?
     ├─ YES ──► canInstall = false (Hidden)
     └─ NO  ──► prompt cleared
            │
   [appinstalled event] ───────────► canInstall = false (Hidden)
```

---

## Cross-Cutting Architecture & Stacking Rules

### Stacking Hierarchy (per `layer-stacking.md`)
1. **Dynamic Top Overlays (`layerStackService.ts`)**: `z-index >= 100000` (highest dynamically assigned)
2. **Biometric PIN Lock (`NativeAppManager.svelte`)**: `z-[10000]`
3. **Fullscreen Signature Pad (`FullscreenSignatureModal.svelte`)**: `z-[9999]`
4. **Mobile Onboarding Modal (`MobileOnboardingModal.svelte`)**: `z-[9990]`
5. **App Update Banner (`AppUpdateBanner.svelte`)**: `z-[9980]`
6. **Toast Container (`#global-toast-container`)**: exempted from suppression
7. **Normal Dialogs & Modals**: standard flow with backdrop

---

## Test Automation & Mocking Blueprint for E2E Suite

For the E2E Test Suite (Node / Vitest / tsx) to verify these 6 features deterministically without physical hardware, the following mock Capacitor bridge is required:

1. `@capacitor/camera`:
   - Mock `Camera.getPhoto(options)`:
     - Configurable responses: success (`{ dataUrl: 'data:image/jpeg;base64,...' }`), user cancellation (`throw new Error('User cancelled photos app')`), permission denial (`throw new Error('Permission denied')`).
2. `@capacitor/geolocation`:
   - Mock `Geolocation.checkPermissions()` / `requestPermissions()`:
     - Configurable states: `'granted'`, `'denied'`.
   - Mock `Geolocation.getCurrentPosition(options)`:
     - Configurable responses: coordinates `{ coords: { latitude: 52.52, longitude: 13.405, accuracy: 10 }, timestamp: Date.now() }`, timeout (`throw { code: 3, message: 'Timeout expired' }`).
3. `@capacitor/screen-orientation`:
   - Mock `ScreenOrientation.lock({ orientation })` and `ScreenOrientation.unlock()`.
   - Spies recording orientation state.
4. `@capacitor/preferences`:
   - In-memory key-value store simulating `Preferences.get({ key })` and `Preferences.set({ key, value })`.
5. `@capacitor/app`:
   - Mock `App.addListener('appStateChange', cb)` allowing tests to simulate foreground/background transitions.
   - Mock `App.getInfo()` returning `{ version: '1.0.0' }`.
   - Mock `App.exitApp()`.
6. `@capacitor/core`:
   - Mock `Capacitor.isNativePlatform()` (switchable between `true` and `false`).
7. Network / Nominatim Mock:
   - Intercept fetch calls to `nominatim.openstreetmap.org` and `ihre-seniorenassistenz.com/api/mobile/version.json`.
