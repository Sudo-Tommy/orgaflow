<script lang="ts">
    import { FileUp, UserCheck, Receipt, FileSpreadsheet, X } from 'lucide-svelte';
    import { shareImportService } from '$lib/services/shareImportService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { pb } from '$lib/services/pocketbase';
    import { uploadClientDocuments } from '$lib/components/clients/clientDocumentService';
    import { toastStore } from '$lib/services/toastService.svelte';

    let mode = $state<'choose' | 'client' | 'expense'>('choose');
    let selectedClientId = $state('');
    let expenseTitle = $state('');
    let expenseAmount = $state('');
    let isSaving = $state(false);

    let files = $derived(shareImportService.pendingFiles);
    let isOpen = $derived(files.length > 0);

    let sortedClients = $derived(
        [...(orgaStore.clients?.data || [])].sort((a: any, b: any) => {
            const labelA = `${a.name_last || ''} ${a.name_first || ''}`.trim();
            const labelB = `${b.name_last || ''} ${b.name_first || ''}`.trim();
            return labelA.localeCompare(labelB, 'de', { sensitivity: 'base' });
        })
    );

    async function saveToClient() {
        if (!selectedClientId || files.length === 0) {
            toastStore.warning('Bitte wählen Sie einen Klienten aus.');
            return;
        }
        isSaving = true;
        try {
            const client = orgaStore.clients?.getById(selectedClientId);
            const currentDocs = Array.isArray(client?.documents) ? client.documents : [];
            await uploadClientDocuments(selectedClientId, files, currentDocs);
            toastStore.success(`${files.length} Datei(en) in der Klienten-Akte gespeichert.`);
            await resetAndClose();
        } catch (e: any) {
            toastStore.error(e?.message || 'Speichern beim Klienten fehlgeschlagen.');
        } finally {
            isSaving = false;
        }
    }

    async function saveAsExpense(asAccounting: boolean) {
        if (files.length === 0) return;
        isSaving = true;
        try {
            const user: any = pb.authStore.record || pb.authStore.model;
            const company = Array.isArray(user?.company) ? user.company[0] : user?.company;
            const amountNum = parseFloat(String(expenseAmount).replace(',', '.')) || 0;
            const title = expenseTitle.trim() || files[0].name.replace(/\.[^/.]+$/, '');

            if (asAccounting) {
                const fd = new FormData();
                fd.append('title', title);
                fd.append('transaction_type', 'expense');
                fd.append('amount_gross', String(amountNum));
                fd.append('transaction_date', new Date().toISOString());
                fd.append('status', 'open');
                if (user?.id) fd.append('createdby', user.id);
                files.forEach((f) => fd.append('receipt_file', f, f.name));
                await pb.collection('accounting').create(fd);
                toastStore.success('Eingangsrechnung in der Buchhaltung abgelegt.');
            } else {
                const fd = new FormData();
                fd.append('title', title);
                fd.append('supplier', 'Beleg-Import');
                fd.append('amount', String(amountNum));
                fd.append('date', new Date().toISOString());
                fd.append('category', 'Sonstiges');
                if (company) fd.append('company', company);
                fd.append('receipt', files[0], files[0].name);
                await pb.collection('company_expenses').create(fd);
                toastStore.success('Beleg als Ausgabe gespeichert.');
            }
            await resetAndClose();
        } catch (e: any) {
            toastStore.error(e?.message || 'Beleg konnte nicht gespeichert werden.');
        } finally {
            isSaving = false;
        }
    }

    async function resetAndClose() {
        mode = 'choose';
        selectedClientId = '';
        expenseTitle = '';
        expenseAmount = '';
        await shareImportService.clearAll();
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 z-[9995] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" data-modal-open="true" role="dialog">
        <div class="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                    <span class="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                        <FileUp class="w-5 h-5" />
                    </span>
                    <div>
                        <h3 class="text-lg font-bold leading-tight">Datei empfangen</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[230px]">
                            {files.length === 1 ? files[0].name : `${files.length} Dateien ausgewählt`}
                        </p>
                    </div>
                </div>
                <button type="button" onclick={resetAndClose} aria-label="Abbrechen" class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer">
                    <X class="w-5 h-5" />
                </button>
            </div>

            {#if mode === 'choose'}
                <div class="flex flex-col gap-2.5">
                    <button type="button" onclick={() => mode = 'client'} class="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-violet-50 dark:hover:bg-violet-950/40 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-left transition-all cursor-pointer">
                        <UserCheck class="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                        <div>
                            <span class="text-sm font-bold block">In Klienten-Akte ablegen</span>
                            <span class="text-xs text-slate-500 dark:text-slate-400">Direkt zu einem Klienten speichern</span>
                        </div>
                    </button>

                    <button type="button" onclick={() => { expenseTitle = files[0]?.name.replace(/\.[^/.]+$/, '') || ''; mode = 'expense'; }} class="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-left transition-all cursor-pointer">
                        <Receipt class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                            <span class="text-sm font-bold block">Als Beleg oder Eingangsrechnung</span>
                            <span class="text-xs text-slate-500 dark:text-slate-400">Für Ausgaben oder Buchhaltung übernehmen</span>
                        </div>
                    </button>
                </div>
            {:else if mode === 'client'}
                <div class="space-y-4">
                    <div>
                        <label for="share-client-select" class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Klient auswählen</label>
                        <select id="share-client-select" bind:value={selectedClientId} class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold">
                            <option value="">Bitte Klient wählen...</option>
                            {#each sortedClients as c}
                                <option value={c.id}>{c.name_last || ''}, {c.name_first || ''}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="flex gap-2">
                        <button type="button" onclick={() => mode = 'choose'} class="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold cursor-pointer">Zurück</button>
                        <button type="button" onclick={saveToClient} disabled={isSaving || !selectedClientId} class="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">
                            {isSaving ? 'Speichert...' : 'Speichern'}
                        </button>
                    </div>
                </div>
            {:else if mode === 'expense'}
                <div class="space-y-3">
                    <input type="text" bind:value={expenseTitle} placeholder="Bezeichnung (z. B. Tankbeleg)" class="orga-input-clear w-full py-2.5 px-3 text-sm dark:bg-slate-800 dark:border-slate-700" />
                    <input type="text" inputmode="decimal" bind:value={expenseAmount} placeholder="Betrag in Euro (optional, z. B. 24,90)" class="orga-input-clear w-full py-2.5 px-3 text-sm dark:bg-slate-800 dark:border-slate-700" />
                    <div class="flex flex-col gap-2 pt-1">
                        <button type="button" onclick={() => saveAsExpense(false)} disabled={isSaving} class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                            <Receipt class="w-4 h-4" /> Als Ausgabe (BWA) speichern
                        </button>
                        <button type="button" onclick={() => saveAsExpense(true)} disabled={isSaving} class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                            <FileSpreadsheet class="w-4 h-4" /> Als Eingangsrechnung ablegen
                        </button>
                        <button type="button" onclick={() => mode = 'choose'} class="w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 cursor-pointer">Zurück</button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}
