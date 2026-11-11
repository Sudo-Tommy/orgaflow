<!-- src/lib/components/clients/CarepersonSignatureModal.svelte -->
<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { getPointerPos, drawStroke } from "$lib/utils/signatureCanvasHelper";
    import {
        resolveClientCarepersonContact,
        resolveClientInheritorContact,
        getContactSignatureUrl
    } from "$lib/services/clientContactRoleHelper";
    import { X, Check, Trash2, Upload, PenTool } from "lucide-svelte";

    let dialog = $state<HTMLDialogElement>();
    let contact = $state<any>(null);
    let client = $state<any>(null);
    let targetRole = $state<"careperson" | "inheritor" | "both">("careperson");
    let canvas = $state<HTMLCanvasElement>();
    let isDrawing = false;
    let hasDrawn = $state(false);
    let lastPos = { x: 0, y: 0 };
    let signatureMode = $state<"draw" | "upload">("draw");
    let isSaving = $state(false);
    let uploadedFile = $state<File | null>(null);
    let existingSignUrl = $state<string>("");

    let roleTitle = $derived(
        targetRole === "both"
            ? "Unterschrift erfassen"
            : targetRole === "inheritor"
              ? "Unterschrift d. Vertretung / Vollmacht"
              : "Unterschrift der Pflegeperson"
    );

    let contactName = $derived.by(() => {
        if (!contact) return "Bezugsperson";
        return `${contact.name_first || ""} ${contact.name_last || ""}`.trim() || contact.company_name || "Kontakt";
    });

    export function open(
        targetContactOrClient: any,
        role: "careperson" | "inheritor" | "both" = "careperson",
        parentClient?: any
    ) {
        targetRole = role;
        hasDrawn = false;
        uploadedFile = null;
        signatureMode = "draw";

        const allContacts = orgaStore.contacts?.data || [];
        if (targetContactOrClient?.collectionName === "contacts" || (!targetContactOrClient?.contact_relations && parentClient)) {
            contact = targetContactOrClient;
            client = parentClient || null;
        } else {
            client = targetContactOrClient;
            contact =
                role === "inheritor"
                    ? resolveClientInheritorContact(client, allContacts)
                    : resolveClientCarepersonContact(client, allContacts);
        }

        existingSignUrl = contact ? getContactSignatureUrl(contact, pb) : "";
        dialog?.showModal();
        setTimeout(initCanvas, 80);
    }

    export function close() {
        dialog?.close();
        contact = null;
        client = null;
    }

    function initCanvas() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.max(600, Math.floor(rect.width * dpr));
        canvas.height = Math.max(220, Math.floor(rect.height * dpr));
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
    }

    function onPointerDown(e: PointerEvent) {
        if (!canvas) return;
        e.preventDefault();
        try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch (_) {}
        isDrawing = true;
        hasDrawn = true;
        lastPos = getPointerPos(e, canvas);
    }

    function onPointerMove(e: PointerEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const currentPos = getPointerPos(e, canvas);
        const ctx = canvas.getContext("2d");
        if (ctx) drawStroke(ctx, lastPos, currentPos, "#4f46e5", 4);
        lastPos = currentPos;
    }

    function onPointerUp(e: PointerEvent) {
        if (!isDrawing) return;
        try { (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId); } catch (_) {}
        isDrawing = false;
    }

    function clearPad() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
        uploadedFile = null;
    }

    function handleFileUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            uploadedFile = input.files[0];
            hasDrawn = true;
        }
    }

    async function handleSave() {
        if (!contact?.id) {
            toastStore.warning("Kein verknüpfter Kontakt gefunden.");
            return;
        }
        isSaving = true;
        try {
            const fd = new FormData();
            if (signatureMode === "draw" && canvas && hasDrawn) {
                const blob: Blob | null = await new Promise((res) => canvas!.toBlob(res, "image/png"));
                if (!blob) throw new Error("Unterschrift konnte nicht gelesen werden.");
                fd.append("sign", blob, `sign_${Date.now()}.png`);
            } else if (signatureMode === "upload" && uploadedFile) {
                fd.append("sign", uploadedFile);
            } else {
                toastStore.warning("Bitte zuerst unterschreiben oder eine Datei auswählen.");
                isSaving = false;
                return;
            }

            const updatedContact = await pb.collection("contacts").update(contact.id, fd);

            if (orgaStore.contacts?.data) {
                orgaStore.contacts.data = orgaStore.contacts.data.map((c: any) =>
                    c.id === updatedContact.id ? { ...c, ...updatedContact } : c
                );
            }
            if (orgaStore.clients) await orgaStore.clients.init();
            toastStore.success(`Unterschrift für ${contactName} im Kontakt hinterlegt ✓`);
            close();
        } catch (err: any) {
            toastStore.error("Fehler beim Speichern: " + (err.message || "Unbekannt"));
        } finally {
            isSaving = false;
        }
    }

    async function handleDeleteExisting() {
        if (!contact?.id) return;
        const updatedContact = await pb.collection("contacts").update(contact.id, { sign: null });
        if (orgaStore.contacts?.data) {
            orgaStore.contacts.data = orgaStore.contacts.data.map((c: any) =>
                c.id === updatedContact.id ? { ...c, ...updatedContact } : c
            );
        }
        existingSignUrl = "";
        clearPad();
        toastStore.info("Hinterlegte Unterschrift wurde entfernt.");
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs w-full max-w-lg mx-auto my-auto rounded-3xl shadow-2xl border-none outline-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    {#if contact}
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 animate-enter shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
                <h3 class="font-black text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
                    <PenTool class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>{roleTitle}</span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Wird direkt im Kontakt <strong>{contactName}</strong> gespeichert</p>
            </div>
            <button type="button" aria-label="Schließen" onclick={close} class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer">
                <X class="w-5 h-5" />
            </button>
        </div>

        {#if existingSignUrl && !hasDrawn}
            <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400">Aktuell hinterlegte Unterschrift:</p>
                <img src={existingSignUrl} alt="Hinterlegte Unterschrift" class="max-h-20 mx-auto object-contain bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700" />
                <div class="flex items-center justify-center gap-2 pt-1">
                    <button type="button" onclick={() => { existingSignUrl = ""; }} class="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer">Neu zeichnen</button>
                    <button type="button" onclick={handleDeleteExisting} class="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold cursor-pointer">Löschen</button>
                </div>
            </div>
        {:else}
            <div class="flex items-center justify-between">
                <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button type="button" onclick={() => (signatureMode = "draw")} class="px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer {signatureMode === 'draw' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500'}">Zeichnen</button>
                    <button type="button" onclick={() => (signatureMode = "upload")} class="px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer {signatureMode === 'upload' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500'}">Hochladen</button>
                </div>
                {#if signatureMode === "draw"}
                    <button type="button" onclick={clearPad} class="text-xs font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer">
                        <Trash2 class="w-3.5 h-3.5" /> Leeren
                    </button>
                {/if}
            </div>

            {#if signatureMode === "draw"}
                <div class="relative w-full aspect-5/2 bg-white dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-inner touch-none">
                    <canvas bind:this={canvas} onpointerdown={onPointerDown} onpointermove={onPointerMove} onpointerup={onPointerUp} class="w-full h-full cursor-crosshair touch-none"></canvas>
                    {#if !hasDrawn}
                        <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm font-semibold select-none">
                            Hier mit dem Finger oder der Maus unterschreiben
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                    <Upload class="w-8 h-8 text-indigo-500 mx-auto" />
                    <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Unterschrift als Bilddatei (PNG / JPEG) hochladen</p>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onchange={handleFileUpload} class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:font-bold cursor-pointer" />
                </div>
            {/if}
        {/if}

        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button type="button" onclick={close} class="orga-button-ghost py-2 text-xs" disabled={isSaving}>Abbrechen</button>
            <button type="button" onclick={handleSave} disabled={isSaving || (!hasDrawn && !existingSignUrl)} class="orga-button-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-violet-600/20">
                <Check class="w-4 h-4" />
                <span>{isSaving ? "Wird gespeichert..." : "Unterschrift speichern"}</span>
            </button>
        </div>
    </div>
    {/if}
</dialog>
