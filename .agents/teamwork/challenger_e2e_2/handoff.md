# Handoff Report: Challenger 2 (Edge Case & Boundary Stress Verification)

**Track**: E2E Testing Track Verification  
**Agent**: Challenger 2 (`challenger_e2e_2`)  
**Verdict**: **REQUEST_CHANGES**  
**Recipient**: Parent Orchestrator (`e4b4390f-0ea6-4617-89fd-efa18f21073c`)

---

## 1. Observation

### Obs 1: Test Command Invocations
All three documented test runner invocations executed successfully in `s:\OrgaFlow_Alpha\frontend`:
- Command: `npm test` -> Output: `Total Tests Run: 75, Total Passed: 75, Total Failed: 0, Total Duration: 112.38ms`, Exit code: `0`.
- Command: `npm run test:e2e` -> Output: `Total Tests Run: 75, Total Passed: 75, Total Failed: 0, Total Duration: 130.40ms`, Exit code: `0`.
- Command: `npx tsx tests/runner.ts` -> Output: `Total Tests Run: 75, Total Passed: 75, Total Failed: 0, Total Duration: 154.80ms`, Exit code: `0`.
- Command: `npm run check` -> Output: `svelte-check found 0 errors and 0 warnings`, Exit code: `0`.

### Obs 2: Real Service Error Execution in Tier 2
1. **GPS Timeout**: `s:\OrgaFlow_Alpha\frontend\src\lib\services\locationService.ts` (lines 70-76) outputs verbatim:
   `Fehler bei der Standortermittlung: { code: 3, message: 'Timeout expired after 10000ms' }` and throws:
   `Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten.`.
   Tested via `tests/tier2/tier2-location.test.ts` (lines 25-34).
2. **Camera Denial**: `s:\OrgaFlow_Alpha\frontend\src\lib\services\documentScannerService.ts` (lines 47-55) outputs verbatim:
   `Kamerafehler beim Belegscan: Error: Permission denied by user` and throws:
   `Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.`.
   Tested via `tests/tier2/tier2-docscanner.test.ts` (lines 24-33).

### Obs 3: Critical Lifecycle Defect in `FullscreenSignatureModal.svelte`
In `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\FullscreenSignatureModal.svelte` (lines 27-39):
```svelte
27:     onMount(() => {
28:         if (!isOpen) return;
29:         setupOrientation();
30:         const unregisterBack = backButtonHandler.register(() => {
31:             closeModal();
32:             return true;
33:         });
34: 
35:         return () => {
36:             resetOrientation();
37:             unregisterBack();
38:         };
39:     });
```
When `<FullscreenSignatureModal bind:isOpen={open} />` mounts with `isOpen = false`, `onMount` runs once and returns immediately at line 28. When `isOpen` subsequently transitions to `true`, `onMount` never re-executes. Consequently:
- `setupOrientation()` (`ScreenOrientation.lock({ orientation: 'landscape' })`) is never called.
- `backButtonHandler.register()` is never registered.
- On close, orientation reset and back-button unregistration are never called.
This directly violates `PROJECT.md` §Interface Contracts (line 66):
`"Lifecycle: Bound via $effect when isOpen becomes true -> triggers ScreenOrientation.lock({ orientation: 'landscape' }) and registers Capacitor back-button handler. On close -> unlocks orientation and unregisters back-button."`

### Obs 4: Downgrade Defect in `AppUpdateBanner.svelte` & Test Masking
In `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\AppUpdateBanner.svelte` (line 31):
```ts
31:         if (data?.version && data.version !== appVersion) {
32:             availableVersion = data.version;
33:             if (data.apkUrl) downloadUrl = data.apkUrl;
34:         }
```
If the installed app version is `1.2.0` and the remote version is `1.0.0`, `"1.0.0" !== "1.2.0"` is `true`, prompting the user to install a downgrade.
However, in `s:\OrgaFlow_Alpha\frontend\tests\tier2\tier2-appupdate.test.ts` (line 30), test `T2-UPD-04` did not test `AppUpdateBanner.svelte`. Instead it tested a private local test function:
```ts
30:         if (data?.version && typeof data.version === 'string' && data.version > appVersion) {
```
The test passed because the test author implemented `>` in the test helper while the real component has `!==`.

### Obs 5: Verification of PDF Byte Stream in Tier 3 & Tier 4
Direct empirical inspection of `documentScannerService.bundleToPdf()` output:
- PDF binary begins with magic bytes `%PDF-`.
- Parsed via `PDFDocument.load()`: exactly 2 pages, DIN A4 dimensions `595.28` x `841.89` points.
- Byte stream size: 1,718 bytes. No mock shortcuts exist in `documentScannerService.ts`.

### Obs 6: Inaccuracy in `TEST_READY.md` Component Checklist
`TEST_READY.md` (lines 45-53) lists `DocumentScanButton.svelte`, `GpsAddressButton.svelte`, `FullscreenSignatureModal.svelte`, `NativeAppManager.svelte`, `AppUpdateBanner.svelte`, and `PwaInstallButton.svelte` as the "Tested Component".
Search command: `Select-String -Path "frontend\tests\**\*.ts" -Pattern "DocumentScanButton|GpsAddressButton|FullscreenSignatureModal|NativeAppManager|AppUpdateBanner|PwaInstallButton"` returned 0 component imports in all test files.

---

## 2. Logic Chain

1. From **Obs 1**, the headless test runner infrastructure and CLI commands are functional, fast, and pass 75/75 tests.
2. From **Obs 2** and **Obs 5**, `locationService.ts` and `documentScannerService.ts` execute real native plugin error handling and real `pdf-lib` binary generation without shortcuts.
3. From **Obs 3**, `FullscreenSignatureModal.svelte` places orientation lock and back-button registration inside `onMount` guarded by `if (!isOpen) return;`. Because modals start closed in normal application flows, the orientation lock to landscape and back-button registration will never execute at runtime.
4. From **Obs 6**, tests in `frontend/tests/` do not import or mount `FullscreenSignatureModal.svelte`, so the test suite could not detect Obs 3.
5. From **Obs 4**, `AppUpdateBanner.svelte` contains a regression bug where older versions trigger an update banner. `T2-UPD-04` masked this by testing a private helper function with stricter logic (`>`) than the component (`!==`).
6. Therefore, while the service layer is robust, critical defects exist in the hybrid component layer that must be resolved prior to final track approval.

---

## 3. Caveats

- Testing Svelte 5 components with runes (`$state`, `$effect`, `$props`) directly inside Node.js `tsx` requires a full DOM mounting setup (e.g. `@testing-library/svelte` or Vitest with JSDOM). The current test runner operates at the service and bridge level, which is standard for Capacitor headless tests, but leaves component template and lifecycle bindings unexercised by automated tests unless controller logic is cleanly separated.
- No other caveats.

---

## 4. Conclusion

**VERDICT: REQUEST_CHANGES**

The native service layer (`documentScannerService.ts`, `locationService.ts`) is well-constructed and verified. However, changes are requested to fix:
1. **`FullscreenSignatureModal.svelte`**: Replace `onMount` with a reactive Svelte 5 `$effect` bound to `isOpen` to ensure landscape lock and back-button handling activate when opened.
2. **`AppUpdateBanner.svelte`**: Fix line 31 to prevent downgrades (`isNewerVersion(data.version, appVersion)` instead of `!==`).
3. **`biometricService.ts`**: Fix `verifyPin()` line 74 so that empty/missing hash does not leave `isLockActive = true` when returning `true`.
4. **`TEST_READY.md`**: Align the documentation to accurately reflect that tests target service and bridge contracts, or extract component controllers into testable TypeScript modules.

---

## 5. Verification Method

1. **Verify Test Runner Execution**:
   ```bash
   cd s:\OrgaFlow_Alpha\frontend
   npm test
   npm run test:e2e
   npx tsx tests/runner.ts
   ```
   All commands should report 75/75 passed.
2. **Verify `FullscreenSignatureModal.svelte` Bug**:
   Inspect lines 27-39 in `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\FullscreenSignatureModal.svelte`. Note that when `isOpen` is initially `false`, `onMount` exits early and orientation lock never executes when `isOpen` becomes `true`.
3. **Verify `AppUpdateBanner.svelte` Downgrade Bug**:
   Inspect line 31 in `s:\OrgaFlow_Alpha\frontend\src\lib\components\app\AppUpdateBanner.svelte`. Compare with line 30 in `s:\OrgaFlow_Alpha\frontend\tests\tier2\tier2-appupdate.test.ts`.
