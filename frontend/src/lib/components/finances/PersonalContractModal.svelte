<script lang="ts">
    import { toastStore } from '$lib/services/toastService.svelte';
    import { pb } from '$lib/services/pocketbase';

    let { onSave, onUpdate } = $props<{
        onSave: (payload: FormData) => Promise<void>;
        onUpdate: (id: string, payload: FormData) => Promise<void>;
    }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let title = $state("");
    let partner = $state("");
    let amount = $state<number | ''>('');
    let interval = $state<'monthly' | 'quarterly' | 'yearly'>('monthly');
    let next_due_date = $state("");
    let notes = $state("");
    let documentFile = $state<File | null>(null);

    // KI-Scanner
    let isScanningDoc = $state(false);
    let docFileInput: HTMLInputElement;

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            title = record.title;
            partner = record.partner || '';
            amount = record.amount;
            interval = record.interval;
            next_due_date = record.next_due_date ? record.next_due_date.substring(0, 10) : '';
            notes = record.notes || '';
        } else {
            editId = null;
            title = '';
            partner = '';
            amount = '';
            interval = 'monthly';
            next_due_date = '';
            notes = '';
        }
        documentFile = null;
        errorMsg = '';
        dialog?.showModal();
    }

    function close() {
        dialog?.close();
    }

    async function handleDocScan(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;
        
        const file = target.files[0];
        isScanningDoc = true;
        
        try {
            const compressedFile = await new Promise<File>((resolve) => {
                if (!file.type.startsWith('image/')) return resolve(file);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 1200;
                        let width = img.width; let height = img.height;
                        if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } 
                        else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob((blob) => {
                            if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
                            else resolve(file);
                        }, 'image/jpeg', 0.85);
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
            });

            documentFile = compressedFile;

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(compressedFile);
            });

            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${microserviceUrl}/api/emails/ai/receipt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
                body: JSON.stringify({ imageBase64: base64, mimeType: compressedFile.type })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler bei der KI-Analyse");
            
            if (data.title) title = data.title;
            if (data.supplier) partner = data.supplier;
            if (data.amount) amount = parseFloat(data.amount);
            if (data.date) next_due_date = data.date;
            
            toastStore.success("Vertrag erfolgreich ausgelesen!");
        } catch (err: any) {
            toastStore.error(err.message || "Vertrag konnte nicht gelesen werden.");
        } finally {
            isScanningDoc = false;
            target.value = '';
        }
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = '';

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('partner', partner);
            formData.append('amount', amount.toString());
            formData.append('interval', interval);
            if (next_due_date) formData.append('next_due_date', new Date(next_due_date).toISOString());
            formData.append('notes', notes);
            if (documentFile) {
                formData.append('document', documentFile);
            }

            if (editId) {
                await onUpdate(editId, formData);
                toastStore.success("Vertrag aktualisiert.");
            } else {
                await onSave(formData);
                toastStore.success("Vertrag erfasst.");
            }
            close();
        } catch (err: any) {
            errorMsg = err.message || "Fehler beim Speichern.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-md mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors z-10">✕</button>
        
        <div class="flex items-center justify-between mb-6 pr-12">
            <h2 class="text-2xl font-bold text-neutral-900">{editId ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}</h2>
            <input type="file" accept="image/*,application/pdf" capture="environment" class="hidden" bind:this={docFileInput} onchange={handleDocScan} />
            <button type="button" onclick={() => docFileInput.click()} disabled={isScanningDoc || isLoading} class="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0">
                {#if isScanningDoc}
                    <div class="w-3 h-3 border-2 border-indigo-200 border-t-indigo-700 rounded-full animate-spin"></div> Scannt...
                {:else}
                    <span>📸</span> KI-Scan
                {/if}
            </button>
        </div>

        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        
        <form onsubmit={handleSubmit} class="space-y-4">
            <div><label for="contract-title" class="block text-sm font-semibold text-neutral-700 mb-1.5">Titel *</label><input id="contract-title" type="text" bind:value={title} placeholder="z.B. Miete, Handyvertrag" class="orga-input-clear" required disabled={isScanningDoc || isLoading} /></div>
            <div><label for="contract-partner" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vertragspartner</label><input id="contract-partner" type="text" bind:value={partner} placeholder="z.B. Vodafone, Vermieter GmbH" class="orga-input-clear" disabled={isScanningDoc || isLoading} /></div>
            
            <div class="grid grid-cols-2 gap-4">
                <div><label for="contract-amount" class="block text-sm font-semibold text-neutral-700 mb-1.5">Betrag (€) *</label><input id="contract-amount" type="number" step="0.01" bind:value={amount} class="orga-input-clear" required disabled={isScanningDoc || isLoading} /></div>
                <div><label for="contract-interval" class="block text-sm font-semibold text-neutral-700 mb-1.5">Intervall *</label>
                    <select id="contract-interval" bind:value={interval} class="orga-input-clear cursor-pointer" disabled={isScanningDoc || isLoading}>
                        <option value="monthly">Monatlich</option>
                        <option value="quarterly">Quartalsweise</option>
                        <option value="yearly">Jährlich</option>
                    </select>
                </div>
            </div>
            
            <div><label for="contract-next-date" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nächste Fälligkeit</label><input id="contract-next-date" type="date" bind:value={next_due_date} class="orga-input-clear" disabled={isScanningDoc || isLoading} /></div>
            <div><label for="contract-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Notizen</label><textarea id="contract-notes" bind:value={notes} rows="2" class="orga-input-clear resize-y" disabled={isScanningDoc || isLoading}></textarea></div>
            
            {#if !isScanningDoc}
                <div>
                    <label for="contract-doc" class="block text-sm font-semibold text-neutral-700 mb-1.5">Dokument (PDF, Bild)</label>
                    <div class="flex items-center gap-2">
                        <input id="contract-doc" type="file" accept="image/*,application/pdf" onchange={(e) => { const tgt = e.target as HTMLInputElement; documentFile = tgt.files ? tgt.files[0] : null; }} class="w-full text-sm text-neutral-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" disabled={isLoading} />
                        {#if documentFile}
                            <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 shrink-0">Ausgewählt</span>
                        {/if}
                    </div>
                </div>
            {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 px-6" disabled={isScanningDoc || isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 px-6" disabled={isScanningDoc || isLoading}>{isLoading ? 'Speichert...' : 'Speichern'}</button>
            </div>
        </form>
    </div>
</dialog>