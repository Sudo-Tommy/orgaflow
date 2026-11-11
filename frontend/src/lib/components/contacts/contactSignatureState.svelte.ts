import { getPointerPos, drawStroke } from "$lib/utils/signatureCanvasHelper";

export function createContactSignatureState() {
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let fsCanvas = $state<HTMLCanvasElement | null>(null);
    let fsDialog = $state<HTMLDialogElement | null>(null);

    let isDrawing = false;
    let isFsDrawing = false;
    let lastPos = { x: 0, y: 0 };
    let lastFsPos = { x: 0, y: 0 };

    let uploadedFile = $state<File | null>(null);
    let uploadedPreviewUrl = $state<string>("");
    let hasDrawnSignature = $state(false);
    let hasDrawnFsSignature = $state(false);
    let deleteExistingSignature = $state(false);
    let isSignatureFullscreen = $state(false);

    function startDrawing(e: PointerEvent) {
        if (!canvas) return;
        e.preventDefault();
        try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
        isDrawing = true;
        hasDrawnSignature = true;
        lastPos = getPointerPos(e, canvas);
        const ctx = canvas.getContext("2d");
        if (ctx) drawStroke(ctx, lastPos, lastPos, "#4f46e5", 4);
    }

    function draw(e: PointerEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const currentPos = getPointerPos(e, canvas);
        const ctx = canvas.getContext("2d");
        if (ctx) drawStroke(ctx, lastPos, currentPos, "#4f46e5", 4);
        lastPos = currentPos;
    }

    function stopDrawing(e?: PointerEvent) {
        if (e) { try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {} }
        isDrawing = false;
    }

    function startFsDrawing(e: PointerEvent) {
        if (!fsCanvas) return;
        e.preventDefault();
        try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
        isFsDrawing = true;
        hasDrawnFsSignature = true;
        lastFsPos = getPointerPos(e, fsCanvas);
        const ctx = fsCanvas.getContext("2d");
        if (ctx) drawStroke(ctx, lastFsPos, lastFsPos, "#4f46e5", 5);
    }

    function drawFs(e: PointerEvent) {
        if (!isFsDrawing || !fsCanvas) return;
        e.preventDefault();
        const currentPos = getPointerPos(e, fsCanvas);
        const ctx = fsCanvas.getContext("2d");
        if (ctx) drawStroke(ctx, lastFsPos, currentPos, "#4f46e5", 5);
        lastFsPos = currentPos;
    }

    function stopFsDrawing(e?: PointerEvent) {
        if (e) { try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {} }
        isFsDrawing = false;
    }

    function clearSignature() {
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        hasDrawnSignature = false;
        uploadedFile = null;
        uploadedPreviewUrl = "";
    }

    function clearFsSignature() {
        if (fsCanvas) {
            const ctx = fsCanvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, fsCanvas.width, fsCanvas.height);
        }
        hasDrawnFsSignature = false;
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            uploadedFile = target.files[0];
            if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
            uploadedPreviewUrl = URL.createObjectURL(uploadedFile);
        } else {
            uploadedFile = null;
            uploadedPreviewUrl = "";
        }
    }

    function openSignatureFullscreen() {
        isSignatureFullscreen = true;
        fsDialog?.showModal();
        setTimeout(() => {
            if (!fsCanvas) return;
            const rect = fsCanvas.getBoundingClientRect();
            const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
            fsCanvas.width = Math.max(800, Math.floor(rect.width * dpr));
            fsCanvas.height = Math.max(320, Math.floor(rect.height * dpr));
            const ctx = fsCanvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, fsCanvas.width, fsCanvas.height);
                if (canvas && hasDrawnSignature) {
                    ctx.drawImage(canvas, 0, 0, fsCanvas.width, fsCanvas.height);
                    hasDrawnFsSignature = true;
                } else {
                    hasDrawnFsSignature = false;
                }
            }
        }, 60);
    }

    function applyFsSignature() {
        if (fsCanvas && canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (hasDrawnFsSignature) {
                    ctx.drawImage(fsCanvas, 0, 0, canvas.width, canvas.height);
                    hasDrawnSignature = true;
                } else {
                    hasDrawnSignature = false;
                }
            }
        }
        closeSignatureFullscreen();
    }

    function closeSignatureFullscreen() {
        isSignatureFullscreen = false;
        fsDialog?.close();
    }

    function resetSignatureState() {
        hasDrawnSignature = false;
        hasDrawnFsSignature = false;
        uploadedFile = null;
        if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
        uploadedPreviewUrl = "";
        deleteExistingSignature = false;
        signatureMode = "draw";
        isSignatureFullscreen = false;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    async function getSignatureBlob(): Promise<Blob | null> {
        if (!canvas) return null;
        return new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, "image/png"));
    }

    return {
        get signatureMode() { return signatureMode; },
        set signatureMode(v: "draw" | "upload") { signatureMode = v; },
        get canvas() { return canvas; },
        set canvas(v: HTMLCanvasElement | null) { canvas = v; },
        get fsCanvas() { return fsCanvas; },
        set fsCanvas(v: HTMLCanvasElement | null) { fsCanvas = v; },
        get fsDialog() { return fsDialog; },
        set fsDialog(v: HTMLDialogElement | null) { fsDialog = v; },
        get uploadedFile() { return uploadedFile; },
        set uploadedFile(v: File | null) { uploadedFile = v; },
        get uploadedPreviewUrl() { return uploadedPreviewUrl; },
        get hasDrawnSignature() { return hasDrawnSignature; },
        set hasDrawnSignature(v: boolean) { hasDrawnSignature = v; },
        get deleteExistingSignature() { return deleteExistingSignature; },
        set deleteExistingSignature(v: boolean) { deleteExistingSignature = v; },
        get isSignatureFullscreen() { return isSignatureFullscreen; },
        startDrawing,
        draw,
        stopDrawing,
        startFsDrawing,
        drawFs,
        stopFsDrawing,
        clearSignature,
        clearFsSignature,
        handleFileChange,
        openSignatureFullscreen,
        applyFsSignature,
        closeSignatureFullscreen,
        resetSignatureState,
        getSignatureBlob
    };
}
