<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { usePersonalFinanceService } from "$lib/services/personalFinanceService.svelte";
    import PersonalTransactionModal from "$lib/components/finances/PersonalTransactionModal.svelte";
    import PersonalContractModal from "$lib/components/finances/PersonalContractModal.svelte";
    import PersonalMonthDetailModal from "$lib/components/finances/PersonalMonthDetailModal.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { goto } from "$app/navigation";
    import { reconcileUserInvoicesAndAccounting } from "$lib/services/invoiceAccountingService";
    import BudgetOverview from "$lib/components/budget/BudgetOverview.svelte";

    const financeService = usePersonalFinanceService();
    const isSuperadmin = $derived(rbacService.isOwner);

    $effect(() => {
        if (!rbacService.canAccessFinances) {
            toastStore.warning("Keine Berechtigung für Finanzdaten.");
            goto('/dashboard');
        }
    });

    let activeTab = $state<'modern' | 'classic'>('modern');
    let users = $state<any[]>([]);
    let selectedUserId = $state(financeService.activeUserId);
    let transactionsTileSize = $state(33.33);
    let contractsTileSize = $state(33.33);
    let showAllTransactions = $state(false);
    let transactionDisplayMode = $state<'grid' | 'table'>('grid');
    let forecastScenario = $state<'realistic' | 'optimistic' | 'pessimistic'>('realistic');

    let transactionModal: PersonalTransactionModal;
    let contractModal: PersonalContractModal;
    let isMonthModalOpen = $state(false);
    let selectedMonthForModal = $state<any>(null);
    let isSyncingInvoices = $state(false);

    async function handleSyncInvoices() {
        isSyncingInvoices = true;
        toastStore.info("Prüfe und synchronisiere Rechnungen & Einnahmen...");
        try {
            const stats = await reconcileUserInvoicesAndAccounting(selectedUserId || financeService.activeUserId);
            await financeService.loadData();
            
            if (stats.created === 0 && stats.updated === 0) {
                toastStore.success(`Alle ${stats.total} Rechnungen sind bereits vollständig mit dem Haushaltsbuch abgestimmt.`);
            } else {
                toastStore.success(`Abstimmung fertig: ${stats.created} neue Einnahmen verbucht, ${stats.updated} aktualisiert.`);
            }
        } catch (err: any) {
            console.error("Fehler bei Rechnungs-Synchronisation:", err);
            toastStore.error("Fehler beim Abgleich der Rechnungen mit dem Haushaltsbuch.");
        } finally {
            isSyncingInvoices = false;
        }
    }

    async function handleStorno(transaction: any) {
        if (await confirmStore.ask(
            `Möchten Sie die Buchung "${transaction.title}" (${formatCurrency(Number(transaction.amount) || 0)}) wirklich GoBD-konform stornieren?`,
            "Buchung stornieren?",
            "Ja, stornieren",
            "Abbrechen",
            true
        )) {
            await financeService.stornoTransaction(transaction.id, "Manuelle Stornierung im Haushaltsbuch");
        }
    }

    let isScanningInvoice = $state(false);
    let invoiceFileInput = $state<HTMLInputElement>();

    async function handleScanAndBookInvoice(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;

        const file = target.files[0];
        isScanningInvoice = true;
        toastStore.info("Analysiere Rechnung / Beleg mit KI...");

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

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(compressedFile);
            });

            const isLocal = typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            const microserviceUrl = isLocal ? `http://${window.location.hostname}:3000` : '';
            const res = await fetch(`${microserviceUrl}/api/emails/ai/receipt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
                body: JSON.stringify({ imageBase64: base64, mimeType: compressedFile.type })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler bei der Dokumentenanalyse");

            const prefillRecord = {
                type: 'expense',
                title: data.title ? (data.supplier ? `${data.supplier}: ${data.title}` : data.title) : (data.supplier || 'Rechnungsbuchung'),
                amount: data.amount ? parseFloat(data.amount) : '',
                category: data.category || 'Miete / Büro',
                date: data.date || new Date().toISOString().split('T')[0],
                notes: `Automatisch per Beleg-Scan erfasst.\nAussteller: ${data.supplier || '-'}\nRechnungs-Nr.: ${data.invoice_nr || '-'}\nNetto: ${data.netto || '-'} € | MwSt: ${data.tax_sum || '-'} € (${data.tax_rate || '-'}%)`,
                is_installment: !!data.is_installment,
                installment_current: data.installment_current || '',
                installment_total_count: data.installment_total_count || '',
                installment_total_amount: data.installment_total_amount ? parseFloat(data.installment_total_amount) : '',
                status: 'gebucht'
            };

            transactionModal?.open(prefillRecord);
            toastStore.success(`Rechnungsdaten erkannt (${formatCurrency(Number(prefillRecord.amount) || 0)})! Bitte kurz prüfen & speichern.`);
        } catch (err: any) {
            console.error("Rechnungs-Scan fehlgeschlagen:", err);
            toastStore.error(err.message || "Rechnung konnte nicht automatisch ausgelesen werden.");
            transactionModal?.open();
        } finally {
            isScanningInvoice = false;
            target.value = '';
        }
    }

    onMount(async () => {
        if (isSuperadmin) {
            try {
                users = await pb
                    .collection("users")
                    .getFullList({ sort: "username" });
            } catch (e) {
                console.error("Konnte Nutzerliste nicht laden", e);
            }
        }
        financeService.loadData();
    });

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    function formatBarAmount(val: number): string {
        const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
        const absVal = Math.abs(val);
        if (absVal >= 10000) {
            return sign + (absVal / 1000).toFixed(1).replace('.', ',') + 'k';
        } else if (absVal >= 1000) {
            return sign + (absVal / 1000).toFixed(1).replace('.', ',') + 'k';
        } else {
            return (val > 0 ? '+' : '') + Math.round(val) + ' €';
        }
    }

    let periodLabel = $derived.by(() => {
        if (financeService.viewMode === 'monthly') {
            const d = new Date(financeService.selectedYear, financeService.selectedMonth - 1, 1);
            return `${d.toLocaleString('de-DE', { month: 'long' })} ${financeService.selectedYear}`;
        } else if (financeService.viewMode === 'quarterly') {
            return `Q${financeService.selectedQuarter} ${financeService.selectedYear}`;
        } else {
            return `Gesamtjahr ${financeService.selectedYear}`;
        }
    });

    // Filter- und Sortier-Zustände
    let transactionTypeFilter = $state<'all' | 'income' | 'expense' | 'invoice' | 'contract'>('all');
    let transactionSearchQuery = $state('');
    let transactionSortBy = $state<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

    let baseTransactions = $derived.by(() => {
        if (showAllTransactions) return financeService.transactions;
        return financeService.periodStats.transactions;
    });

    let displayedTransactions = $derived.by(() => {
        let list = [...baseTransactions];

        // 1. Typ-Filter
        if (transactionTypeFilter === 'income') {
            list = list.filter(t => t.type === 'income');
        } else if (transactionTypeFilter === 'expense') {
            list = list.filter(t => t.type === 'expense');
        } else if (transactionTypeFilter === 'invoice') {
            list = list.filter(t => t.source === 'accounting' || t.is_invoice || (t.category && t.category.toLowerCase().includes('rechnung')));
        } else if (transactionTypeFilter === 'contract') {
            list = list.filter(t => (t.category && t.category.toLowerCase().includes('vertrag')) || (t.title && t.title.toLowerCase().includes('vertrag:')));
        }

        // 2. Volltextsuche
        if (transactionSearchQuery.trim()) {
            const q = transactionSearchQuery.toLowerCase().trim();
            list = list.filter(t => 
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.category && t.category.toLowerCase().includes(q)) ||
                (t.notes && t.notes.toLowerCase().includes(q)) ||
                String(t.amount || '').includes(q)
            );
        }

        // 3. Sortierung
        list.sort((a, b) => {
            if (transactionSortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (transactionSortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (transactionSortBy === 'amount_desc') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
            if (transactionSortBy === 'amount_asc') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
            return 0;
        });

        return list;
    });

    function exportTransactionsCsv() {
        if (displayedTransactions.length === 0) {
            toastStore.info("Keine Buchungen zum Exportieren vorhanden.");
            return;
        }

        const headers = ["Datum", "Typ", "Titel", "Kategorie", "Betrag (€)", "Netto (€)", "Steuersatz (%)", "Quelle", "Status", "Notizen"];
        const rows = displayedTransactions.map(t => [
            t.date ? new Date(t.date).toLocaleDateString("de-DE") : '',
            t.type === 'income' ? 'Einnahme' : 'Ausgabe',
            `"${(t.title || '').replace(/"/g, '""')}"`,
            `"${(t.category || '').replace(/"/g, '""')}"`,
            (Number(t.amount) || 0).toFixed(2).replace('.', ','),
            (Number(t.amount_net) || Number(t.amount) || 0).toFixed(2).replace('.', ','),
            t.tax_rate ? `${t.tax_rate}%` : '0%',
            t.source === 'accounting' ? 'Buchhaltung / Rechnung' : 'Privat',
            t.status || 'Gebucht',
            `"${(t.notes || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Haushaltsbuch_${periodLabel.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toastStore.success("CSV-Export erfolgreich heruntergeladen.");
    }

    let maxBalanceVal = $derived(Math.max(financeService.periodStats.income, financeService.periodStats.expense) || 1);

    function openMonthModal(monthItem: any) {
        selectedMonthForModal = monthItem;
        isMonthModalOpen = true;
    }

    function openCurrentMonthModal() {
        const currentMonthIdx = financeService.selectedMonth - 1;
        const currentM = financeService.monthlyBreakdown[currentMonthIdx] || {
            monthName: periodLabel,
            year: financeService.selectedYear,
            income: financeService.periodStats.income,
            expense: financeService.periodStats.expense,
            contractExpenses: financeService.periodStats.contractExpenses,
            variableExpenses: financeService.periodStats.variableExpenses,
            transactions: financeService.periodStats.transactions,
            isHistorical: true
        };
        openMonthModal(currentM);
    }

    async function bookContractManually(c: any) {
        const formData = new FormData();
        formData.append("title", `Vertrag: ${c.title}`);
        formData.append("amount", c.amount.toString());
        formData.append("type", c.type || "expense");
        formData.append("category", "Vertrag");
        formData.append("date", new Date().toISOString());

        await financeService.addTransaction(formData);
        toastStore.success(
            `Buchung für '${c.title}' wurde erfolgreich erfasst!`,
        );
    }

    async function handleDeleteTransaction(id: string) {
        if (
            await confirmStore.ask(
                "Möchtest du diese Buchung wirklich löschen?",
                "Löschen bestätigen",
                "Löschen",
                "Abbrechen",
                true,
            )
        ) {
            await financeService.deleteTransaction(id);
        }
    }

    async function handleDeleteContract(id: string) {
        if (
            await confirmStore.ask(
                "Möchtest du diesen Vertrag wirklich löschen?",
                "Löschen bestätigen",
                "Löschen",
                "Abbrechen",
                true,
            )
        ) {
            await financeService.deleteContract(id);
        }
    }

    function bookNextInstallment(transaction: any) {
        transactionModal?.open(transaction, true);
    }
</script>

<div class="orga-page-header animate-enter">
    <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4"
    >
        <div>
            <h1 class="orga-page-title text-2xl sm:text-3xl">Mein Haushaltsbuch</h1>
            <p class="orga-page-subtitle text-xs sm:text-sm">
                Ihre persönliche Übersicht über Einnahmen, Ausgaben und Verträge.
            </p>
        </div>
        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <!-- Button: Rechnungen & Einnahmen synchronisieren / abstimmen -->
            <button
                type="button"
                disabled={isSyncingInvoices}
                onclick={handleSyncInvoices}
                class="orga-button-ghost bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 py-2 px-3.5 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 touch-manipulation active:scale-95 disabled:opacity-60 cursor-pointer"
                title="Prüft alle Rechnungen dieses Benutzers, gleicht bezahlte Rechnungen mit dem Haushaltsbuch ab und synchronisiert fehlende Einnahmen"
            >
                {#if isSyncingInvoices}
                    <span class="inline-block animate-spin">🔄</span>
                    <span>Synchronisiere...</span>
                {:else}
                    <span>🔄</span>
                    <span>Rechnungen synchronisieren</span>
                {/if}
            </button>

            {#if isSuperadmin && users.length > 0}
                <div
                    class="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-neutral-200 w-full sm:w-auto"
                >
                    <label
                        for="user-select"
                        class="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1 shrink-0"
                        >Nutzer:</label
                    >
                    <select
                        id="user-select"
                        bind:value={selectedUserId}
                        onchange={(e) => financeService.setUserId(e.currentTarget.value)}
                        class="orga-input py-1.5 text-sm bg-neutral-50 border-none w-full sm:w-48 font-semibold text-neutral-800 cursor-pointer"
                    >
                        {#each users as u}
                            <option value={u.id}
                                >{u.name_first}
                                {u.name_last} ({u.username})</option
                            >
                        {/each}
                    </select>
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Ansichts-Umschaltung: Modernes Card-UI vs Klassische Tabellen & BWA -->
<div class="my-4 flex items-center justify-between border-b border-neutral-200 dark:border-slate-800 pb-3">
    <div class="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-2xl bg-neutral-100 p-1 dark:bg-slate-800 shadow-2xs gap-1">
        <button
            type="button"
            onclick={() => activeTab = 'modern'}
            class="min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer {activeTab === 'modern' ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400' : 'text-neutral-600 hover:text-neutral-900 dark:text-slate-400'}"
        >
            <span>✨</span>
            <span class="hidden sm:inline">Modernes Haushaltsbuch (Card UI)</span>
            <span class="sm:hidden">Modern (Cards)</span>
        </button>
        <button
            type="button"
            onclick={() => activeTab = 'classic'}
            class="min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer {activeTab === 'classic' ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400' : 'text-neutral-600 hover:text-neutral-900 dark:text-slate-400'}"
        >
            <span>📊</span>
            <span class="hidden sm:inline">Klassische Tabellen & Prognose</span>
            <span class="sm:hidden">Klassisch (BWA)</span>
        </button>
    </div>
</div>

{#if activeTab === 'modern'}
    <BudgetOverview 
        userId={selectedUserId || financeService.activeUserId}
        bind:selectedYear={financeService.selectedYear}
        bind:selectedMonth={financeService.selectedMonth}
    />
{:else}
    {#if financeService.isLoading}
        <div class="flex justify-center py-20">
            <div
                class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"
            ></div>
        </div>
    {:else if financeService.error}
    <div
        class="bg-red-50 text-red-700 p-4 sm:p-6 rounded-2xl border border-red-200 font-semibold"
    >
        <h3 class="font-bold text-base sm:text-lg mb-2">Datenbank-Fehler</h3>
        <p class="text-sm">{financeService.error}</p>
        <p class="mt-2 text-xs sm:text-sm">
            Bitte stellen Sie sicher, dass die Tabellen korrekt in PocketBase
            angelegt wurden und die API-Regeln gesetzt sind.
        </p>
    </div>
{:else}
    <!-- Top KPI Cards (Responsiv auf Periode abgestimmt) -->
    <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-100"
    >
        <!-- Einnahmen -->
        <div class="orga-card-white p-4 sm:p-5 flex items-center gap-4 group hover:shadow-md transition-all active:scale-[0.98] touch-manipulation">
            <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0"
            >
                📈
            </div>
            <div class="min-w-0 flex-1">
                <p
                    class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5 truncate"
                >
                    Einnahmen ({financeService.viewMode === 'monthly' ? new Date(2000, financeService.selectedMonth - 1, 1).toLocaleString('de-DE', { month: 'short' }) : (financeService.viewMode === 'quarterly' ? `Q${financeService.selectedQuarter}` : 'Jahr')})
                </p>
                <p class="text-xl sm:text-2xl font-black text-emerald-700 truncate">
                    {formatCurrency(financeService.periodStats.income)}
                </p>
                <div class="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-medium">
                    <span class="text-emerald-700 font-bold">📄 {formatCurrency(financeService.periodStats.invoiceIncome)}</span>
                    <span class="text-neutral-300">|</span>
                    <span class="text-neutral-600">👤 {formatCurrency(financeService.periodStats.personalIncome)}</span>
                </div>
            </div>
        </div>

        <!-- Ausgaben -->
        <div class="orga-card-white p-4 sm:p-5 flex items-center gap-4 group hover:shadow-md transition-all active:scale-[0.98] touch-manipulation">
            <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0"
            >
                📉
            </div>
            <div class="min-w-0 flex-1">
                <p
                    class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5 truncate"
                >
                    Ausgaben ({financeService.viewMode === 'monthly' ? new Date(2000, financeService.selectedMonth - 1, 1).toLocaleString('de-DE', { month: 'short' }) : (financeService.viewMode === 'quarterly' ? `Q${financeService.selectedQuarter}` : 'Jahr')})
                </p>
                <p class="text-xl sm:text-2xl font-black text-rose-800 truncate">
                    {formatCurrency(financeService.periodStats.expense)}
                </p>
                <div class="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-medium">
                    <span class="text-amber-700 font-bold">📜 {formatCurrency(financeService.periodStats.contractExpenses)} Fix</span>
                    <span class="text-neutral-300">|</span>
                    <span class="text-rose-700 font-bold">🛒 {formatCurrency(financeService.periodStats.variableExpenses)} Var</span>
                </div>
            </div>
        </div>

        <!-- Haushalts-Saldo / Bilanz -->
        <div class="orga-card-white p-4 sm:p-5 flex items-center gap-4 group hover:shadow-md transition-all active:scale-[0.98] touch-manipulation">
            <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0"
            >
                💰
            </div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 mb-0.5">
                    <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">
                        Haushalts-Saldo
                    </p>
                    {#if financeService.periodStats.income > 0}
                        <span class="text-[10px] font-black px-1.5 py-0.2 rounded {financeService.periodStats.savingsRate >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                            {financeService.periodStats.savingsRate.toFixed(0)}%
                        </span>
                    {/if}
                </div>
                <p
                    class="text-xl sm:text-2xl font-black truncate {financeService.periodStats.balance >= 0
                        ? 'text-indigo-950'
                        : 'text-rose-900'}"
                >
                    {formatCurrency(financeService.periodStats.balance)}
                </p>
                <p class="text-[11px] font-semibold text-neutral-400 mt-1 truncate">
                    {financeService.periodStats.balance >= 0 ? 'Freier Cashflow' : 'Haushaltsdefizit'}
                </p>
            </div>
        </div>

        <!-- Fixkosten -->
        <div class="orga-card-white p-4 sm:p-5 flex items-center gap-4 group hover:shadow-md transition-all active:scale-[0.98] touch-manipulation">
            <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0"
            >
                📜
            </div>
            <div class="min-w-0 flex-1">
                <p
                    class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5 truncate"
                >
                    Fixkosten (Monatlich)
                </p>
                <p class="text-xl sm:text-2xl font-black text-neutral-900 truncate">
                    {formatCurrency(financeService.periodStats.totalMonthlyContracts)}
                </p>
                <p class="text-[11px] font-semibold text-amber-700 mt-1 truncate">
                    {financeService.contracts.length} laufende Verträge
                </p>
            </div>
        </div>
    </div>

    <!-- Große Abrechnungs- & Zeitraumleiste (Über die gesamte Breite gestreckt) -->
    <div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm p-3.5 sm:p-6 mb-6 sm:mb-8 animate-enter delay-150">
        <!-- Top Row: Ansichts-Umschalter & Jahr & Monatsbericht -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-neutral-100">
            <!-- Ansichts-Modus Segmented Control -->
            <div class="flex items-center gap-1 sm:gap-1.5 bg-neutral-100/90 p-1 sm:p-1.5 rounded-2xl shadow-inner w-full md:w-auto">
                <button 
                    onclick={() => financeService.viewMode = 'monthly'} 
                    class="flex-1 md:flex-none px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center touch-manipulation active:scale-95 {financeService.viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    📅 Monatlich
                </button>
                <button 
                    onclick={() => financeService.viewMode = 'quarterly'} 
                    class="flex-1 md:flex-none px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center touch-manipulation active:scale-95 {financeService.viewMode === 'quarterly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    📊 Quartal
                </button>
                <button 
                    onclick={() => financeService.viewMode = 'yearly'} 
                    class="flex-1 md:flex-none px-2.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center touch-manipulation active:scale-95 {financeService.viewMode === 'yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    📆 Jährlich
                </button>
            </div>

            <!-- Rechts: Jahr-Auswahl & Monatsbericht öffnen -->
            <div class="flex items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
                <!-- Jahr-Steuerung -->
                <div class="flex items-center bg-neutral-50 border border-neutral-200/70 rounded-2xl p-1 shadow-sm">
                    <button 
                        onclick={() => financeService.selectedYear--} 
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-white transition-colors touch-manipulation active:scale-90"
                        title="Vorheriges Jahr"
                    >
                        ◀
                    </button>
                    <select 
                        bind:value={financeService.selectedYear} 
                        aria-label="Haushaltsjahr" 
                        class="bg-transparent text-sm sm:text-base font-black text-neutral-900 px-2 sm:px-3 outline-none cursor-pointer text-center"
                    >
                        {#each financeService.availableYears as year}
                            <option value={year}>{year}</option>
                        {/each}
                    </select>
                    <button 
                        onclick={() => financeService.selectedYear++} 
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-white transition-colors touch-manipulation active:scale-90"
                        title="Nächstes Jahr"
                    >
                        ▶
                    </button>
                </div>

                <!-- Monatsbericht öffnen Button -->
                <button 
                    onclick={openCurrentMonthModal} 
                    class="px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 touch-manipulation active:scale-95"
                    title="Detaillierten Monatsbericht öffnen"
                >
                    <span>📊</span>
                    <span>Monatsbericht</span>
                </button>
            </div>
        </div>

        <!-- Bottom Row: Detail-Auswahl für Monate bzw. Quartale -->
        <div class="pt-3 sm:pt-4">
            {#if financeService.viewMode === 'monthly'}
                <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2">
                    {#each Array.from({length: 12}) as _, i}
                        {@const mNum = i + 1}
                        {@const mName = new Date(2000, i, 1).toLocaleString('de-DE', { month: 'short' })}
                        {@const isSelected = financeService.selectedMonth === mNum}
                        <button 
                            onclick={() => financeService.selectedMonth = mNum}
                            class="min-h-[46px] flex flex-col items-center justify-center rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 touch-manipulation {isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' : 'bg-neutral-50 hover:bg-indigo-50 text-neutral-700 hover:text-indigo-600 border border-neutral-100'}"
                        >
                            <span>{mName}</span>
                            <span class="text-[9px] font-medium {isSelected ? 'text-indigo-100' : 'text-neutral-400'}">{mNum < 10 ? `0${mNum}` : mNum}</span>
                        </button>
                    {/each}
                </div>
            {:else if financeService.viewMode === 'quarterly'}
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {#each [
                        { q: 1, label: 'Q1', desc: 'Januar – März' },
                        { q: 2, label: 'Q2', desc: 'April – Juni' },
                        { q: 3, label: 'Q3', desc: 'Juli – September' },
                        { q: 4, label: 'Q4', desc: 'Oktober – Dezember' }
                    ] as qItem}
                        {@const isSelected = financeService.selectedQuarter === qItem.q}
                        <button 
                            onclick={() => financeService.selectedQuarter = qItem.q}
                            class="min-h-[52px] p-2.5 sm:p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-left transition-all active:scale-95 touch-manipulation {isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' : 'bg-neutral-50 hover:bg-indigo-50 text-neutral-700 hover:text-indigo-600 border border-neutral-100'}"
                        >
                            <span class="font-black text-sm sm:text-base">{qItem.label}</span>
                            <span class="text-[10px] sm:text-xs font-medium {isSelected ? 'text-indigo-100' : 'text-neutral-400'}">{qItem.desc}</span>
                        </button>
                    {/each}
                </div>
            {:else}
                <div class="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-center text-xs font-bold text-neutral-500">
                    Gesamtjahr {financeService.selectedYear} ausgewählt (Kumulierte Summe aller Monate)
                </div>
            {/if}
        </div>
    </div>

    <!-- Middle Grid: Haushalts-Balance & Finanzprognose (12 Spalten) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-200">
        <!-- Detaillierte Haushalts-Balance (5 Spalten) -->
        <div class="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-6 group hover:shadow-md transition-shadow justify-between">
            <div>
                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <span class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shadow-inner shrink-0">⚖️</span>
                        <div>
                            <h3 class="font-bold text-neutral-900 text-base sm:text-lg leading-tight">Haushalts-Balance</h3>
                            <p class="text-[11px] text-neutral-400 font-medium">Echtzeit-Gegenüberstellung Einnahmen vs. Ausgaben</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        {#if financeService.periodStats.income > 0}
                            {@const rate = financeService.periodStats.savingsRate}
                            <span class="px-2.5 py-1 rounded-xl text-xs font-black {rate >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}" title="Sparquote">
                                {rate >= 0 ? '+' : ''}{rate.toFixed(1)}% Sparquote
                            </span>
                        {/if}
                        <button onclick={openCurrentMonthModal} class="w-9 h-9 rounded-xl bg-neutral-50 hover:bg-indigo-50 text-neutral-400 hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0 touch-manipulation active:scale-90" title="Detaillierten Monatsbericht öffnen">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        </button>
                    </div>
                </div>

                <!-- Hero Display Saldo -->
                <div class="p-4 rounded-2xl mb-4 border {financeService.periodStats.balance >= 0 ? 'bg-emerald-50/50 border-emerald-100/80' : 'bg-rose-50/50 border-rose-100/80'} flex items-center justify-between">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider block {financeService.periodStats.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}">
                            Haushalts-Saldo {financeService.periodStats.balance >= 0 ? '(Überschuss)' : '(Defizit)'}
                        </span>
                        <span class="text-2xl sm:text-3xl font-black {financeService.periodStats.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                            {formatCurrency(financeService.periodStats.balance)}
                        </span>
                    </div>
                    <div class="text-right text-xs">
                        <span class="text-neutral-400 text-[10px] block font-medium">Gesamteinnahmen</span>
                        <span class="font-bold text-neutral-700">{formatCurrency(financeService.periodStats.income)}</span>
                    </div>
                </div>

                <!-- Einnahmen vs. Ausgaben Balken -->
                <div class="mb-4">
                    <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span class="text-emerald-600 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Einnahmen: {formatCurrency(financeService.periodStats.income)}</span>
                        <span class="text-rose-600 flex items-center gap-1.5">Ausgaben: {formatCurrency(financeService.periodStats.expense)} <span class="w-2 h-2 rounded-full bg-rose-500"></span></span>
                    </div>
                    <div class="w-full h-3.5 bg-neutral-100 rounded-full overflow-hidden flex shadow-inner">
                        <div class="h-full bg-emerald-500 transition-all duration-1000" style="width: {financeService.periodStats.income > 0 ? Math.min(100, (financeService.periodStats.income / maxBalanceVal) * 100) : 0}%" title="Einnahmen"></div>
                        <div class="h-full bg-rose-500 transition-all duration-1000" style="width: {financeService.periodStats.expense > 0 ? Math.min(100, (financeService.periodStats.expense / maxBalanceVal) * 100) : 0}%" title="Ausgaben"></div>
                    </div>
                </div>

                <!-- Detaillierte Haushaltsstruktur -->
                <div class="space-y-2.5 pt-3 border-t border-neutral-100">
                    <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Kosten- & Ausgabenstruktur (Details)</span>

                    <!-- Fixkosten & Verträge -->
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-neutral-600 font-medium flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                            Feste Verträge & Fixkosten
                        </span>
                        <div class="flex items-center gap-2">
                            <span class="text-neutral-400 text-[10px]">
                                ({financeService.periodStats.income > 0 ? ((financeService.periodStats.contractExpenses / financeService.periodStats.income) * 100).toFixed(0) : 0}%)
                            </span>
                            <span class="font-bold text-neutral-900">{formatCurrency(financeService.periodStats.contractExpenses)}</span>
                        </div>
                    </div>

                    <!-- Variable Ausgaben -->
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-neutral-600 font-medium flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                            Variable Lebenshaltung & Einkäufe
                        </span>
                        <div class="flex items-center gap-2">
                            <span class="text-neutral-400 text-[10px]">
                                ({financeService.periodStats.income > 0 ? ((financeService.periodStats.variableExpenses / financeService.periodStats.income) * 100).toFixed(0) : 0}%)
                            </span>
                            <span class="font-bold text-neutral-900">{formatCurrency(financeService.periodStats.variableExpenses)}</span>
                        </div>
                    </div>

                    <!-- Gesamtfazit Box -->
                    <div class="p-3 bg-neutral-900 text-white rounded-2xl border border-neutral-800 flex items-center justify-between text-xs mt-2">
                        <div>
                            <span class="text-[10px] font-bold text-neutral-400 block uppercase">Freier Haushaltsüberschuss</span>
                            <span class="text-base font-black {financeService.periodStats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                {formatCurrency(financeService.periodStats.balance)}
                            </span>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-bold text-neutral-400 block uppercase">Verfügbare Sparquote</span>
                            <span class="text-base font-black {financeService.periodStats.savingsRate >= 0 ? 'text-indigo-300' : 'text-rose-400'}">
                                {financeService.periodStats.savingsRate.toFixed(1).replace('.', ',')} %
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Haushalts-Finanzprognose mit Balkensystem (7 Spalten) -->
        <div class="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-6 group hover:shadow-md transition-shadow justify-between">
            <div>
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <div class="flex items-center gap-2.5 sm:gap-3">
                        <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">🔮</span>
                        <div>
                            <h3 class="font-bold text-neutral-900 text-base sm:text-lg leading-tight">Haushalts-Prognose (12M)</h3>
                            <p class="text-[11px] text-neutral-400 font-medium">Reale Monate & rollierende 12-Monats-Zukunftsprognose</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
                        <!-- Szenario-Wähler -->
                        <div class="flex bg-neutral-100 p-0.5 sm:p-1 rounded-xl border border-neutral-200/70 shadow-inner">
                            <button onclick={() => forecastScenario = 'pessimistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors touch-manipulation active:scale-95 {forecastScenario === 'pessimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Pessimistisch (-15% Einnahmen)">📉 -15%</button>
                            <button onclick={() => forecastScenario = 'realistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors touch-manipulation active:scale-95 {forecastScenario === 'realistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Realistisch">⚖️ Real</button>
                            <button onclick={() => forecastScenario = 'optimistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors touch-manipulation active:scale-95 {forecastScenario === 'optimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Optimistisch (+15% Einnahmen)">📈 +15%</button>
                        </div>
                        <button onclick={openCurrentMonthModal} class="w-9 h-9 rounded-xl bg-neutral-50 hover:bg-purple-50 text-neutral-400 hover:text-purple-600 flex items-center justify-center transition-colors shrink-0 touch-manipulation active:scale-90" title="Detaillierten Monatsbericht öffnen">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        </button>
                    </div>
                </div>

                <!-- Legende -->
                <div class="flex items-center gap-3 text-[10px] font-bold text-neutral-400 mb-2">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Ist</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Prog</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Defizit</span>
                    <span class="text-neutral-300 ml-auto hidden sm:inline text-[9px]">💡 Klick = Monatsbericht</span>
                </div>

                <!-- Balkensystem -->
                {#if financeService.timelineStats.length > 0}
                    {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
                    {@const maxVal = Math.max(...financeService.timelineStats.map((f: any) => Math.abs((f.isHistorical ? f.income : (f.income * multiplier)) - f.expenses)), 1)}
                    
                    <div class="w-full h-48 sm:h-52 flex gap-2 items-end overflow-x-auto custom-scrollbar touch-pan-x overscroll-x-contain pb-2 pt-6 flex-1 select-none">
                        {#each financeService.timelineStats as f}
                            {@const inc = f.isHistorical ? f.income : (f.income * multiplier)}
                            {@const val = inc - f.expenses}
                            {@const barHeight = Math.max(6, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)))}
                            
                            <button 
                                onclick={() => openMonthModal(f)}
                                class="flex flex-col items-center shrink-0 group/bar flex-1 min-w-[42px] sm:min-w-[48px] h-full justify-end cursor-pointer transition-transform hover:-translate-y-1 active:scale-95 touch-manipulation focus:outline-none"
                                title="{f.month}: {f.isHistorical ? 'Ist' : 'Prognose'} Saldo {formatCurrency(val)}"
                            >
                                <!-- Betrag über dem Balken -->
                                <span class="text-[9px] font-black leading-none mb-1 whitespace-nowrap {val >= 0 ? (f.isHistorical ? 'text-emerald-700' : 'text-indigo-700') : 'text-rose-600'}">
                                    {formatBarAmount(val)}
                                </span>

                                <div class="w-full h-32 sm:h-36 flex items-end justify-center relative">
                                    <div 
                                        class="w-full rounded-t-lg transition-all shadow-sm group-hover/bar:brightness-110 {val >= 0 ? (f.isHistorical ? 'bg-emerald-500' : 'bg-indigo-500') : 'bg-rose-400'}" 
                                        style="height: {barHeight}%;"
                                    ></div>
                                </div>

                                <div class="flex flex-col items-center mt-1.5 w-full">
                                    <span class="text-[10px] font-bold text-neutral-700 group-hover/bar:text-indigo-600 transition-colors truncate text-center">
                                        {f.monthShort}
                                    </span>
                                    <span class="text-[7px] font-bold uppercase px-0.5 rounded {f.isHistorical ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}">
                                        {f.isHistorical ? 'Ist' : 'Prog'}
                                    </span>
                                </div>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- Bottom Grid: Transaktionen & Verträge -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <!-- Linke Spalte: Transaktionen (7 Spalten) -->
        <div class="lg:col-span-7 orga-card-white overflow-hidden flex flex-col">
            <div
                class="p-3.5 sm:p-4 border-b border-neutral-100 flex flex-col gap-3 bg-neutral-50/50"
            >
                <!-- Row 1: Titel, Zähler, Ansichtsmodus und Aktionen -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                        <div>
                            <h3 class="font-bold text-neutral-900 text-sm sm:text-base flex items-center gap-2">
                                <span>{showAllTransactions ? 'Alle Buchungen' : `Buchungen (${periodLabel})`}</span>
                                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {displayedTransactions.length}
                                </span>
                            </h3>
                        </div>

                        <!-- Zeitraum-Filter Toggle -->
                        <button 
                            onclick={() => showAllTransactions = !showAllTransactions}
                            class="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors min-h-[34px] touch-manipulation {showAllTransactions ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}"
                        >
                            {showAllTransactions ? '📅 Nur Monat' : '🌐 Alle'}
                        </button>

                        <!-- Ansichtsmodus: Kacheln vs. Tabelle -->
                        <div class="inline-flex rounded-lg border border-neutral-200 p-0.5 bg-white shadow-xs">
                            <button
                                type="button"
                                onclick={() => transactionDisplayMode = 'grid'}
                                class="px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 min-h-[30px] touch-manipulation {transactionDisplayMode === 'grid' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                                title="Kachelansicht"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onclick={() => transactionDisplayMode = 'table'}
                                class="px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 min-h-[30px] touch-manipulation {transactionDisplayMode === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                                title="Tabellenansicht"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        <!-- CSV Export Button -->
                        <button
                            type="button"
                            onclick={exportTransactionsCsv}
                            class="orga-button-ghost py-1.5 px-2.5 text-xs shadow-xs bg-white min-h-[36px] flex items-center justify-center gap-1.5 font-semibold text-neutral-700 hover:text-indigo-600 border border-neutral-200 touch-manipulation active:scale-95 cursor-pointer"
                            title="Buchungen als CSV-Datei für Excel / Steuerberater exportieren"
                        >
                            <span>📥</span>
                            <span class="hidden md:inline">CSV-Export</span>
                        </button>

                        <button
                            type="button"
                            disabled={isScanningInvoice}
                            onclick={() => invoiceFileInput?.click()}
                            class="orga-button-primary bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-1.5 px-3 text-xs shadow-emerald-600/20 min-h-[36px] flex items-center justify-center gap-1.5 font-bold touch-manipulation active:scale-95 cursor-pointer disabled:opacity-50"
                            title="1-Click: Beleg oder Rechnung automatisch per KI erfassen und buchen"
                        >
                            {#if isScanningInvoice}
                                <span class="inline-block animate-spin">⏳</span>
                                <span class="hidden sm:inline">Lese Beleg...</span>
                            {:else}
                                <span>⚡</span>
                                <span class="hidden sm:inline">Beleg scannen</span>
                            {/if}
                        </button>
                        <input 
                            type="file" 
                            bind:this={invoiceFileInput} 
                            onchange={handleScanAndBookInvoice} 
                            accept="image/*,application/pdf" 
                            class="hidden" 
                        />
                        <button
                            onclick={financeService.bookDueContracts}
                            class="orga-button-ghost py-1.5 px-2.5 text-xs shadow-xs bg-white min-h-[36px] flex items-center justify-center font-medium touch-manipulation active:scale-95"
                            title="Fällige Verträge als Buchung anlegen"
                            >Fixkosten</button
                        >
                        <button
                            onclick={() => transactionModal?.open()}
                            class="orga-button-primary py-1.5 px-3 text-xs shadow-indigo-600/20 min-h-[36px] flex items-center justify-center gap-1 font-bold touch-manipulation active:scale-95"
                            ><span>+</span> Buchung</button
                        >
                    </div>
                </div>

                <!-- Row 2: Suchfeld, Typ-Filter Tabs & Sortierung -->
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-neutral-100">
                    <!-- Typen-Filter Tabs -->
                    <div class="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                        <button
                            onclick={() => transactionTypeFilter = 'all'}
                            class="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors {transactionTypeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200/70'}"
                        >
                            Alle
                        </button>
                        <button
                            onclick={() => transactionTypeFilter = 'income'}
                            class="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors {transactionTypeFilter === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200/70'}"
                        >
                            📈 Einnahmen
                        </button>
                        <button
                            onclick={() => transactionTypeFilter = 'expense'}
                            class="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors {transactionTypeFilter === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200/70'}"
                        >
                            📉 Ausgaben
                        </button>
                        <button
                            onclick={() => transactionTypeFilter = 'invoice'}
                            class="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors {transactionTypeFilter === 'invoice' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200/70'}"
                            title="Nur Einnahmen aus Kundenrechnungen anzeigen"
                        >
                            📄 Rechnungen
                        </button>
                        <button
                            onclick={() => transactionTypeFilter = 'contract'}
                            class="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors {transactionTypeFilter === 'contract' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200/70'}"
                        >
                            📜 Verträge
                        </button>
                    </div>

                    <!-- Suche & Sortierung -->
                    <div class="flex items-center gap-2">
                        <!-- Volltext-Suche -->
                        <div class="relative flex-1 sm:w-48">
                            <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-neutral-400 text-xs">🔍</span>
                            <input
                                type="text"
                                bind:value={transactionSearchQuery}
                                placeholder="Buchung suchen..."
                                class="w-full pl-8 pr-3 py-1 text-xs bg-white border border-neutral-200 rounded-lg shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-neutral-800"
                            />
                            {#if transactionSearchQuery}
                                <button
                                    onclick={() => transactionSearchQuery = ''}
                                    class="absolute inset-y-0 right-0 flex items-center pr-2 text-neutral-400 hover:text-neutral-600 text-xs"
                                >
                                    ✕
                                </button>
                            {/if}
                        </div>

                        <!-- Sortierauswahl -->
                        <select
                            bind:value={transactionSortBy}
                            aria-label="Buchungen sortieren"
                            class="py-1 px-2 text-xs bg-white border border-neutral-200 rounded-lg shadow-xs text-neutral-700 cursor-pointer outline-none shrink-0"
                        >
                            <option value="date_desc">Neueste zuerst</option>
                            <option value="date_asc">Älteste zuerst</option>
                            <option value="amount_desc">Höchster Betrag</option>
                            <option value="amount_asc">Niedrigster Betrag</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="overflow-y-auto custom-scrollbar max-h-130 p-3 sm:p-4 flex-1">
                {#if displayedTransactions.length === 0}
                    <div class="p-8 text-center text-neutral-400 italic text-sm">
                        Keine Buchungen für diesen Zeitraum vorhanden.
                        <button onclick={() => showAllTransactions = true} class="block mx-auto mt-2 text-indigo-600 font-bold hover:underline not-italic">
                            Alle Buchungen anzeigen &rarr;
                        </button>
                    </div>
                {:else if transactionDisplayMode === 'grid'}
                    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {#each displayedTransactions as t}
                            {@const isStorno = t.is_storno || t.status === 'storniert'}
                            <div
                                class="rounded-xl p-3.5 sm:p-4 border transition-all flex flex-col gap-3 relative overflow-hidden shadow-xs hover:shadow-md {isStorno ? 'bg-amber-50/60 border-dashed border-amber-300 opacity-80' : t.type === 'income' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}"
                            >
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-center gap-2 min-w-0 flex-1">
                                        {#if isStorno}
                                            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900 shrink-0 shadow-xs">
                                                GoBD Storno
                                            </span>
                                        {:else if t.source === 'accounting' || t.is_invoice}
                                            <span
                                                class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0 shadow-xs flex items-center gap-1"
                                                title="Automatisch verbucht aus Rechnung"
                                            >
                                                📄 Rechnung
                                            </span>
                                        {:else}
                                            <span
                                                class="px-2 py-0.5 rounded text-[11px] font-bold {t.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} shrink-0 shadow-xs"
                                            >
                                                {t.type === "income" ? "Einnahme" : "Ausgabe"}
                                            </span>
                                        {/if}
                                        <div class="min-w-0 flex-1">
                                            <p
                                                class="font-bold text-neutral-900 truncate text-sm {isStorno ? 'line-through text-neutral-500' : ''}"
                                                title={t.title}
                                            >
                                                {t.title}
                                            </p>
                                            <p class="text-xs text-neutral-500 truncate">
                                                {t.category || 'Sonstiges'} • {new Date(t.date).toLocaleDateString("de-DE", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p
                                            class="font-black text-sm sm:text-base {isStorno ? 'line-through text-neutral-400' : t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}"
                                        >
                                            {formatCurrency(Number(t.amount) || 0)}
                                        </p>
                                        {#if isStorno && t.storno_reason}
                                            <span class="text-[10px] text-amber-800 block truncate max-w-[120px]" title={t.storno_reason}>
                                                {t.storno_reason}
                                            </span>
                                        {/if}
                                    </div>
                                </div>

                                {#if t.is_installment}
                                    <div
                                        class="bg-white/80 p-2 rounded-lg text-xs text-neutral-600 flex justify-between items-center border border-white/60 shadow-xs"
                                    >
                                        <span>Rate {t.installment_current || 1} / {t.installment_total_count || "?"}</span>
                                        {#if t.installment_total_amount}
                                            <span class="font-semibold">{formatCurrency(t.installment_total_amount)}</span>
                                        {/if}
                                    </div>
                                {/if}

                                <div
                                    class="flex items-center justify-between mt-auto pt-2.5 border-t border-neutral-200/60 gap-2"
                                >
                                    <div class="flex items-center gap-1.5">
                                        {#if t.receipt}
                                            <a
                                                href={pb.files.getURL(t, t.receipt)}
                                                target="_blank"
                                                class="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-sm hover:scale-105 transition-transform bg-white rounded-lg border border-neutral-200 shadow-xs touch-manipulation"
                                                title="Beleg ansehen"
                                            >
                                                🧾
                                            </a>
                                        {/if}
                                    </div>
                                    <div class="flex items-center gap-1">
                                        {#if t.is_installment && (t.installment_current || 1) < (t.installment_total_count || 999) && !isStorno}
                                            <button
                                                onclick={() => bookNextInstallment(t)}
                                                class="px-2.5 py-1 min-h-[38px] text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors shadow-xs flex items-center gap-1 touch-manipulation active:scale-95"
                                                title="Nächste Rate buchen"
                                            >
                                                💰 Zahlen
                                            </button>
                                        {/if}
                                        {#if t.source !== 'accounting' && !isStorno}
                                            <button
                                                onclick={() => handleStorno(t)}
                                                class="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors touch-manipulation active:scale-90"
                                                title="GoBD-konform stornieren"
                                            >
                                                🚫
                                            </button>
                                            <button
                                                onclick={() => transactionModal?.open(t)}
                                                class="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-neutral-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors touch-manipulation active:scale-90"
                                                title="Bearbeiten"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                onclick={() => handleDeleteTransaction(t.id)}
                                                class="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-neutral-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors touch-manipulation active:scale-90"
                                                title="Löschen"
                                            >
                                                ✕
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <!-- Tabellenansicht -->
                    <div class="overflow-x-auto orga-table-container custom-scrollbar">
                        <table class="w-full text-left text-sm border-collapse">
                            <thead class="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                                <tr>
                                    <th class="py-3.5 px-4">Datum</th>
                                    <th class="py-3.5 px-4">Typ</th>
                                    <th class="py-3.5 px-4">Titel</th>
                                    <th class="py-3.5 px-4">Kategorie</th>
                                    <th class="py-3.5 px-4 text-right">Betrag</th>
                                    <th class="py-3.5 px-4 text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                                {#each displayedTransactions as t}
                                    {@const isStorno = t.is_storno || t.status === 'storniert'}
                                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors {isStorno ? 'bg-amber-50/50 dark:bg-amber-950/20 text-slate-400 dark:text-slate-500' : ''}">
                                        <td class="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                                            {new Date(t.date).toLocaleDateString("de-DE", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric"
                                            })}
                                        </td>
                                        <td class="py-3.5 px-4 whitespace-nowrap">
                                            {#if isStorno}
                                                <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                                                    Storno
                                                </span>
                                            {:else if t.source === 'accounting' || t.is_invoice}
                                                <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800" title="Automatisch verbucht aus Rechnung">
                                                    📄 Rechnung
                                                </span>
                                            {:else}
                                                <span class="px-2.5 py-1 rounded-md text-xs font-bold {t.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'}">
                                                    {t.type === 'income' ? 'Einnahme' : 'Ausgabe'}
                                                </span>
                                            {/if}
                                        </td>
                                        <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 max-w-[220px] truncate {isStorno ? 'line-through text-slate-400 dark:text-slate-500' : ''}">
                                            <span class="block truncate">{t.title}</span>
                                            {#if isStorno && t.storno_reason}
                                                <span class="block text-xs text-amber-700 dark:text-amber-400 font-medium">
                                                    ({t.storno_reason})
                                                </span>
                                            {:else if t.source === 'accounting'}
                                                <span class="block text-xs text-slate-500 dark:text-slate-400 font-normal">
                                                    {t.payment_method || 'Banküberweisung'} • Status: {t.status || 'Bezahlt'}
                                                </span>
                                            {/if}
                                        </td>
                                        <td class="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                            {t.category || 'Sonstiges'}
                                        </td>
                                        <td class="py-3.5 px-4 text-right font-black whitespace-nowrap tabular-nums text-sm sm:text-base {isStorno ? 'line-through text-slate-400 dark:text-slate-500' : t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                                            {formatCurrency(Number(t.amount) || 0)}
                                        </td>
                                        <td class="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div class="inline-flex items-center gap-1.5 justify-end">
                                                {#if t.receipt}
                                                    <a
                                                        href={pb.files.getURL(t, t.receipt)}
                                                        target="_blank"
                                                        class="p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                                                        title="Beleg"
                                                    >🧾</a>
                                                {/if}
                                                {#if t.source !== 'accounting' && !isStorno}
                                                    <button
                                                        onclick={() => handleStorno(t)}
                                                        class="p-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg"
                                                        title="Stornieren"
                                                    >🚫</button>
                                                    <button
                                                        onclick={() => transactionModal?.open(t)}
                                                        class="p-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                        title="Bearbeiten"
                                                    >✎</button>
                                                    <button
                                                        onclick={() => handleDeleteTransaction(t.id)}
                                                        class="p-2 text-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                                        title="Löschen"
                                                    >✕</button>
                                                {/if}
                                            </div>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Rechte Spalte: Verträge (5 Spalten) -->
        <div class="lg:col-span-5 orga-card-white overflow-hidden flex flex-col">
            <div
                class="p-3.5 sm:p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-50/50 gap-3"
            >
                <div class="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                    <div>
                        <h3 class="font-bold text-neutral-900 text-sm sm:text-base">
                            Laufende Verträge
                        </h3>
                        <span class="text-[11px] text-neutral-400 font-medium">
                            {financeService.contracts.length} Verträge erfasst
                        </span>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                        <span>Zoom :</span>
                        <select
                            bind:value={contractsTileSize}
                            class="orga-input py-1 px-2 text-xs bg-white border border-neutral-200 rounded-lg shadow-sm text-neutral-700 w-auto h-auto min-h-0 cursor-pointer"
                        >
                            <option value={100}>100%</option>
                            <option value={50}>50%</option>
                            <option value={33.33}>33%</option>
                            <option value={25}>25%</option>
                        </select>
                    </div>
                </div>
                <div class="w-full sm:w-auto flex justify-end">
                    <button
                        onclick={() => contractModal?.open()}
                        class="orga-button-primary w-full sm:w-auto py-2 px-3.5 text-xs shadow-indigo-600/20 min-h-[38px] flex items-center justify-center font-bold touch-manipulation active:scale-95"
                        >Vertrag hinzufügen</button
                    >
                </div>
            </div>
            <div class="overflow-y-auto custom-scrollbar max-h-130 p-3 sm:p-4 flex-1">
                {#if financeService.contracts.length === 0}
                    <p class="p-8 text-center text-neutral-400 italic text-sm">
                        Noch keine Verträge erfasst.
                    </p>
                {:else}
                    <div class="flex flex-wrap gap-3 sm:gap-4">
                        {#each financeService.contracts as c}
                            <div
                                class="responsive-tile {c.type === 'income' ? 'bg-blue-200 border-blue-300' : 'bg-rose-200 border-rose-300'} border rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all group flex flex-col gap-3 relative overflow-hidden"
                                style="width: calc({contractsTileSize}% - 1rem); flex-grow: 1;"
                            >
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                        <span
                                            class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold {c.type ===
                                            'income'
                                                ? 'bg-white text-blue-800'
                                                : 'bg-white text-rose-800'} shrink-0 shadow-sm"
                                            >{c.type === "income"
                                                ? "Einnahme"
                                                : "Ausgabe"}</span
                                        >
                                        <div class="min-w-0 flex-1">
                                            <p
                                                class="font-bold text-neutral-900 truncate text-sm sm:text-base"
                                                title={c.title}
                                            >
                                                {c.title}
                                            </p>
                                            <p
                                                class="text-xs text-neutral-600 truncate"
                                            >
                                                {c.partner || "Kein Partner"} • {c.interval ===
                                                "monthly"
                                                    ? "Monatlich"
                                                    : c.interval === "quarterly"
                                                      ? "Quartalsweise"
                                                      : "Jährlich"}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p
                                            class="font-black text-base sm:text-lg {c.type ===
                                            'income'
                                                ? 'text-blue-700'
                                                : 'text-rose-700'}"
                                        >
                                            {formatCurrency(Number(c.amount) || 0)}
                                        </p>
                                    </div>
                                </div>

                                {#if c.next_due_date}
                                    <div
                                        class="bg-white/80 p-2 rounded-lg text-xs text-neutral-600 flex justify-between items-center border border-white/60 shadow-xs"
                                    >
                                        <span
                                            >Nächste Fälligkeit: {new Date(
                                                c.next_due_date,
                                            ).toLocaleDateString("de-DE", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            })}</span
                                        >
                                    </div>
                                {/if}

                                <div
                                    class="flex items-center justify-between mt-auto pt-2.5 sm:pt-3 border-t border-black/5 gap-2"
                                >
                                    <button
                                        onclick={() => bookContractManually(c)}
                                        class="px-2.5 sm:px-3 py-1.5 min-h-[34px] text-xs font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors shadow-sm flex items-center gap-1 touch-manipulation active:scale-95"
                                        title="Diesen Vertrag jetzt verbuchen"
                                        >💸 Buchen</button
                                    >
                                    <div
                                        class="flex items-center gap-1"
                                    >
                                        {#if c.document}<a
                                                href={pb.files.getURL(
                                                    c,
                                                    c.document,
                                                )}
                                                target="_blank"
                                                class="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center text-base sm:text-lg hover:scale-110 transition-transform bg-white/80 rounded-lg shadow-xs"
                                                title="Dokument ansehen">📄</a
                                            >{/if}
                                        <button
                                            onclick={() =>
                                                contractModal?.open(c)}
                                            class="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center text-neutral-700 sm:text-neutral-500 hover:text-indigo-600 rounded-lg bg-white/70 sm:bg-transparent hover:bg-white transition-colors touch-manipulation active:scale-90"
                                            title="Bearbeiten">✎</button
                                        >
                                        <button
                                            onclick={() =>
                                                handleDeleteContract(c.id)}
                                            class="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center text-neutral-700 sm:text-neutral-500 hover:text-rose-500 rounded-lg bg-white/70 sm:bg-transparent hover:bg-white transition-colors touch-manipulation active:scale-90"
                                            title="Löschen">✕</button
                                        >
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
{/if}

<!-- Modals -->
<PersonalMonthDetailModal 
    bind:isOpen={isMonthModalOpen}
    monthData={selectedMonthForModal}
/>

<PersonalTransactionModal
    bind:this={transactionModal}
    onSave={financeService.addTransaction}
    onUpdate={financeService.updateTransaction}
/>

<PersonalContractModal
    bind:this={contractModal}
    onSave={financeService.addContract}
    onUpdate={financeService.updateContract}
/>

<style>
    @media (max-width: 768px) {
        :global(.responsive-tile) {
            width: 100% !important;
            min-width: 100% !important;
        }
    }

    :global(.custom-scrollbar) {
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
    }
</style>
