// src/lib/services/toastService.svelte.ts
export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

function cleanToastMessage(msg: string): string {
    if (!msg) return 'Ein unerwarteter Fehler ist aufgetreten.';
    const lower = msg.toLowerCase();
    if (
        lower.includes('googlegenerativeai') ||
        lower.includes('429') ||
        lower.includes('quota exceeded') ||
        lower.includes('rate-limit') ||
        lower.includes('generativelanguage.googleapis.com') ||
        lower.includes('omni-antwort') ||
        lower.includes('generatecontent') ||
        lower.includes('gemini') ||
        lower.includes('500') ||
        lower.includes('internal server error')
    ) {
        return 'Die Support-KI ist momentan im Offline-Modus aktiv. Du kannst deine Frage wie gewohnt stellen.';
    }
    return msg;
}

export function createToastService() {
    let toasts = $state<Toast[]>([]);

    function add(type: Toast['type'], message: string, duration = 3500) {
        const id = crypto.randomUUID();
        const safeMessage = type === 'error' ? cleanToastMessage(message) : message;
        toasts.push({ id, type, message: safeMessage });

        // Haptisches Feedback auf Mobilgeräten
        import('$lib/services/hapticFeedback').then(m => m.triggerHaptic(type)).catch(() => {});

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
