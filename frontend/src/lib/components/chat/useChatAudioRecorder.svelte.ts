import { toastStore } from "$lib/services/toastService.svelte";

export function createChatAudioRecorder(onAudioRecorded: (file: File) => void) {
    let isRecording = $state(false);
    let recordingTime = $state(0);
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let recordingInterval: ReturnType<typeof setInterval> | null = null;

    let formattedRecordingTime = $derived(
        `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`
    );

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };
            mediaRecorder.onstop = () => {
                if (audioChunks.length > 0) {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const file = new File([audioBlob], `Sprachnachricht_${Date.now()}.webm`, { type: 'audio/webm' });
                    onAudioRecorded(file);
                }
            };
            mediaRecorder.start();
            isRecording = true;
            recordingTime = 0;
            if (recordingInterval) clearInterval(recordingInterval);
            recordingInterval = setInterval(() => {
                recordingTime++;
            }, 1000);
        } catch {
            toastStore.error("Konnte nicht auf das Mikrofon zugreifen. Bitte überprüfe die Browser-Berechtigungen.");
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            if (recordingInterval) clearInterval(recordingInterval);
            mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
    }

    function cancelRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.onstop = null;
            mediaRecorder.stop();
            isRecording = false;
            if (recordingInterval) clearInterval(recordingInterval);
            mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            audioChunks = [];
        }
    }

    function cleanup() {
        cancelRecording();
    }

    return {
        get isRecording() { return isRecording; },
        get formattedRecordingTime() { return formattedRecordingTime; },
        startRecording,
        stopRecording,
        cancelRecording,
        cleanup
    };
}
