export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

export function createToastService() {
    let toasts = $state<Toast[]>([]);

    function add(type: Toast['type'], message: string, duration = 3500) {
        const id = crypto.randomUUID();
        toasts.push({ id, type, message });

        // Haptisches Feedback auf Mobilgeräten (falls unterstützt)
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate(50);
            } catch {
                // Vibration kann in manchen Browser-Sicherheitskontexten blockiert sein
            }
        }

        if (duration > 0) {
            setTimeout(() => remove(id), duration);
        }
    }

    function remove(id: string) {
        toasts = toasts.filter(t => t.id !== id);
    }

    function clear() {
        toasts = [];
    }

    return {
        get toasts() { return toasts; },
        success: (msg: string, dur?: number) => add('success', msg, dur),
        error: (msg: string, dur?: number) => add('error', msg, dur),
        info: (msg: string, dur?: number) => add('info', msg, dur),
        warning: (msg: string, dur?: number) => add('warning', msg, dur),
        remove,
        clear
    };
}

export const toastStore = createToastService();