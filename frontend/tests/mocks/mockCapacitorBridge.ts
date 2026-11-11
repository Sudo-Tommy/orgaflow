/**
 * Comprehensive Mock Capacitor Bridge
 * Intercepts all Capacitor plugin calls via nativePromise/nativeCallback and provides
 * stateful in-memory stores, lifecycle simulation, and deterministic control.
 * Strictly adheres to code-minimalism.md (<= 250 lines).
 */

export interface MockLocationCoords {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export class MockCapacitorBridge {
    platform: 'android' | 'ios' | 'web' = 'android';
    isNative = true;

    // Camera state
    cameraPhotoDataUrl: string | null = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    cameraError: Error | string | null = null;
    cameraPermission: 'granted' | 'denied' = 'granted';

    // Geolocation state
    coords: MockLocationCoords = { latitude: 48.137154, longitude: 11.576124, accuracy: 5 };
    locationPermission: 'granted' | 'denied' | 'prompt' = 'granted';
    locationError: any = null;

    // Screen Orientation state
    currentOrientation: string = 'portrait-primary';
    failOrientationLock = false;

    // Preferences state
    preferences = new Map<string, string>();

    // App state
    appVersion = '1.0.0';
    exitAppCalls = 0;
    appListeners = new Map<string, Set<(data: any) => void>>();

    reset(): void {
        this.platform = 'android';
        this.isNative = true;
        this.cameraPhotoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        this.cameraError = null;
        this.cameraPermission = 'granted';
        this.coords = { latitude: 48.137154, longitude: 11.576124, accuracy: 5 };
        this.locationPermission = 'granted';
        this.locationError = null;
        this.currentOrientation = 'portrait-primary';
        this.failOrientationLock = false;
        this.preferences.clear();
        this.appVersion = '1.0.0';
        this.exitAppCalls = 0;
        this.appListeners.clear();
    }

    notifyApp(eventName: string, data: any): void {
        const set = this.appListeners.get(eventName);
        if (set) {
            set.forEach(cb => cb(data));
        }
        try {
            (App as any).notifyListeners?.(eventName, data);
        } catch {}
    }

    async handleNativePromise(plugin: string, method: string, options: any): Promise<any> {
        if (plugin === 'Camera') {
            if (method === 'checkPermissions') return { camera: this.cameraPermission };
            if (method === 'requestPermissions') return { camera: this.cameraPermission };
            if (method === 'getPhoto') {
                if (this.cameraError) {
                    if (typeof this.cameraError === 'string') throw new Error(this.cameraError);
                    throw this.cameraError;
                }
                return { dataUrl: this.cameraPhotoDataUrl, format: 'png' };
            }
        }

        if (plugin === 'Geolocation') {
            if (method === 'checkPermissions') return { location: this.locationPermission };
            if (method === 'requestPermissions') {
                if (this.locationPermission === 'prompt') this.locationPermission = 'granted';
                return { location: this.locationPermission };
            }
            if (method === 'getCurrentPosition') {
                if (this.locationError) throw this.locationError;
                return {
                    coords: { ...this.coords },
                    timestamp: Date.now()
                };
            }
        }

        if (plugin === 'ScreenOrientation') {
            if (method === 'lock') {
                if (this.failOrientationLock) throw new Error('Screen orientation lock not supported');
                this.currentOrientation = options?.orientation || 'landscape';
                return;
            }
            if (method === 'unlock') {
                this.currentOrientation = 'unlocked';
                return;
            }
        }

        if (plugin === 'Preferences') {
            if (method === 'get') {
                const val = this.preferences.get(options?.key) ?? null;
                return { value: val };
            }
            if (method === 'set') {
                this.preferences.set(options?.key, String(options?.value));
                return;
            }
            if (method === 'remove') {
                this.preferences.delete(options?.key);
                return;
            }
            if (method === 'clear') {
                this.preferences.clear();
                return;
            }
        }

        if (plugin === 'App') {
            if (method === 'getInfo') {
                return { version: this.appVersion, build: '1', id: 'com.orgaflow.app', name: 'OrgaFlow' };
            }
            if (method === 'exitApp') {
                this.exitAppCalls++;
                return;
            }
        }

        return {};
    }

    handleNativeCallback(plugin: string, method: string, options: any, callback: (data: any) => void): string {
        if (plugin === 'App' && method === 'addListener') {
            const eventName = options?.eventName || options;
            if (!this.appListeners.has(eventName)) {
                this.appListeners.set(eventName, new Set());
            }
            this.appListeners.get(eventName)!.add(callback);
            return `listener_${Date.now()}_${Math.random()}`;
        }
        return 'cb_id';
    }
}

export const mockCapacitorBridge = new MockCapacitorBridge();

export function installCapacitorMocks(): void {
    const pluginHeaders = [
        { name: 'Camera', methods: [{ name: 'getPhoto', rtype: 'promise' }, { name: 'checkPermissions', rtype: 'promise' }, { name: 'requestPermissions', rtype: 'promise' }] },
        { name: 'Geolocation', methods: [{ name: 'getCurrentPosition', rtype: 'promise' }, { name: 'checkPermissions', rtype: 'promise' }, { name: 'requestPermissions', rtype: 'promise' }] },
        { name: 'ScreenOrientation', methods: [{ name: 'lock', rtype: 'promise' }, { name: 'unlock', rtype: 'promise' }] },
        { name: 'Preferences', methods: [{ name: 'get', rtype: 'promise' }, { name: 'set', rtype: 'promise' }, { name: 'remove', rtype: 'promise' }, { name: 'clear', rtype: 'promise' }] },
        { name: 'App', methods: [{ name: 'getInfo', rtype: 'promise' }, { name: 'exitApp', rtype: 'promise' }, { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }] }
    ];

    const cap = (globalThis as any).Capacitor || {};
    cap.PluginHeaders = pluginHeaders;
    cap.isNativePlatform = () => mockCapacitorBridge.isNative;
    cap.getPlatform = () => mockCapacitorBridge.platform;
    cap.nativePromise = (plugin: string, method: string, options: any) => mockCapacitorBridge.handleNativePromise(plugin, method, options);
    cap.nativeCallback = (plugin: string, method: string, options: any, cb: any) => mockCapacitorBridge.handleNativeCallback(plugin, method, options, cb);

    (globalThis as any).Capacitor = cap;
    (globalThis as any).androidBridge = {};
}

// Auto-bootstrap Capacitor mocks
installCapacitorMocks();

