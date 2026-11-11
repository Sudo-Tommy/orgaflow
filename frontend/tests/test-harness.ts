/**
 * Test Harness & Assertion Framework
 * Lightweight, zero-overhead test runner helper for requirement-driven test verification.
 * Strictly adheres to code-minimalism.md (<= 250 lines).
 */

export interface TestResult {
    id: string;
    tier: number;
    name: string;
    passed: boolean;
    durationMs: number;
    error?: Error | string;
}

export type TestFn = () => Promise<void> | void;

export interface RegisteredTestCase {
    id: string;
    tier: number;
    name: string;
    fn: TestFn;
}

const registeredSuites: RegisteredTestCase[] = [];

export function registerTest(id: string, tier: number, name: string, fn: TestFn): void {
    registeredSuites.push({ id, tier, name, fn });
}

export function getRegisteredTests(): RegisteredTestCase[] {
    return [...registeredSuites];
}

export function clearRegisteredTests(): void {
    registeredSuites.length = 0;
}

export async function runTestCase(testCase: RegisteredTestCase): Promise<TestResult> {
    const start = performance.now();
    try {
        await testCase.fn();
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        return {
            id: testCase.id,
            tier: testCase.tier,
            name: testCase.name,
            passed: true,
            durationMs
        };
    } catch (err: any) {
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        return {
            id: testCase.id,
            tier: testCase.tier,
            name: testCase.name,
            passed: false,
            durationMs,
            error: err
        };
    }
}

// Assertion Helpers
export function assert(condition: boolean, message = 'Assertion failed'): void {
    if (!condition) {
        throw new Error(message);
    }
}

export function assertEquals<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
        const defaultMsg = `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`;
        throw new Error(message ? `${message}: ${defaultMsg}` : defaultMsg);
    }
}

export function assertNotEquals<T>(actual: T, expected: T, message?: string): void {
    if (actual === expected) {
        const defaultMsg = `Expected value to differ from ${JSON.stringify(expected)}`;
        throw new Error(message ? `${message}: ${defaultMsg}` : defaultMsg);
    }
}

export function assertMatches(actual: string, pattern: RegExp, message?: string): void {
    if (!pattern.test(actual)) {
        const defaultMsg = `Expected "${actual}" to match pattern ${pattern}`;
        throw new Error(message ? `${message}: ${defaultMsg}` : defaultMsg);
    }
}

export function assertDefined<T>(value: T | null | undefined, message = 'Expected value to be defined and not null'): T {
    if (value === null || value === undefined) {
        throw new Error(message);
    }
    return value;
}

export async function assertRejects(
    asyncFn: () => Promise<any>,
    expectedErrSubstringOrRegex?: string | RegExp,
    message?: string
): Promise<void> {
    let threw = false;
    try {
        await asyncFn();
    } catch (err: any) {
        threw = true;
        const errMsg = err?.message || String(err);
        if (expectedErrSubstringOrRegex) {
            if (typeof expectedErrSubstringOrRegex === 'string') {
                if (!errMsg.includes(expectedErrSubstringOrRegex)) {
                    throw new Error(
                        `${message || 'Error message mismatch'}: Expected error to contain "${expectedErrSubstringOrRegex}", but got "${errMsg}"`
                    );
                }
            } else if (expectedErrSubstringOrRegex instanceof RegExp) {
                if (!expectedErrSubstringOrRegex.test(errMsg)) {
                    throw new Error(
                        `${message || 'Error message mismatch'}: Expected error to match ${expectedErrSubstringOrRegex}, but got "${errMsg}"`
                    );
                }
            }
        }
    }
    if (!threw) {
        throw new Error(message || 'Expected asynchronous function to reject, but it resolved successfully.');
    }
}
