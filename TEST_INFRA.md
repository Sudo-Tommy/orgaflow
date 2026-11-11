# TEST_INFRA — OrgaFlow Hybrid App E2E Test Infrastructure

## 1. Overview & Architecture
This document specifies the automated, headless End-to-End (E2E) testing infrastructure for the OrgaFlow Hybrid App ("Seniorenassistenz", Capacitor 7, SvelteKit).
The test suite implements an opaque-box, requirement-driven verification methodology across four hierarchical tiers covering all 6 native hybrid hardware and platform features:
1. **Document Scanner Service** (`documentScannerService.ts` / `DocumentScanButton.svelte`)
2. **Location & Reverse Geocoding Service** (`locationService.ts` / `GpsAddressButton.svelte`)
3. **Fullscreen Signature Modal & Orientation Lock** (`FullscreenSignatureModal.svelte`)
4. **Biometric Security & Resume Lock** (`biometricService.ts` / `biometricService.svelte.ts` / `NativeAppManager.svelte`)
5. **App Update Banner** (`AppUpdateBanner.svelte`)
6. **PWA Installation Button** (`PwaInstallButton.svelte`)

The suite operates in Node.js (v25+) using `tsx` and a high-fidelity in-memory Capacitor & Browser Bridge (`frontend/tests/mocks/`), ensuring 100% deterministic, offline, and sub-second execution without physical mobile hardware.

---

## 2. Test Execution & Interface Contract

### Commands
- Full E2E Test Suite:
  ```bash
  cd frontend
  npm run test:e2e
  ```
- Standard Test Alias:
  ```bash
  cd frontend
  npm test
  ```
- Direct tsx Runner Invocation:
  ```bash
  cd frontend
  npx tsx tests/runner.ts
  ```

### Exit Codes & Output Contract
- **Exit Code 0**: 100% of tests pass (75 of 75 passing, 0 failed).
- **Exit Code 1**: Any test failure or uncaught assertion error.
- **Console Output**: ANSI color-coded hierarchical report detailing each test ID, status, execution duration, tier breakdown, and summary.

---

## 3. Mock Capacitor & Browser Bridge Architecture

Located in `frontend/tests/mocks/`, the mock bridge replaces native device APIs with deterministic in-memory implementations:

| Mock Component | Target Native Dependency | Simulated Behavior |
|---|---|---|
| `capacitor-camera.mock.ts` | `@capacitor/camera` (`Camera`) | High-res image capture (JPEG/PNG data URLs), gallery picker, simulated cancellation, permission rejection |
| `capacitor-geolocation.mock.ts` | `@capacitor/geolocation` (`Geolocation`) | GPS coordinate simulation, permission negotiation (`granted`, `denied`, `prompt`), timeout emulation |
| `capacitor-orientation.mock.ts` | `@capacitor/screen-orientation` (`ScreenOrientation`) | Landscape locking (`ScreenOrientation.lock`), orientation unlocking, unsupported platform fail-safety |
| `capacitor-preferences.mock.ts` | `@capacitor/preferences` (`Preferences`) | Asynchronous key-value store simulating device preferences (PIN hashes, security flags) |
| `capacitor-app.mock.ts` | `@capacitor/app` (`App`) | App lifecycle events (`appStateChange`), version inspection (`getInfo`), application exit (`exitApp`) |
| `capacitor-core.mock.ts` | `@capacitor/core` (`Capacitor`) | Runtime platform switching (`android`, `ios`, `web`), native platform interrogation (`isNativePlatform`) |
| `browser-env.mock.ts` | `window`, `navigator`, `document`, `fetch` | Headless DOM & Canvas 2D context, `beforeinstallprompt`, OpenStreetMap Nominatim reverse geocoding API, version endpoint |

---

## 4. 4-Tier Test Catalog & Coverage Matrix

### Tier Breakdown
- **Tier 1: Feature Coverage (30 Tests)**: Validates standard functionality and API contracts for each of the 6 features (5 tests per feature).
- **Tier 2: Boundary & Corner Cases (30 Tests)**: Validates hardware timeouts, permission denials, offline modes, input boundaries, and error recovery (5 tests per feature).
- **Tier 3: Cross-Feature Combinations (10 Tests)**: Validates concurrent feature interactions, modal stacking hierarchy (`layer-stacking.md`), and lifecycle collisions.
- **Tier 4: Real-World Application Scenarios (5 Tests)**: Validates end-to-end caregiver workflows (Fahrtenbuch logging, client visit completion, receipt archiving, boot security, onboarding).

**Total Test Count**: 75 tests.

---

## 5. Verification Gate & Publication
Execution of the test suite is verified via:
1. `npm run test:e2e`: 75/75 passing, 0 failing.
2. `npm run check`: 0 TypeScript / Svelte compilation errors.
3. Code minimalism check: all test and mock source files strictly <= 250 lines.
4. Publication of `TEST_READY.md` upon completion.
