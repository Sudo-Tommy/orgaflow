// src/lib/services/systemDialogAudio.ts
// Akustischer Benachrichtigungston über die native Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return null;
        if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new AudioCtx();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    } catch {
        return null;
    }
}

/**
 * Spielt einen professionellen, zweistufigen System-Gong ab (D5 -> A5)
 */
export function playSystemDialogChime(isUrgent: boolean = false) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        
        // Ton 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = isUrgent ? 'sawtooth' : 'sine';
        osc1.frequency.setValueAtTime(isUrgent ? 659.25 : 587.33, now); // E5 oder D5
        
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.4);

        // Ton 2 (Harmonische Quinte darüber)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(isUrgent ? 880.00 : 880.00, now + 0.12); // A5
        
        gain2.gain.setValueAtTime(0.001, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.75);
    } catch (e) {
        // Falls Autoplay gesperrt ist, geräuschlos ignorieren
    }
}
