/**
 * Master E2E Test Runner for OrgaFlow Hybrid App
 * Executes all 75 requirement-driven tests across Tiers 1 through 4.
 * Strictly conforms to code-minimalism.md (<= 250 lines).
 */

import './mocks/setup';

// Import all test suites
import './tier1/tier1-docscanner.test';
import './tier1/tier1-location.test';
import './tier1/tier1-signature.test';
import './tier1/tier1-biometric.test';
import './tier1/tier1-appupdate.test';
import './tier1/tier1-pwainstall.test';
import './tier1/tier1-reminders.test';
import './tier1/tier1-ocr-sync.test';
import './tier1/tier1-trips-widget.test';

import './tier2/tier2-docscanner.test';
import './tier2/tier2-location.test';
import './tier2/tier2-signature.test';
import './tier2/tier2-biometric.test';
import './tier2/tier2-appupdate.test';
import './tier2/tier2-pwainstall.test';

import './tier3/tier3-pairwise-part1.test';
import './tier3/tier3-pairwise-part2.test';

import './tier4/tier4-workflows.test';

import { getRegisteredTests, runTestCase, type TestResult } from './test-harness';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

async function main() {
    const startTime = performance.now();
    const tests = getRegisteredTests();

    console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
    console.log(`${BOLD}${CYAN}   OrgaFlow Hybrid App - 4-Tier Automated E2E Test Suite        ${RESET}`);
    console.log(`${CYAN}   Target: Capacitor 7 & SvelteKit Hybrid Architecture          ${RESET}`);
    console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

    const results: TestResult[] = [];
    let currentTier = 0;

    const tierTitles: Record<number, string> = {
        1: 'Tier 1: Feature Coverage (Core Functional Contracts)',
        2: 'Tier 2: Boundary & Corner Cases (Hardware & Error Modes)',
        3: 'Tier 3: Cross-Feature Combinations (Pairwise & Stacking)',
        4: 'Tier 4: Real-World Application Workflows (Caregiver E2E)'
    };

    for (const testCase of tests) {
        if (testCase.tier !== currentTier) {
            currentTier = testCase.tier;
            console.log(`\n${BOLD}${YELLOW}--- ${tierTitles[currentTier]} ---${RESET}`);
        }

        const res = await runTestCase(testCase);
        results.push(res);

        if (res.passed) {
            console.log(`  ${GREEN}✓ PASS${RESET} [${res.id}] ${res.name} ${CYAN}(${res.durationMs}ms)${RESET}`);
        } else {
            console.error(`  ${RED}✗ FAIL${RESET} [${res.id}] ${res.name} ${RED}(${res.durationMs}ms)${RESET}`);
            if (res.error) {
                console.error(`    ${RED}Error: ${res.error instanceof Error ? res.error.message : String(res.error)}${RESET}`);
            }
        }
    }

    const totalDuration = Math.round((performance.now() - startTime) * 100) / 100;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
    console.log(`${BOLD}                    TEST EXECUTION SUMMARY                      ${RESET}`);
    console.log(`${BOLD}${CYAN}================================================================${RESET}`);

    for (let t = 1; t <= 4; t++) {
        const tierResults = results.filter(r => r.tier === t);
        const tierPassed = tierResults.filter(r => r.passed).length;
        const tierFailed = tierResults.filter(r => !r.passed).length;
        const statusColor = tierFailed === 0 ? GREEN : RED;
        console.log(`  ${BOLD}Tier ${t}${RESET}: ${statusColor}${tierPassed}/${tierResults.length} Passed${RESET} (${tierFailed} Failed)`);
    }

    console.log(`${CYAN}----------------------------------------------------------------${RESET}`);
    console.log(`  Total Tests Run:  ${BOLD}${results.length}${RESET}`);
    console.log(`  Total Passed:     ${GREEN}${BOLD}${passed}${RESET}`);
    console.log(`  Total Failed:     ${failed === 0 ? GREEN : RED}${BOLD}${failed}${RESET}`);
    console.log(`  Total Duration:   ${YELLOW}${totalDuration}ms${RESET}`);
    console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

    if (failed > 0) {
        console.error(`${RED}${BOLD}Suite execution failed with ${failed} failing test(s).${RESET}\n`);
        process.exit(1);
    } else {
        console.log(`${GREEN}${BOLD}Suite execution succeeded! 100% of tests passed (${passed}/${results.length}).${RESET}\n`);
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal test runner exception:', err);
    process.exit(1);
});
