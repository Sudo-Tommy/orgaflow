/**
 * Global Test Environment Setup & Reset Utility
 * Bootstraps the mock Capacitor bridge and browser globals.
 * Strictly adheres to code-minimalism.md (<= 250 lines).
 */

import './mockBrowserGlobals';
import { installCapacitorMocks, mockCapacitorBridge } from './mockCapacitorBridge';
import { setupBrowserGlobals, resetBrowserGlobals } from './mockBrowserGlobals';
import { backButtonHandler } from '$lib/services/backButtonHandler';
import { biometricService } from '$lib/services/biometricService';

let isInitialized = false;

export function initTestEnvironment(): void {
    if (!isInitialized) {
        installCapacitorMocks();
        setupBrowserGlobals();
        isInitialized = true;
    }
}

export function resetTestEnvironment(): void {
    initTestEnvironment();
    mockCapacitorBridge.reset();
    resetBrowserGlobals();
    (backButtonHandler as any).handlers = [];
    (backButtonHandler as any).initialized = false;
    (biometricService as any).isEnabled = false;
    (biometricService as any).isLockedState = false;
    (biometricService as any).initialized = false;
}

// Auto-initialize on import
initTestEnvironment();


