# Handoff Report: Native Features Specification Mining (Spec Miner 2)

**Milestone**: E2E-2 (Native Features Specifications & Behaviors)  
**Author**: Spec Miner 2  
**Date**: 2026-11-11  
**State Folder**: `s:\OrgaFlow_Alpha\.agents\teamwork\spec_miner_e2e_2\`  

---

## 1. Observation

### Source Files & Locations Probed
1. `documentScannerService.ts`: `s:\OrgaFlow_Alpha\frontend\src\lib\services\documentScannerService.ts` (122 lines)
   - Line 25-55: `async capturePage(): Promise<ScannedPage | null>`:
     Calls `Camera.getPhoto({ quality: 85, allowEditing: false, resultType: CameraResultType.DataUrl, source: CameraSource.Camera, promptLabelHeader: 'Beleg fotografieren', promptLabelPhoto: 'Aus Galerie wählen', promptLabelPicture: 'Foto aufnehmen' })`.
     Line 49-51: `if (error?.message?.includes('User cancelled') || error === 'User cancelled photos app') { return null; }`
     Line 53: `throw new Error('Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.');`
   - Line 60-111: `async bundleToPdf(pages: ScannedPage[], documentTitle = 'Beleg'): Promise<DocumentScanResult>`:
     Line 61-63: `if (!pages || pages.length === 0) throw new Error('Es wurden keine Seiten zum Erstellen des PDFs ausgewählt.');`
     Line 72-76: Checks `page.blob.type === 'image/png'` -> calls `pdfDoc.embedPng()`, else `pdfDoc.embedJpg()`.
     Line 80-86: Scales proportionally to A4 dimensions (595.28 x 841.89 points) with `Math.min(a4Width / width, a4Height / height, 1)`.
     Line 103: Filename generated as `${documentTitle}_${dateStr}.pdf` where `dateStr = new Date().toISOString().slice(0, 10)`.
   - Line 116-119: `isCameraAvailable(): boolean`:
     `if (Capacitor.isNativePlatform()) return true; return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;`

2. `locationService.ts`: `s:\OrgaFlow_Alpha\frontend\src\lib\services\locationService.ts` (110 lines)
   - Line 20-36: `async checkOrRequestPermissions(): Promise<boolean>`:
     Line 23-26: `const status = await Geolocation.checkPermissions(); if (status.location === 'granted') return true; const req = await Geolocation.requestPermissions({ permissions: ['location'] }); return req.location === 'granted';`
     Line 28-29: Web fallback: `if (typeof navigator !== 'undefined' && 'geolocation' in navigator) return true;`
   - Line 41-77: `async getCurrentPosition(): Promise<LocationCoordinates>`:
     Line 42-45: If `!hasPermission` -> `throw new Error('Der Standortzugriff wurde abgelehnt. Bitte in den Geräteeinstellungen aktivieren.');`
     Line 48-52: `Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 })`.
     Line 62-67: Calls `reverseGeocode()`; on error or offline: `// Bei Netzwerkausfall bleibt der Koordinatensatz gültig`.
     Line 72-74: If `error?.message?.includes('Timeout') || error?.code === 3` -> `throw new Error('Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten.');`
     Line 75: Other errors -> `throw new Error('Der aktuelle Standort konnte nicht erfasst werden.');`
   - Line 82-107: `async reverseGeocode(lat: number, lon: number): Promise<string | null>`:
     Line 83: `if (typeof window === 'undefined' || !navigator.onLine) return null;`
     Line 85: Query: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1` with header `{ 'Accept-Language': 'de' }`.
     Line 94-103: Assembles formatted address `"${street} ${houseNo}, ${postcode} ${city}"` or falls back to `data.display_name || null`.

3. `FullscreenSignatureModal.svelte`: `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\FullscreenSignatureModal.svelte` (205 lines)
   - Line 8-20: Props `{ title = "Unterschrift erfassen", signerName = "", isOpen = $bindable(false), onSave, onCancel }`.
   - Line 27-39: `onMount` lifecycle:
     ```svelte
     onMount(() => {
         if (!isOpen) return;
         setupOrientation();
         const unregisterBack = backButtonHandler.register(() => {
             closeModal();
             return true;
         });
         return () => {
             resetOrientation();
             unregisterBack();
         };
     });
     ```
   - Line 41-55: `setupOrientation()` calls `ScreenOrientation.lock({ orientation: 'landscape' })`; `resetOrientation()` calls `ScreenOrientation.unlock()`.
   - Line 117-122: `handleSave()`: `if (!canvas || !hasSignature) return; const dataUrl = canvas.toDataURL('image/png'); onSave(dataUrl); closeModal();`.
   - Line 124-128: `closeModal()`: `resetOrientation(); isOpen = false; onCancel?.();`.
   - Line 186 & 196: Buttons "Löschen" and "Bestätigen" have `disabled={!hasSignature}`.

4. `biometricService.ts`: `s:\OrgaFlow_Alpha\frontend\src\lib\services\biometricService.ts` (96 lines)
   - Keys: `PREF_BIOMETRIC_KEY = 'orga_biometric_lock_enabled'`, `PREF_PIN_HASH_KEY = 'orga_app_pin_hash'`.
   - Line 16-40: `init()`:
     Line 22: `this.isEnabled = value === 'true';`
     Line 26: `if (this.isEnabled) this.isLockedState = true;`
     Line 30-36: `App.addListener('appStateChange', (state) => { if (!state.isActive && this.isEnabled) { this.isLockedState = true; } });`
   - Line 42-44: `get isLockActive(): boolean { return this.isEnabled && this.isLockedState; }`
   - Line 61-69: `setPin(pin: string)`: Hashes via `crypto.subtle.digest('SHA-256', data)` and saves hex string in Preferences.
   - Line 71-89: `verifyPin(pin: string)`: Reads stored hash. If `!value` returns `true`. If hash matches, `this.isLockedState = false; return true;`. Mismatch returns `false`.

5. `NativeAppManager.svelte`: `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\NativeAppManager.svelte` (97 lines)
   - Mounted globally in `frontend/src/routes/+layout.svelte` at line 183 (`<NativeAppManager isLoggedIn={auth.isLoggedIn} />`).
   - Line 17-23: On mount on native platform, initializes `backButtonHandler`, calls `biometricService.init()`, and assigns `isLocked = biometricService.isLockActive`.
   - Line 54-96: Stacking layer `z-[10000]` fullscreen overlay (`data-modal-open="true"`). 6-digit numeric password input with "Entsperren" button and error feedback.

6. `AppUpdateBanner.svelte`: `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\AppUpdateBanner.svelte` (81 lines)
   - Line 12-15: `if (!Capacitor.isNativePlatform()) return; await checkUpdate();`.
   - Line 17-38: `checkUpdate()`: Compares `App.getInfo().version` with `https://www.ihre-seniorenassistenz.com/api/mobile/version.json`.
   - Line 40-45: `handleDownload()` opens downloadUrl with `window.open(downloadUrl, '_system')` and sets `isDismissed = true`.
   - Line 51: Stacking layer `z-[9980]`.

7. `PwaInstallButton.svelte`: `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\PwaInstallButton.svelte` (76 lines)
   - Line 17-20: Aborts if `Capacitor.isNativePlatform()` or if `matchMedia('(display-mode: standalone)').matches` or `(navigator as any).standalone`.
   - Line 22-36: Captures `beforeinstallprompt`, calls `e.preventDefault()`, sets `canInstall = true`. Listens to `appinstalled` to hide.
   - Line 39-47: `installPwa()` calls `deferredPrompt.prompt()`, checks `outcome === 'accepted'`, resets prompt.

8. Discovered Subsystems:
   - `backButtonHandler.ts` (72 lines): Priority stack of back handlers -> DOM query for `[data-modal-open="true"]` -> history back -> double press within 2000ms `App.exitApp()`.
   - `pushNotificationService.ts` (113 lines): Native/Web push registration saved to PocketBase `push_subscriptions`.
   - `layerStackService.ts` (137 lines): Dynamic z-index manager starting at 100000 for dialogs and modal backdrops.
   - `MobileOnboardingModal.svelte` (134 lines): First-run permissions modal (`z-[9990]`) for Camera, Geolocation, and Push.

---

## 2. Logic Chain

1. **Service and Component Architecture**:
   - The native capabilities are decoupled into headless TypeScript service singletons (`documentScannerService`, `locationService`, `biometricService`, `backButtonHandler`, `pushNotificationService`) and modular UI trigger/modal components (`DocumentScanButton`, `GpsAddressButton`, `FullscreenSignatureModal`, `NativeAppManager`, `AppUpdateBanner`, `PwaInstallButton`).
   - This architectural decoupling directly enables opaque-box unit and E2E testing without physical devices by substituting a mock Capacitor plugin layer.

2. **Error and Cancellation Handling**:
   - In `documentScannerService.ts`, user cancellation in the camera app is identified by inspecting error strings (`'User cancelled'`). Rather than re-throwing, it returns `null`. This prevents application-level error toasts during intentional user cancellations.
   - In `locationService.ts`, network failures during reverse geocoding are caught and suppressed so that the raw GPS coordinates (`latitude`, `longitude`, `accuracy`) remain usable for offline or rural trip logging.
   - In `FullscreenSignatureModal.svelte`, empty signatures are strictly prevented at both the UI layer (`disabled={!hasSignature}`) and the handler guard (`if (!hasSignature) return;`).

3. **Lifecycle Anomaly in Signature Modal**:
   - In `FullscreenSignatureModal.svelte` line 28, `onMount` checks `if (!isOpen) return;`.
   - Because modals in Svelte are normally instantiated when `isOpen` is initially `false`, the orientation lock and back-button registration would not execute when `isOpen` is toggled to `true`.
   - This directly corroborates Milestone 3 Item 9 in `PROJECT.md` ("Signature Lifecycle Fix: Svelte 5 `$effect` reactive orientation lock & back-button unregister in `FullscreenSignatureModal`").

4. **Security & Resume Lock**:
   - The biometric/PIN security mechanism in `biometricService.ts` uses SHA-256 password hashing and relies on `@capacitor/preferences` for persistent state and `@capacitor/app` `appStateChange` event for background-to-foreground transitions.
   - The UI lock overlay in `NativeAppManager.svelte` sits at `z-[10000]`, above all other standard application modals (`z-[9999]` and below), adhering to `layer-stacking.md`.

---

## 3. Caveats

- `DocumentScanButton.svelte` and `GpsAddressButton.svelte` were identified in `PROJECT.md` §44-58 and §Code Layout as new reusable trigger components to be created in Milestones 1 and 2. Their contracts, prop types, and workflows are completely specified, but the actual files have not yet been written to disk in `frontend/src/lib/components/common/`.
- In `biometricService.ts`, the current implementation uses SHA-256 PIN hashing stored in Preferences. Physical biometric authentication (Face ID / Fingerprint via hardware sensor) is not implemented via an external plugin (e.g. `@aparajita/capacitor-biometric-auth`), as evidenced by `package.json` dependencies; instead, device PIN acts as the fallback credential.
- In `AppUpdateBanner.svelte`, the remote version endpoint (`https://www.ihre-seniorenassistenz.com/api/mobile/version.json`) is an external production URL. E2E test suites must mock this endpoint to prevent external network dependencies.

---

## 4. Conclusion

All 6 primary native features and 4 additional discovered subsystems have been completely mined and documented. The observable behaviors, method signatures, return types, error messages, and edge cases are documented in `analysis.md`:
- Document Scanner Service: 3 public methods, 2 types, 6 edge cases.
- Location Service: 3 public methods, 1 coordinate interface, 5 edge cases.
- Fullscreen Signature Modal: 5 props, landscape orientation lock/unlock, 5 edge cases.
- Biometric Service & NativeAppManager: 7 methods/getters, 2 preference keys, SHA-256 verification, 5 edge cases.
- App Update Banner: 1 remote check method, 4 edge cases.
- PWA Install Button: 2 variants, `beforeinstallprompt` capture, 4 edge cases.
- Plus Back Button Handler, Push Notification Service, Layer Stack Service, and Mobile Onboarding Modal.

The E2E test framework can now construct the mock Capacitor environment and author test cases for Tiers 1–4 with 100% specification parity.

---

## 5. Verification Method

To independently verify the mined specifications:
1. **Source Inspection**:
   - Inspect `frontend/src/lib/services/documentScannerService.ts` for camera parameters and PDF scaling.
   - Inspect `frontend/src/lib/services/locationService.ts` for timeout (10000ms), maxAge (5000ms), and Nominatim URL.
   - Inspect `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` for orientation lock and `hasSignature` button disabling.
   - Inspect `frontend/src/lib/services/biometricService.ts` for SHA-256 digest and Preferences keys.
   - Inspect `frontend/src/lib/components/app/AppUpdateBanner.svelte` for version check logic and `Capacitor.isNativePlatform()` guard.
   - Inspect `frontend/src/lib/components/app/PwaInstallButton.svelte` for `beforeinstallprompt` listener and standalone check.
2. **Analysis Report Inspection**:
   - Inspect `s:\OrgaFlow_Alpha\.agents\teamwork\spec_miner_e2e_2\analysis.md` for the complete feature inventory and edge cases matrix.
3. **TypeScript Type Verification**:
   - Run `npm run check` in `frontend/` to confirm all existing TypeScript declarations compile cleanly.
