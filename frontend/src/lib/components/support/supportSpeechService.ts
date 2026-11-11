// src/lib/components/support/supportSpeechService.ts
export function speakText(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
}

export function createSpeechRecognizer(
    onResult: (text: string) => void,
    onStateChange: (recording: boolean) => void
) {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return null;

    let rec: any = null;
    let isRecording = false;

    return {
        toggle() {
            if (isRecording) {
                rec?.stop();
                isRecording = false;
                onStateChange(false);
                return;
            }
            try {
                rec = new SpeechRec();
                rec.lang = 'de-DE';
                rec.onresult = (e: any) => {
                    const t = e.results[0]?.[0]?.transcript || '';
                    if (t) onResult(t);
                };
                rec.onerror = () => { isRecording = false; onStateChange(false); };
                rec.onend = () => { isRecording = false; onStateChange(false); };
                rec.start();
                isRecording = true;
                onStateChange(true);
            } catch {
                isRecording = false;
                onStateChange(false);
            }
        }
    };
}

