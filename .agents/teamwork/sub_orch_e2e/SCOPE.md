# Scope: E2E Testing Track

## Architecture
The E2E Testing Track provides an opaque-box, requirement-driven automated test suite for the 6 native hybrid app features of OrgaFlow ("Seniorenassistenz"):
1. Document Scanner Service (`documentScannerService.ts`)
2. Location & Reverse Geocoding Service (`locationService.ts`)
3. Fullscreen Signature Modal & Orientation Lock (`FullscreenSignatureModal.svelte`)
4. Biometric Authentication & App Resume Lock (`biometricService.svelte.ts`, `NativeAppManager.svelte`)
5. App Update Banner (`AppUpdateBanner.svelte`)
6. PWA Installation Button (`PwaInstallButton.svelte`)

Tests run in `frontend/tests/` via Node / tsx / vitest with a comprehensive mock Capacitor bridge, enabling deterministic, fast, offline automated verification.

The suite adheres to the 4-tier requirement-driven methodology:
- Tier 1: Feature Coverage (>=5 test cases per feature = >=30 tests)
- Tier 2: Boundary & Corner Cases (>=5 test cases per feature = >=30 tests)
- Tier 3: Cross-Feature Combinations (>=10 tests covering pairwise interactions)
- Tier 4: Real-World Application Scenarios (>=5 realistic end-to-end workflows)
Total minimum tests: >=75 tests.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Document Scanner Service | Multi-page receipt/doc scanning, PDF bundling, page limit, cancellation, camera error handling | E2E-2 | ORIGINAL_REQUEST §R1 |
| 2 | Location Service | 1-click GPS capture, reverse geocoding, timeout/permission errors, coordinate caching | E2E-2 | ORIGINAL_REQUEST §R1 |
| 3 | Fullscreen Signature Modal | Touch/pen capture, landscape lock, orientation reset, back-button dismiss, empty save prevention | E2E-2 | ORIGINAL_REQUEST §R1 |
| 4 | Biometric & PIN Security | Biometric/PIN auth, enable/disable, verify PIN, resume lock, failed attempt lockout | E2E-2 | ORIGINAL_REQUEST §R1 |
| 5 | App Update Banner | Update check, prompt display, dismiss persistence, update trigger | E2E-2 | ORIGINAL_REQUEST §R1 |
| 6 | PWA Installation Button | beforeinstallprompt capture, trigger prompt, installed hide, non-supported platform hide | E2E-2 | ORIGINAL_REQUEST §R1 |
| 7 | Cross-Feature Interactions | GPS + Document Scan, Appointment Complete with Signature + GPS, Resume Lock during Signature, etc. | E2E-3 | Project Pattern Tier 3 |
| 8 | Real-World Application Scenarios | Appointment completion workflow, Fahrtenbuch trip logging, Caregiver client visit sign-off | E2E-3 | Project Pattern Tier 4 |
| 9 | Test Runner & Verification | Unified execution script, 100% pass verification, publication of TEST_READY.md | E2E-4 | Project Pattern Dual Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E-1 | Test Infra & Mocks Setup | Test runner harness, mock Capacitor environment, TEST_INFRA.md | none | IN_PROGRESS |
| E2E-2 | Tier 1 & Tier 2 Test Cases | >=30 Tier 1 tests, >=30 Tier 2 tests across all 6 features | E2E-1 | PLANNED |
| E2E-3 | Tier 3 & Tier 4 Test Cases | >=10 Tier 3 pairwise tests, >=5 Tier 4 real-world workflows | E2E-2 | PLANNED |
| E2E-4 | Suite Execution & Publish | Run full test suite, verify 100% pass, publish TEST_READY.md | E2E-3 | PLANNED |

## Interface Contracts
The E2E test runner must be executable from the repository via a single clean command:
- Command: `npm test` or `npm run test:e2e` in `frontend/` (or `node tests/runner.js` / `npx tsx tests/runner.ts`)
- Exit code: 0 on all tests passing, non-zero on any failure.
- Output: Clear summary reporting total tests run, passed, failed, and breakdown across Tiers 1-4.
