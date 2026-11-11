# Handoff Report — Explorer R2-1 (Remediation of Tautological Dummy Tests)

**Track**: E2E Testing Track (Iteration 2)  
**Agent**: Explorer R2-1 (`explorer_e2e_r2_1`)  
**Parent Orchestrator**: `e4b4390f-0ea6-4617-89fd-efa18f21073c`  
**Date**: 2026-11-11  
**Handoff Type**: Hard (Investigation & Test Design Complete)  

---

## 1. Observation

1. **Reviewer 1 Findings on 4 Tautological Tests**:
   In `s:\OrgaFlow_Alpha\.agents\teamwork\reviewer_e2e_1\handoff.md` lines 20–51, Reviewer 1 cited the following verbatim code blocks:
   - `frontend/tests/tier1/tier1-pwainstall.test.ts` (lines 120–128, `T1-PWA-05`):
     ```typescript
     const compactConfig = { variant: 'compact' };
     const fullConfig = { variant: 'full' };
     assertEquals(compactConfig.variant, 'compact');
     assertEquals(fullConfig.variant, 'full');
     ```
   - `frontend/tests/tier3/tier3-pairwise-part2.test.ts` (lines 19–35, `T3-INT-06`):
     ```typescript
     mockCapacitorBridge.isNative = true;
     const canPwaNative = !mockCapacitorBridge.isNative;
     const canUpdateNative = mockCapacitorBridge.isNative;
     assertEquals(canPwaNative, false, 'PWA install must be suppressed on native');
     assertEquals(canUpdateNative, true, 'AppUpdateBanner is eligible on native');
     ```
   - `frontend/tests/tier3/tier3-pairwise-part2.test.ts` (lines 91–93, `T3-INT-09`):
     ```typescript
     const lockZIndex = 10000;
     const bannerZIndex = 9980;
     assert(lockZIndex > bannerZIndex, 'Biometric lock z-index must strictly exceed update banner');
     ```
   - `frontend/tests/tier4/tier4-workflows.test.ts` (lines 127–129, `T4-E2E-04`):
     ```typescript
     let bannerDismissed = false;
     bannerDismissed = true; // User clicks close button
     assertEquals(bannerDismissed, true, 'Update banner dismissed for session');
     ```

2. **Component Source Inspections**:
   - `frontend/src/lib/components/app/PwaInstallButton.svelte`:
     - Line 7: `let { variant = 'compact' }: { variant?: 'compact' | 'full' } = $props();`
     - Line 17: `if (Capacitor.isNativePlatform()) return;`
     - Line 18: `if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) return;`
     - Line 28: `window.addEventListener('beforeinstallprompt', handlePrompt);`
     - Lines 50–75: Conditional rendering based on `canInstall` and `variant`:
       - `variant === 'full'`: `w-full flex items-center justify-between ...` with label `"App auf PC installieren"` and badge `"1-Klick"`.
       - `variant === 'compact'`: `flex items-center gap-1.5 ...` with tooltip `title="Seniorenassistenz als App auf Ihrem PC installieren"` and label `"App installieren"`.
   - `frontend/src/lib/components/app/AppUpdateBanner.svelte`:
     - Line 13: `if (!Capacitor.isNativePlatform()) return;`
     - Line 51: Declares CSS class `z-[9980]`.
     - Line 48: Renders `{#if availableVersion && !isDismissed}`.
     - Line 73: Dismisses with `onclick={() => isDismissed = true}`.
   - `frontend/src/lib/components/app/NativeAppManager.svelte`:
     - Line 56: Declares biometric lock overlay CSS class `z-[10000]` with `role="dialog"`.
     - Mounts `<AppUpdateBanner />` on line 51, placing the security screen directly over it when active.

3. **Current File Line Counts**:
   - `frontend/tests/tier1/tier1-pwainstall.test.ts`: exactly 128 lines.
   - `frontend/tests/tier3/tier3-pairwise-part2.test.ts`: exactly 123 lines.
   - `frontend/tests/tier4/tier4-workflows.test.ts`: exactly 164 lines.
   All are well within the 250-line limit mandated by `code-minimalism.md`.

---

## 2. Logic Chain

1. **Premise 1**: Reviewer 1 and Challenger 2 rejected the test suite due to 4 dummy assertions that did not test application code, inflating test metrics without verification.
2. **Premise 2 (T1-PWA-05)**: Rather than testing `{ variant: 'compact' }`, an authentic test must evaluate the variant property resolution (`compact` vs `full`), the initial hidden state, the dynamic layout and accessibility changes (inline label & tooltip vs full-width & `"1-Klick"` badge) triggered by `beforeinstallprompt`, and the teardown upon `appinstalled`.
3. **Premise 3 (T3-INT-06)**: Rather than evaluating local variable inversion `!mockCapacitorBridge.isNative`, an authentic pairwise test must execute the lifecycle platform check of `PwaInstallButton` and `AppUpdateBanner` under both `Capacitor.isNativePlatform() === true` and `=== false`. On native, PWA is suppressed and update banner is active; in browser, update banner is suppressed and PWA prompt is active.
4. **Premise 4 (T3-INT-09)**: Rather than evaluating `10000 > 9980` statically, an authentic test must parse the actual production Svelte templates (`NativeAppManager.svelte` and `AppUpdateBanner.svelte`) on disk, extract the declared Tailwind classes (`z-[10000]` and `z-[9980]`), and verify that the security lock strictly supersedes the update notification pursuant to `layer-stacking.md`.
5. **Premise 5 (T4-E2E-04)**: Rather than asserting `bannerDismissed = true`, an authentic workflow test must execute a multi-cycle session check where the caregiver dismisses the update banner, and subsequent update check cycles (simulating background polling/resumes) preserve `isDismissed === true` and keep the banner hidden.
6. **Conclusion**: The replacement implementations designed in `analysis.md` completely eliminate all tautologies, directly test the contracts of the hybrid features, and remain within the 250-line limit of `code-minimalism.md`.

---

## 3. Caveats

- **Scope Boundary**: Explorer R2-1 is a read-only investigation agent. The replacement code is provided in `analysis.md` as concrete, machine-applicable replacement snippets ready for the implementer agent (`sub_orch_e2e` / `implementer_e2e_r2_1`).
- **Production Downgrade & Signature Fixes**: Reviewer 1 and Challenger 2 also highlighted fixes needed in `AppUpdateBanner.svelte` (version comparison) and `FullscreenSignatureModal.svelte` (`$effect` lifecycle). The test replacements designed here are forward-compatible with both the existing component code and the proposed fixes.
- No other caveats.

---

## 4. Conclusion

The investigation into the 4 tautological dummy tests is complete.
Concrete, authentic, and fully specified replacement implementations are documented in `analysis.md` in this state folder:
1. **`T1-PWA-05`**: Enhanced `PwaInstallController` with `getViewProps()` testing initial hidden state, compact vs full layout/badges, and `appinstalled` teardown.
2. **`T3-INT-06`**: Real dual-platform execution (`isNative = true` vs `false`) with `beforeinstallprompt` event dispatching and `version.json` mocking proving mutual exclusivity.
3. **`T3-INT-09`**: File-reading template verification extracting `z-[10000]` from `NativeAppManager.svelte` and `z-[9980]` from `AppUpdateBanner.svelte`, proving strict layer stacking and modal trapping.
4. **`T4-E2E-04`**: Multi-cycle `AppUpdateWorkflowSession` verifying that dismissal persists across repeated background checks within the same user session.

All proposed replacements preserve line counts under 185 lines (safe margin against the 250-line limit).

---

## 5. Verification Method

1. **Inspect Analysis Report**:
   Read `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_e2e_r2_1\analysis.md` for the full code snippets and architecture rationale.
2. **Line Count Audit**:
   Verify projected file line counts:
   - `tier1-pwainstall.test.ts`: ~165 lines (<= 250)
   - `tier3-pairwise-part2.test.ts`: ~175 lines (<= 250)
   - `tier4-workflows.test.ts`: ~185 lines (<= 250)
3. **Execution Verification (Post-Implementation)**:
   Once applied by the implementer:
   ```bash
   cd s:\OrgaFlow_Alpha\frontend
   npm test
   npm run check
   ```
   Both commands must exit with code 0 and report 75/75 tests passed.
