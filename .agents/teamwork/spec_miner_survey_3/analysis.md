# Phase 0 Survey & Specification Mining: Hybrid App Architecture, Build Pipelines, Schemas & Design Rules

**Workspace**: `s:\OrgaFlow_Alpha`  
**State Folder**: `s:\OrgaFlow_Alpha\.agents\teamwork\spec_miner_survey_3\`  
**Date**: 2026-11-11  
**Archetype**: Specification Miner (`teamwork_spec_miner`)

---

## Executive Summary

This survey provides an authoritative audit of the hybrid application architecture ("Seniorenassistenz"), Capacitor 7 configuration, platform capabilities (Android, iOS, PWA), build and synchronization pipelines, project design rule constraints, PocketBase schema structures, and test infrastructure in `s:\OrgaFlow_Alpha`.

### Key Verification Results
- **TypeScript & Svelte Diagnostics**: `npm run check` in `frontend/` completed with **0 errors and 0 warnings**.
- **Production Web Build**: `npm run build` in `frontend/` cleanly produced the SPA bundle in `frontend/pb_public` (using `@sveltejs/adapter-static` with fallback `index.html`) and copied it via `postbuild` to `backend/pb_public`.
- **Capacitor Android Sync**: `npx cap sync` in `frontend/` completed in 0.759s with **9 active plugins** synchronized to `frontend/android/app/src/main/assets/public`.
- **Platform Status**:
  - Android is fully configured with Capacitor 7.6.10, SDK compile/target 35, and permissions for Camera, Geolocation, and Notifications.
  - iOS native folder (`frontend/ios`) does not yet exist; iOS is currently addressed via PWA standalone mode with dedicated Safari install guidance.
- **Rule Adherence**: The project strictly enforces 6 design rules (`code-minimalism.md` <= 250 lines, `zero-inner-scroll.md`, `mobile-landscape-mode.md`, `no-brainer-design.md`, `alphabetical-select.md`, `layer-stacking.md`).

---

## 1. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Hybrid Core | Capacitor 7 Integration | Hybrid runtime linking SvelteKit SPA to Android WebView and native plugins | `capacitor.config.ts`, `frontend/android/` | Web bundle in `public/assets`, native APK bridge | Logs navigation error if domain unauthorized | `frontend/capacitor.config.ts`, `frontend/package.json` |
| 2 | Camera / Scanner | `documentScannerService` | Native multi-page camera capture and automatic PDF bundling via `pdf-lib` | Camera click or gallery selection | `DocumentScanResult` (PDF Blob, file name, page count) | Catch cancel gracefully; throws plain German error on perm denial | `frontend/src/lib/services/documentScannerService.ts` |
| 3 | Camera / Scanner | `receiptScannerService` | Real-time edge detection and prospective perspective warp on HTML5 canvas | Video stream / canvas frame | Cropped receipt blob, auto-detected total & title | Catches OpenCV / pixel processing errors | `frontend/src/lib/services/receiptScannerService.ts` |
| 4 | Geolocation | `locationService` | 1-Click single GPS measurement (10s timeout) with OSM Nominatim reverse geocoding | `getCurrentPosition()` trigger | `LocationCoordinates` (lat, lon, accuracy, address) | Throws German user-friendly message on timeout/weak signal | `frontend/src/lib/services/locationService.ts` |
| 5 | Signatures | `FullscreenSignatureModal` | Fullscreen touch-optimized landscape signature pad with auto screen orientation lock | Touch/pen draw events, signer name | PNG Data URL via `onSave` | Cleans up orientation lock on close; graceful back button dismissal | `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` |
| 6 | Signatures | `CaregiverAppointmentSignature` | Inline touch/pen canvas pad with automatic bounding box trimming (`trimSignatureCanvas`) | Pen/finger strokes | Trimmed PNG Data URL | Fallback if untrimmable | `frontend/src/lib/components/mitarbeiter/CaregiverAppointmentSignature.svelte` |
| 7 | Security | `biometricService` | App lock and PIN verification manager using Preferences and App state listener | PIN string (0-9, 4-6 digits) | Boolean lock status, hashed SHA-256 validation | Returns false on mismatch | `frontend/src/lib/services/biometricService.ts` |
| 8 | Lifecycle | `backButtonHandler` | Android hardware back button & gesture manager with cascading modal close & exit guard | Hardware back click | Closes topmost dialog or exits app on 2x press | Fallback to `window.history.back()` | `frontend/src/lib/services/backButtonHandler.ts` |
| 9 | Lifecycle | `NativeAppManager` | Global coordinator mounted in root layout for onboarding, updates, and app lock | User auth state, App resume events | Renders onboarding, update banner, or PIN lock | Graceful silent catch on web | `frontend/src/lib/components/app/NativeAppManager.svelte` |
| 10 | Installation | `AppInstallButton` | PWA installation handler for Chromium (`beforeinstallprompt`) and iOS Safari manual modal | Click on "App herunterladen" | System install prompt or iOS instruction modal | Displays guided steps modal if prompt unavailable | `frontend/src/lib/components/pwa/AppInstallButton.svelte` |
| 11 | Installation | `PwaInstallButton` | Compact PWA install button for sidebar/header actions | Click on "App installieren" | Triggers deferred install prompt | Hides when already installed/native | `frontend/src/lib/components/app/PwaInstallButton.svelte` |
| 12 | App Updates | `AppUpdateBanner` | Automated native APK update checker querying `version.json` endpoint | App resume / mount | Fixed floating banner with 1-click download trigger | Silently fails when offline | `frontend/src/lib/components/app/AppUpdateBanner.svelte` |
| 13 | Notifications | `pushNotificationService` | Dual native (FCM/Capacitor) and Web-Push registration service | Device registration trigger | Stored subscription in PocketBase | Traps missing collection errors | `frontend/src/lib/services/pushNotificationService.ts` |
| 14 | Layer Stacking | `layerStackService` | Dynamic window z-index coordinator ensuring newest modal is always topmost (z >= 100000) | Dialog showModal, DOM mutations | Incremented z-index style property | Excludes toasts and feedback buttons | `frontend/src/lib/services/layerStackService.ts` |
| 15 | UI Responsiveness | Auto-Grow Textarea Action | Svelte action dynamically resizing textareas to content height (`zero-inner-scroll`) | Input events | Recalculated element pixel height | Restores min-height on empty text | `frontend/src/lib/actions/autoGrow.ts` |

---

## 2. Edge Cases Observed & Behavior

| # | Feature | Input / Condition | Observed Behavior |
|---|---------|-------------------|-------------------|
| 1 | Geolocation | GPS timeout or indoors signal loss (> 10s) | Throws explicit German user message: *"Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten."* (does not crash app). |
| 2 | Geolocation | Geocoding failure (offline / OSM Nominatim unreachable) | Coordinates (`latitude`, `longitude`, `accuracy`) remain valid and are returned without address rather than aborting. |
| 3 | Document Scanner | User cancels native camera or gallery picker | Detects `"User cancelled"` / `"User cancelled photos app"` and returns `null` cleanly without error toast. |
| 4 | Document Scanner | Multi-page PDF bundling with mixed PNG and JPEG | `bundleToPdf` automatically branches between `embedPng()` and `embedJpg()`, calculates proportional aspect ratio fitting DIN A4 (595.28 x 841.89 pt), and centers image. |
| 5 | Fullscreen Signature | Screen orientation lock on unsupported platform (Web/PWA) | Wrapped in `Capacitor.isNativePlatform()` and `try/catch`, silently ignores orientation lock if unsupported by browser. |
| 6 | Android Back Button | User presses hardware back with an open modal | Closes the topmost dialog via registered callback or `[data-action="close"]` click; prevents unintended exit from app. |
| 7 | Android Back Button | User presses back at top-level dashboard | First press triggers toast *"Noch einmal tippen zum Beenden der App."*; only exits if pressed again within 2000 ms. |
| 8 | Biometric / PIN Lock | App backgrounded and resumed on native device | `App.addListener('appStateChange')` flags `isLockedState = true` if enabled; displays full-screen blocking PIN dialog over all views (`z-[10000]`). |
| 9 | PWA Installation | Standalone mode or native app execution | Detects `Capacitor.isNativePlatform()` or `matchMedia('(display-mode: standalone)')` and suppresses install prompts automatically. |
| 10 | Layer Stacking | Multiple dialogs opened sequentially (e.g., Signature inside Appointment Complete) | `layerStackService` intercepts `showModal()`, assigns `z-index = 100000 + n`, ensuring the newest dialog and its backdrop cover previous layers. |

---

## 3. Capacitor & Hybrid Setup Audit

### 3.1 Capacitor Configuration (`frontend/capacitor.config.ts`)
```typescript
{
  appId: 'de.seniorenassistenz.orgaflow',
  appName: 'Seniorenassistenz',
  webDir: 'pb_public',
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'https://www.ihre-seniorenassistenz.com',
      'https://ihre-seniorenassistenz.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      overlaysWebView: true
    }
  }
}
```

### 3.2 Installed Capacitor Plugins (`frontend/package.json`)
All installed Capacitor dependencies are aligned to **Capacitor 7**:
- `@capacitor/core`: `^7.6.10`
- `@capacitor/cli`: `^7.6.10`
- `@capacitor/android`: `^7.6.10`
- `@capacitor/app`: `^7.1.2`
- `@capacitor/camera`: `^7.0.5`
- `@capacitor/geolocation`: `^7.1.8`
- `@capacitor/network`: `^7.0.4`
- `@capacitor/preferences`: `^7.0.4`
- `@capacitor/push-notifications`: `^7.0.7`
- `@capacitor/screen-orientation`: `^7.0.4`
- `@capacitor/splash-screen`: `^7.0.5`
- `@capacitor/status-bar`: `^7.0.6`

### 3.3 Android Platform Audit (`frontend/android/`)
- **Android Gradle Plugin / SDK**:
  - `minSdkVersion`: 23 (Android 6.0 Marshmallow)
  - `compileSdkVersion`: 35 (Android 15)
  - `targetSdkVersion`: 35 (Android 15)
- **Permissions Declared in `AndroidManifest.xml`**:
  - `android.permission.INTERNET`
  - `android.permission.ACCESS_NETWORK_STATE`
  - `android.permission.CAMERA`
  - `android.permission.ACCESS_COARSE_LOCATION`
  - `android.permission.ACCESS_FINE_LOCATION`
  - `android.permission.POST_NOTIFICATIONS`
  - `android.permission.READ_MEDIA_IMAGES`
  - `android.permission.READ_EXTERNAL_STORAGE` (maxSdkVersion=32)
  - `android.permission.WRITE_EXTERNAL_STORAGE` (maxSdkVersion=29)
- **Permissions Audit**:
  - `USE_BIOMETRIC` / `USE_FINGERPRINT` is currently **omitted** from `AndroidManifest.xml`. If native biometric prompt (`BiometricPrompt` API via a native biometric plugin) is adopted, `android.permission.USE_BIOMETRIC` must be added. Currently, `biometricService.ts` operates via SHA-256 hashed PIN and device preferences.

### 3.4 iOS Platform Audit
- **Status**: The directory `frontend/ios/` does NOT exist in the workspace.
- **Current iOS Strategy**: iOS users are served via PWA (Progressive Web App). `AppInstallButton.svelte` contains a dedicated iOS instruction modal explaining how to add OrgaFlow to the home screen via Safari's Share Sheet.
- **Future Native iOS Setup**: When adding native iOS via `npx cap add ios` with `@capacitor/ios`, the following keys must be set in `Info.plist`:
  - `NSCameraUsageDescription`: *"Für das Scannen von Belegen und Dokumenten wird Zugriff auf die Kamera benötigt."*
  - `NSLocationWhenInUseUsageDescription`: *"Für die Übernahme des aktuellen Standorts im Fahrtenbuch wird Ihr Standort benötigt."*
  - `NSFaceIDUsageDescription`: *"Für die biometrische Entsperrung der App."*

---

## 4. Build & Verification Pipelines Audit

### 4.1 SvelteKit Configuration & Output Directory
- **Config**: `frontend/svelte.config.js` utilizes `@sveltejs/adapter-static`:
  - `pages`: `'pb_public'`
  - `assets`: `'pb_public'`
  - `fallback`: `'index.html'` (SPA mode)
  - `strict`: true
- **Build Output**: Running `vite build` writes production artifacts directly to `frontend/pb_public/`.
- **Postbuild Synchronization**: `frontend/package.json` defines a `postbuild` script:
  ```json
  "postbuild": "node -e \"const fs = require('fs'); const path = require('path'); const src = path.resolve('pb_public'); const dst = path.resolve('../backend/pb_public'); if (fs.existsSync(src)) { const appDst = path.join(dst, '_app'); if (fs.existsSync(appDst)) fs.rmSync(appDst, { recursive: true, force: true }); fs.cpSync(src, dst, { recursive: true }); }\""
  ```
  This immediately copies the SPA output to `backend/pb_public` for PocketBase static file serving.

### 4.2 Pipeline Verification Runs
1. **Type & Component Verification (`npm run check`)**:
   - Command: `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`
   - Result: **0 errors, 0 warnings** across all `.svelte` and `.ts` files.
2. **Production Build (`npm run build`)**:
   - Command: `vite build`
   - Result: **Completed with code 0** (4694 SSR modules, 4942 client modules transformed, output in `frontend/pb_public` and `backend/pb_public`).
3. **Capacitor Sync (`npx cap sync`)**:
   - Command: `npx cap sync`
   - Result: **Completed with code 0 in 0.759s**.
   - Output: 9 plugins detected and synchronized to `frontend/android/app/src/main/assets/public`.

---

## 5. Design Rules & Constraint Specifications

The project enforces six immutable design rules documented in `.agents/rules/`:

### 5.1 Code Minimalism (`code-minimalism.md`)
- **Rule**: Strict hard limit of **<= 250 lines per file/component**.
- **Requirement**: Any component approaching or exceeding 250 lines must be decomposed into modular subcomponents and helper modules.
- **Rule for Edits**: Modified files must be emitted completely without placeholders or omissions, accompanied by a concise change summary.

### 5.2 Zero Inner Scroll (`zero-inner-scroll.md` & `modal_topbar_rules.md`)
- **Rule**: Nested scroll containers and internal scrollbars within cards, lists, or input fields are strictly prohibited.
- **Components**:
  - Modals scroll as a single unit using `<dialog class="zero-inner-scroll-modal">` with `max-h-[94dvh]` or `max-h-dvh`.
  - Headers and KPI tiles scroll naturally out of view to maximize interactive vertical space.
  - Sticky filter controls: `sticky top-0 z-20 bg-white/95 backdrop-blur-md`.
  - Textareas must use dynamic height expansion (`use:autoGrow`) without vertical scrollbars.
  - Absolutely no horizontal scrolling (`overflow-x-hidden`, `min-w-0`, `flex-wrap`, `break-words`).

### 5.3 Mobile Landscape Mode (`mobile-landscape-mode.md`)
- **Rule**: Every UI must adapt to reduced vertical viewport in landscape orientation on smartphones without clipping or obscuring interactive controls.
- **Techniques**:
  - Signature pads and modals must pivot actions to side columns (`landscape:flex-row`, `lg:flex-col`).
  - Input forms reduce margins and paddings (`landscape:p-3`, `landscape:my-2`).
  - Fixed bars (such as mobile bottom navigation) must not obscure actionable inputs.

### 5.4 No-Brainer Design (`no-brainer-design.md`)
- **Rule**: Designed for non-technical senior care staff.
- **Language**: Exclusively plain, conversational German (strictly no technical jargon, HTTP status codes, or developer terminology).
- **Interactions**:
  - Primary actions highlighted with bold icons and descriptive text labels.
  - Large touch targets (`min-h-10`, `min-h-11`, `min-h-[44px]`).
  - Proactive feedback (loading spinners, success toasts).
  - Destructive operations guarded by friendly German confirmation dialogs.
  - Empty states guide the user with an inviting call-to-action button.

### 5.5 Alphabetical Select (`alphabetical-select.md`)
- **Rule**: All dropdowns, menus, and selection lists must be sorted alphabetically by display text.
- **Collation**: Case-insensitive and German locale-sensitive (`localeCompare('de')`).
- **Persons**: Sorted by last name or primary display name (`sortPersons` in `$lib/utils/sortHelper`).

### 5.6 Layer Stacking (`layer-stacking.md` & `layerStackService.ts`)
- **Rule**: Strict z-index hierarchy ensuring overlays, dialogs, and popovers never collide.
- **Enforcement**:
  - Native `<dialog>` elements tracked dynamically.
  - `layerStackService` dynamically elevates topmost dialogs to `z-index >= 100000`.
  - `#global-toast-container` is protected and stays topmost over all modals.
  - Background scrolling is disabled while modals are active.

---

## 6. PocketBase Schema Audit

Analysis of `backend/pb_schema.json` and migration files:

### 6.1 `drive_records` (Base Collection)
- `id`: `text` (Primary Key)
- `type`: `select` (Options: "Anfahrt", "Abfahrt", "Zwischenfahrt")
- `km`: `number` (Kilometers driven)
- `lump_sum`: `number` (Flat fee / Pauschale)
- `created`: `autodate`
- `updated`: `autodate`
- *Relationship*: Linked from `appointments.drive_record` (relation field, multiple).

### 6.2 `appointments` (Base Collection)
- `id`: `text`
- `client`: `relation` -> `clients`
- `user` / `assigned_to` / `billing_user`: `relation` -> `users`
- `pickup_address`: `text` (Starting address for travel)
- `location_address`: `text` (Destination / appointment location address)
- `route_distance`: `number` (Calculated distance in km)
- `route_duration`: `number` (Travel duration in minutes)
- `drive_record`: `relation` -> `drive_records` (multiple)
- `report`: `text` (Visit report / documentation)
- `notes`: `text` (Internal notes)
- `checklist`: `json` (Holds checklist items, `signature` dataUrl, `signed_by`, and `photos` array)
- `documents`: `file` (Attached appointment documents)
- `voice_records`: `file` (Audio memos)
- `status`: `text` ("Geplant", "Offen", "Erledigt", "Abgesagt")

### 6.3 `client_documents` (Base Collection)
- `id`: `text`
- `client`: `relation` -> `clients`
- `template`: `relation` -> `document_templates`
- `title`: `text`
- `document_type`: `select`
- `status`: `select`
- `file`: `file` (Uploaded / scanned PDF document)
- `valid_from` / `valid_until`: `date`
- `notes`: `text`
- `created_by`: `relation` -> `users`

### 6.4 `expenditure` (Base Collection)
- `id`: `text`
- `titel`: `text` (Receipt / expenditure title)
- `sum`: `number` (Total expense amount in EUR)
- `receipt`: `file` (Scanned receipt image or PDF)
- *Relationship*: Linked from `appointments.expenditures`.

### 6.5 `users` & User Settings (Auth Collection)
- `id`: `text`
- `username`, `email`, `name_first`, `name_last`: `text`
- `street`, `housenr`, `zip`, `city`, `tel`, `handy`: `text`
- `role`: `select` ("admin", "developer", "office", "caregiver", "client")
- `sign`: `file` (User signature image)
- `avatar`: `file`
- `push_subscriptions`: `json` (Stores push subscriptions directly on the user record)
- *Note*: App lock preferences (`orga_biometric_lock_enabled`, `orga_app_pin_hash`) are stored client-side via `@capacitor/preferences`.

---

## 7. Test Infrastructure Audit

### 7.1 Existing Test Setup
- **Unit / Integration Testing**: Currently, there are **no unit test frameworks** (e.g. Vitest, Jest) configured in `frontend/package.json`. No `*.test.ts` or `*.spec.ts` files exist in `frontend/src`.
- **E2E Testing**: No Playwright or Cypress configurations exist in `frontend/`.
- **Native Android Tests**: `frontend/android/app/build.gradle` includes Android standard test runners (`AndroidJUnitRunner`, `junit:4.13.2`, `androidx.test.espresso:3.6.1`), but no custom instrumentation tests have been added.

### 7.2 Recommendations for the E2E Testing Track
1. **Vitest + Svelte Testing Library**:
   - Install `vitest` and `@testing-library/svelte` in `frontend/devDependencies`.
   - Create unit tests for native mock services:
     - `locationService.test.ts`: Test `getCurrentPosition`, error formatting on timeout, and reverse geocoding fallback.
     - `documentScannerService.test.ts`: Test PDF bundling, A4 scaling calculation, and cancellation handling.
     - `biometricService.test.ts`: Test SHA-256 PIN hashing, verification, and app resume lock state.
     - `backButtonHandler.test.ts`: Test cascading modal closure priority and double-tap exit logic.
2. **Playwright E2E Track**:
   - Configure `@playwright/test` for browser and responsive mobile viewports (portrait 375x667, landscape 667x375).
   - Mock Capacitor runtime plugins in the browser context (`window.Capacitor = ...`) to automate:
     - Appointment completion with signature capture.
     - Document upload and camera scanner trigger.
     - PWA install prompt button behavior and dialog display.
     - Landscape orientation layout verification (verifying no cutoffs or overlapping action buttons).

---

## 8. Integration Gap Analysis & Implementation Roadmap

| Feature Track | Target Components | Current State | Required Work for Implementation Team |
|---------------|-------------------|---------------|---------------------------------------|
| **1. Document Scanner** | `ClientDocumentUploadZone.svelte`, `ExpenditureModal.svelte`, `MailAttachmentSection.svelte`, `CaregiverAppointmentPhotos.svelte` | Native service `documentScannerService.ts` exists. `ClientDocumentUploadZone` and `CaregiverAppointmentPhotos` use standard HTML file inputs. | Wire up `documentScannerService.capturePage()` and `bundleToPdf()` with camera scan action buttons on mobile native platforms. |
| **2. Location 1-Click** | `DriveRecordModal.svelte`, `AppointmentCompleteModal.svelte`, `CaregiverAppointmentTimeKm.svelte` | `locationService.ts` exists but is not yet imported in any component. | Add a "📍 Standort übernehmen" button that invokes `locationService.getCurrentPosition()` to populate address or calculate travel distance. |
| **3. Fullscreen Signature** | `AppointmentCompleteModal.svelte`, `CaregiverAppointmentSignature.svelte`, `CarepersonSignatureModal.svelte` | `FullscreenSignatureModal.svelte` exists. `CaregiverAppointmentSignature` has an inline canvas pad. `AppointmentCompleteModal` lacks signature capture. | Integrate `FullscreenSignatureModal` trigger into `AppointmentCompleteModal` and provide a fullscreen toggle button in `CaregiverAppointmentSignature`. |
| **4. Biometrics / PIN** | `ProfileSecurityCard.svelte`, `NativeAppManager.svelte` | `biometricService.ts` and `NativeAppManager.svelte` handle app lock and PIN verification. `ProfileSecurityCard.svelte` lacks a toggle or PIN setup UI. | Add a biometric/PIN lock toggle and PIN change dialog in `ProfileSecurityCard.svelte`. |
| **5. Updates & PWA** | `SidebarActions.svelte`, `SidebarProfileCard.svelte`, `+layout.svelte` | `PwaInstallButton.svelte` is in sidebar actions. `AppUpdateBanner.svelte` is in `NativeAppManager`. | Verify visibility and prominence across both desktop and mobile drawer navigations. |
