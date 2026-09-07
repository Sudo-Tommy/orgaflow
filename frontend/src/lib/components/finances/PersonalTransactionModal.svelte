<script lang="ts">
    import { toastStore } from '$lib/services/toastService.svelte';
    import { pb } from '$lib/services/pocketbase';
  import { confirmStore } from '$lib/services/confirmService.svelte';

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

    // GoBD Status & Storno
    let status = $state<'gebucht' | 'storniert' | 'ausstehend'>('gebucht');
    let is_storno = $state(false);
    let storno_reason = $state("");

    let initialDataHash = $state("");

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
            status = record.status || 'gebucht';
            is_storno = record.is_storno || (record.status === 'storniert');
            storno_reason = record.storno_reason || '';
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
            status = 'gebucht';
            is_storno = false;
            storno_reason = '';
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
            status = 'gebucht';
            is_storno = false;
            storno_reason = '';
        }
        receiptFile = null;
        errorMsg = '';
        initialDataHash = JSON.stringify({ type, title, amount, category, date, notes, is_installment, installment_current, installment_total_count, installment_total_amount, status, is_storno, storno_reason });
        dialog?.showModal();
    }

    function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        if (JSON.stringify({ type, title, amount, category, date, notes, is_installment, installment_current, installment_total_count, installment_total_amount }) !== initialDataHash) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
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
        if (isLoading) return; // Double-Submission Lock

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

            formData.append('status', is_storno ? 'storniert' : status);
            formData.append('is_storno', is_storno.toString());
            formData.append('storno_reason', is_storno ? storno_reason : '');

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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-[calc(100%-1.5rem)] sm:w-full max-w-md mx-auto my-auto rounded-2xl sm:rounded-3xl shadow-2xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-200/80 dark:border-slate-800">
        <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer">✕</button>
        
        <div class="flex items-center justify-between mb-5 sm:mb-6 pr-10 sm:pr-12">
            <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{editId ? 'Buchung bearbeiten' : 'Neue Buchung'}</h2>
            <input type="file" accept="image/*,application/pdf" capture="environment" class="hidden" bind:this={receiptFileInput} onchange={handleReceiptScan} />
            <button type="button" onclick={() => receiptFileInput.click()} disabled={isScanningReceipt || isLoading} class="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 min-h-[36px] cursor-pointer">
                {#if isScanningReceipt}
                    <div class="w-3 h-3 border-2 border-indigo-200 border-t-indigo-700 rounded-full animate-spin"></div> Scannt...
                {:else}
                    <span>✨</span> KI-Scan
                {/if}
            </button>
        </div>

        {#if errorMsg}<div class="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 text-sm font-medium border border-rose-100 dark:border-rose-900/60">{errorMsg}</div>{/if}
        
        <form onsubmit={handleSubmit} class="space-y-4">
            <div class="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button type="button" onclick={() => type = 'expense'} class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors min-h-[40px] cursor-pointer {type === 'expense' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}" disabled={isScanningReceipt || isLoading}>Ausgabe</button>
                <button type="button" onclick={() => type = 'income'} class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors min-h-[40px] cursor-pointer {type === 'income' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}" disabled={isScanningReceipt || isLoading}>Einnahme</button>
            </div>

            <div><label for="trans-title" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Titel *</label><input id="trans-title" type="text" bind:value={title} placeholder="z.B. Einkauf bei Aldi" class="orga-input-clear min-h-[42px]" required disabled={isScanningReceipt || isLoading} /></div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><label for="trans-amount" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Betrag (€) *</label><input id="trans-amount" type="number" step="0.01" bind:value={amount} class="orga-input-clear min-h-[42px]" required disabled={isScanningReceipt || isLoading} /></div>
                <div><label for="trans-date" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Datum *</label><input id="trans-date" type="date" bind:value={date} class="orga-input-clear min-h-[42px]" required disabled={isScanningReceipt || isLoading} /></div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label class="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" bind:checked={is_installment} class="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500" disabled={isScanningReceipt || isLoading} />
                    <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Ratenzahlung</span>
                </label>
                {#if is_installment}
                    <div class="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200 animate-enter">
                        <div><label for="trans-rate-nr" class="block text-xs font-semibold text-neutral-700 mb-1">Rate Nr.</label><input id="trans-rate-nr" type="number" bind:value={installment_current} class="orga-input-clear py-2 text-sm min-h-[38px]" placeholder="z.B. 3" disabled={isScanningReceipt || isLoading} /></div>
                        <div><label for="trans-rate-tot" class="block text-xs font-semibold text-neutral-700 mb-1">von (Gesamt)</label><input id="trans-rate-tot" type="number" bind:value={installment_total_count} class="orga-input-clear py-2 text-sm min-h-[38px]" placeholder="z.B. 12" disabled={isScanningReceipt || isLoading} /></div>
                    </div>
                    <div class="pt-2 border-t border-neutral-200 animate-enter">
                        <label for="trans-rate-total-amount" class="block text-xs font-semibold text-neutral-700 mb-1">Gesamtsumme der Anschaffung (€)</label>
                        <input id="trans-rate-total-amount" type="number" step="0.01" bind:value={installment_total_amount} class="orga-input-clear py-2 text-sm min-h-[38px]" placeholder="z.B. 1200.00" disabled={isScanningReceipt || isLoading} />
                    </div>
                {/if}
            </div>

            <div><label for="trans-category" class="block text-sm font-semibold text-neutral-700 mb-1.5">Kategorie</label><input id="trans-category" type="text" bind:value={category} placeholder="z.B. Lebensmittel, Wohnen" class="orga-input-clear min-h-[42px]" disabled={isScanningReceipt || isLoading} /></div>
            <div><label for="trans-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Notizen</label><textarea id="trans-notes" bind:value={notes} rows="2" class="orga-input-clear resize-y" disabled={isScanningReceipt || isLoading}></textarea></div>
            
            <!-- GoBD Storno Option -->
            <div class="bg-neutral-50 p-3.5 sm:p-4 rounded-xl border border-neutral-200 space-y-3">
                <label class="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" bind:checked={is_storno} class="w-4 h-4 text-rose-600 rounded border-neutral-300 focus:ring-rose-500" disabled={isScanningReceipt || isLoading} />
                    <div class="flex-1">
                        <span class="text-sm font-semibold text-neutral-800">GoBD-Storno</span>
                        <span class="text-[11px] text-neutral-500 block">Buchung stornieren (wird rechnerisch neutralisiert)</span>
                    </div>
                </label>
                {#if is_storno}
                    <div class="pt-2 border-t border-neutral-200 animate-enter">
                        <label for="trans-storno-reason" class="block text-xs font-semibold text-neutral-700 mb-1">Stornobegründung *</label>
                        <input id="trans-storno-reason" type="text" bind:value={storno_reason} placeholder="z.B. Fehlbuchung / Duplikat" class="orga-input-clear py-2 text-sm min-h-[38px]" required={is_storno} disabled={isScanningReceipt || isLoading} />
                    </div>
                {/if}
            </div>

            {#if !isScanningReceipt}
                <div>
                    <label for="trans-receipt" class="block text-sm font-semibold text-neutral-700 mb-1.5">Beleg (optional)</label>
                    <div class="flex items-center gap-2">
                        <input id="trans-receipt" type="file" accept="image/*,application/pdf" onchange={(e) => { const tgt = e.target as HTMLInputElement; receiptFile = tgt.files ? tgt.files[0] : null; }} class="w-full text-sm text-neutral-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 min-h-[40px]" disabled={isLoading} />
                        {#if receiptFile}
                            <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 shrink-0">Ausgewählt</span>
                        {/if}
                    </div>
                </div>
            {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-2.5 sm:py-3 px-6 min-h-[44px] flex items-center justify-center font-medium" disabled={isLoading || isScanningReceipt}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-2.5 sm:py-3 px-6 min-h-[44px] flex items-center justify-center font-bold" disabled={isScanningReceipt || isLoading}>{isLoading ? 'Speichert...' : 'Speichern'}</button>
            </div>
        </form>
    </div>
</dialog>
