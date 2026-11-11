# Technical Analysis: Signature Lifecycle & Biometric State Remediation

**Track**: E2E Testing Track — Iteration 2  
**Author**: Explorer R2-3 (`explorer_e2e_r2_3`)  
**Date**: 2026-11-11  
**Target Files**:
- `frontend/src/lib/components/app/FullscreenSignatureModal.svelte`
- `frontend/src/lib/services/biometricService.ts`
- `frontend/src/lib/services/signatureLifecycle.ts` (new helper module)
- `frontend/tests/tier1/tier1-signature.test.ts`
- `frontend/tests/tier2/tier2-signature.test.ts`
- `frontend/tests/tier2/tier2-biometric.test.ts`
- `frontend/tests/tier3/tier3-pairwise-part1.test.ts`

---

## 1. Executive Summary

This investigation analyzed two critical production defects and associated test masking identified by Reviewer 1 and Challenger 2:
1. **Signature Modal Lifecycle Defect**: `FullscreenSignatureModal.svelte` mounts with `isOpen = false` by default. Its `onMount` hook executes early and returns immediately (`if (!isOpen) return;`). When `isOpen` subsequently transitions to `true`, `onMount` never re-runs, leaving the device in portrait mode and failing to register the Android hardware back-button handler. Furthermore, if the modal were open during a biometric lock screen appearance, pressing back would dismiss the underlying modal rather than protecting the secure layer stack.
2. **Biometric PIN State Desynchronization**: In `biometricService.ts` line 74, when no PIN hash exists in preferences, `verifyPin()` returns `true` (granting access) without resetting `this.isLockedState = false`. Consequently, `isLockActive` remains `true`, causing an irrecoverable state desynchronization where the caller believes authentication succeeded, but the app remains permanently locked.
3. **Authentic Test Strategy**: Previous tests in `frontend/tests/` bypassed these issues by calling mock Capacitor methods directly rather than invoking application logic. We propose extracting a clean, testable lifecycle coordinator (`signatureLifecycle.ts`) invoked via Svelte 5 `$effect`, allowing automated tests to execute real application logic in headless Node/tsx without masking.

---

## 2. Defect 1: `FullscreenSignatureModal.svelte` Lifecycle & Reactivity

### 2.1 Code Inspection & Root Cause
In `frontend/src/lib/components/app/FullscreenSignatureModal.svelte` (lines 27-39):
```svelte
onMount(() => {
    if (!isOpen) return;
    setupOrientation();
    const unregisterBack = backButtonHandler.register(() => {
        closeModal();
        return true;
    });

    return () => {
        resetOrientation();
        unregisterBack();
    };
});
```

#### The Lifecycle Failure Sequence:
1. **Initial Mount**: In standard OrgaFlow workflows (e.g. `AppointmentCompleteModal`, `CaregiverAppointmentSignature`), `<FullscreenSignatureModal bind:isOpen={showModal} />` is initialized with `isOpen = false`.
2. **Hook Execution**: `onMount` fires exactly once when the component is placed in the DOM. Line 28 detects `isOpen === false` and returns `undefined`. No cleanup function is captured.
3. **Dynamic Open**: The user taps "Unterschrift erfassen", setting `isOpen = true`.
4. **Defect**: In Svelte (both 4 and 5), `onMount` **never re-executes**.
   - `setupOrientation()` is never called: on Android/iOS, the device remains in portrait mode rather than locking to landscape (`ScreenOrientation.lock({ orientation: 'landscape' })`).
   - `backButtonHandler.register()` is never invoked: pressing the Android hardware back-button does not dismiss the modal; instead, it falls through to closing parent views or exiting the app.
5. **Close & Teardown**: Because `onMount` returned early on initial mount, no teardown function exists. If closed externally by mutating `isOpen = false`, neither `resetOrientation()` nor `unregisterBack()` would be triggered by Svelte lifecycle hooks.

### 2.2 Layer Stacking Vulnerability with Biometric Lock
In `layer-stacking.md`:
> "Alle Fenster Modale Dialoge und Overlays müssen einer strikten und eindeutigen Schichtenarchitektur folgen damit Überlappungsfehler und fehlerhafte Klickbereiche ausgeschlossen sind... Bei mehrstufigen Abläufen muss jedes neu geöffnete Fenster zuverlässig über dem vorherigen liegen inklusive abgedunkelter Ebenen die nur das oberste Element bedienbar halten."

`NativeAppManager.svelte` renders the biometric lock dialog at `z-[10000]`. `FullscreenSignatureModal.svelte` renders at `z-[9999]`.
If the signature modal is open and the application is backgrounded, `biometricService` locks the app.
When the user re-opens the app and presses the hardware back-button:
- `FullscreenSignatureModal.svelte`'s current back-button handler (if it were registered) unconditionally closes the modal (`closeModal(); return true;`).
- This violates layer stacking by allowing input while a higher-priority security overlay (`z-[10000]`) is active.
- The handler must guard against dismissal when `biometricService.isLockActive` is true:
  ```ts
  if (biometricService.isLockActive) return false;
  ```

### 2.3 Proposed Fix: Architecture & Implementation

To satisfy both Svelte 5 reactive standards and project rule `code-minimalism.md` (delegating complex logic into separate modules for testability), we design the fix in two modular layers:

#### Layer A: `signatureLifecycle.ts` (Coordinator Module)
Create `frontend/src/lib/services/signatureLifecycle.ts`:
```typescript
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';
import { backButtonHandler } from '$lib/services/backButtonHandler';
import { biometricService } from '$lib/services/biometricService';

export interface SignatureSessionOptions {
    onClose: () => void;
}

/**
 * Manages native orientation locking and hardware back-button registration
 * for fullscreen signature capture.
 * Returns a synchronous teardown function to restore orientation and clean up handlers.
 */
export function activateSignatureSession(options: SignatureSessionOptions): () => void {
    if (Capacitor.isNativePlatform()) {
        ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    }

    const unregisterBack = backButtonHandler.register(() => {
        // Guard: Do not dismiss signature modal if biometric lock screen is active above it
        if (biometricService.isLockActive) {
            return false;
        }
        options.onClose();
        return true;
    });

    return () => {
        if (Capacitor.isNativePlatform()) {
            ScreenOrientation.unlock().catch(() => {});
        }
        unregisterBack();
    };
}
```
*Line count: ~38 lines (well below 250 lines).*

#### Layer B: `FullscreenSignatureModal.svelte` (Reactive Svelte 5 Binding)
Replace lines 1-56 in `frontend/src/lib/components/app/FullscreenSignatureModal.svelte`:

```svelte
<script lang="ts">
    import { activateSignatureSession } from '$lib/services/signatureLifecycle';
    import { Check, Trash2, X, PenTool } from 'lucide-svelte';

    let {
        title = "Unterschrift erfassen",
        signerName = "",
        isOpen = $bindable(false),
        onSave,
        onCancel
    }: {
        title?: string;
        signerName?: string;
        isOpen: boolean;
        onSave: (dataUrl: string) => void;
        onCancel?: () => void;
    } = $props();

    let canvas: HTMLCanvasElement | null = $state(null);
    let ctx: CanvasRenderingContext2D | null = null;
    let isDrawing = false;
    let hasSignature = $state(false);

    // Svelte 5 $effect tracks isOpen reactively
    $effect(() => {
        if (!isOpen) return;

        return activateSignatureSession({
            onClose: () => closeModal()
        });
    });

    $effect(() => {
        if (isOpen && canvas) {
            initCanvas();
        }
    });
...
    function closeModal() {
        isOpen = false;
        onCancel?.();
    }
</script>
```

#### How this solves the problem:
1. **Reactive Dependency Tracking**: Svelte 5's `$effect` automatically records `isOpen` as a reactive dependency on the first run.
2. **Dynamic Triggering**: When `isOpen` transitions from `false` to `true`, the effect re-runs immediately, invoking `activateSignatureSession()`.
3. **Clean Teardown**: When `isOpen` transitions back to `false` (via `closeModal()`, hardware back button, save confirmation, or external parent mutation) OR when the component unmounts, Svelte 5 automatically executes the returned cleanup function:
   - Orientation is unlocked via `ScreenOrientation.unlock()`.
   - The back-button listener is cleanly removed from `backButtonHandler`.
4. **Testability**: Node/tsx tests can directly import and execute `activateSignatureSession()`, testing 100% of the native coordination logic without needing a browser DOM or SvelteKit SSR compilation.

---

## 3. Defect 2: `biometricService.ts` PIN State Desynchronization

### 3.1 Code Inspection & Root Cause
In `frontend/src/lib/services/biometricService.ts` (lines 71-89):
```typescript
71:     async verifyPin(pin: string): Promise<boolean> {
72:         try {
73:             const { value } = await Preferences.get({ key: PREF_PIN_HASH_KEY });
74:             if (!value) return true; // Falls kein PIN gesetzt, gewähren
75:             const encoder = new TextEncoder();
76:             const data = encoder.encode(pin);
77:             const hashBuffer = await crypto.subtle.digest('SHA-256', data);
78:             const hashArray = Array.from(new Uint8Array(hashBuffer));
79:             const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
80: 
81:             if (hashHex === value) {
82:                 this.isLockedState = false;
83:                 return true;
84:             }
85:             return false;
86:         } catch (e) {
87:             return false;
88:         }
89:     }
```

### 3.2 Empirical Verification of Defect
We executed a deterministic test script against `biometricService.ts` in Node/tsx:
```bash
cd frontend; npx tsx -e "
import('./tests/mocks/setup').then(async () => {
    const { biometricService } = await import('./src/lib/services/biometricService');
    await biometricService.setEnabled(true);
    (biometricService as any).isLockedState = true;
    console.log('Before: isLockActive =', biometricService.isLockActive);
    const res = await biometricService.verifyPin('1234');
    console.log('verifyPin returned:', res);
    console.log('After: isLockActive =', biometricService.isLockActive);
});"
```
**Empirical Output**:
```
Before: isLockActive = true
verifyPin returned: true
After: isLockActive = true
```

### 3.3 Root Cause Analysis
1. `biometricService.isLockActive` is computed as:
   ```ts
   get isLockActive(): boolean {
       return this.isEnabled && this.isLockedState;
   }
   ```
2. When `this.isEnabled === true` and the app locks on boot or background resume (`this.isLockedState = true`), `isLockActive` is `true`.
3. If no PIN hash has been stored yet (e.g. `orga_app_pin_hash` preference is `null` or `""`), line 74 executes:
   ```ts
   if (!value) return true;
   ```
4. It returns `true`, indicating success.
5. **Critical Defect**: Line 74 does **not** execute `this.isLockedState = false;`.
6. Therefore:
   - Caller receives `true` (access granted).
   - `this.isLockedState` remains `true`.
   - `biometricService.isLockActive` remains `true`.
   - The security lock overlay continues to block user interactions permanently!

### 3.4 Proposed Fix for `biometricService.ts`
Modify line 74 of `frontend/src/lib/services/biometricService.ts`:
```typescript
    async verifyPin(pin: string): Promise<boolean> {
        try {
            const { value } = await Preferences.get({ key: PREF_PIN_HASH_KEY });
            if (!value) {
                this.isLockedState = false;
                return true;
            }
            const encoder = new TextEncoder();
            const data = encoder.encode(pin);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (hashHex === value) {
                this.isLockedState = false;
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }
```

### 3.5 Milestone 3 Reactive Upgrade (`biometricService.svelte.ts`)
In Milestone 3 (Item 12), `biometricService.ts` will be upgraded to `biometricService.svelte.ts` using Svelte 5 `$state`:
```typescript
class BiometricService {
    isEnabled = $state(false);
    isLockedState = $state(false);

    get isLockActive(): boolean {
        return this.isEnabled && this.isLockedState;
    }
...
```
With reactive `$state`, when `verifyPin()` sets `this.isLockedState = false`, any consuming component (such as `NativeAppManager.svelte`) automatically and reactively dismisses the lock overlay without needing local mirror state (`let isLocked = $state(false)`). The fix to line 74 is required in both the current `.ts` and future `.svelte.ts` versions.

---

## 4. Authentic Test Strategy Without Masking

### 4.1 How Existing Tests Masked Defects
Reviewer 1 and Challenger 2 rightly pointed out:
1. **`tier1-signature.test.ts` (`T1-SIG-01`, `T1-SIG-05`)**: Called `ScreenOrientation.lock()` and `ScreenOrientation.unlock()` directly in test body. They tested Capacitor mock state, not component logic.
2. **`tier2-signature.test.ts` (`T2-SIG-02`)**: Constructed a private `closeModal` function and registered it with `backButtonHandler` in test code. Never verified whether `FullscreenSignatureModal.svelte` actually registers anything.
3. **`tier3-pairwise-part1.test.ts` (`T3-INT-05`)**: Added `if (biometricService.isLockActive) return false;` into a local test callback because `FullscreenSignatureModal.svelte` lacked this guard in production.
4. **`tier2-biometric.test.ts`**: Lacked any test verifying `verifyPin()` behavior when no PIN hash is configured, allowing the state desynchronization bug to go undetected.

### 4.2 Concrete Remediation for Test Files

#### A. Refactoring `tier1-signature.test.ts`
Replace mock simulations in `T1-SIG-01` and `T1-SIG-05` with real calls to `activateSignatureSession`:

```typescript
import { activateSignatureSession } from '$lib/services/signatureLifecycle';
import { backButtonHandler } from '$lib/services/backButtonHandler';

registerTest('T1-SIG-01', 1, 'Signature: Landscape Orientation Lock on Open', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    let closed = false;
    const teardown = activateSignatureSession({ onClose: () => { closed = true; } });

    // Assert real production function locked orientation and registered back handler
    assertEquals(mockCapacitorBridge.currentOrientation, 'landscape', 'Orientation must be locked to landscape');
    assertEquals((backButtonHandler as any).handlers.length, 1, 'Hardware back handler must be registered');

    teardown();
});

registerTest('T1-SIG-05', 1, 'Signature: Orientation Unlock on Close', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    let closed = false;
    const teardown = activateSignatureSession({ onClose: () => { closed = true; } });
    assertEquals(mockCapacitorBridge.currentOrientation, 'landscape');

    // Execute teardown returned by activateSignatureSession
    teardown();
    assertEquals(mockCapacitorBridge.currentOrientation, 'unlocked', 'Orientation must reset to unlocked on teardown');
    assertEquals((backButtonHandler as any).handlers.length, 0, 'Back handler must be unregistered on teardown');
});
```

#### B. Refactoring `tier2-signature.test.ts` (`T2-SIG-02`)
Test authentic hardware back button invocation using `activateSignatureSession`:

```typescript
registerTest('T2-SIG-02', 2, 'Signature Corner: Android Hardware Back-Button Dismissal', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    let modalDismissed = false;
    const teardown = activateSignatureSession({
        onClose: () => { modalDismissed = true; }
    });

    // Simulate native Android hardware back button event via Capacitor bridge
    const topHandler = (backButtonHandler as any).handlers[(backButtonHandler as any).handlers.length - 1];
    const handled = topHandler();

    assertEquals(handled, true, 'Signature back handler must consume back press');
    assertEquals(modalDismissed, true, 'onClose callback must be fired on back button dismiss');

    // Simulate Svelte 5 $effect teardown when isOpen becomes false
    teardown();
    assertEquals(mockCapacitorBridge.currentOrientation, 'unlocked', 'Orientation must reset to unlocked');
    assertEquals((backButtonHandler as any).handlers.length, 0, 'Handler must be cleaned up');
});
```

#### C. Enhancing `tier2-biometric.test.ts`
Add authentic test for unset/missing PIN hash (`T2-BIO-06` or refactor `T2-BIO-02`):

```typescript
registerTest('T2-BIO-02', 2, 'Biometrics Corner: Blank / Empty PIN Entry & Unset Hash Handling', async () => {
    resetTestEnvironment();
    resetBiometricService();

    // 1. When real PIN is set, empty PIN must fail and preserve lock
    await biometricService.setEnabled(true);
    await biometricService.setPin('123456');
    (biometricService as any).isLockedState = true;

    const failedAttempt = await biometricService.verifyPin('');
    assertEquals(failedAttempt, false, 'Empty string PIN must not unlock when real PIN is configured');
    assertEquals(biometricService.isLockActive, true, 'Lock must remain active on invalid PIN');

    // 2. When NO PIN is configured, verification must unlock and synchronize state
    mockCapacitorBridge.preferences.delete('orga_app_pin_hash');
    const unsetUnlock = await biometricService.verifyPin('any');
    assertEquals(unsetUnlock, true, 'Unset PIN hash must allow unlock to prevent lockout');
    assertEquals(biometricService.isLockActive, false, 'isLockActive must be false after unset PIN unlock');
    assertEquals((biometricService as any).isLockedState, false, 'isLockedState must be synchronously reset to false');
});
```

#### D. Enhancing `tier3-pairwise-part1.test.ts` (`T3-INT-05`)
Verify production layer stacking protection using `activateSignatureSession`:

```typescript
registerTest('T3-INT-05', 3, 'Signature + BackButton + Biometrics: Back-Button Prioritization Under Active Lock', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;
    mockCapacitorBridge.preferences.set('orga_biometric_lock_enabled', 'true');

    // 1. Signature session opens underneath
    let signatureDismissed = false;
    const teardownSignature = activateSignatureSession({
        onClose: () => { signatureDismissed = true; }
    });

    // 2. App locks due to background resume (z-[10000] over z-[9999])
    (biometricService as any).initialized = false;
    await biometricService.init();
    (biometricService as any).isLockedState = true;
    assertEquals(biometricService.isLockActive, true, 'Security lock is active');

    // 3. User presses hardware back button
    const topHandler = (backButtonHandler as any).handlers[(backButtonHandler as any).handlers.length - 1];
    const handled = topHandler();

    // Must be rejected by signature handler because biometric lock is active
    assertEquals(handled, false, 'Back button must NOT dismiss signature modal while biometric lock is active');
    assertEquals(signatureDismissed, false, 'Signature modal must remain protected under lock');
    assertEquals(biometricService.isLockActive, true, 'Biometric lock remains strictly active');

    teardownSignature();
});
```

---

## 5. Architectural Compliance Checklist

| Rule | Requirement | Assessment |
|---|---|---|
| `code-minimalism.md` | All files strictly <= 250 lines | `signatureLifecycle.ts` (38 lines), `FullscreenSignatureModal.svelte` (185 lines), `biometricService.ts` (98 lines). Fully compliant. |
| `layer-stacking.md` | Modals strictly respect z-index hierarchy | Signature back-button handler checks `biometricService.isLockActive` and yields to higher-priority security overlay. Fully compliant. |
| `mobile-landscape-mode.md` | Fullscreen signature must lock to landscape on open and unlock on close | Reactively bound via Svelte 5 `$effect` to `isOpen`. Fully compliant. |
| `zero-inner-scroll.md` | No nested scroll containers | Modal uses absolute/fixed full-screen container with flex column and flex-1 canvas. Compliant. |
| `no-brainer-design.md` | Intuitive, clear terminology and safe flows | Empty signatures prevented from saving, canvas auto-resizes to DPI. Compliant. |
| Svelte 5 Runes | Use `$props`, `$state`, `$effect` | Clean reactive lifecycle with proper teardown functions. Fully compliant. |
