/**
 * Browser Globals & Headless DOM Mock
 * Provides deterministic simulation of window, document, navigator, canvas, and fetch.
 * Conforms to code-minimalism.md (strictly <= 250 lines).
 */

// Svelte 5 runes shims for Node testing environment (must be at top-level before other imports)
(globalThis as any).$state = (v: any) => v;
(globalThis as any).$derived = (v: any) => (typeof v === 'function' ? v() : v);
(globalThis as any).$effect = (fn: any) => { fn(); return () => {}; };
(globalThis as any).$props = () => ({});
(globalThis as any).$bindable = (v: any) => v;

export interface MockCanvasContext {
    scale: (x: number, y: number) => void;
    beginPath: () => void;
    moveTo: (x: number, y: number) => void;
    lineTo: (x: number, y: number) => void;
    stroke: () => void;
    clearRect: (x: number, y: number, w: number, h: number) => void;
    lineCap: string;
    lineJoin: string;
    lineWidth: number;
    strokeStyle: string;
    strokes: Array<{ type: string; x?: number; y?: number }>;
}

export interface MockCanvasElement {
    width: number;
    height: number;
    getContext: (type: string) => MockCanvasContext;
    getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
    toDataURL: (type?: string) => string;
}

let nominatimMockHandler: ((url: string) => any) | null = null;
let versionJsonMockHandler: ((url: string) => any) | null = null;
const originalFetch = globalThis.fetch;
const windowListeners = new Map<string, Set<(event: any) => void>>();

export function setNominatimMock(handler: ((url: string) => any) | null): void {
    nominatimMockHandler = handler;
}

export function setVersionJsonMock(handler: ((url: string) => any) | null): void {
    versionJsonMockHandler = handler;
}

export function dispatchWindowEvent(type: string, event: any = {}): void {
    const listeners = windowListeners.get(type);
    if (listeners) {
        listeners.forEach(fn => fn(event));
    }
}

export function createMockCanvas(width = 800, height = 400): MockCanvasElement {
    const strokes: Array<{ type: string; x?: number; y?: number }> = [];
    const ctx: MockCanvasContext = {
        lineCap: 'round',
        lineJoin: 'round',
        lineWidth: 3,
        strokeStyle: '#0f172a',
        strokes,
        scale: () => {},
        beginPath: () => { strokes.push({ type: 'beginPath' }); },
        moveTo: (x, y) => { strokes.push({ type: 'moveTo', x, y }); },
        lineTo: (x, y) => { strokes.push({ type: 'lineTo', x, y }); },
        stroke: () => { strokes.push({ type: 'stroke' }); },
        clearRect: () => { strokes.length = 0; }
    };

    return {
        width,
        height,
        getContext: () => ctx,
        getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
        toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };
}

export function setupBrowserGlobals(): void {
    // Svelte 5 runes shims for Node testing environment
    (globalThis as any).$state = (v: any) => v;
    (globalThis as any).$derived = (v: any) => (typeof v === 'function' ? v() : v);
    (globalThis as any).$effect = (fn: any) => { fn(); return () => {}; };
    (globalThis as any).$props = () => ({});
    (globalThis as any).$bindable = (v: any) => v;

    // Window shim
    const mockWindow: any = {
        devicePixelRatio: 2,
        location: { pathname: '/dashboard' },
        history: { back: () => {} },
        matchMedia: (query: string) => ({
            matches: false,
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {}
        }),
        open: (_url: string, _target?: string) => null,
        addEventListener: (type: string, listener: any) => {
            if (!windowListeners.has(type)) windowListeners.set(type, new Set());
            windowListeners.get(type)!.add(listener);
        },
        removeEventListener: (type: string, listener: any) => {
            windowListeners.get(type)?.delete(listener);
        }
    };
    (globalThis as any).window = mockWindow;

    // Document shim
    const documentListeners = new Map<string, Set<(event: any) => void>>();
    const mockDocument: any = {
        querySelectorAll: (_selector: string) => [],
        addEventListener: (type: string, listener: any) => {
            if (!documentListeners.has(type)) documentListeners.set(type, new Set());
            documentListeners.get(type)!.add(listener);
        },
        removeEventListener: (type: string, listener: any) => {
            documentListeners.get(type)?.delete(listener);
        },
        createElement: (tag: string) => {
            if (tag === 'canvas') return createMockCanvas();
            return {
                style: {},
                classList: { add: () => {}, remove: () => {} },
                setAttribute: () => {},
                getAttribute: () => null
            };
        }
    };
    (globalThis as any).document = mockDocument;

    // Navigator shim (configurable properties in Node 25)
    try {
        Object.defineProperty(globalThis.navigator, 'onLine', {
            value: true,
            writable: true,
            configurable: true
        });
        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: { getUserMedia: async () => ({}) },
            writable: true,
            configurable: true
        });
        Object.defineProperty(globalThis.navigator, 'geolocation', {
            value: {
                getCurrentPosition: (success: any) => success({
                    coords: { latitude: 52.520008, longitude: 13.404954, accuracy: 10 },
                    timestamp: Date.now()
                })
            },
            writable: true,
            configurable: true
        });
    } catch {
        // Fallback if globalThis.navigator definition fails
    }

    // Intercept fetch for Nominatim and Version API
    globalThis.fetch = async (input: any, init?: any): Promise<Response> => {
        const url = typeof input === 'string' ? input : input?.url || '';

        if (url.includes('nominatim.openstreetmap.org')) {
            if (nominatimMockHandler) {
                const res = nominatimMockHandler(url);
                if (res instanceof Error) throw res;
                if (res === null) return new Response('Not Found', { status: 404 });
                if (typeof res === 'object' && res.status) return new Response(res.body || '', { status: res.status });
                return new Response(JSON.stringify(res), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify({
                display_name: 'Marienplatz 1, 80331 München, Deutschland',
                address: {
                    road: 'Marienplatz',
                    house_number: '1',
                    postcode: '80331',
                    city: 'München'
                }
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (url.includes('version.json')) {
            if (versionJsonMockHandler) {
                const res = versionJsonMockHandler(url);
                if (res instanceof Error) throw res;
                if (res === null) return new Response('Not Found', { status: 404 });
                if (typeof res === 'object' && res.status) return new Response(res.body || '', { status: res.status });
                return new Response(JSON.stringify(res), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify({
                version: '1.0.0',
                apkUrl: 'https://www.ihre-seniorenassistenz.com/downloads/seniorenassistenz.apk'
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return originalFetch(input, init);
    };
}

export function resetBrowserGlobals(): void {
    windowListeners.clear();
    nominatimMockHandler = null;
    versionJsonMockHandler = null;
    if (globalThis.window) {
        globalThis.window.location = { pathname: '/dashboard' };
    }
    if (globalThis.navigator) {
        (globalThis.navigator as any).onLine = true;
    }
}

// Auto-bootstrap browser environment
setupBrowserGlobals();

