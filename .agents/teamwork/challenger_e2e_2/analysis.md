# Empirical Analysis Report: E2E Test Suite & Native Features Track

**Agent**: Challenger 2 (Empirical Challenger - critic, specialist)  
**Date**: 2026-11-11  
**Scope**: OrgaFlow Hybrid App Native Features E2E Test Track  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Executive Summary

A comprehensive empirical evaluation of the 4-tier E2E test suite (`frontend/tests/`) and its corresponding native services and UI components was executed. The test harness itself executes rapidly (~110–150 ms) and deterministically across all three invocations (`npm test`, `npm run test:e2e`, and `npx tsx tests/runner.ts`) with 75/75 tests passing.

However, adversarial stress testing and source code inspection uncovered **critical runtime defects** and **test isolation discrepancies**:
1. **Critical Defect in `FullscreenSignatureModal.svelte`**: Screen orientation lock and back-button registration are located in `onMount` guarded by `if (!isOpen) return;`. In standard usage, when `isOpen` changes from `false` to `true`, `onMount` never re-runs, meaning the screen **never locks to landscape** and the Android back-button handler is **never registered**. The test suite did not catch this because no test mounts `FullscreenSignatureModal.svelte` (tests invoke Capacitor plugins directly).
2. **Defect in `AppUpdateBanner.svelte` & Test Facade**: Line 31 of `AppUpdateBanner.svelte` uses `if (data?.version && data.version !== appVersion)` which causes the banner to prompt users to **downgrade** if the server version is older (e.g. 1.0.0 vs local 1.2.0). The test `T2-UPD-04` passed only because it tested a private helper function in the test file that implemented `data.version > appVersion`, completely bypassing the flawed component.
3. **Logic Flaw in `biometricService.verifyPin`**: Line 74 (`if (!value) return true;`) returns `true` when the stored PIN hash is empty or missing, but fails to set `this.isLockedState = false`. Consequently, `verifyPin()` returns `true` (claiming success) while `isLockActive` remains `true` (locked), leaving the application in an unrecoverable desynchronized state.
4. **Documentation Inaccuracy in `TEST_READY.md`**: Section 4 claims that Svelte UI components (`DocumentScanButton.svelte`, `GpsAddressButton.svelte`, `FullscreenSignatureModal.svelte`, `NativeAppManager.svelte`, `AppUpdateBanner.svelte`, `PwaInstallButton.svelte`) are the "Tested Component". In reality, zero `.svelte` files are imported or executed anywhere in `frontend/tests/`.

---

## 2. Empirical Verification of Boundary Conditions (Tier 2)

### 2.1 GPS Hardware Acquisition Timeout (T2-LOC-02)
- **Status**: **VERIFIED** (Real Service Error Code Path)
- **Empirical Execution**: Injected `{ code: 3, message: 'Timeout expired after 10000ms' }` via `mockCapacitorBridge.locationError`.
- **Observed Behavior**: `locationService.getCurrentPosition()` caught error code 3, output `Fehler bei der Standortermittlung: { code: 3, message: 'Timeout expired after 10000ms' }` to stderr/console, and threw the localized user-facing German error:
  `'Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten.'`
- **Result**: Fully validated against real service logic.

### 2.2 Camera Hardware Permission Denial (T2-DOC-02)
- **Status**: **VERIFIED** (Real Service Error Code Path)
- **Empirical Execution**: Injected `new Error('Permission denied by user')` via `mockCapacitorBridge.cameraError`.
- **Observed Behavior**: `documentScannerService.capturePage()` intercepted the hardware rejection, output `Kamerafehler beim Belegscan: Error: Permission denied by user` to console, and rethrew:
  `'Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.'`
- **Result**: Fully validated against real service logic.

### 2.3 Corrupt PIN Hash in Biometrics (T2-BIO Edge Case)
- **Status**: **DEFECT FOUND / TEST GAP**
- **Empirical Test Script**: Injected various corrupted states into `Preferences` (`orga_app_pin_hash`):
  1. *Corrupt hash string* (`'corrupted_non_sha256_hash'`): `verifyPin('123456')` returned `false`, app remained locked (`isLockActive = true`). (Correct behavior)
  2. *Corrupt/empty hash string* (`''`): `verifyPin('wrong_pin')` returned `true`, but `isLockActive` remained `true`! (Bug: line 74 returns `true`, skipping line 82 `this.isLockedState = false`).
  3. *Missing/deleted hash key when enabled*: `verifyPin('wrong_pin')` returned `true`, but `isLockActive` remained `true`!
- **Test Gap**: `frontend/tests/tier2/tier2-biometric.test.ts` contains no test case where `orga_app_pin_hash` is corrupted, deleted, or empty while `orga_biometric_lock_enabled` is `'true'`.

### 2.4 Missing / Older Update Version (T2-UPD-02, T2-UPD-04)
- **Status**: **DEFECT FOUND IN COMPONENT / TEST FACADE**
- **Empirical Observation**:
  - `AppUpdateBanner.svelte` (line 31):
    ```ts
    if (data?.version && data.version !== appVersion) {
        availableVersion = data.version;
    ```
    If local app version is `1.2.0` and remote version is `1.0.0`, `"1.0.0" !== "1.2.0"` evaluates to `true`. The component displays an update banner offering to downgrade the app!
  - `tier2-appupdate.test.ts` (line 30):
    ```ts
    if (data?.version && typeof data.version === 'string' && data.version > appVersion) {
        return { availableVersion: data.version, apkUrl: data.apkUrl };
    ```
    The test passed only because it tested its own local function `executeRobustUpdateCheck` which implemented `data.version > appVersion`. The test did NOT test `AppUpdateBanner.svelte`, masking this bug.

### 2.5 PWA `beforeinstallprompt` (T2-PWA-04)
- **Status**: **OBSERVED TEST ABSTRACTION**
- **Observation**: `tier2-pwainstall.test.ts` defines `mountPwaButtonLifecycle` directly inside the test file instead of importing `PwaInstallButton.svelte`. While the event lifecycle logic mirrors the component, the component itself is not under test.

---

## 3. Empirical Verification of Full Service Logic & PDF Generation (Tiers 3 & 4)

### 3.1 Document Scanner & `pdf-lib` Binary Verification
- **Status**: **VERIFIED (Zero Shortcuts)**
- **Empirical Test**: Executed `documentScannerService.bundleToPdf()` with two 1x1 test images. The resulting binary was directly examined and re-parsed using `PDFDocument.load()`:
  - Header: Exact `%PDF-` specification signature.
  - Page count: Exactly 2 pages.
  - Page dimensions: Standard DIN A4 (`595.28` x `841.89` points).
  - Byte stream size: 1,718 bytes.
- **Verdict**: The document scanner service executes full, authentic `pdf-lib` image embedding, aspect ratio calculation, and PDF serialization. No mock shortcuts exist in the service.

### 3.2 Fullscreen Signature Modal Orientation & Lifecycle
- **Status**: **CRITICAL DEFECT IN COMPONENT**
- **Empirical Code Inspection (`FullscreenSignatureModal.svelte`)**:
  ```svelte
  onMount(() => {
      if (!isOpen) return; // <-- Early exit on mount when modal starts closed!
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
- **Failure Scenario**:
  1. A parent view mounts `<FullscreenSignatureModal bind:isOpen={showModal} />` with `showModal = false`.
  2. `onMount` executes once on initial DOM attachment and immediately returns `undefined` because `!isOpen`.
  3. When the caregiver later opens the modal (`showModal = true`), `onMount` **does not execute again**.
  4. Result: `setupOrientation()` is **never called** (orientation remains portrait), and `backButtonHandler.register` is **never registered** (Android hardware back-button does not close modal).
  5. When closed, no cleanup function exists to restore portrait orientation.
- **Root Cause in PROJECT.md Specification**:
  `PROJECT.md` line 23 specifically required:
  `"Signature Lifecycle Fix: Svelte 5 $effect reactive orientation lock & back-button unregister in FullscreenSignatureModal"`.
  The implementation incorrectly used `onMount` with an early return instead of a reactive Svelte 5 `$effect(() => { if (isOpen) { ... return () => { ... } } })`.
- **Why Tests Passed**: Tests in Tier 1 (`T1-SIG-01..05`), Tier 2 (`T2-SIG-01..05`), Tier 3, and Tier 4 never imported or mounted `FullscreenSignatureModal.svelte`. They directly called `ScreenOrientation.lock()` and `backButtonHandler.register()` manually in the test body.

---

## 4. Test Suite Execution Under Varying Command Invocations

All three documented execution commands were tested in a clean environment:

| Invocation Command | Result | Tests Passed | Duration | Exit Code |
|---|---|---|---|---|
| `npm test` | **PASS** | 75 / 75 | 112.38 ms | `0` |
| `npm run test:e2e` | **PASS** | 75 / 75 | 130.40 ms | `0` |
| `npx tsx tests/runner.ts` | **PASS** | 75 / 75 | 154.80 ms | `0` |

---

## 5. Required Actions & Remediations

To achieve full production readiness, the following fixes must be made:

1. **Fix `FullscreenSignatureModal.svelte` Lifecycle**:
   Replace the faulty `onMount` with a reactive `$effect` observing `isOpen`:
   ```svelte
   $effect(() => {
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
2. **Fix Version Comparison in `AppUpdateBanner.svelte`**:
   Replace `if (data?.version && data.version !== appVersion)` with semver comparison or downgrade protection:
   ```svelte
   if (data?.version && isNewerVersion(data.version, appVersion))
   ```
3. **Fix Lock Desync in `biometricService.ts`**:
   In `verifyPin(pin: string)`:
   If `!value`, ensure `this.isLockedState = false;` is set before returning `true`, or reject verification if biometric lock is enabled without a stored PIN hash.
4. **Update `TEST_READY.md` Component Checklist**:
   Clarify in Section 4 that tests assert against the native services and Capacitor bridge contracts, or extract the controller logic of `AppUpdateBanner` and `PwaInstallButton` into dedicated testable service modules (e.g. `appUpdateService.ts`, `pwaInstallService.ts`) imported by both components and tests.
