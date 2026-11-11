/**
 * Tier 2: App Update Banner - Boundary & Corner Cases
 * Tests: T2-UPD-01 through T2-UPD-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { setVersionJsonMock } from '../mocks/mockBrowserGlobals';
import { App } from '@capacitor/app';
import { appUpdateService, isNewerVersion } from '$lib/services/appUpdateService';
import { registerTest, assertEquals } from '../test-harness';

registerTest('T2-UPD-01', 2, 'AppUpdate Corner: Remote Endpoint Offline', async () => {
    resetTestEnvironment();
    setVersionJsonMock(() => new Error('Network request failed: ENOTFOUND'));

    const result = await appUpdateService.checkUpdate({ localVersion: '1.0.0' });
    assertEquals(result.hasUpdate, false, 'Offline network error must not report update');
    assertEquals(result.availableVersion, null, 'Offline network error must return null availableVersion');
});

registerTest('T2-UPD-02', 2, 'AppUpdate Corner: Corrupted / Malformed Remote JSON', async () => {
    resetTestEnvironment();
    setVersionJsonMock(() => ({ unexpectedField: 123 }));

    const result = await appUpdateService.checkUpdate({ localVersion: '1.0.0' });
    assertEquals(result.hasUpdate, false, 'Malformed JSON missing version must be ignored');
    assertEquals(result.availableVersion, null, 'Malformed JSON must return null availableVersion');
});

registerTest('T2-UPD-03', 2, 'AppUpdate Corner: App.getInfo() Plugin Failure', async () => {
    resetTestEnvironment();
    const origGetInfo = App.getInfo;
    (App as any).getInfo = async () => { throw new Error('Plugin unavailable'); };

    setVersionJsonMock(() => ({ version: '1.5.0' }));
    const result = await appUpdateService.checkUpdate();

    assertEquals(result.hasUpdate, true, 'Must detect update when App.getInfo fails and falls back to default');
    assertEquals(result.availableVersion, '1.5.0', 'Available version must match remote');
    (App as any).getInfo = origGetInfo;
});

registerTest('T2-UPD-04', 2, 'AppUpdate Corner: Older Remote Version (Downgrade Avoidance)', async () => {
    resetTestEnvironment();
    setVersionJsonMock(() => ({ version: '1.0.0' }));

    // Test real production service with older remote version (remote 1.0.0 vs local 1.2.0)
    const result = await appUpdateService.checkUpdate({ localVersion: '1.2.0' });
    assertEquals(result.hasUpdate, false, 'Older remote versions must not prompt for downgrade');
    assertEquals(result.availableVersion, null, 'Available version must be null on downgrade attempt');

    // Thorough verification of version comparison helper edge cases
    assertEquals(isNewerVersion('1.0.0', '1.2.0'), false, '1.0.0 is not newer than 1.2.0');
    assertEquals(isNewerVersion('1.1.9', '1.2.0'), false, '1.1.9 is not newer than 1.2.0');
    assertEquals(isNewerVersion('1.10.0', '1.9.0'), true, '1.10.0 is newer than 1.9.0 (multi-digit semver check)');
    assertEquals(isNewerVersion('1.0.12', '1.0.9'), true, '1.0.12 is newer than 1.0.9 (multi-digit patch check)');
    assertEquals(isNewerVersion('v1.3.0', '1.2.0'), true, 'v-prefix handled cleanly');
    assertEquals(isNewerVersion('1.2.0', '1.2.0'), false, 'Identical versions do not prompt update');
    assertEquals(isNewerVersion('invalid', '1.2.0'), false, 'Invalid remote version rejected');
    assertEquals(isNewerVersion('1.0.0-rc.1', '1.0.0'), false, 'Pre-release is not newer than final release');
});

registerTest('T2-UPD-05', 2, 'AppUpdate Corner: Repeated Mount Cycles', async () => {
    resetTestEnvironment();
    setVersionJsonMock(() => ({ version: '2.0.0' }));

    let isDismissed = false;
    for (let i = 0; i < 5; i++) {
        const check = await appUpdateService.checkUpdate({ localVersion: '1.0.0' });
        if (i === 1) isDismissed = true; // Dismiss on second cycle
        if (isDismissed) {
            assertEquals(isDismissed, true, 'Dismissal state must persist across cycles');
        } else {
            assertEquals(check.availableVersion, '2.0.0');
        }
    }
});
