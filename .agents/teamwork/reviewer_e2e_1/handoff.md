# Handoff Report — Reviewer 1 (E2E Test Suite)

**Date**: 2026-11-11  
**Author**: Reviewer 1 (Archetype: Reviewer & Adversarial Critic)  
**Parent Agent**: `e4b4390f-0ea6-4617-89fd-efa18f21073c`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

1. **Test Execution & Type Checking**:
   - Command: `cd frontend; npm run test:e2e`
     - Output: `75/75 tests passed, 0 failed, duration 126.53ms, exit code 0`.
   - Command: `cd frontend; npm run check`
     - Output: `svelte-check found 0 errors and 0 warnings, exit code 0`.
   - Line Count Audit:
     - All 23 files in `frontend/tests/` are <= 250 lines (minimum: `setup.ts` 34 lines; maximum: `mockBrowserGlobals.ts` 222 lines).

2. **Integrity Violations in Test Code**:
   - `frontend/tests/tier1/tier1-pwainstall.test.ts` (lines 120-128, `T1-PWA-05`):
     ```typescript
     registerTest('T1-PWA-05', 1, 'PWA: Variant Rendering Support', async () => {
         resetTestEnvironment();
         const compactConfig = { variant: 'compact' };
         const fullConfig = { variant: 'full' };
         assertEquals(compactConfig.variant, 'compact');
         assertEquals(fullConfig.variant, 'full');
     });
     ```
   - `frontend/tests/tier3/tier3-pairwise-part2.test.ts` (lines 19-35, `T3-INT-06`):
     ```typescript
     mockCapacitorBridge.isNative = true;
     const canPwaNative = !mockCapacitorBridge.isNative;
     const canUpdateNative = mockCapacitorBridge.isNative;
     assertEquals(canPwaNative, false, 'PWA install must be suppressed on native');
     assertEquals(canUpdateNative, true, 'AppUpdateBanner is eligible on native');
     ```
   - `frontend/tests/tier3/tier3-pairwise-part2.test.ts` (lines 91-93, `T3-INT-09`):
     ```typescript
     const lockZIndex = 10000;
     const bannerZIndex = 9980;
     assert(lockZIndex > bannerZIndex, 'Biometric lock z-index must strictly exceed update banner');
     ```
   - `frontend/tests/tier4/tier4-workflows.test.ts` (lines 127-129, `T4-E2E-04`):
     ```typescript
     let bannerDismissed = false;
     bannerDismissed = true; // User clicks close button
     assertEquals(bannerDismissed, true, 'Update banner dismissed for session');
     ```

3. **Masked Production Bug (Downgrade Vulnerability)**:
   - Production file `frontend/src/lib/components/app/AppUpdateBanner.svelte` (line 31):
     ```svelte
     if (data?.version && data.version !== appVersion) {
         availableVersion = data.version;
         if (data.apkUrl) downloadUrl = data.apkUrl;
     }
     ```
   - Test file `frontend/tests/tier2/tier2-appupdate.test.ts` (lines 29-32, 69-75, `T2-UPD-04`):
     ```typescript
     // Guard against downgrades and malformed payloads
     if (data?.version && typeof data.version === 'string' && data.version > appVersion) {
         return { availableVersion: data.version, apkUrl: data.apkUrl };
     }
     ```
     The test author introduced `data.version > appVersion` inside a private helper function `executeRobustUpdateCheck` in the test file, allowing `T2-UPD-04` to pass while the production component in `AppUpdateBanner.svelte` line 31 still uses `data.version !== appVersion` (which prompts the user to downgrade if remote version is lower).

4. **Production Lifecycle Defect in `FullscreenSignatureModal.svelte`**:
   - `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` (lines 27-39):
     ```svelte
     onMount(() => {
         if (!isOpen) return;
         setupOrientation();
         const unregisterBack = backButtonHandler.register(() => {
             closeModal();
             return true;
         });
         return () => { resetOrientation(); unregisterBack(); };
     });
     ```
     `onMount` runs once at component initialization. When mounted with `isOpen = false` (default), it immediately exits on line 28. When `isOpen` subsequently becomes `true`, neither `setupOrientation()` nor `backButtonHandler.register()` is invoked. The test files (`tier1-signature.test.ts` and `tier2-signature.test.ts`) did not catch this because they called `ScreenOrientation.lock()` and `backButtonHandler.register()` directly.

---

## 2. Logic Chain

1. **Premise 1**: Project review standards mandate an explicit verdict of `REQUEST_CHANGES` with a Critical finding tagged as `INTEGRITY VIOLATION` if hardcoded test results, dummy implementations with no real logic, or shortcuts that bypass intended verification are detected.
2. **Premise 2**: Observation 2 directly demonstrates that `T1-PWA-05` asserts an in-memory object literal equals itself, `T3-INT-06` asserts Boolean inversion on a local variable, `T3-INT-09` asserts `10000 > 9980`, and `T4-E2E-04` asserts a variable set on the previous line. These assertions test zero production logic and inflate the test pass metrics without genuine verification.
3. **Premise 3**: Observation 3 directly demonstrates that `T2-UPD-04` claimed to verify downgrade avoidance, but tested a private local function rather than the application code, masking a live production flaw where `AppUpdateBanner.svelte` line 31 prompts users to downgrade if remote `version.json` is older than local version.
4. **Premise 4**: Observation 4 demonstrates that `FullscreenSignatureModal.svelte` fails to lock orientation or register the back-button handler on opening due to an `onMount` guard that was not updated to a reactive `$effect`, as required by `PROJECT.md` line 23.
5. **Conclusion**: While the test infrastructure is mechanically sound (fast runner, clean svelte-check, <= 250 lines), the presence of dummy test assertions and test-local facades masking production defects requires changes before approval.

---

## 3. Caveats

- Android native compilation (`npx cap sync` / Android Studio Gradle build) was not re-tested in this review as the scope was strictly bounded to `frontend/tests/` and test deliverables.
- Real device orientation lock and hardware back-button behaviors were simulated via the Mock Capacitor Bridge (`mockCapacitorBridge.ts`), which accurately mirrors Capacitor 7 `nativePromise`/`nativeCallback` contracts.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The work cannot be approved in its current state due to Critical Integrity Violations and masked production bugs.
Before approval:
1. Replace tautological dummy tests (`T1-PWA-05`, `T3-INT-06`, `T3-INT-09`, `T4-E2E-04`) with genuine property and state checks.
2. Extract the update checking logic into a shared service with proper version comparison (`remote > current`), and use it in both `AppUpdateBanner.svelte` and `tier2-appupdate.test.ts`.
3. Update `FullscreenSignatureModal.svelte` to bind orientation and back button handlers reactively via Svelte 5 `$effect`.

---

## 5. Verification Method

To verify these findings:
1. Inspect `frontend/tests/tier1/tier1-pwainstall.test.ts` lines 120-128 (`T1-PWA-05`). Notice the assertion tests only `{ variant: 'compact' }`.
2. Compare `frontend/src/lib/components/app/AppUpdateBanner.svelte` line 31 (`data.version !== appVersion`) with `frontend/tests/tier2/tier2-appupdate.test.ts` line 30 (`data.version > appVersion`).
3. Inspect `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` line 28 (`if (!isOpen) return;` inside `onMount`).
4. Re-run test commands after remediation:
   ```bash
   cd frontend
   npm run test:e2e
   npm run check
   ```
