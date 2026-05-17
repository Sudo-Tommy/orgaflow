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
    let type = $state<'income' | 'expense'>('expense');
    let title = $state("");
    let amount = $state<number | ''>('');
    let category = $state("");
    let date = $state(new Date().toISOString().split('T')[0]);
    let notes = $state("");
    let receiptFile = $state<File | null>(null);
    
    // Ratenzahlung
    let is_installment = $state(false);
    let installment_current = $state<number | "">("");
    let installment_total_count = $state<number | "">("");
    let installment_total_amount = $state<number | "">("");

    // KI-Scanner
    let isScanningReceipt = $state(false);
    let receiptFileInput: HTMLInputElement;

    export function open(record?: any, asNewInstallment: boolean = false) {
        if (record && !asNewInstallment) {
            editId = record.id;
            type = record.type;
            title = record.title;
            amount = record.amount;
            category = record.category || '';
            date = record.date ? record.date.substring(0, 10) : new Date().toISOString().split('T')[0];
            notes = record.notes || '';
            is_installment = record.is_installment || false;
            installment_current = record.installment_current || "";
            installment_total_count = record.installment_total_count || "";
            installment_total_amount = record.installment_total_amount || "";
        } else if (record && asNewInstallment) { // Erstelle neuen Datensatz mit vorausgefüllten Daten (für Ratenzahlung)
            editId = null;
            type = record.type || 'expense';
            title = record.title || '';
            amount = record.amount || '';
            category = record.category || '';
            date = new Date().toISOString().split('T')[0];
            notes = record.notes || '';
            is_installment = record.is_installment || false;
            installment_current = (parseInt(record.installment_current) || 0) + 1;
            installment_total_count = record.installment_total_count || "";
            installment_total_amount = record.installment_total_amount || "";
        } else {
            editId = null;
            type = 'expense';
            title = '';
            amount = '';
            category = '';
            date = new Date().toISOString().split('T')[0];
            notes = '';
            is_installment = false;
            installment_current = "";
            installment_total_count = "";
            installment_total_amount = "";
        }
        receiptFile = null;
        errorMsg = '';
        dialog?.showModal();
    }

    function close() {
        dialog?.close();
    }

    async function handleReceiptScan(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;
        
        const file = target.files[0];
        isScanningReceipt = true;
        
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

            receiptFile = compressedFile;

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
            if (data.amount) amount = parseFloat(data.amount);
            if (data.date) date = data.date;
            if (data.category) category = data.category;
            if (data.is_installment) is_installment = data.is_installment;
            if (data.installment_current) installment_current = parseInt(data.installment_current);
            if (data.installment_total_count) installment_total_count = parseInt(data.installment_total_count);
            if (data.installment_total_amount) installment_total_amount = parseFloat(data.installment_total_amount);
            
            toastStore.success("Beleg erfolgreich ausgelesen!");
        } catch (err: any) {
            toastStore.error(err.message || "Beleg konnte nicht gelesen werden.");
        } finally {
            isScanningReceipt = false;
            target.value = '';
        }
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = '';

        try {
            const formData = new FormData();
            formData.append('type', type);
            formData.append('title', title);
            formData.append('amount', amount.toString());
            formData.append('category', category);
            formData.append('date', new Date(date).toISOString());
            formData.append('notes', notes);

            formData.append('is_installment', is_installment.toString());
            if (is_installment) {
                formData.append('installment_current', installment_current !== "" ? installment_current.toString() : '0');
                formData.append('installment_total_count', installment_total_count !== "" ? installment_total_count.toString() : '0');
                formData.append('installment_total_amount', installment_total_amount !== "" ? installment_total_amount.toString() : '0');
            }

            if (receiptFile) {
                formData.append('receipt', receiptFile);
            }

            if (editId) {
                await onUpdate(editId, formData);
                toastStore.success("Buchung aktualisiert.");
            } else {
                await onSave(formData);
                toastStore.success("Buchung erfasst.");
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
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">✕</button>
        
        <div class="flex items-center justify-between mb-6 pr-12">
            <h2 class="text-2xl font-bold text-neutral-900">{editId ? 'Buchung bearbeiten' : 'Neue Buchung'}</h2>
            <input type="file" accept="image/*,application/pdf" capture="environment" class="hidden" bind:this={receiptFileInput} onchange={handleReceiptScan} />
            <button type="button" onclick={() => receiptFileInput.click()} disabled={isScanningReceipt || isLoading} class="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50">
                {#if isScanningReceipt}
                    <div class="w-3 h-3 border-2 border-indigo-200 border-t-indigo-700 rounded-full animate-spin"></div> Scannt...
                {:else}
                    <span>📸</span> KI-Scan
                {/if}
            </button>
        </div>

        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        
        <form onsubmit={handleSubmit} class="space-y-4">
            <div class="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                <button type="button" onclick={() => type = 'expense'} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {type === 'expense' ? 'bg-white shadow-sm text-rose-600' : 'text-neutral-500 hover:text-neutral-700'}" disabled={isScanningReceipt || isLoading}>Ausgabe</button>
                <button type="button" onclick={() => type = 'income'} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {type === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}" disabled={isScanningReceipt || isLoading}>Einnahme</button>
            </div>

            <div><label for="trans-title" class="block text-sm font-semibold text-neutral-700 mb-1.5">Titel *</label><input id="trans-title" type="text" bind:value={title} placeholder="z.B. Einkauf bei Aldi" class="orga-input-clear" required disabled={isScanningReceipt || isLoading} /></div>
            
            <div class="grid grid-cols-2 gap-4">
                <div><label for="trans-amount" class="block text-sm font-semibold text-neutral-700 mb-1.5">Betrag (€) *</label><input id="trans-amount" type="number" step="0.01" bind:value={amount} class="orga-input-clear" required disabled={isScanningReceipt || isLoading} /></div>
                <div><label for="trans-date" class="block text-sm font-semibold text-neutral-700 mb-1.5">Datum *</label><input id="trans-date" type="date" bind:value={date} class="orga-input-clear" required disabled={isScanningReceipt || isLoading} /></div>
            </div>

            <div class="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" bind:checked={is_installment} class="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" disabled={isScanningReceipt || isLoading} />
                    <span class="text-sm font-semibold text-neutral-800">Ratenzahlung</span>
                </label>
                {#if is_installment}
                    <div class="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200 animate-enter">
                        <div><label for="trans-rate-nr" class="block text-xs font-semibold text-neutral-700 mb-1">Rate Nr.</label><input id="trans-rate-nr" type="number" bind:value={installment_current} class="orga-input-clear py-2 text-sm" placeholder="z.B. 3" disabled={isScanningReceipt || isLoading} /></div>
                        <div><label for="trans-rate-tot" class="block text-xs font-semibold text-neutral-700 mb-1">von (Gesamt)</label><input id="trans-rate-tot" type="number" bind:value={installment_total_count} class="orga-input-clear py-2 text-sm" placeholder="z.B. 12" disabled={isScanningReceipt || isLoading} /></div>
                    </div>
                    <div class="pt-2 border-t border-neutral-200 animate-enter">
                        <label for="trans-rate-total-amount" class="block text-xs font-semibold text-neutral-700 mb-1">Gesamtsumme der Anschaffung (€)</label>
                        <input id="trans-rate-total-amount" type="number" step="0.01" bind:value={installment_total_amount} class="orga-input-clear py-2 text-sm" placeholder="z.B. 1200.00" disabled={isScanningReceipt || isLoading} />
                    </div>
                {/if}
            </div>

            <div><label for="trans-category" class="block text-sm font-semibold text-neutral-700 mb-1.5">Kategorie</label><input id="trans-category" type="text" bind:value={category} placeholder="z.B. Lebensmittel, Wohnen" class="orga-input-clear" disabled={isScanningReceipt || isLoading} /></div>
            <div><label for="trans-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Notizen</label><textarea id="trans-notes" bind:value={notes} rows="2" class="orga-input-clear resize-y" disabled={isScanningReceipt || isLoading}></textarea></div>
            
            {#if !isScanningReceipt}
                <div>
                    <label for="trans-receipt" class="block text-sm font-semibold text-neutral-700 mb-1.5">Beleg (optional)</label>
                    <div class="flex items-center gap-2">
                        <input id="trans-receipt" type="file" accept="image/*,application/pdf" onchange={(e) => { const tgt = e.target as HTMLInputElement; receiptFile = tgt.files ? tgt.files[0] : null; }} class="w-full text-sm text-neutral-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" disabled={isLoading} />
                        {#if receiptFile}
                            <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 shrink-0">Ausgewählt</span>
                        {/if}
                    </div>
                </div>
            {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 px-6" disabled={isLoading || isScanningReceipt}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 px-6" disabled={isScanningReceipt || isLoading}>{isLoading ? 'Speichert...' : 'Speichern'}</button>
            </div>
        </form>
    </div>
</dialog>
