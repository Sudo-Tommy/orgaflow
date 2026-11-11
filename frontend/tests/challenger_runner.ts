/**
 * Challenger M1-2 Runner
 * Executes the adversarial stress test suite for Milestone 1.
 * Code-minimalism: <= 250 lines.
 */

import './mocks/setup';
import './challenger_m1_2.test';
import { getRegisteredTests, runTestCase } from './test-harness';

async function run() {
    console.log('\n=== RUNNING CHALLENGER M1-2 ADVERSARIAL STRESS SUITE ===\n');
    const tests = getRegisteredTests().filter(t => t.id.startsWith('CH-M1'));
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const res = await runTestCase(test);
        if (res.passed) {
            console.log(`✓ PASS [${res.id}] ${res.name} (${res.durationMs}ms)`);
            passed++;
        } else {
            console.error(`✗ FAIL [${res.id}] ${res.name} (${res.durationMs}ms)`);
            if (res.error) {
                console.error('  Error:', res.error);
            }
            failed++;
        }
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests.`);
    if (failed > 0) {
        process.exit(1);
    }
}

run().catch((err) => {
    console.error('Runner failed:', err);
    process.exit(1);
});
