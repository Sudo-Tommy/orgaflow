<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    
    let { bwa, isGodMode, currentUser } = $props<any>();
    
    let expenseDialog: HTMLDialogElement | undefined = $state();
    let expTitle = $state("");
    let expSupplier = $state("");
    let expInvoiceNr = $state("");
    let expAmount = $state<number | "">("");
    let expNetto = $state<number | "">("");
    let expTaxSum = $state<number | "">("");
    let expTaxRate = $state<number | "">("");
    let expDate = $state(new Date().toISOString().split('T')[0]);
    let expCategory = $state("Sonstiges");
    let expCompany = $state(""); 
    let expIsRecurring = $state(false);
    let expInterval = $state<'monthly' | 'quarterly' | 'yearly'>('monthly');
    let expReceiptFile = $state<File | null>(null);
    let expIsInstallment = $state(false);
    let expInstallmentCurrent = $state<number | "">("");
    let expInstallmentTotal = $state<number | "">("");
    let expInstallmentTotalAmount = $state<number | "">("");
    let isScanningReceipt = $state(false);
    let receiptFileInput: HTMLInputElement | undefined = $state();

    export function showModal() {
        expTitle = ""; expSupplier = ""; expInvoiceNr = ""; expAmount = ""; expNetto = ""; expTaxSum = ""; expTaxRate = ""; expReceiptFile = null;
        expIsInstallment = false; expInstallmentCurrent = ""; expInstallmentTotal = ""; expInstallmentTotalAmount = "";
        expIsRecurring = false; expInterval = 'monthly';
        expenseDialog?.showModal();
    }

    export function bookNextInstallment(expense: any) {
        expTitle = expense.title || ''; expSupplier = expense.supplier || ''; expInvoiceNr = ''; expAmount = expense.amount || '';
        expNetto = expense.netto || ''; expTaxSum = expense.tax_sum || ''; expTaxRate = expense.tax_rate || '';
        expDate = new Date().toISOString().split('T')[0]; expCategory = expense.category || 'Sonstiges'; expCompany = expense.company || '';
        expIsInstallment = true; expInstallmentCurrent = (parseInt(expense.installment_current) || 0) + 1;
        expInstallmentTotal = expense.installment_total_count || ''; expInstallmentTotalAmount = expense.installment_total_amount || '';
        expenseDialog?.showModal();
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
                        let width = img.width; let height = img.height;
                        if (width > height && width > 1200) { height *= 1200 / width; width = 1200; } else if (height > 1200) { width *= 1200 / height; height = 1200; }
                        canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d');
                        if (ctx) ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob((blob) => { if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' })); else resolve(file); }, 'image/jpeg', 0.85);
                    }; img.src = event.target?.result as string;
                }; reader.readAsDataURL(file);
            });
            expReceiptFile = compressedFile; 
            const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(compressedFile); });
            const res = await fetch(import.meta.env.DEV ? 'http://localhost:3000/api/emails/ai/receipt' : '/api/emails/ai/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` }, body: JSON.stringify({ imageBase64: base64, mimeType: compressedFile.type }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler bei der KI-Analyse");
            if (data.title) expTitle = data.title; if (data.supplier) expSupplier = data.supplier; if (data.amount) expAmount = parseFloat(data.amount);
            if (data.netto) expNetto = parseFloat(data.netto); if (data.tax_sum) expTaxSum = parseFloat(data.tax_sum); if (data.tax_rate) expTaxRate = parseFloat(data.tax_rate);
            if (data.invoice_nr) expInvoiceNr = data.invoice_nr; if (data.is_installment) expIsInstallment = data.is_installment; if (data.installment_current) expInstallmentCurrent = parseInt(data.installment_current);
            if (data.installment_total_count) expInstallmentTotal = parseInt(data.installment_total_count); if (data.installment_total_amount) expInstallmentTotalAmount = parseFloat(data.installment_total_amount);
            if (data.date) expDate = data.date;
            if (data.category && ["Miete / Büro", "Software / IT", "Marketing", "Fahrzeuge", "Personal", "Sonstiges"].includes(data.category)) expCategory = data.category;
            toastStore.success("Beleg erfolgreich ausgelesen!");
        } catch (err: any) { toastStore.error(err.message || "Beleg konnte nicht gelesen werden."); } finally { isScanningReceipt = false; target.value = ''; }
    }

    async function submitExpense(e: Event) {
        e.preventDefault();
        try {
            let targetCompany = isGodMode ? expCompany : (Array.isArray(currentUser?.company) ? currentUser?.company[0] : currentUser?.company);
            if (isGodMode && bwa.selectedCompanyId !== "all") targetCompany = bwa.selectedCompanyId;
            const fd = new FormData();
            fd.append('title', expTitle); fd.append('supplier', expSupplier); fd.append('invoice_nr', expInvoiceNr); fd.append('amount', expAmount.toString());
            fd.append('netto', expNetto !== "" ? expNetto.toString() : '0'); fd.append('tax_sum', expTaxSum !== "" ? expTaxSum.toString() : '0'); fd.append('tax_rate', expTaxRate !== "" ? expTaxRate.toString() : '0');
            fd.append('date', new Date(expDate).toISOString()); fd.append('category', expCategory); if (targetCompany) fd.append('company', targetCompany);
            fd.append('is_recurring', expIsRecurring.toString()); if (expIsRecurring) fd.append('interval', expInterval);
            fd.append('is_installment', expIsInstallment.toString()); if (expIsInstallment) { fd.append('installment_current', expInstallmentCurrent !== "" ? expInstallmentCurrent.toString() : '0'); fd.append('installment_total_count', expInstallmentTotal !== "" ? expInstallmentTotal.toString() : '0'); fd.append('installment_total_amount', expInstallmentTotalAmount !== "" ? expInstallmentTotalAmount.toString() : '0'); }
            if (expReceiptFile) fd.append('receipt', expReceiptFile);
            await bwa.addExpense(fd); expenseDialog?.close(); toastStore.success("Ausgabe und Beleg erfolgreich erfasst!");
        } catch (err) { alert("Fehler beim Speichern der Ausgabe."); }
    }
</script>

<dialog bind:this={expenseDialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-[96vw] max-w-xl mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === expenseDialog) expenseDialog?.close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-7 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" onclick={() => { expenseDialog?.close(); expReceiptFile = null; }} class="absolute top-4 sm:top-6 right-4 sm:right-6 w-10 h-10 min-h-[44px] min-w-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors">✕</button>
        <div class="flex items-center justify-between mb-5 pr-12">
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2"><span>🧾</span> Ausgabe erfassen</h2>
            <input type="file" accept="image/*,application/pdf" capture="environment" class="hidden" bind:this={receiptFileInput} onchange={handleReceiptScan} />
            <button type="button" onclick={() => receiptFileInput?.click()} disabled={isScanningReceipt} class="min-h-[44px] text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50">
                {#if isScanningReceipt}
                    <div class="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-700 rounded-full animate-spin"></div> Scannt...
                {:else}
                    <span>📸</span> KI-Scan
                {/if}
            </button>
        </div>
        <form onsubmit={submitExpense} class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="expSupplier" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Geschäft / Aussteller *</label>
                    <input id="expSupplier" type="text" bind:value={expSupplier} placeholder="z.B. MediaMarkt" class="orga-input-clear min-h-[44px]" required disabled={isScanningReceipt} />
                </div>
                <div>
                    <label for="expInvoiceNr" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Beleg-Nr.</label>
                    <input id="expInvoiceNr" type="text" bind:value={expInvoiceNr} placeholder="Optional" class="orga-input-clear min-h-[44px]" disabled={isScanningReceipt} />
                </div>
            </div>
            <div>
                <label for="expTitle" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Zweck der Ausgabe *</label>
                <input id="expTitle" type="text" bind:value={expTitle} placeholder="z.B. Neuer Laptop" class="orga-input-clear min-h-[44px]" required disabled={isScanningReceipt} />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="expCategory" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Kategorie</label>
                    <select id="expCategory" bind:value={expCategory} class="orga-input-clear min-h-[44px] cursor-pointer" disabled={isScanningReceipt}>
                        <option value="Miete / Büro">Miete / Büro</option>
                        <option value="Software / IT">Software / IT</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Fahrzeuge">Fahrzeuge & Tanken</option>
                        <option value="Personal">Personal / Löhne</option>
                        <option value="Sonstiges">Sonstiges</option>
                    </select>
                </div>
                <div>
                    <label for="expDate" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Belegdatum *</label>
                    <input id="expDate" type="date" bind:value={expDate} class="orga-input-clear min-h-[44px]" required disabled={isScanningReceipt} />
                </div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="sm:col-span-2">
                    <label for="expAmount" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Brutto (Gesamt) *</label>
                    <input id="expAmount" type="number" step="0.01" bind:value={expAmount} class="orga-input-clear min-h-[44px] py-2 text-sm font-bold text-indigo-700 dark:text-indigo-400" required disabled={isScanningReceipt} />
                </div>
                <div>
                    <label for="expNetto" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Netto</label>
                    <input id="expNetto" type="number" step="0.01" bind:value={expNetto} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isScanningReceipt} />
                </div>
                <div>
                    <label for="expTaxSum" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">MwSt</label>
                    <input id="expTaxSum" type="number" step="0.01" bind:value={expTaxSum} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isScanningReceipt} />
                </div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label for="expIsRecurring" class="flex items-center gap-3 cursor-pointer select-none">
                    <input id="expIsRecurring" type="checkbox" bind:checked={expIsRecurring} class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span class="text-sm font-bold text-slate-800 dark:text-slate-200">Wiederkehrende Ausgabe</span>
                </label>
                {#if expIsRecurring}
                    <div class="pt-2 border-t border-slate-200 dark:border-slate-700 animate-enter">
                        <label for="expInterval" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Intervall</label>
                        <select id="expInterval" bind:value={expInterval} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer">
                            <option value="monthly">Monatlich</option>
                            <option value="quarterly">Quartalsweise</option>
                            <option value="yearly">Jährlich</option>
                        </select>
                    </div>
                {/if}
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label for="expIsInstallment" class="flex items-center gap-3 cursor-pointer select-none">
                    <input id="expIsInstallment" type="checkbox" bind:checked={expIsInstallment} class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span class="text-sm font-bold text-slate-800 dark:text-slate-200">Ratenzahlung</span>
                </label>
                {#if expIsInstallment}
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 animate-enter">
                        <div>
                            <label for="expInstallmentCurrent" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Rate Nr.</label>
                            <input id="expInstallmentCurrent" type="number" bind:value={expInstallmentCurrent} class="orga-input-clear min-h-[44px] py-2 text-sm" placeholder="z.B. 3" />
                        </div>
                        <div>
                            <label for="expInstallmentTotal" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">von (Anzahl)</label>
                            <input id="expInstallmentTotal" type="number" bind:value={expInstallmentTotal} class="orga-input-clear min-h-[44px] py-2 text-sm" placeholder="z.B. 12" />
                        </div>
                        <div>
                            <label for="expInstallmentTotalAmount" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Gesamtsumme (€)</label>
                            <input id="expInstallmentTotalAmount" type="number" step="0.01" bind:value={expInstallmentTotalAmount} class="orga-input-clear min-h-[44px] py-2 text-sm" placeholder="z.B. 1200.00" />
                        </div>
                    </div>
                {/if}
            </div>
            {#if isGodMode && bwa.selectedCompanyId === "all"}
                <div>
                    <label for="expCompany" class="block text-xs font-bold text-rose-700 dark:text-rose-400 mb-1.5 uppercase tracking-wide">Für welche Firma? *</label>
                    <select id="expCompany" bind:value={expCompany} class="orga-input-clear min-h-[44px] border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200" required>
                        <option value="">Bitte wählen...</option>
                        {#each orgaStore.company?.data || [] as comp}
                            <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
                        {/each}
                    </select>
                </div>
            {/if}
            <div class="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button type="button" onclick={() => expenseDialog?.close()} class="orga-button-ghost min-h-[44px] py-2.5 px-6">Abbrechen</button>
                <button type="submit" class="orga-button-primary min-h-[44px] py-2.5 px-6">Speichern</button>
            </div>
        </form>
    </div>
</dialog>