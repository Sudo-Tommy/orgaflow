import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * SemVer 2.0.0 Interface for version components
 */
export interface SemVer {
    major: number;
    minor: number;
    patch: number;
    revision?: number;
    prerelease?: string[];
    build?: string;
}

export interface AppUpdateCheckResult {
    hasUpdate: boolean;
    availableVersion: string | null;
    downloadUrl?: string;
    currentVersion: string;
}

export interface CheckUpdateOptions {
    isNative?: boolean;
    localVersion?: string;
    endpoint?: string;
}

/**
 * Parses a semantic version string with support for optional 'v' prefix,
 * 1-4 numeric components, pre-release tags, and build metadata.
 */
export function parseSemver(v: unknown): SemVer | null {
    if (typeof v !== 'string') return null;
    const clean = v.trim().replace(/^[vV]/, '');
    if (!clean) return null;

    // Strip build metadata (e.g. +build.123)
    const [withoutBuild, build] = clean.split('+');

    // Extract pre-release tag (e.g. -rc.1)
    const firstDash = withoutBuild.indexOf('-');
    let core = withoutBuild;
    let prerelease: string[] | undefined = undefined;
    if (firstDash !== -1) {
        core = withoutBuild.slice(0, firstDash);
        const preStr = withoutBuild.slice(firstDash + 1);
        if (preStr) prerelease = preStr.split('.');
    }

    const parts = core.split('.');
    if (parts.length === 0 || parts.length > 4) return null;
    if (parts.some(p => !/^\d+$/.test(p))) return null;

    const major = parseInt(parts[0], 10);
    const minor = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    const patch = parts.length > 2 ? parseInt(parts[2], 10) : 0;
    const revision = parts.length > 3 ? parseInt(parts[3], 10) : 0;

    return { major, minor, patch, revision, prerelease, build };
}

/**
 * Compares two dot-separated pre-release identifier arrays per SemVer 2.0.0 §11
 */
function comparePrerelease(p1: string[], p2: string[]): number {
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
        const id1 = p1[i];
        const id2 = p2[i];
        if (id1 === undefined) return -1;
        if (id2 === undefined) return 1;
        if (id1 === id2) continue;

        const num1 = /^\d+$/.test(id1) ? parseInt(id1, 10) : null;
        const num2 = /^\d+$/.test(id2) ? parseInt(id2, 10) : null;

        if (num1 !== null && num2 !== null) {
            return num1 > num2 ? 1 : -1;
        }
        if (num1 !== null && num2 === null) return -1;
        if (num1 === null && num2 !== null) return 1;
        return id1.localeCompare(id2);
    }
    return 0;
}

/**
 * Compares two parsed SemVer objects.
 * Returns > 0 if s1 > s2, < 0 if s1 < s2, and 0 if s1 === s2.
 */
export function compareSemver(s1: SemVer, s2: SemVer): number {
    if (s1.major !== s2.major) return s1.major > s2.major ? 1 : -1;
    if (s1.minor !== s2.minor) return s1.minor > s2.minor ? 1 : -1;
    if (s1.patch !== s2.patch) return s1.patch > s2.patch ? 1 : -1;
    if ((s1.revision || 0) !== (s2.revision || 0)) {
        return (s1.revision || 0) > (s2.revision || 0) ? 1 : -1;
    }

    // Normal version vs pre-release version: normal version has higher precedence
    if (!s1.prerelease && s2.prerelease) return 1;
    if (s1.prerelease && !s2.prerelease) return -1;
    if (!s1.prerelease && !s2.prerelease) return 0;

    return comparePrerelease(s1.prerelease!, s2.prerelease!);
}

/**
 * Compares two arbitrary version strings.
 */
export function compareVersions(v1: unknown, v2: unknown): number {
    const p1 = parseSemver(v1);
    const p2 = parseSemver(v2);
    if (!p1 && !p2) return 0;
    if (!p1) return -1;
    if (!p2) return 1;
    return compareSemver(p1, p2);
}

/**
 * Determines whether `remote` is strictly newer than `local`.
 * Returns false if remote is equal, older (downgrade prevention), or invalid.
 */
export function isNewerVersion(remote: unknown, local: unknown): boolean {
    const parsedRemote = parseSemver(remote);
    if (!parsedRemote) return false;
    const parsedLocal = parseSemver(local) || { major: 0, minor: 0, patch: 0 };
    return compareSemver(parsedRemote, parsedLocal) > 0;
}

/**
 * In-App APK Update Service for native hybrid applications
 */
export class AppUpdateService {
    readonly defaultVersion = '1.0.0';
    readonly defaultDownloadUrl = 'https://www.ihre-seniorenassistenz.com/downloads/seniorenassistenz.apk';
    readonly defaultEndpoints = [
        'https://www.ihre-seniorenassistenz.com/version.json',
        'https://www.ihre-seniorenassistenz.com/api/mobile/version.json',
        '/version.json'
    ];

    async getCurrentVersion(): Promise<string> {
        try {
            const info = await App.getInfo();
            if (info?.version) return info.version;
        } catch {
            // Ignore plugin failure and fall back
        }
        return this.defaultVersion;
    }

    async checkUpdate(options?: CheckUpdateOptions): Promise<AppUpdateCheckResult> {
        const isNative = options?.isNative ?? Capacitor.isNativePlatform();
        let currentVersion = options?.localVersion;
        if (!currentVersion) {
            currentVersion = await this.getCurrentVersion();
        }

        if (!isNative) {
            return {
                hasUpdate: false,
                availableVersion: null,
                currentVersion
            };
        }

        const endpoints = options?.endpoint ? [options.endpoint] : this.defaultEndpoints;

        for (const ep of endpoints) {
            try {
                const response = await fetch(ep, { cache: 'no-store' });
                if (!response.ok) continue;

                const data = await response.json();
                const remoteVersion = data?.version;

                if (isNewerVersion(remoteVersion, currentVersion)) {
                    return {
                        hasUpdate: true,
                        availableVersion: remoteVersion,
                        downloadUrl: data?.apkUrl || this.defaultDownloadUrl,
                        currentVersion
                    };
                } else if (remoteVersion) {
                    return { hasUpdate: false, availableVersion: null, currentVersion };
                }
            } catch {
                // Silently continue to next endpoint
            }
        }

        return {
            hasUpdate: false,
            availableVersion: null,
            currentVersion
        };
    }

    openDownload(url?: string): void {
        const targetUrl = url || this.defaultDownloadUrl;
        if (typeof window !== 'undefined') {
            try {
                const a = document.createElement('a');
                a.href = targetUrl;
                a.download = 'Seniorenassistenz.apk';
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch {
                window.open(targetUrl, '_system');
            }
        }
    }
}

export const appUpdateService = new AppUpdateService();
