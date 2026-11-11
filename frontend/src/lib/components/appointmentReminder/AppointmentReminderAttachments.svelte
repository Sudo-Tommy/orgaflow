<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { Paperclip, X, Eye, Check } from 'lucide-svelte';

    let {
        client,
        attachments = $bindable([]),
        isSending = false,
        onPreviewDoc
    }: {
        client: any;
        attachments: File[];
        isSending: boolean;
        onPreviewDoc: (record: any, filename: string) => void;
    } = $props();

    function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files) {
            attachments = [...attachments, ...Array.from(input.files)];
        }
        input.value = '';
    }

    function removeAttachment(index: number) {
        attachments = attachments.filter((_, i) => i !== index);
    }

    async function toggleClientDocumentAttachment(record: any, filename: string) {
        if (isSending) return;
        const isCurrentlyAttached = attachments.some(a => a.name === filename);
        if (isCurrentlyAttached) {
            attachments = attachments.filter(a => a.name !== filename);
            toastStore.info(`Anhang "${filename}" entfernt.`);
        } else {
            try {
                const url = pb.files.getURL(record, filename);
                const response = await fetch(url);
                if (!response.ok) throw new Error();
                const blob = await response.blob();
                const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                attachments = [...attachments, file];
                toastStore.success(`Anhang "${filename}" hinzugefügt.`);
            } catch {
                toastStore.error("Dokument konnte nicht geladen werden.");
            }
        }
    }
</script>

<div class="pt-4 mt-2 border-t border-neutral-100">
    <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Paperclip class="w-4 h-4 text-neutral-400" /> Anhänge hinzufügen
        </h3>
        <input type="file" id="reminder-file-upload" multiple class="hidden" onchange={handleFileSelect} disabled={isSending} />
        <button type="button" onclick={() => document.getElementById('reminder-file-upload')?.click()} class="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1 bg-brand-50 px-2.5 py-1.5 rounded-lg touch-manipulation min-h-11 sm:min-h-0" disabled={isSending}>
            Datei wählen
        </button>
    </div>

    {#if client?.documents && client.documents.length > 0}
        <div class="mb-4">
            <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Aus Klienten-Akte übernehmen:</p>
            <div class="flex flex-wrap gap-2">
                {#each client.documents as docName}
                    {@const isAttached = attachments.some(a => a.name === docName)}
                    <div class="flex items-center bg-white border border-neutral-200 rounded-lg text-xs font-bold transition-all shadow-sm {isAttached ? 'border-brand-300 bg-brand-50' : ''}">
                        <button type="button" onclick={() => toggleClientDocumentAttachment(client, docName)} disabled={isSending} class="flex items-center gap-2 px-3 py-2 min-h-11 sm:min-h-0 text-neutral-600 hover:text-brand-600 transition-colors">
                            {#if isAttached}<Check class="w-3.5 h-3.5 text-brand-600" />{:else}<Paperclip class="w-3.5 h-3.5" />{/if}
                            <span class="truncate max-w-36">{docName}</span>
                        </button>
                        <button type="button" onclick={() => onPreviewDoc(client, docName)} class="px-2.5 py-2 min-h-11 sm:min-h-0 text-neutral-400 hover:text-neutral-600 transition-colors border-l border-neutral-100" title="Vorschau">
                            <Eye class="w-3.5 h-3.5" />
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    {#if attachments.length > 0}
        <div class="flex flex-wrap gap-2">
            {#each attachments as file, i}
                <div class="flex items-center justify-between gap-2 bg-neutral-50 text-neutral-700 px-3 py-1.5 rounded-lg text-xs border border-neutral-200 shadow-sm max-w-full">
                    <span class="truncate flex-1 font-bold">{file.name}</span>
                    <button type="button" onclick={() => removeAttachment(i)} class="shrink-0 text-neutral-400 hover:text-rose-600 transition-colors p-1" disabled={isSending}><X class="w-3.5 h-3.5" /></button>
                </div>
            {/each}
        </div>
    {/if}
</div>
