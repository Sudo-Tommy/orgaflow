<script lang="ts">
    import { useBwaService } from "$lib/services/bwaService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    const bwa = useBwaService();
    let activeTab = $state<'bwa' | 'clients' | 'team' | 'expenses' | 'forecast'>('bwa');
    
    let currentUser = $state(pb.authStore.record || pb.authStore.model);
    let isGodMode = $derived(pb.authStore.isSuperuser || currentUser?.role === 'superadmin');

    // Automatischer Datenabruf bei Änderung von Jahr oder Firma
    $effect(() => {
        bwa.loadExpenses();
    });

    // Expense Modal States
    // svelte-ignore non_reactive_update
    let expenseDialog: HTMLDialogElement;
    let expTitle = $state("");
    let expSupplier = $state("");
    let expInvoiceNr = $state("");
    let expAmount = $state<number | "">("");
    let expNetto = $state<number | "">("");
    let expTaxSum = $state<number | "">("");
    let expTaxRate = $state<number | "">("");
    let expDate = $state(new Date().toISOString().split('T')[0]);
    let expCategory = $state("Sonstiges");
    let expCompany = $state(""); // Für GodMode
    let expIsRecurring = $state(false);
    let expInterval = $state<'monthly' | 'quarterly' | 'yearly'>('monthly');
    let expReceiptFile = $state<File | null>(null);
    let expIsInstallment = $state(false);
    let expInstallmentCurrent = $state<number | "">("");
    let expInstallmentTotal = $state<number | "">("");
    let expInstallmentTotalAmount = $state<number | "">("");

    let isScanningReceipt = $state(false);
    // svelte-ignore non_reactive_update
    let receiptFileInput: HTMLInputElement;

    async function handleReceiptScan(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;
        
        const file = target.files[0];
        isScanningReceipt = true;
        
        try {
            // Bild verkleinern, um Server-Limits (Payload Too Large) und lange Ladezeiten zu umgehen
            const compressedFile = await new Promise<File>((resolve) => {
                if (!file.type.startsWith('image/')) return resolve(file);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 1200; // Reicht völlig für KI-Texterkennung
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

            expReceiptFile = compressedFile; // Wir hängen die leichte Version an die Datenbank

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
            
            if (data.title) expTitle = data.title;
            if (data.supplier) expSupplier = data.supplier;
            if (data.amount) expAmount = parseFloat(data.amount);
            if (data.netto) expNetto = parseFloat(data.netto);
            if (data.tax_sum) expTaxSum = parseFloat(data.tax_sum);
            if (data.tax_rate) expTaxRate = parseFloat(data.tax_rate);
            if (data.invoice_nr) expInvoiceNr = data.invoice_nr;
            if (data.is_installment) expIsInstallment = data.is_installment;
            if (data.installment_current) expInstallmentCurrent = parseInt(data.installment_current);
            if (data.installment_total_count) expInstallmentTotal = parseInt(data.installment_total_count);
            if (data.installment_total_amount) expInstallmentTotalAmount = parseFloat(data.installment_total_amount);
            if (data.date) expDate = data.date;
            if (data.category) {
                const valid = ["Miete / Büro", "Software / IT", "Marketing", "Fahrzeuge", "Personal", "Sonstiges"];
                if (valid.includes(data.category)) expCategory = data.category;
            }
            toastStore.success("Beleg erfolgreich ausgelesen!");
        } catch (err: any) {
            toastStore.error(err.message || "Beleg konnte nicht gelesen werden.");
        } finally {
            isScanningReceipt = false;
            target.value = '';
        }
    }

    function bookNextInstallment(expense: any) {
        // Setzt alle Felder zurück und füllt nur die Raten-Daten für die NEUE Buchung aus
        expTitle = expense.title || '';
        expSupplier = expense.supplier || '';
        expInvoiceNr = '';
        expAmount = expense.amount || '';
        expNetto = expense.netto || '';
        expTaxSum = expense.tax_sum || '';
        expTaxRate = expense.tax_rate || '';
        expDate = new Date().toISOString().split('T')[0];
        expCategory = expense.category || 'Sonstiges';
        expCompany = expense.company || '';
        expIsInstallment = true; // Wichtig: Direkt auf true setzen
        expInstallmentCurrent = (parseInt(expense.installment_current) || 0) + 1;
        expInstallmentTotal = expense.installment_total_count || '';
        expInstallmentTotalAmount = expense.installment_total_amount || '';
        expenseDialog?.showModal();
    }

    async function submitExpense(e: Event) {
        e.preventDefault();
        try {
            let targetCompany = isGodMode ? expCompany : (Array.isArray(currentUser?.company) ? currentUser?.company[0] : currentUser?.company);
            if (isGodMode && bwa.selectedCompanyId !== "all") targetCompany = bwa.selectedCompanyId;
            
            const formData = new FormData();
            formData.append('title', expTitle);
            formData.append('supplier', expSupplier);
            formData.append('invoice_nr', expInvoiceNr);
            formData.append('amount', expAmount.toString());
            formData.append('netto', expNetto !== "" ? expNetto.toString() : '0');
            formData.append('tax_sum', expTaxSum !== "" ? expTaxSum.toString() : '0');
            formData.append('tax_rate', expTaxRate !== "" ? expTaxRate.toString() : '0');
            formData.append('date', new Date(expDate).toISOString());
            formData.append('category', expCategory);
            if (targetCompany) formData.append('company', targetCompany);

            formData.append('is_recurring', expIsRecurring.toString());
            if (expIsRecurring) {
                formData.append('interval', expInterval);
            }
            
            formData.append('is_installment', expIsInstallment.toString());
            if (expIsInstallment) {
                formData.append('installment_current', expInstallmentCurrent !== "" ? expInstallmentCurrent.toString() : '0');
                formData.append('installment_total_count', expInstallmentTotal !== "" ? expInstallmentTotal.toString() : '0');
                formData.append('installment_total_amount', expInstallmentTotalAmount !== "" ? expInstallmentTotalAmount.toString() : '0');
            }

            if (expReceiptFile) formData.append('receipt', expReceiptFile);
            
            await bwa.addExpense(formData);
            
            expTitle = ""; expSupplier = ""; expInvoiceNr = ""; expAmount = ""; expNetto = ""; expTaxSum = ""; expTaxRate = ""; expReceiptFile = null;
            expIsInstallment = false; expInstallmentCurrent = ""; expInstallmentTotal = ""; expInstallmentTotalAmount = "";
            expIsRecurring = false; expInterval = 'monthly';
            expenseDialog.close();
            toastStore.success("Ausgabe und Beleg erfolgreich erfasst!");
        } catch (err) { alert("Fehler beim Speichern der Ausgabe."); }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">BWA & Statistik</h1>
        <p class="orga-page-subtitle">Ihre betriebswirtschaftliche Auswertung, Umsätze und Leistungszahlen.</p>
    </div>
    <div class="flex flex-col sm:flex-row items-center gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
        {#if isGodMode}
            <select bind:value={bwa.selectedCompanyId} class="orga-input-clear py-3 sm:py-2.5 w-full sm:w-auto cursor-pointer font-bold text-indigo-700 bg-indigo-50/50 border-indigo-200">
                <option value="all">🏢 Alle Firmen</option>
                {#each orgaStore.company?.data || [] as comp}
                    <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
                {/each}
            </select>
        {/if}
        <div class="flex items-center gap-3 w-full sm:w-auto">
            <label for="year-select" class="text-sm font-semibold text-neutral-600 shrink-0">Geschäftsjahr:</label>
            <select id="year-select" bind:value={bwa.selectedYear} class="orga-input-clear py-3 sm:py-2.5 w-full sm:w-32 cursor-pointer font-bold text-neutral-900 bg-white">
                {#each bwa.availableYears as year}
                    <option value={year}>{year}</option>
                {/each}
            </select>
        </div>
    </div>
</div>

{#if orgaStore.invoices?.isLoading || orgaStore.appointments?.isLoading}
    <div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
{:else}
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-enter delay-100">
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner shrink-0">💶</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Umsatz (Netto)</p>
                <p class="text-2xl font-black text-indigo-950">{bwa.stats.totals.revenue.toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl shadow-inner shrink-0">📉</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Gesamtausgaben</p>
                <p class="text-2xl font-black text-rose-900">{(bwa.stats.totals.appExpenses + bwa.stats.totals.compExpenses).toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner shrink-0">📈</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Gewinn (Ertrag)</p>
                <p class="text-2xl font-black text-emerald-700">{bwa.stats.totals.profit.toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shadow-inner shrink-0">⏱️</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Leistungsstunden</p>
                <p class="text-2xl font-black text-neutral-900">{bwa.stats.totals.hours.toFixed(1).replace('.', ',')} h <span class="text-xs font-medium text-neutral-400 ml-1">in {bwa.stats.totals.appointments} Terminen</span></p>
            </div>
        </div>
    </div>

    <!-- Reiter / Tabs -->
    <div class="flex overflow-x-auto custom-scrollbar bg-neutral-100 p-1 sm:p-1.5 rounded-xl border border-neutral-200 shadow-inner w-full mb-6">
        <button onclick={() => activeTab='bwa'} class="shrink-0 whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-colors {activeTab === 'bwa' ? 'bg-white shadow-sm text-indigo-700' : 'text-neutral-500 hover:text-neutral-700'}">📊 BWA & Übersicht</button>
        <button onclick={() => activeTab='clients'} class="shrink-0 whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-colors {activeTab === 'clients' ? 'bg-white shadow-sm text-indigo-700' : 'text-neutral-500 hover:text-neutral-700'}">🏆 Klienten-Ranking</button>
        <button onclick={() => activeTab='team'} class="shrink-0 whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-colors {activeTab === 'team' ? 'bg-white shadow-sm text-indigo-700' : 'text-neutral-500 hover:text-neutral-700'}">👥 Team-Performance</button>
        <button onclick={() => activeTab='expenses'} class="shrink-0 whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-colors {activeTab === 'expenses' ? 'bg-white shadow-sm text-indigo-700' : 'text-neutral-500 hover:text-neutral-700'}">🧾 Betriebsausgaben</button>
        <button onclick={() => activeTab='forecast'} class="shrink-0 whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-colors {activeTab === 'forecast' ? 'bg-white shadow-sm text-indigo-700' : 'text-neutral-500 hover:text-neutral-700'}">🔮 Prognose</button>
    </div>

    <div class="orga-card-white overflow-hidden animate-enter">
        <!-- TAB 1: BWA -->
        {#if activeTab === 'bwa'}
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-200">
                    <thead class="bg-neutral-50/80 border-b border-neutral-200">
                        <tr>
                            <th class="p-4 font-bold text-neutral-800">Monat</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Umsatz (Netto)</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Spesen (Termine)</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Betriebsausgaben</th>
                            <th class="p-4 font-bold text-emerald-700 text-right bg-emerald-50/30">Gewinn</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-50">
                        {#each bwa.stats.monthly as m}
                            <tr class="hover:bg-neutral-50/50 transition-colors">
                                <td class="p-4 font-semibold text-neutral-900">{m.month}</td>
                                <td class="p-4 text-indigo-600 font-medium text-right">{m.revenue ? m.revenue.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                                <td class="p-4 text-rose-500 font-medium text-right">{m.appExpenses ? m.appExpenses.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                                <td class="p-4 text-rose-500 font-medium text-right">{m.compExpenses ? m.compExpenses.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                                <td class="p-4 {m.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'} font-bold text-right bg-emerald-50/10">{m.profit !== 0 ? m.profit.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                            </tr>
                        {/each}
                        <tr class="bg-neutral-50 border-t-2 border-neutral-200">
                            <td class="p-4 font-black text-neutral-900">Jahres-Summe</td>
                            <td class="p-4 font-black text-indigo-700 text-right">{bwa.stats.totals.revenue.toFixed(2).replace('.', ',')} €</td>
                            <td class="p-4 font-black text-rose-600 text-right">{bwa.stats.totals.appExpenses.toFixed(2).replace('.', ',')} €</td>
                            <td class="p-4 font-black text-rose-600 text-right">{bwa.stats.totals.compExpenses.toFixed(2).replace('.', ',')} €</td>
                            <td class="p-4 font-black {bwa.stats.totals.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'} text-right bg-emerald-50/30 text-lg">{bwa.stats.totals.profit.toFixed(2).replace('.', ',')} €</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        <!-- TAB 2: Klienten-Ranking -->
        {:else if activeTab === 'clients'}
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-150">
                    <thead class="bg-neutral-50/80 border-b border-neutral-200">
                        <tr>
                            <th class="p-4 font-bold text-neutral-800 w-16">Platz</th>
                            <th class="p-4 font-bold text-neutral-800">Klient</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Termine</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Betreuungszeit</th>
                            <th class="p-4 font-bold text-indigo-700 text-right">Umsatz generiert</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-50">
                        {#each bwa.stats.clientStats as c, i}
                            <tr class="hover:bg-neutral-50/50 transition-colors">
                                <td class="p-4 font-black text-neutral-400">#{i + 1}</td>
                                <td class="p-4 font-bold text-neutral-900">{c.name}</td>
                                <td class="p-4 text-neutral-600 text-right font-medium">{c.appts}</td>
                                <td class="p-4 text-neutral-600 text-right font-medium">{c.hours.toFixed(1).replace('.', ',')} h</td>
                                <td class="p-4 text-indigo-600 font-bold text-right">{c.revenue.toFixed(2).replace('.', ',')} €</td>
                            </tr>
                        {/each}
                        {#if bwa.stats.clientStats.length === 0}
                            <tr><td colspan="5" class="p-10 text-center text-neutral-400 italic">Keine abgerechneten Klienten in diesem Zeitraum.</td></tr>
                        {/if}
                    </tbody>
                </table>
            </div>

        <!-- TAB 3: Team-Performance -->
        {:else if activeTab === 'team'}
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-150">
                    <thead class="bg-neutral-50/80 border-b border-neutral-200">
                        <tr>
                            <th class="p-4 font-bold text-neutral-800">Mitarbeiter</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Termine absolviert</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Geleistete Stunden</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Gefahrene Strecke</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-50">
                        {#each bwa.stats.userStats as u}
                            <tr class="hover:bg-neutral-50/50 transition-colors">
                                <td class="p-4 font-bold text-neutral-900 flex items-center gap-3"><span class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0">{u.name.charAt(0)}</span> {u.name}</td>
                                <td class="p-4 text-neutral-600 text-right font-medium">{u.appts}</td>
                                <td class="p-4 text-emerald-600 text-right font-bold">{u.hours.toFixed(1).replace('.', ',')} h</td>
                                <td class="p-4 text-neutral-600 text-right font-medium">{u.km.toFixed(1).replace('.', ',')} km</td>
                            </tr>
                        {/each}
                        {#if bwa.stats.userStats.length === 0}
                            <tr><td colspan="4" class="p-10 text-center text-neutral-400 italic">Keine Termine im gewählten Zeitraum.</td></tr>
                        {/if}
                    </tbody>
                </table>
            </div>
            
        <!-- TAB 4: Betriebsausgaben -->
        {:else if activeTab === 'expenses'}
            <div class="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h3 class="font-bold text-neutral-900">Erfasste Betriebsausgaben</h3>
                <button onclick={() => expenseDialog?.showModal()} class="orga-button-primary py-2 px-4 text-xs shadow-indigo-600/20">+ Ausgabe erfassen</button>
            </div>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-150">
                    <thead class="bg-neutral-50/80 border-b border-neutral-200">
                        <tr>
                            <th class="p-4 font-bold text-neutral-800">Datum</th>
                            <th class="p-4 font-bold text-neutral-800">Kategorie</th>
                            <th class="p-4 font-bold text-neutral-800">Geschäft / Zweck</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Betrag (Brutto)</th>
                            <th class="p-4 font-bold text-neutral-800 text-center">Beleg</th>
                            <th class="p-4 font-bold text-neutral-800 text-right w-16"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-50">
                        {#each bwa.companyExpenses as exp}
                            <tr class="hover:bg-neutral-50/50 transition-colors group">
                                <td class="p-4 text-neutral-600">{new Date(exp.date).toLocaleDateString('de-DE')}</td>
                                <td class="p-4"><span class="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-lg">{exp.category}</span></td>
                                <td class="p-4">
                                    <p class="font-bold text-neutral-900">{exp.supplier || 'Unbekannt'}</p>
                                    <p class="text-xs text-neutral-500 truncate max-w-48">{exp.title}</p>
                                </td>
                                <td class="p-4 text-right">
                                    <p class="text-rose-600 font-bold">{exp.amount.toFixed(2).replace('.', ',')} €</p>
                                    {#if exp.is_installment && exp.installment_current > 0}
                                        <p class="text-[10px] text-neutral-400 font-medium mt-0.5">
                                            Rate {exp.installment_current} / {exp.installment_total_count}
                                            {#if exp.installment_total_amount > 0}
                                                (Gesamt: {exp.installment_total_amount.toFixed(2).replace('.',',')} €)
                                            {/if}
                                        </p>
                                    {:else if exp.tax_sum}
                                        <p class="text-[10px] text-neutral-400 font-medium mt-0.5">inkl. {exp.tax_sum.toFixed(2).replace('.', ',')} € MwSt</p>
                                    {/if}
                                </td>
                                <td class="p-4 text-center">
                                    {#if exp.receipt}
                                        <a href={pb.files.getURL(exp, exp.receipt)} target="_blank" class="p-2 text-xl hover:scale-110 transition-transform inline-block" title="Beleg ansehen">🧾</a>
                                    {:else}
                                        <span class="text-neutral-300">-</span>
                                    {/if}
                                </td>
                                <td class="p-4 text-right">
                                    {#if exp.is_installment && exp.installment_current < exp.installment_total_count}
                                        <button onclick={() => bookNextInstallment(exp)} class="px-2.5 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors shadow-sm opacity-100 xl:opacity-0 group-hover:opacity-100 mr-2" title="Nächste Rate buchen">💰 Zahlen</button>
                                    {/if}
                                    <button onclick={async () => { if(await confirmStore.ask("Ausgabe löschen?")) bwa.deleteExpense(exp.id); }} class="p-2 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors opacity-100 xl:opacity-0 group-hover:opacity-100 inline-block">✕</button>
                                </td>
                            </tr>
                        {/each}
                        {#if bwa.companyExpenses.length === 0}
                            <tr><td colspan="5" class="p-10 text-center text-neutral-400 italic">Keine Betriebsausgaben in diesem Zeitraum erfasst.</td></tr>
                        {/if}
                    </tbody>
                </table>
            </div>
        
        <!-- TAB 5: Prognose -->
        {:else if activeTab === 'forecast'}
            <div class="p-4 border-b border-neutral-100 bg-neutral-50/50">
                <h3 class="font-bold text-neutral-900">Finanzprognose (Nächste 12 Monate)</h3>
                <p class="text-xs text-neutral-500 mt-1">Basiert auf den erfassten, wiederkehrenden Betriebsausgaben.</p>
            </div>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-150">
                    <thead class="bg-neutral-50/80 border-b border-neutral-200">
                        <tr>
                            <th class="p-4 font-bold text-neutral-800">Monat</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Progn. Umsatz</th>
                            <th class="p-4 font-bold text-neutral-800 text-right">Progn. Ausgaben</th>
                            <th class="p-4 font-bold text-emerald-700 text-right bg-emerald-50/30">Progn. Gewinn</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-50">
                        {#each bwa.forecastStats as m}
                            <tr class="hover:bg-neutral-50/50 transition-colors">
                                <td class="p-4 font-semibold text-neutral-900">{m.month}</td>
                                <td class="p-4 text-indigo-600 font-medium text-right">{m.revenue > 0 ? m.revenue.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                                <td class="p-4 text-rose-500 font-medium text-right">{m.expenses > 0 ? m.expenses.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                                <td class="p-4 {m.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'} font-bold text-right bg-emerald-50/10">{m.profit !== 0 ? m.profit.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>

    <!-- Neues Modal für die Ausgabenerfassung -->
    <dialog bind:this={expenseDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === expenseDialog) expenseDialog.close(); }}>
        <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
            <button aria-label="Schließen" onclick={() => { expenseDialog.close(); expReceiptFile = null; }} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">✕</button>
            <div class="flex items-center justify-between mb-6 pr-12">
                <h2 class="text-2xl font-bold text-neutral-900">Ausgabe</h2>
                <input type="file" accept="image/*,application/pdf" capture="environment" class="hidden" bind:this={receiptFileInput} onchange={handleReceiptScan} />
                <button type="button" onclick={() => receiptFileInput.click()} disabled={isScanningReceipt} class="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50">
                    {#if isScanningReceipt}
                        <div class="w-3 h-3 border-2 border-indigo-200 border-t-indigo-700 rounded-full animate-spin"></div> Scannt...
                    {:else}
                        <span>📸</span> KI-Scan
                    {/if}
                </button>
            </div>
            
            <form onsubmit={submitExpense} class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <div><label class="block text-sm font-semibold text-neutral-700 mb-1.5">Geschäft / Aussteller *</label><input type="text" bind:value={expSupplier} placeholder="z.B. MediaMarkt" class="orga-input-clear" required disabled={isScanningReceipt} /></div>
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <div><label class="block text-sm font-semibold text-neutral-700 mb-1.5">Beleg- / Rechnungs-Nr.</label><input type="text" bind:value={expInvoiceNr} placeholder="Optional" class="orga-input-clear" disabled={isScanningReceipt} /></div>
                </div>

                <!-- svelte-ignore a11y_label_has_associated_control -->
                <div><label class="block text-sm font-semibold text-neutral-700 mb-1.5">Zweck der Ausgabe *</label><input type="text" bind:value={expTitle} placeholder="z.B. Neuer Laptop" class="orga-input-clear" required disabled={isScanningReceipt} /></div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-semibold text-neutral-700 mb-1.5">Kategorie</label>
                        <select bind:value={expCategory} class="orga-input-clear cursor-pointer" disabled={isScanningReceipt}>
                            <option value="Miete / Büro">Miete / Büro</option>
                            <option value="Software / IT">Software / IT</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Fahrzeuge">Fahrzeuge & Tanken</option>
                            <option value="Personal">Personal / Löhne</option>
                            <option value="Sonstiges">Sonstiges</option>
                        </select>
                    </div>
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <div><label class="block text-sm font-semibold text-neutral-700 mb-1.5">Belegdatum *</label><input type="date" bind:value={expDate} class="orga-input-clear" required disabled={isScanningReceipt} /></div>
                </div>

                <div class="bg-neutral-50 p-4 rounded-xl border border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <div class="sm:col-span-2"><label class="block text-xs font-semibold text-neutral-700 mb-1">Brutto (Gesamt) *</label><input type="number" step="0.01" bind:value={expAmount} class="orga-input-clear py-2 text-sm font-bold text-indigo-700" required disabled={isScanningReceipt} /></div>
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <div><label class="block text-xs font-semibold text-neutral-700 mb-1">Netto</label><input type="number" step="0.01" bind:value={expNetto} class="orga-input-clear py-2 text-sm" disabled={isScanningReceipt} /></div>
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <div><label class="block text-xs font-semibold text-neutral-700 mb-1">MwSt</label><input type="number" step="0.01" bind:value={expTaxSum} class="orga-input-clear py-2 text-sm" disabled={isScanningReceipt} /></div>
                </div>

                <div class="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" bind:checked={expIsRecurring} class="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" />
                        <span class="text-sm font-semibold text-neutral-800">Wiederkehrende Ausgabe</span>
                    </label>
                    {#if expIsRecurring}
                        <div class="pt-2 border-t border-neutral-200 animate-enter">
                            <label for="exp-interval" class="block text-xs font-semibold text-neutral-700 mb-1">Intervall</label>
                            <select id="exp-interval" bind:value={expInterval} class="orga-input-clear py-2 text-sm cursor-pointer"><option value="monthly">Monatlich</option><option value="quarterly">Quartalsweise</option><option value="yearly">Jährlich</option></select>
                        </div>
                    {/if}
                </div>

                <div class="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" bind:checked={expIsInstallment} class="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" />
                        <span class="text-sm font-semibold text-neutral-800">Ratenzahlung</span>
                    </label>
                    {#if expIsInstallment}
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-200 animate-enter">
                            <!-- svelte-ignore a11y_label_has_associated_control -->
                            <div><label class="block text-xs font-semibold text-neutral-700 mb-1">Rate Nr.</label><input type="number" bind:value={expInstallmentCurrent} class="orga-input-clear py-2 text-sm" placeholder="z.B. 3" /></div>
                            <!-- svelte-ignore a11y_label_has_associated_control -->
                            <div><label class="block text-xs font-semibold text-neutral-700 mb-1">von (Anzahl)</label><input type="number" bind:value={expInstallmentTotal} class="orga-input-clear py-2 text-sm" placeholder="z.B. 12" /></div>
                            <!-- svelte-ignore a11y_label_has_associated_control -->
                            <div><label class="block text-xs font-semibold text-neutral-700 mb-1">Gesamtsumme (€)</label><input type="number" step="0.01" bind:value={expInstallmentTotalAmount} class="orga-input-clear py-2 text-sm" placeholder="z.B. 1200.00" /></div>
                        </div>
                    {/if}
                </div>
                {#if isGodMode && bwa.selectedCompanyId === "all"}
                    <div>
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label class="block text-sm font-semibold text-rose-700 mb-1.5">Für welche Firma? *</label>
                        <select bind:value={expCompany} class="orga-input-clear border-rose-300 bg-rose-50" required>
                            <option value="">Bitte wählen...</option>
                            {#each orgaStore.company?.data || [] as comp}<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>{/each}
                        </select>
                    </div>
                {/if}
                <div class="pt-4 flex justify-end gap-3 border-t border-neutral-100 mt-6">
                    <button type="button" onclick={() => expenseDialog.close()} class="orga-button-ghost py-3 px-6">Abbrechen</button>
                    <button type="submit" class="orga-button-primary py-3 px-6">Speichern</button>
                </div>
            </form>
        </div>
    </dialog>
{/if}