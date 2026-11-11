# Handoff Report: E2E Test Suite Design & Matrix Architecture (Tiers 1-4)

**Agent**: Explorer 3 (`explorer_e2e_3`)  
**Task**: Design the test catalog and suite architecture adhering to the 4-tier requirement-driven methodology  
**State Folder**: `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_e2e_3\`  
**Working Directory**: `s:\OrgaFlow_Alpha`  
**Parent Conversation ID**: `e4b4390f-0ea6-4617-89fd-efa18f21073c`  

---

## 1. Observation

1. **Requirements & Scope**:
   - `s:\OrgaFlow_Alpha\.agents\teamwork\sub_orch_e2e\SCOPE.md` (lines 14-20): Requires a 4-tier requirement-driven methodology with >= 75 test cases:
     - Tier 1: Feature Coverage (>=5 test cases per feature across 6 features = >=30 test cases)
     - Tier 2: Boundary & Corner Cases (>=5 test cases per feature across 6 features = >=30 test cases)
     - Tier 3: Cross-Feature Combinations (>=10 pairwise interaction test cases)
     - Tier 4: Real-World Application Scenarios (>=5 end-to-end workflow test cases)
   - `s:\OrgaFlow_Alpha\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 12-18, 20-28, 35-43): Mandates integration of 6 native features: Document Scanner, Location & Reverse Geocoding, Fullscreen Signature Modal, Biometric Service, App Update Banner, and PWA Installation Button.
   - Project Rules: `code-minimalism.md` (lines 1-10) enforces a strict hard ceiling of 250 lines per file; `layer-stacking.md` enforces modal z-index hierarchy; `mobile-landscape-mode.md` requires landscape locking for signature capture; `no-brainer-design.md` requires plain German terminology.

2. **Codebase Structure & Runtime Environment**:
   - `frontend/package.json` (lines 33-57): Uses `@capacitor/core` (`^7.6.10`), `@capacitor/camera` (`^7.0.5`), `@capacitor/geolocation` (`^7.1.8`), `@capacitor/screen-orientation` (`^7.0.4`), `@capacitor/preferences` (`^7.0.4`), `@capacitor/app` (`^7.1.2`), `pdf-lib` (`^1.17.1`), and Svelte 5 (`^5.55.2`).
   - Node runtime: `node -v` output is `v25.9.0`. Node 25 provides built-in native TypeScript execution via `node --experimental-strip-types` and built-in test module `node:test` and `node:assert`.
   - `frontend/tsconfig.json` extends `.svelte-kit/tsconfig.json` which already configures `"include": ["../tests/**/*.ts"]` and path mappings (`$lib/*`).
   - Target source implementations:
     - `frontend/src/lib/services/documentScannerService.ts` (122 lines)
     - `frontend/src/lib/services/locationService.ts` (110 lines)
     - `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` (205 lines)
     - `frontend/src/lib/services/biometricService.ts` (96 lines)
     - `frontend/src/lib/components/app/AppUpdateBanner.svelte` (81 lines)
     - `frontend/src/lib/components/app/PwaInstallButton.svelte` (76 lines)
     - `frontend/src/lib/components/app/NativeAppManager.svelte` (97 lines)

---

## 2. Logic Chain

1. **Coverage Sizing**:
   From Observation 1, the test suite must cover 6 native features across 4 tiers with >= 75 tests. Allocating 5 tests per feature for Tier 1 yields 30 tests; 5 tests per feature for Tier 2 yields 30 tests; 10 pairwise tests for Tier 3 yields 10 tests; 5 end-to-end workflows for Tier 4 yields 5 tests. Total: 30 + 30 + 10 + 5 = 75 tests.

2. **File Size & Modular Layout**:
   From Observation 1 (`code-minimalism.md`), any file exceeding 250 lines violates project integrity. Writing 30 tests in a single file would exceed 500 lines. Therefore, the suite is partitioned into:
   - 6 individual test files for Tier 1 (`tests/tier1/tier1-*.test.ts`, each ~140-160 lines).
   - 6 individual test files for Tier 2 (`tests/tier2/tier2-*.test.ts`, each ~150-170 lines).
   - 2 pairwise test files for Tier 3 (`tests/tier3/tier3-pairwise-part1.test.ts` and `part2.test.ts`, each ~180 lines).
   - 1 workflow file for Tier 4 (`tests/tier4/tier4-workflows.test.ts`, ~220 lines).
   - 7 modular mock files in `tests/mocks/` (each 60-140 lines).
   - Test harness and master runner (`tests/test-harness.ts` and `tests/runner.ts`, each <180 lines).
   This ensures 100% compliance with the 250-line rule across all test files.

3. **Execution Architecture**:
   From Observation 2, Node 25 is installed and natively supports TypeScript execution via `node --experimental-strip-types`. A unified runner script `tests/runner.ts` executed via `npm run test:e2e` (or `node --experimental-strip-types tests/runner.ts`) allows instant, deterministic, zero-dependency offline execution without needing external compilation steps.

4. **Detailed Inventory Traceability**:
   Every test case was assigned a unique ID (`T1-DOC-01` to `T1-DOC-05`, `T1-LOC-01` to `T1-LOC-05`, `T1-SIG-01` to `T1-SIG-05`, `T1-BIO-01` to `T1-BIO-05`, `T1-UPD-01` to `T1-UPD-05`, `T1-PWA-01` to `T1-PWA-05`, `T2-DOC-01` to `T2-PWA-05`, `T3-INT-01` to `T3-INT-10`, and `T4-E2E-01` to `T4-E2E-05`) with exact preconditions, execution flow, and assertions documented in `analysis.md`.

---

## 3. Caveats

1. **Browser Globals in Node**:
   In a headless Node environment, browser globals (`window`, `navigator`, `fetch`, `crypto.subtle`, `matchMedia`, `beforeinstallprompt`) must be injected into the global scope by `tests/mocks/browser-env.mock.ts` prior to test execution.
2. **Svelte 5 Runes in Services vs Components**:
   When testing Svelte components headlessly, testing the underlying service contracts (`documentScannerService`, `locationService`, `biometricService`) alongside DOM/event simulations in the test harness allows reliable, fast execution without needing a full Webdriver/Playwright browser overhead.
3. **No Caveats on Test Count**:
   Exactly 75 test cases have been exhaustively specified and mapped.

---

## 4. Conclusion

The test catalog and test suite architecture for the E2E Testing Track are fully designed and documented:
1. **Test Matrix Complete**: 75 test cases designed and categorized across Tiers 1-4 (Tier 1: 30 tests, Tier 2: 30 tests, Tier 3: 10 tests, Tier 4: 5 tests).
2. **Layout Defined**: Proposed 22 modular files in `frontend/tests/` (mocks, tier1, tier2, tier3, tier4, harness, runner), each strictly <= 250 lines.
3. **Infrastructure Blueprint**: Detailed outline for `s:\OrgaFlow_Alpha\TEST_INFRA.md` prepared and aligned with the Project Pattern.
4. **Analysis Delivered**: Full tabular specification delivered in `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_e2e_3\analysis.md`.

---

## 5. Verification Method

To independently verify the test design, file layout, and specifications:
1. Inspect `s:\OrgaFlow_Alpha\.agents\teamwork\explorer_e2e_3\analysis.md` to confirm:
   - Section 2.1 contains 30 Tier 1 tests across the 6 native features.
   - Section 2.2 contains 30 Tier 2 boundary tests across the 6 native features.
   - Section 2.3 contains 10 Tier 3 cross-feature combination tests.
   - Section 2.4 contains 5 Tier 4 real-world workflow tests.
   - Section 3 lists the modular file layout adhering to `code-minimalism.md` (<= 250 lines/file).
   - Section 4 provides the `TEST_INFRA.md` architectural blueprint.
2. Verify Node 25 capability with `node --experimental-strip-types -e "console.log('OK')"` (exit code 0).
3. Invalidation condition: If any feature lacks 5 Tier 1 or 5 Tier 2 tests, or if total test count is below 75, or if any planned test file exceeds 250 lines.
