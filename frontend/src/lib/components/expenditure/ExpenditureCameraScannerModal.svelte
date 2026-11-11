<script lang="ts">
    import { Camera, Zap, X, Upload } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";

    let {
        isOpen,
        isCapturingFrame,
        onCapture,
        onClose,
        onPickFile
    } = $props<{
        isOpen: boolean;
        isCapturingFrame: boolean;
        onCapture: (sourceCanvas: HTMLCanvasElement) => void;
        onClose: () => void;
        onPickFile: () => void;
    }>();

    // svelte-ignore non_reactive_update
    let cameraDialog: HTMLDialogElement;
    let videoElement = $state<HTMLVideoElement | null>(null);
    let mediaStream = $state<MediaStream | null>(null);
    let hasTorch = $state(false);
    let isTorchOn = $state(false);

    export async function startCamera() {
        if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
            onPickFile();
            return;
        }

        try {
            cameraDialog?.showModal();
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStream = stream;

            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
            hasTorch = !!capabilities?.torch;
            isTorchOn = false;

            setTimeout(() => {
                if (videoElement) {
                    videoElement.srcObject = stream;
                    videoElement.play().catch(console.error);
                }
            }, 100);
        } catch (err) {
            console.warn("Live-Kamerazugriff fehlgeschlagen:", err);
            stopCamera();
            onPickFile();
        }
    }

    export function stopCamera() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        if (videoElement) {
            videoElement.srcObject = null;
        }
        isTorchOn = false;
        cameraDialog?.close();
        onClose();
    }

    async function toggleTorch() {
        if (!mediaStream) return;
        const track = mediaStream.getVideoTracks()[0];
        if (!track) return;
        try {
            isTorchOn = !isTorchOn;
            await (track as any).applyConstraints({ advanced: [{ torch: isTorchOn }] });
        } catch (e) {
            console.warn("Blitzlicht konnte nicht geschaltet werden:", e);
        }
    }

    function capture() {
        if (!videoElement || isCapturingFrame) return;
        hapticFeedback.tap();

        const videoWidth = videoElement.videoWidth || 1920;
        const videoHeight = videoElement.videoHeight || 1080;
        const canvas = document.createElement('canvas');
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
            stopCamera();
            onCapture(canvas);
        }
    }
</script>

<dialog 
    bind:this={cameraDialog} 
    class="m-0 p-0 w-screen h-screen max-w-none max-h-none border-0 bg-black text-white fixed inset-0 z-[1000] overflow-hidden select-none outline-hidden backdrop:bg-black"
    oncancel={(e) => { e.preventDefault(); stopCamera(); }}
>
    {#if isOpen}
        <div class="w-full h-full bg-black flex flex-col items-center justify-between overflow-hidden relative select-none animate-in fade-in duration-200">
            <!-- Scanner Top Bar -->
            <div class="w-full px-4 pt-4 pb-2 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-20">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span class="text-white text-xs font-bold tracking-wider">LIVE BELEG-SCANNER</span>
                </div>
                <div class="flex items-center gap-2">
                    {#if hasTorch}
                        <button 
                            type="button" 
                            onclick={toggleTorch} 
                            class="p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Blitzlicht"
                        >
                            <Zap class="w-4 h-4 {isTorchOn ? 'text-amber-400 fill-amber-400' : 'text-white'}" />
                        </button>
                    {/if}
                    <button 
                        type="button" 
                        onclick={stopCamera} 
                        class="p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Schließen"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <!-- Video & Viewfinder Frame -->
            <div class="relative w-full flex-1 flex items-center justify-center overflow-hidden">
                <!-- svelte-ignore a11y_media_has_caption -->
                <video bind:this={videoElement} autoplay playsinline muted class="absolute inset-0 w-full h-full object-cover"></video>

                <div class="relative w-[86%] max-w-md aspect-[3/4] rounded-3xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] pointer-events-none flex flex-col justify-between p-3 overflow-hidden">
                    <div class="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-[0_0_8px_#34d399]"></div>
                    <div class="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-[0_0_8px_#34d399]"></div>
                    <div class="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-[0_0_8px_#34d399]"></div>
                    <div class="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-[0_0_8px_#34d399]"></div>

                    <div class="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[scan_2.5s_ease-in-out_infinite] shadow-[0_0_10px_#34d399]"></div>

                    <div class="mx-auto mt-auto mb-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold text-center shadow-lg">
                        Dokument innerhalb des Rahmens halten
                    </div>
                </div>

                {#if isCapturingFrame}
                    <div class="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30">
                        <div class="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p class="text-sm font-bold">Kanten werden erkannt &amp; zugeschnitten...</p>
                    </div>
                {/if}
            </div>

            <!-- Controls -->
            <div class="w-full px-6 pt-3 pb-8 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-around z-20">
                <button 
                    type="button" 
                    onclick={() => { stopCamera(); onPickFile(); }}
                    class="text-xs text-white/80 hover:text-white flex flex-col items-center gap-1 cursor-pointer min-h-[44px]"
                >
                    <Upload class="w-5 h-5" />
                    <span class="text-[11px] font-medium">Datei</span>
                </button>

                <button 
                    type="button" 
                    onclick={capture} 
                    disabled={isCapturingFrame}
                    class="w-20 h-20 rounded-full border-4 border-white/90 flex items-center justify-center p-1 cursor-pointer active:scale-95 transition-transform disabled:opacity-50 shadow-2xl"
                    title="Fotografieren"
                >
                    <div class="w-full h-full bg-white rounded-full shadow-inner flex items-center justify-center">
                        <Camera class="w-8 h-8 text-neutral-900" />
                    </div>
                </button>

                <button 
                    type="button" 
                    onclick={stopCamera}
                    class="text-xs text-white/80 hover:text-white flex flex-col items-center gap-1 cursor-pointer min-h-[44px]"
                >
                    <X class="w-5 h-5" />
                    <span class="text-[11px] font-medium">Abbrechen</span>
                </button>
            </div>
        </div>
    {/if}
</dialog>

<style>
    @keyframes scan {
        0% { transform: translateY(0); opacity: 0.8; }
        50% { transform: translateY(260px); opacity: 1; }
        100% { transform: translateY(0); opacity: 0.8; }
    }
</style>
