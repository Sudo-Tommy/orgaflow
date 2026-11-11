# Comprehensive Analysis: E2E Test Suite Architecture & 4-Tier Test Catalog

**Explorer 3**: Test Suite Design & Matrix Architecture (Tiers 1-4)  
**Date**: 2026-11-11  
**Target System**: OrgaFlow Hybrid App ("Seniorenassistenz")  
**State Folder**: `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_e2e_3\`  
**Project Plan**: `s:\OrgaFlow_Alpha\PROJECT.md`  
**Scope Reference**: `s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_e2e\SCOPE.md`  

---

## 1. Executive Summary

This document specifies the complete test catalog, test suite architecture, and test infrastructure blueprint for the automated End-to-End (E2E) testing track of the OrgaFlow Hybrid App.

The testing suite provides an **opaque-box, requirement-driven automated verification system** covering all six core native hybrid features:
1. **Document Scanner Service** (`documentScannerService.ts` / `DocumentScanButton.svelte`)
2. **Location & Reverse Geocoding Service** (`locationService.ts` / `GpsAddressButton.svelte`)
3. **Fullscreen Signature Modal & Orientation Lock** (`FullscreenSignatureModal.svelte`)
4. **Biometric Security & Resume Lock** (`biometricService.svelte.ts` / `biometricService.ts` / `NativeAppManager.svelte`)
5. **App Update Banner** (`AppUpdateBanner.svelte`)
6. **PWA Installation Button** (`PwaInstallButton.svelte`)

### Requirement-Driven 4-Tier Structure
| Tier | Description | Minimum Count | Designed Count |
|---|---|---|---|
| **Tier 1** | **Feature Coverage** (Core happy path & functional contracts across 6 features) | >= 30 (>=5 / feature) | **30** |
| **Tier 2** | **Boundary & Corner Cases** (Permission denials, hardware timeouts, edge cases, error fallbacks) | >= 30 (>=5 / feature) | **30** |
| **Tier 3** | **Cross-Feature Combinations** (Pairwise interaction, layer stacking, lifecycle collision) | >= 10 | **10** |
| **Tier 4** | **Real-World Application Scenarios** (Multi-step end-to-end caregiver workflows) | >= 5 | **5** |
| **Total** | **Comprehensive Test Catalog** | **>= 75** | **75** |

All test suite files are organized strictly adhering to the project's **Code Minimalism Rule** (`code-minimalism.md`: maximum 250 lines per file).

---

## 2. Complete Test Catalog Matrix (Tiers 1 - 4)

### 2.1 Tier 1: Feature Coverage (30 Tests)

#### Feature 1: Document Scanner Service
| Test ID | Feature | Test Case Name | Preconditions / Input | Action / Method Under Test | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T1-DOC-01` | DocScanner | Single Page Capture | Camera mock initialized with test JPEG dataUrl | `documentScannerService.capturePage()` | Returns `ScannedPage` object; `dataUrl` matches input; `blob.type === 'image/jpeg'`; `blob.size > 0`. |
| `T1-DOC-02` | DocScanner | Multi-Page PDF Bundling | 2 valid `ScannedPage` objects (PNG and JPEG) | `documentScannerService.bundleToPdf(pages, 'Rechnung')` | Resolves `DocumentScanResult`; `pdfBlob.type === 'application/pdf'`; `pageCount === 2`; bytes begin with `%PDF-`. |
| `T1-DOC-03` | DocScanner | Custom Document Filename | 1 valid `ScannedPage`, title `'Apotheke_Rezept'` | `documentScannerService.bundleToPdf(pages, 'Apotheke_Rezept')` | Generated `fileName` strictly matches regex `/^Apotheke_Rezept_\d{4}-\d{2}-\d{2}\.pdf$/`. |
| `T1-DOC-04` | DocScanner | Native Camera Availability | `Capacitor.isNativePlatform() === true` | `documentScannerService.isCameraAvailable()` | Evaluates to `true` on native iOS/Android environments. |
| `T1-DOC-05` | DocScanner | Web MediaDevices Fallback | Web browser environment with `navigator.mediaDevices.getUserMedia` | `documentScannerService.isCameraAvailable()` | Evaluates to `true` when WebRTC camera API is available. |

#### Feature 2: Location & Reverse Geocoding Service
| Test ID | Feature | Test Case Name | Preconditions / Input | Action / Method Under Test | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T1-LOC-01` | Location | Permission Check & Request | Native platform; Geolocation permissions initially granted | `locationService.checkOrRequestPermissions()` | Returns `true`; does not throw errors. |
| `T1-LOC-02` | Location | High-Accuracy Position Acquisition | GPS mock configured for lat: 48.137154, lon: 11.576124, accuracy: 5m | `locationService.getCurrentPosition()` | Resolves `LocationCoordinates`; `latitude === 48.137154`; `longitude === 11.576124`; `accuracy === 5`; `timestamp > 0`. |
| `T1-LOC-03` | Location | Reverse Geocoding Resolution | Online status; valid German lat/lon coordinates | `locationService.reverseGeocode(52.520008, 13.404954)` | Fetches Nominatim German address format; returns formatted string containing street, house number, postcode, city. |
| `T1-LOC-04` | Location | Combined GPS & Address Capture | Mock GPS coords and active Nominatim endpoint | `locationService.getCurrentPosition()` | Returns coordinates object with populated `address` string (e.g. "Marienplatz 1, 80331 München"). |
| `T1-LOC-05` | Location | First-Use Permission Escalation | Permission initially `'prompt'`; user grants on request | `locationService.checkOrRequestPermissions()` | Calls `Geolocation.requestPermissions()`; returns `true` upon grant. |

#### Feature 3: Fullscreen Signature Modal & Orientation Lock
| Test ID | Feature | Test Case Name | Preconditions / Input | Action / Method Under Test | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T1-SIG-01` | Signature | Landscape Orientation Lock on Open | Native platform; modal state `isOpen = false` | Transition `isOpen = true` | `ScreenOrientation.lock({ orientation: 'landscape' })` is invoked immediately. |
| `T1-SIG-02` | Signature | Drawing Input Sets Signature State | Modal open; canvas initialized | Dispatch pointer/touch events `startDrawing -> draw -> stopDrawing` | Canvas context renders strokes; reactive `hasSignature` state flips to `true`. |
| `T1-SIG-03` | Signature | Clear Canvas Reset | Modal open with drawn strokes (`hasSignature === true`) | Invoke `clear()` / click "Löschen" button | Canvas is wiped via `clearRect`; `hasSignature` resets to `false`; save button disables. |
| `T1-SIG-04` | Signature | Signature Save Export | Canvas has strokes; `onSave` mock callback provided | Invoke `handleSave()` / click "Bestätigen" | Invokes `onSave(dataUrl)`; `dataUrl` starts with `'data:image/png;base64,'`; closes modal. |
| `T1-SIG-05` | Signature | Orientation Unlock on Close | Modal open in landscape lock | Invoke `closeModal()` / click close button | Invokes `ScreenOrientation.unlock()`; sets `isOpen = false`; invokes `onCancel()`. |

#### Feature 4: Biometric Authentication & App Resume Lock
| Test ID | Feature | Test Case Name | Preconditions / Input | Action / Method Under Test | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T1-BIO-01` | Biometrics | Service Initialization | Capacitor Preferences mock contains `orga_biometric_lock_enabled = 'true'` | `biometricService.init()` | Service initializes; `isConfigured === true`; initial app launch state `isLockActive === true`. |
| `T1-BIO-02` | Biometrics | Secure PIN Hashing & Storage | User inputs 6-digit PIN `'246810'` | `biometricService.setPin('246810')` | Calculates SHA-256 hash via Web Crypto API; stores hexadecimal digest in Preferences. |
| `T1-BIO-03` | Biometrics | Valid PIN Authentication | Stored hash for PIN `'246810'`; service locked | `biometricService.verifyPin('246810')` | Returns `true`; clears `isLockedState`; `isLockActive` becomes `false`. |
| `T1-BIO-04` | Biometrics | Enable Biometric Lock Mode | Service unconfigured | `biometricService.setEnabled(true)` | Writes `'true'` to Preferences key `orga_biometric_lock_enabled`; activates lock protection. |
| `T1-BIO-05` | Biometrics | App Backgrounding Triggers Lock | Service enabled and unlocked; app is active | Mock Capacitor `App.notify('appStateChange', { isActive: false })` | Service captures background event; sets `isLockedState = true`; `isLockActive` becomes `true`. |

#### Feature 5: App Update Banner
| Test ID | Feature | Test Case Name | Preconditions / Input | Action / Method Under Test | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T1-UPD-01` | AppUpdate | Update Detection Trigger | App version `'1.0.0'`; remote endpoint returns `{ version: '1.1.0', apkUrl: 'https://example.com/app.apk' }` | Component mounts / `checkUpdate()` | Sets `availableVersion = '1.1.0'`; banner DOM elements are rendered with update notification. |
| `T1-UPD-02` | AppUpdate | Version Match Suppression | App version `'1.0.0'`; remote endpoint returns `{ version: '1.0.0' }` | Component mounts / `checkUpdate()` | `availableVersion` remains `null`; update banner is completely hidden from UI. |
| `T1-UPD-03` | AppUpdate | User Dismissal ("Später erinnern") | Update banner is visible (`availableVersion === '1.1.0'`) | Click "Später erinnern" (X button) | Sets `isDismissed = true`; banner unmounts/hides immediately. |
| `T1-UPD-04` | AppUpdate | Direct APK Download Launch | Update banner is visible with `apkUrl` | Click "Laden" button | Invokes `window.open(downloadUrl, '_system')`; sets `isDismissed = true`. |
| `T1-UPD-05` | AppUpdate | Non-Native Platform Suppression | Browser environment (`Capacitor.isNativePlatform() === false`) | Component mounts | Skips remote version check completely; never renders banner in web browser. |

#### Feature 6: PWA Installation Button
| Test ID | Feature | Test Case Name | Preconditions / Input | Action / Method Under Test | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T1-PWA-01` | PWA | beforeinstallprompt Capture | Web browser; component mounted | Window dispatches `beforeinstallprompt` event | Event default prevented; prompt saved; `canInstall` becomes `true`; button renders. |
| `T1-PWA-02` | PWA | Trigger Installation Prompt | `canInstall === true`; prompt event mock | Click install button / `installPwa()` | Invokes `deferredPrompt.prompt()`; awaits `userChoice`. |
| `T1-PWA-03` | PWA | Successful User Acceptance | Prompt shown; user clicks accept | `userChoice` resolves `{ outcome: 'accepted' }` | `canInstall` sets to `false`; button hides; deferred prompt cleaned up. |
| `T1-PWA-04` | PWA | Appinstalled Event Handling | Browser dispatches `appinstalled` event | Event listener executes | `canInstall` resets to `false`; deferred prompt set to `null`. |
| `T1-PWA-05` | PWA | Variant Rendering Support | `variant = 'full'` vs `variant = 'compact'` | Render component with each variant prop | `'full'` renders sidebar card with "1-Klick" badge; `'compact'` renders minimal icon button. |

---

### 2.2 Tier 2: Boundary & Corner Cases (30 Tests)

#### Feature 1: Document Scanner Service
| Test ID | Feature | Corner / Boundary Condition | Preconditions / Input | Action / Flow | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T2-DOC-01` | DocScanner | User Cancels Photo Capture | User opens camera UI and presses Android back/cancel | `Camera.getPhoto()` throws `'User cancelled photos app'` | `capturePage()` returns `null` cleanly without throwing an unhandled exception. |
| `T2-DOC-02` | DocScanner | Camera Hardware Permission Denied | Camera permission denied in OS settings | `Camera.getPhoto()` rejects with permission error | Catches error; throws user-friendly German message: `"Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen."` |
| `T2-DOC-03` | DocScanner | Empty Page Array for PDF Bundling | Empty array `[]` passed to bundling service | `bundleToPdf([], 'Dokument')` | Throws `Error('Es wurden keine Seiten zum Erstellen des PDFs ausgewählt.')`. |
| `T2-DOC-04` | DocScanner | Mixed Image Formats & High Page Count | 5 pages containing alternating `image/png` and `image/jpeg` blobs | `bundleToPdf(mixedPages, 'Sammelbeleg')` | Correctly invokes `embedPng` and `embedJpg`; outputs valid 5-page PDF document without byte corruption. |
| `T2-DOC-05` | DocScanner | Extreme Aspect Ratio Scaling | Ultra-wide (5:1) or tall receipt image (e.g. 200x2000px) | `bundleToPdf([extremePage])` | Proportional scaling factor ensures width <= 595.28 and height <= 841.89; margins `x >= 0` and `y >= 0`. |

#### Feature 2: Location & Reverse Geocoding Service
| Test ID | Feature | Corner / Boundary Condition | Preconditions / Input | Action / Flow | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T2-LOC-01` | Location | OS Location Permission Denied | Permission request rejected by user | `locationService.getCurrentPosition()` | Throws user-friendly German error: `"Der Standortzugriff wurde abgelehnt. Bitte in den Geräteeinstellungen aktivieren."` |
| `T2-LOC-02` | Location | GPS Hardware Acquisition Timeout | Device in tunnel/deep indoors; 10s timeout triggers | `Geolocation.getCurrentPosition()` throws timeout (`code === 3`) | Catches timeout; throws user-friendly message: `"Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten."` |
| `T2-LOC-03` | Location | Offline / Network Down During Reverse Geocode | `navigator.onLine === false` or fetch network failure | `locationService.getCurrentPosition()` | Coordinates are preserved; `result.address === undefined`; does NOT crash or fail position acquisition. |
| `T2-LOC-04` | Location | Geocoding Server Error (HTTP 500/503) | Nominatim API returns HTTP 500 Internal Server Error | `locationService.reverseGeocode(lat, lon)` | Catches HTTP failure gracefully; returns `null` without throwing. |
| `T2-LOC-05` | Location | Extreme Coordinates & Boundary Numbers | Lat: 0.0, Lon: 0.0 (Null Island) or South Pole Lat: -90.0, Lon: 0.0 | `locationService.getCurrentPosition()` | Correctly validates coordinates; handles boundary floats without `NaN` or precision loss. |

#### Feature 3: Fullscreen Signature Modal & Orientation Lock
| Test ID | Feature | Corner / Boundary Condition | Preconditions / Input | Action / Flow | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T2-SIG-01` | Signature | Empty Canvas Save Prevention | Modal open; no strokes drawn (`hasSignature === false`) | Attempt `handleSave()` / click disabled save | No data emitted; `onSave` callback is NOT invoked; modal remains open. |
| `T2-SIG-02` | Signature | Android Hardware Back-Button Dismissal | Modal open in landscape; back button pressed | `backButtonHandler.trigger()` | Closes modal (`isOpen = false`); resets orientation to unlock; calls `onCancel()`. |
| `T2-SIG-03` | Signature | Unsupported ScreenOrientation Platform | Desktop browser / WebKit where `ScreenOrientation.lock()` rejects | Modal transitions `isOpen = true` | Caught in `try...catch`; modal opens and functions seamlessly without uncaught exception. |
| `T2-SIG-04` | Signature | High-DPI / Retina Canvas Scaling | `window.devicePixelRatio = 3.0` | Canvas initialization in `initCanvas()` | `canvas.width` and `canvas.height` scale by DPR; 2D context scaled; drawing prevents pixelation. |
| `T2-SIG-05` | Signature | Rapid Successive Toggle Cycle | User rapidly opens and closes modal 10 times | Multiple fast toggle transitions | No listener leaks; final orientation state is unlocked; back-button listener unregistered. |

#### Feature 4: Biometric Authentication & App Resume Lock
| Test ID | Feature | Corner / Boundary Condition | Preconditions / Input | Action / Flow | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T2-BIO-01` | Biometrics | Invalid PIN Entry | Stored PIN is `'123456'`; user inputs `'999999'` | `biometricService.verifyPin('999999')` | Returns `false`; `isLockedState` remains `true`; `isLockActive` remains `true`. |
| `T2-BIO-02` | Biometrics | Blank / Empty PIN Entry Attempt | PIN input is empty string `""` | `NativeAppManager` submit with empty input | Input rejected; no hash verification performed; error state reported. |
| `T2-BIO-03` | Biometrics | Consecutive Failed PIN Attempts | 3 consecutive incorrect PIN submissions | Enter wrong PIN 3 times | Error message displayed; `pinError === true`; app remains strictly locked. |
| `T2-BIO-04` | Biometrics | Disabling Biometrics Unlocks App | App locked with active PIN; user disables setting | `biometricService.setEnabled(false)` | Sets `isEnabled = false`; immediately resets `isLockedState = false`; clears Preferences. |
| `T2-BIO-05` | Biometrics | Spurious App State Change (Foregrounding) | App already authenticated and active (`isActive: true`) | `App.notify('appStateChange', { isActive: true })` | Does not re-lock an already active session; `isLockedState` remains `false`. |

#### Feature 5: App Update Banner
| Test ID | Feature | Corner / Boundary Condition | Preconditions / Input | Action / Flow | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T2-UPD-01` | AppUpdate | Remote Endpoint Offline (Network Timeout) | Device offline or remote server unreachable | `checkUpdate()` network fetch throws error | Error caught silently; does not crash app; banner is not displayed. |
| `T2-UPD-02` | AppUpdate | Corrupted / Malformed Remote JSON | Endpoint returns invalid JSON or `{}` without `version` | `checkUpdate()` parses response | Missing properties handled safely; `availableVersion` remains `null`. |
| `T2-UPD-03` | AppUpdate | App.getInfo() Plugin Failure | Native plugin `App.getInfo()` rejects with error | `checkUpdate()` calls `App.getInfo()` | Falls back to internal constant `CURRENT_VERSION` (`'1.0.0'`) without failure. |
| `T2-UPD-04` | AppUpdate | Older Remote Version (Downgrade Avoidance) | Current version is `'1.2.0'`; remote returns `'1.1.0'` | `checkUpdate()` compares versions | Downgrade is ignored (`data.version !== appVersion` guarded by version comparison); banner suppressed. |
| `T2-UPD-05` | AppUpdate | Repeated Component Mounts | Banner mounted, unmounted, and remounted rapidly | Multiple mount cycles | No redundant concurrent fetch calls; dismissal state persists properly. |

#### Feature 6: PWA Installation Button
| Test ID | Feature | Corner / Boundary Condition | Preconditions / Input | Action / Flow | Expected Outcome / Assertions |
|---|---|---|---|---|---|
| `T2-PWA-01` | PWA | Native Android Platform Suppression | `Capacitor.isNativePlatform() === true` | Component mount and event receipt | Button remains completely hidden; ignores any synthetic install events. |
| `T2-PWA-02` | PWA | Already Installed Standalone PWA Mode | `matchMedia('(display-mode: standalone)').matches === true` | Component mount | Detects standalone mode; `canInstall` stays `false`; button remains hidden. |
| `T2-PWA-03` | PWA | User Dismisses Native Install Prompt | User clicks "Cancel" on browser install dialog | `userChoice` resolves `{ outcome: 'dismissed' }` | `canInstall` remains intact or cleanly resets without throwing unhandled rejection. |
| `T2-PWA-04` | PWA | installPwa() Called When No Prompt Available | `deferredPrompt === null` | Trigger `installPwa()` | Guard `if (!deferredPrompt) return;` prevents null pointer exception. |
| `T2-PWA-05` | PWA | Component Cleanup on Unmount | Component listens to `beforeinstallprompt` | Component unmounts from DOM | Event listener is removed via `removeEventListener`; prevents memory leaks. |

---

### 2.3 Tier 3: Cross-Feature Combinations (10 Tests)

| Test ID | Interacting Features | Interaction Scenario | Test Action & Flow | Expected Outcome & Invariants |
|---|---|---|---|---|
| `T3-INT-01` | **DocScanner + Location** | Receipt Capture with On-Site Geotagging | In expense recording, trigger `capturePage()` + `bundleToPdf()`, then immediately trigger `locationService.getCurrentPosition()`. | Both promises resolve successfully; PDF receipt blob and GPS coordinates are attached to the same transaction without state interference. |
| `T3-INT-02` | **Signature + Location** | Client Appointment Sign-Off with Geocoded Proof | In `AppointmentCompleteModal`, sign on canvas via `FullscreenSignatureModal` and acquire GPS location with reverse geocoded address. | Signature PNG dataUrl and verified address (e.g. "Hauptstraße 15, Berlin") are both embedded in the appointment completion payload. |
| `T3-INT-03` | **Signature + Biometrics** | App Backgrounding & Resume Lock During Open Signature Modal | Open `FullscreenSignatureModal` (`z-[9999]`); trigger `App.notify('appStateChange', { isActive: false })`. | Layer stacking: `NativeAppManager` lock overlay (`z-[10000]`) renders *over* the signature modal; unlocking with PIN restores the intact signature modal with existing strokes. |
| `T3-INT-04` | **DocScanner + Biometrics** | Camera App Switch Resume Protection | While camera is active for receipt scan, OS switches app to background; on camera capture return, app resumes. | Biometric lock triggers on background; after PIN authentication, the captured photo blob is safely recovered and passed to the caller. |
| `T3-INT-05` | **Signature + BackButton + Biometrics** | Hardware Back-Button Prioritization Under Active Lock | Both Biometric PIN Lock (`z-[10000]`) and Signature Modal (`z-[9999]`) are mounted; hardware back button is pressed. | Hardware back button does NOT dismiss the security lock screen; lock remains active until valid PIN is submitted. |
| `T3-INT-06` | **PWA + AppUpdate** | Platform Mutually Exclusive Display | Mount both `PwaInstallButton` and `AppUpdateBanner` in desktop browser and native mobile environments. | On native Android: `AppUpdateBanner` is active, `PwaInstallButton` is hidden. In desktop browser: `PwaInstallButton` can appear, `AppUpdateBanner` is strictly hidden. |
| `T3-INT-07` | **DocScanner + Location (Offline)** | Offline Receipt Scan with Failed Geocode Fallback | Network offline (`navigator.onLine = false`); caregiver scans multi-page receipt and acquires GPS. | Document scanner successfully produces PDF; GPS returns raw coordinates with `address: undefined`; no uncaught errors occur. |
| `T3-INT-08` | **Signature + DocScanner** | Orientation Isolation Across Modals | Open signature modal (landscape lock), cancel modal (reset to unlock), then immediately trigger document scanner. | Device orientation returns to natural/unlocked state; camera interface does not retain unwanted landscape orientation lock. |
| `T3-INT-09` | **AppUpdate + Biometrics** | Background Version Check Under Security Lock | App cold boots with biometric lock active; background update check executes concurrently. | Update check resolves silently in the background; update banner renders below or defers until PIN lock is successfully completed (`z-[10000]` over `z-[9980]`). |
| `T3-INT-10` | **DocScanner + Location in Chat** | Chat Attachment Document Scan & GPS Location Share | In `ChatWidget`, trigger document scanner for contract PDF, then insert current location into message. | PDF document is attached as valid file and GPS address is appended as formatted message text without component conflict. |

---

### 2.4 Tier 4: Real-World Application Scenarios (5 Tests)

| Test ID | Workflow Title | Domain Scenario & Actors | Step-by-Step E2E Execution Flow | Expected Business Outcome & Invariants |
|---|---|---|---|---|
| `T4-E2E-01` | **Fahrtenbuch (Drive Record) 1-Click GPS Logging** | Caregiver starts journey to senior client | 1. Open `DriveRecordModal`.<br>2. Click `GpsAddressButton` ("Standort erfassen").<br>3. Hardware GPS captures lat/lon.<br>4. OpenStreetMap reverse geocodes to "Goethestraße 10, 80336 München".<br>5. Departure address prefilled automatically.<br>6. Caregiver inputs start odometer reading.<br>7. Submit record to PocketBase `drive_records`. | Trip record is persisted with precise coordinates, geocoded address, and correct timestamp; zero manual address typing required. |
| `T4-E2E-02` | **Caregiver Client Visit Completion & Sign-off** | Senior care visit completion with digital consent | 1. Caregiver completes visit tasks in `AppointmentCompleteModal`.<br>2. Clicks "Kunden-Unterschrift erfassen".<br>3. `FullscreenSignatureModal` locks screen to landscape.<br>4. Senior/Client signs on canvas with stylus/finger.<br>5. Clicks "Bestätigen" -> modal unlocks and closes.<br>6. 1-Click GPS captures location stamp of visit.<br>7. Submit completion -> status transitions to `completed`. | Appointment document record created with valid PNG signature attachment and GPS verification stamp; zero inner scrollbars throughout flow. |
| `T4-E2E-03` | **Pharmacy Prescription & Receipt Expense Archiving** | Caregiver purchases pharmacy medication for client | 1. Open `ExpenditureReceiptCard` / `BudgetReceiptField`.<br>2. Click `DocumentScanButton` ("Dokument scannen").<br>3. Capture page 1 (Prescription).<br>4. Prompt selects "Weitere Seite erfassen".<br>5. Capture page 2 (Cash register receipt).<br>6. Finish scanning -> `bundleToPdf()` compiles 2 pages into DIN A4 PDF.<br>7. File attached to budget entry and saved. | Multi-page PDF generated directly on device, valid `%PDF` headers, correct file naming convention (`Beleg_YYYY-MM-DD.pdf`), zero upload failures. |
| `T4-E2E-04` | **Cold Boot Biometric Unlock & App Update Workflow** | Caregiver starts workday app session | 1. Launch native app from device launcher.<br>2. `NativeAppManager` displays PIN lock overlay.<br>3. Enter 6-digit security PIN.<br>4. Service validates SHA-256 hash -> app unlocks to Dashboard.<br>5. Background check detects APK update `v1.1.0`.<br>6. `AppUpdateBanner` appears with "Laden" and "Später erinnern".<br>7. Caregiver clicks "Später erinnern" -> banner dismisses cleanly. | Secure authentication gate prevents unauthorized access; non-intrusive update banner allows caregiver to continue work immediately. |
| `T4-E2E-05` | **Client Master Data Onboarding with Contract Scan** | Caregiver creates new senior client profile | 1. Navigate to `/clients/new` (`ClientMasterTab`).<br>2. Click GPS button in address field to capture current home address.<br>3. Reverse geocoding populates street, house number, zip, city.<br>4. In document section, click `DocumentScanButton`.<br>5. Scan 3-page care service agreement.<br>6. Save client profile to PocketBase `clients` collection. | Client master record is created with validated address and signed PDF contract attached; alphabetical select lists remain sorted. |

---

## 3. Proposed Test File Layout in `frontend/tests/`

To guarantee strict compliance with the project's **Code Minimalism Rule** (`code-minimalism.md`: maximum 250 lines per file), the test suite is partitioned into focused, single-responsibility modules:

```
frontend/tests/
├── mocks/
│   ├── browser-env.mock.ts              # Global window, navigator, matchMedia, fetch mock (~140 lines)
│   ├── capacitor-core.mock.ts            # Mock Capacitor.isNativePlatform, getPlatform (~60 lines)
│   ├── capacitor-camera.mock.ts          # Mock Camera.getPhoto, CameraSource (~80 lines)
│   ├── capacitor-geolocation.mock.ts     # Mock Geolocation.getCurrentPosition, permissions (~90 lines)
│   ├── capacitor-orientation.mock.ts     # Mock ScreenOrientation.lock, unlock (~70 lines)
│   ├── capacitor-preferences.mock.ts     # Mock Preferences.get, set, remove (~80 lines)
│   └── capacitor-app.mock.ts             # Mock App.getInfo, addListener (~75 lines)
├── tier1/
│   ├── tier1-docscanner.test.ts          # T1-DOC-01 to T1-DOC-05 (~150 lines)
│   ├── tier1-location.test.ts            # T1-LOC-01 to T1-LOC-05 (~160 lines)
│   ├── tier1-signature.test.ts           # T1-SIG-01 to T1-SIG-05 (~160 lines)
│   ├── tier1-biometric.test.ts           # T1-BIO-01 to T1-BIO-05 (~150 lines)
│   ├── tier1-appupdate.test.ts           # T1-UPD-01 to T1-UPD-05 (~140 lines)
│   └── tier1-pwainstall.test.ts          # T1-PWA-01 to T1-PWA-05 (~140 lines)
├── tier2/
│   ├── tier2-docscanner.test.ts          # T2-DOC-01 to T2-DOC-05 (~170 lines)
│   ├── tier2-location.test.ts            # T2-LOC-01 to T2-LOC-05 (~170 lines)
│   ├── tier2-signature.test.ts           # T2-SIG-01 to T2-SIG-05 (~170 lines)
│   ├── tier2-biometric.test.ts           # T2-BIO-01 to T2-BIO-05 (~160 lines)
│   ├── tier2-appupdate.test.ts           # T2-UPD-01 to T2-UPD-05 (~150 lines)
│   └── tier2-pwainstall.test.ts          # T2-PWA-01 to T2-PWA-05 (~150 lines)
├── tier3/
│   ├── tier3-pairwise-part1.test.ts      # T3-INT-01 to T3-INT-05 (~180 lines)
│   └── tier3-pairwise-part2.test.ts      # T3-INT-06 to T3-INT-10 (~180 lines)
├── tier4/
│   └── tier4-workflows.test.ts           # T4-E2E-01 to T4-E2E-05 (~220 lines)
├── test-harness.ts                       # Minimal test assertion & reporting framework (~120 lines)
└── runner.ts                             # Master execution runner with Tier breakdown & exit code (~180 lines)
```

**Line Count Compliance Guarantee**:
- No file exceeds 220 lines.
- Average file length: ~135 lines.
- Every test file is completely self-contained and independently executable.

---

## 4. Test Infrastructure Architecture Blueprint (`TEST_INFRA.md`)

Below is the architectural blueprint for `s:\OrgaFlow_Alpha\TEST_INFRA.md` following the required Project Pattern template.

### Structural Blueprint
1. **Title & Header**: `TEST_INFRA.md` - OrgaFlow Hybrid App E2E Test Infrastructure
2. **Architecture & Scope**: Headless, opaque-box, requirement-driven test harness executing under Node.js 25.
3. **Execution Command & Interface Contract**:
   - Single command: `npm run test:e2e` in `frontend/` (executes `node --experimental-strip-types tests/runner.ts`).
   - Exit code: 0 on all tests passing, 1 on any failure.
   - Output format: ANSI color formatted tabular summary reporting Tier 1, 2, 3, 4 breakdown.
4. **Mock Capacitor & Browser Bridge**:
   - Detailed specification of mock interceptors for `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/screen-orientation`, `@capacitor/preferences`, `@capacitor/app`, and browser globals (`fetch`, `crypto.subtle`, `matchMedia`, `beforeinstallprompt`).
5. **Tier Breakdown & Traceability Matrix**:
   - Tabular summary of all 75 test cases with IDs and criteria.
6. **Pass Criteria & Publication of `TEST_READY.md`**:
   - 100% of the 75 tests passing.
   - Zero errors, zero flakiness, deterministic offline execution.

---

## 5. Synthesis & Peer Alignment

- **Explorer 1 (Test Infra)**: Recommends Node 25 native execution (`--experimental-strip-types` or `node:test`) with lightweight Capacitor plugin mocks. This perfectly aligns with our proposed modular mock structure.
- **Spec Miner 2 (Feature Specifications)**: Extracted full method signatures and failure modes from `documentScannerService.ts`, `locationService.ts`, `FullscreenSignatureModal.svelte`, `biometricService.ts`, `AppUpdateBanner.svelte`, and `PwaInstallButton.svelte`. Our 75 test cases directly map to all discovered edge cases and state machines.
- **Explorer 3 (Test Suite Architect)**: Delivers the concrete 75-case inventory and <= 250 line modular file breakdown.
