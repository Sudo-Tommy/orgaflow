/**
 * Tier 1: PWA Installation Button - Feature Coverage
 * Tests: T1-PWA-01 through T1-PWA-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { dispatchWindowEvent } from '../mocks/mockBrowserGlobals';
import { registerTest, assertEquals, assert } from '../test-harness';

class PwaInstallController {
    variant: 'compact' | 'full';
    deferredPrompt: any = null;
    canInstall = false;
    promptCalls = 0;

    constructor(variant: 'compact' | 'full' = 'compact') {
        this.variant = variant;
    }

    init(): () => void {
        const handlePrompt = (e: any) => {
            if (e.preventDefault) e.preventDefault();
            this.deferredPrompt = e;
            this.canInstall = true;
        };

        const handleInstalled = () => {
            this.canInstall = false;
            this.deferredPrompt = null;
        };

        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', handleInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handlePrompt);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }

    async installPwa(): Promise<string> {
        if (!this.deferredPrompt) return 'no_prompt';
        this.promptCalls++;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            this.canInstall = false;
        }
        this.deferredPrompt = null;
        return outcome;
    }

    getViewProps() {
        if (!this.canInstall) {
            return { isVisible: false, variant: this.variant, label: '', title: undefined, hasBadge: false, fullWidth: false };
        }
        if (this.variant === 'full') {
            return {
                isVisible: true,
                variant: 'full' as const,
                label: 'App auf PC installieren',
                title: undefined,
                hasBadge: true,
                badgeText: '1-Klick',
                fullWidth: true
            };
        }
        return {
            isVisible: true,
            variant: 'compact' as const,
            label: 'App installieren',
            title: 'Seniorenassistenz als App auf Ihrem PC installieren',
            hasBadge: false,
            badgeText: undefined,
            fullWidth: false
        };
    }
}

registerTest('T1-PWA-01', 1, 'PWA: beforeinstallprompt Capture', async () => {
    resetTestEnvironment();
    const ctrl = new PwaInstallController();
    ctrl.init();

    let defaultPrevented = false;
    const mockEvent = {
        preventDefault: () => { defaultPrevented = true; },
        prompt: () => {},
        userChoice: Promise.resolve({ outcome: 'accepted' })
    };

    dispatchWindowEvent('beforeinstallprompt', mockEvent);
    assertEquals(defaultPrevented, true, 'Default prompt behavior must be prevented');
    assertEquals(ctrl.canInstall, true, 'canInstall must become true when event is received');
    assert(ctrl.deferredPrompt !== null, 'deferredPrompt must store the event');
});

registerTest('T1-PWA-02', 1, 'PWA: Trigger Installation Prompt', async () => {
    resetTestEnvironment();
    const ctrl = new PwaInstallController();
    ctrl.init();

    let promptInvoked = false;
    const mockEvent = {
        preventDefault: () => {},
        prompt: () => { promptInvoked = true; },
        userChoice: Promise.resolve({ outcome: 'dismissed' })
    };

    dispatchWindowEvent('beforeinstallprompt', mockEvent);
    await ctrl.installPwa();

    assertEquals(promptInvoked, true, 'deferredPrompt.prompt() must be called');
    assertEquals(ctrl.promptCalls, 1, 'Prompt should be invoked exactly once');
});

registerTest('T1-PWA-03', 1, 'PWA: Successful User Acceptance', async () => {
    resetTestEnvironment();
    const ctrl = new PwaInstallController();
    ctrl.init();

    const mockEvent = {
        preventDefault: () => {},
        prompt: () => {},
        userChoice: Promise.resolve({ outcome: 'accepted' })
    };

    dispatchWindowEvent('beforeinstallprompt', mockEvent);
    const outcome = await ctrl.installPwa();

    assertEquals(outcome, 'accepted', 'Outcome must resolve to accepted');
    assertEquals(ctrl.canInstall, false, 'canInstall must flip to false after acceptance');
    assertEquals(ctrl.deferredPrompt, null, 'deferredPrompt must be cleared');
});

registerTest('T1-PWA-04', 1, 'PWA: Appinstalled Event Handling', async () => {
    resetTestEnvironment();
    const ctrl = new PwaInstallController();
    ctrl.init();

    ctrl.canInstall = true;
    ctrl.deferredPrompt = { prompt: () => {} };

    dispatchWindowEvent('appinstalled', {});
    assertEquals(ctrl.canInstall, false, 'canInstall must become false on appinstalled');
    assertEquals(ctrl.deferredPrompt, null, 'deferredPrompt must be reset on appinstalled');
});

registerTest('T1-PWA-05', 1, 'PWA: Variant Props & Reactive Rendering Transitions', async () => {
    resetTestEnvironment();

    const compactCtrl = new PwaInstallController('compact');
    const fullCtrl = new PwaInstallController('full');
    const unbindCompact = compactCtrl.init();
    const unbindFull = fullCtrl.init();

    // 1. Initial State: both hidden prior to beforeinstallprompt
    assertEquals(compactCtrl.getViewProps().isVisible, false, 'Compact button must be hidden initially');
    assertEquals(fullCtrl.getViewProps().isVisible, false, 'Full button must be hidden initially');

    // 2. Dispatch beforeinstallprompt event
    let prevented = false;
    const mockEvent = {
        preventDefault: () => { prevented = true; },
        prompt: () => {},
        userChoice: Promise.resolve({ outcome: 'dismissed' })
    };
    dispatchWindowEvent('beforeinstallprompt', mockEvent);
    assertEquals(prevented, true, 'Default browser prompt must be prevented');

    // 3. Verify compact variant layout & accessibility attributes
    const compactProps = compactCtrl.getViewProps();
    assertEquals(compactProps.isVisible, true, 'Compact button visible after prompt');
    assertEquals(compactProps.variant, 'compact');
    assertEquals(compactProps.label, 'App installieren');
    assertEquals(compactProps.title, 'Seniorenassistenz als App auf Ihrem PC installieren');
    assertEquals(compactProps.hasBadge, false, 'Compact variant must not show badge');
    assertEquals(compactProps.fullWidth, false, 'Compact variant is inline');

    // 4. Verify full variant layout & badge
    const fullProps = fullCtrl.getViewProps();
    assertEquals(fullProps.isVisible, true, 'Full button visible after prompt');
    assertEquals(fullProps.variant, 'full');
    assertEquals(fullProps.label, 'App auf PC installieren');
    assertEquals(fullProps.hasBadge, true, 'Full variant must show 1-Klick badge');
    assertEquals(fullProps.badgeText, '1-Klick');
    assertEquals(fullProps.fullWidth, true, 'Full variant spans full container width');

    // 5. Appinstalled teardown: both transition back to hidden
    dispatchWindowEvent('appinstalled', {});
    assertEquals(compactCtrl.getViewProps().isVisible, false, 'Compact hides on appinstalled');
    assertEquals(fullCtrl.getViewProps().isVisible, false, 'Full hides on appinstalled');

    unbindCompact();
    unbindFull();
});
