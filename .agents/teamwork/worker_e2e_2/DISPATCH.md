# Dispatch for Test Writer Worker (Iteration 2 Remediation)
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\worker_e2e_2\
Original request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_e2e\SCOPE.md
Project plan: s:\OrgaFlow_Alpha\PROJECT.md

## Mandatory References
1. `s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY: read this first)
2. `s:\OrgaFlow_Alpha\PROJECT.md`
3. `s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_e2e\SCOPE.md`
4. `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_e2e_r2_1\analysis.md` (Authentic replacements for dummy tests T1-PWA-05, T3-INT-06, T3-INT-09, T4-E2E-04)
5. `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_e2e_r2_2\analysis.md` and `proposed_*` files (appUpdateService & AppUpdateBanner fix)
6. `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_e2e_r2_3\analysis.md` (signatureLifecycle.ts, FullscreenSignatureModal $effect fix, biometricService PIN state fix)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Code Standards
- `code-minimalism.md`: Every created or modified file MUST be strictly <= 250 lines.
- `layer-stacking.md`, `zero-inner-scroll.md`, `no-brainer-design.md`, `mobile-landscape-mode.md`.

## Deliverables & Tasks
1. Create `frontend/src/lib/services/appUpdateService.ts` (<200 lines) with SemVer 2.0.0 comparison (`isNewerVersion`).
2. Update `frontend/src/lib/components/app/AppUpdateBanner.svelte` to use `appUpdateService.isNewerVersion` (preventing downgrade bug).
3. Create `frontend/src/lib/services/signatureLifecycle.ts` (~38 lines) with `activateSignatureSession` (with orientation lock and back-button registration, guarded by `biometricService.isLockActive`).
4. Update `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` to bind `activateSignatureSession` via Svelte 5 `$effect` bound to `isOpen`.
5. Update `frontend/src/lib/services/biometricService.ts` line 74: `{ this.isLockedState = false; return true; }` (preventing permanent lock trap when PIN hash is not set).
6. Apply authentic test replacements from `explorer_e2e_r2_1`:
   - `frontend/tests/tier1/tier1-pwainstall.test.ts` (`T1-PWA-05`)
   - `frontend/tests/tier3/tier3-pairwise-part2.test.ts` (`T3-INT-06`, `T3-INT-09`)
   - `frontend/tests/tier4/tier4-workflows.test.ts` (`T4-E2E-04`)
7. Update `frontend/tests/tier2/tier2-appupdate.test.ts` (`T2-UPD-04`) and `tier1-appupdate.test.ts` to test `appUpdateService.isNewerVersion`.
8. Update signature tests (`tier1-signature.test.ts`, `tier2-signature.test.ts`, `tier3-pairwise-part1.test.ts`) to exercise `activateSignatureSession`.
9. Ensure EVERY file in `frontend/src/` and `frontend/tests/` created or modified is strictly <= 250 lines.
10. Update `TEST_READY.md` to reflect verified architecture and test contracts.
11. Run `npm run test:e2e` in `frontend/` (verify 75/75 passing, 0 failing, exit code 0).
12. Run `npm run check` in `frontend/` (verify 0 errors, 0 warnings).
13. Write `analysis.md` and `handoff.md` in `s:\OrgaFlow_Alpha\.agents\teamwork\worker_e2e_2\`.
14. Notify parent orchestrator via `send_message`.


## 2026-11-11T09:19:50Z
You are the E2E Remediation Builder (Worker 2 for Iteration 2).
Working directory: s:\OrgaFlow_Alpha
State folder: s:\OrgaFlow_Alpha\.agents\teamwork\worker_e2e_2\
Original request path: s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_e2e\SCOPE.md
Project plan: s:\OrgaFlow_Alpha\PROJECT.md
