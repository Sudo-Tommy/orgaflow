import { toastStore } from "$lib/services/toastService.svelte";
import { triggerHaptic } from "$lib/services/hapticFeedback";

export interface AudioRecording {
    id: number;
    blob: Blob;
    mimeType: string;
    duration: number;
    url: string;
}

export interface AttachedDoc {
    id: number;
    blob: Blob;
    name: string;
    mimeType: string;
    url: string;
}

export class AiReportState {
    isRecording = $state(false);
    recordingTime = $state(0);
    recordings = $state<AudioRecording[]>([]);
    attachedDocuments = $state<AttachedDoc[]>([]);
    errorMsg = $state("");

    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private recordingInterval: any = null;

    async startRecording() {
        try {
            this.errorMsg = "";
            triggerHaptic('tap');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : 'audio/mp4';
            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                if (this.audioChunks.length > 0 && !this.errorMsg) {
                    const finalBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
                    this.recordings = [...this.recordings, {
                        id: Date.now(),
                        blob: finalBlob,
                        mimeType: this.mediaRecorder?.mimeType || 'audio/webm',
                        duration: this.recordingTime,
                        url: URL.createObjectURL(finalBlob)
                    }];
                    triggerHaptic('success');
                }
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingTime = 0;
            this.recordingInterval = setInterval(() => this.recordingTime++, 1000);
        } catch (err) {
            console.error("Mikrofon-Zugriff verweigert", err);
            this.errorMsg = "Konnte nicht auf das Mikrofon zugreifen. Bitte überprüfen Sie Ihre Browser-Einstellungen.";
            triggerHaptic('error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            clearInterval(this.recordingInterval);
        }
    }

    cancelRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.errorMsg = "Abgebrochen";
            this.mediaRecorder.stop();
            this.isRecording = false;
            clearInterval(this.recordingInterval);
            this.errorMsg = "";
            triggerHaptic('tap');
        }
    }

    deleteRecording(id: number) {
        triggerHaptic('tap');
        const rec = this.recordings.find(r => r.id === id);
        if (rec) URL.revokeObjectURL(rec.url);
        this.recordings = this.recordings.filter(r => r.id !== id);
    }

    handleFileUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const newRecs: AudioRecording[] = [];
        let hasHugeFile = false;
        for (const file of Array.from(input.files)) {
            if (file.size > 50 * 1024 * 1024) hasHugeFile = true;
            const mimeType = file.type || (file.name.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/webm');
            newRecs.push({
                id: Date.now() + Math.random(),
                blob: file,
                mimeType,
                duration: 0,
                url: URL.createObjectURL(file)
            });
        }
        this.recordings = [...this.recordings, ...newRecs];
        input.value = '';
        triggerHaptic('selection');
        if (hasHugeFile) {
            toastStore.warning("Achtung: Sehr große Audiodatei erkannt. Die KI-Verarbeitung kann einen Moment dauern.");
        }
    }

    handleDocumentUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const newDocs: AttachedDoc[] = [];
        for (const file of Array.from(input.files)) {
            newDocs.push({
                id: Date.now() + Math.random(),
                blob: file,
                name: file.name,
                mimeType: file.type || 'application/pdf',
                url: URL.createObjectURL(file)
            });
        }
        this.attachedDocuments = [...this.attachedDocuments, ...newDocs];
        input.value = '';
        triggerHaptic('selection');
    }

    deleteDocument(id: number) {
        triggerHaptic('tap');
        const doc = this.attachedDocuments.find(d => d.id === id);
        if (doc) URL.revokeObjectURL(doc.url);
        this.attachedDocuments = this.attachedDocuments.filter(d => d.id !== id);
    }

    cleanup() {
        if (this.isRecording) {
            this.cancelRecording();
        }
        this.recordings.forEach(r => URL.revokeObjectURL(r.url));
        this.attachedDocuments.forEach(d => URL.revokeObjectURL(d.url));
        this.recordings = [];
        this.attachedDocuments = [];
        this.errorMsg = "";
    }
}
