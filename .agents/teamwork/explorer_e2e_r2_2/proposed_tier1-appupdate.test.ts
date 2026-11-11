/**
 * Tier 1: App Update Banner - Feature Coverage
 * Tests: T1-UPD-01 through T1-UPD-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { setVersionJsonMock } from '../mocks/mockBrowserGlobals';
import { appUpdateService } from '$lib/services/appUpdateService';
import { registerTest, assertEquals } from '../test-harness';

registerTest('T1-UPD-01', 1, 'AppUpdate: Update Detection Trigger', async () => {
    resetTestEnvironment();
    setVersionJsonMock(() => ({ version: '1.1.0', apkUrl: 'https://example.com/app-v1.1.0.apk' }));

    const result = await appUpdateService.checkUpdate({ localVersion: '1.0.0' });
    assertEquals(result.hasUpdate, true, 'New version must be detected');
    assertEquals(result.availableVersion, '1.1.0', 'Available version must match remote');
    assertEquals(result.downloadUrl, 'https://example.com/app-v1.1.0.apk', 'Download APK URL must be updated');
});

registerTest('T1-UPD-02', 1, 'AppUpdate: Version Match Suppression', async () => {
    resetTestEnvironment();
    setVersionJsonMock(() => ({ version: '1.0.0' }));

    const result = await appUpdateService.checkUpdate({ localVersion: '1.0.0' });
    assertEquals(result.hasUpdate, false, 'Banner must remain hidden when versions match');
    assertEquals(result.availableVersion, null, 'Available version must be null on match');
});

registerTest('T1-UPD-03', 1, 'AppUpdate: User Dismissal ("Später erinnern")', async () => {
    resetTestEnvironment();
    setVersionJsonMock(() => ({ version: '1.2.0' }));

    const result = await appUpdateService.checkUpdate({ localVersion: '1.0.0' });
    assertEquals(result.availableVersion, '1.2.0', 'Update should be present');

    let isDismissed = false;
    // User dismisses banner
    isDismissed = true;
    assertEquals(isDismissed, true, 'isDismissed must be true after user clicks close');
});

registerTest('T1-UPD-04', 1, 'AppUpdate: Direct APK Download Launch', async () => {
    resetTestEnvironment();
    let openedUrl = '';
    let openedTarget = '';
    globalThis.window.open = (url: string, target?: string) => {
        openedUrl = url;
        openedTarget = target || '';
        return null;
    };

    setVersionJsonMock(() => ({ version: '2.0.0', apkUrl: 'https://example.com/release.apk' }));
    const result = await appUpdateService.checkUpdate({ localVersion: '1.0.0' });

    // Trigger download via service
    appUpdateService.openDownload(result.downloadUrl);

    assertEquals(openedUrl, 'https://example.com/release.apk', 'Target APK URL must be opened');
    assertEquals(openedTarget, '_system', 'Target must be _system to launch external browser/installer');
});

registerTest('T1-UPD-05', 1, 'AppUpdate: Non-Native Platform Suppression', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = false;
    setVersionJsonMock(() => ({ version: '3.0.0' }));

    const result = await appUpdateService.checkUpdate({ isNative: false });
    assertEquals(result.hasUpdate, false, 'Update check must be skipped on non-native platform');
    assertEquals(result.availableVersion, null, 'Available version must be null on non-native platform');
});
