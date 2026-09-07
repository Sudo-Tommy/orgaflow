<script lang="ts">
    import { onMount } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import { reconcileUserInvoicesAndAccounting } from '$lib/services/invoiceAccountingService';
    import type {
        BudgetEntry,
        Contract,
        BudgetStatusFilter,
        BudgetTimeFilter,
        BudgetEntryType,
        PaymentStatus,
        PaymentMethod,
        ContractInterval,
        ContractPaymentStatus,
        BudgetEntrySource,
        BudgetTotals
    } from '$lib/types/budget';
    import {
        formatCurrency,
        formatDate,
        getDueDateInfo,
        getInstallmentProgress,
        BUDGET_CATEGORIES,
        PAYMENT_METHOD_METADATA,
        CONTRACT_INTERVAL_METADATA
    } from '$lib/types/budget';
    import BudgetCard from './BudgetCard.svelte';
    import ContractCard from './ContractCard.svelte';
    import {
        TrendingUp,
        TrendingDown,
        Clock,
        AlertCircle,
        Search,
        Plus,
        Filter,
        Calendar,
        CalendarDays,
        ChevronLeft,
        ChevronRight,
        CheckCircle2,
        Repeat,
        FileText,
        X,
        Sparkles,
        UploadCloud,
        Layers,
        Eye,
        Download,
        Trash2,
        ShieldCheck,
        DollarSign,
        Calculator,
        RefreshCw,
        FileCheck,
        Receipt,
        AlertTriangle,
        Zap,
        ListTree,
        Check
    } from 'lucide-svelte';

    // Props (inklusive bindbarer Monat- und Jahresauswahl)
    let {
        initialEntries = [],
        initialContracts = [],
        userId = pb.authStore.model?.id,
        selectedYear = $bindable(new Date().getFullYear()),
        selectedMonth = $bindable(new Date().getMonth() + 1)
    } = $props<{
        initialEntries?: BudgetEntry[];
        initialContracts?: Contract[];
        userId?: string;
        selectedYear?: number;
        selectedMonth?: number;
    }>();

    // Lokaler State
    let entries = $state<BudgetEntry[]>([]);
    let contracts = $state<Contract[]>([]);
    let isLoading = $state(false);
    let isSyncingInvoices = $state(false);

    // Filter-Zustände (Standard: Gezielte Monatsansicht)
    let statusFilter = $state<BudgetStatusFilter>('all');
    let timeFilter = $state<BudgetTimeFilter>('month');
    let categoryFilter = $state<string>('all');
    let searchQuery = $state<string>('');

    // Modals
    let isEntryModalOpen = $state(false);
    let isContractModalOpen = $state(false);
    let isReceiptModalOpen = $state(false);
    let selectedReceiptUrl = $state<string | null>(null);
    let selectedReceiptTitle = $state<string>('');
    let showArrearsInCurrentView = $state(true);
    let selectedInstallmentPlanKey = $state<string | null>(null);

    // Editier-Zustände
    let editingEntry = $state<BudgetEntry | null>(null);
    let editingContract = $state<Contract | null>(null);

    // Formular-State für Buchung (inklusive Ratenzahlung)
    let entryForm = $state({
        type: 'expense' as BudgetEntryType,
        title: '',
        description: '',
        amount: '' as number | '',
        category: 'Sonstiges',
        payment_status: 'open' as PaymentStatus,
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        paid_at: '',
        recipient_or_payer: '',
        payment_method: 'bank_transfer' as PaymentMethod,
        contract_id: '',
        // Ratenzahlung
        is_installment: false,
        installment_current: 1 as number | '',
        installment_total_count: 12 as number | '',
        installment_total_amount: '' as number | ''
    });
    let entryReceiptFile = $state<File | null>(null);

    // Formular-State für Vertrag
    let contractForm = $state({
        partner_name: '',
        contract_number: '',
        amount: '' as number | '',
        interval: 'monthly' as ContractInterval,
        next_due_date: new Date().toISOString().split('T')[0],
        payment_status: 'open' as ContractPaymentStatus,
        category: 'Miete & Wohnen',
        auto_book: false,
        is_active: true,
        description: ''
    });

    // -------------------------------------------------------------------------
    // HILFSFUNKTION: EFFEKTIVES DATUM EINER BUCHUNG (KASSEN- vs. PERIODENPRINZIP)
    // -------------------------------------------------------------------------
    function getEffectiveEntryDate(entry: BudgetEntry): string {
        // Bei bezahlten Buchungen ist das tatsächliche Zahlungsdatum maßgeblich
        if (entry.payment_status === 'paid' && entry.paid_at) {
            return entry.paid_at;
        }
        // Bei noch offenen Buchungen gilt das Rechnungs-/Belegdatum
        return entry.invoice_date || entry.due_date || entry.paid_at || entry.created || '';
    }

    // -------------------------------------------------------------------------
    // DATEN LADEN & AUTOMATISCHE RECHNUNGS-INTEGRATION
    // -------------------------------------------------------------------------
    async function loadData() {
        if (!userId) return;
        isLoading = true;
        try {
            const [entriesRes, contractsRes, accountingRes] = await Promise.all([
                // 1. Primäre Buchungen (budget_entries oder Fallback personal_transactions)
                pb.collection('budget_entries').getFullList<BudgetEntry>({
                    filter: `user = "${userId}"`,
                    sort: '-created',
                    requestKey: null
                }).then(list => list.filter(e => (e as any).status !== 'storniert' && !(e as any).is_storno))
                .catch(async () => {
                    try {
                        const fallbackList = await pb.collection('personal_transactions').getFullList({
                            filter: `user = "${userId}"`,
                            sort: '-date',
                            requestKey: null
                        });
                        return fallbackList
                            .filter((pt: any) => pt.status !== 'storniert' && !pt.is_storno)
                            .map((pt: any) => ({
                                id: pt.id,
                                collectionId: pt.collectionId || 'personal_transactions',
                                user: pt.user,
                                type: (pt.type || 'expense') as BudgetEntryType,
                                title: pt.title || '',
                                description: pt.notes || '',
                                amount: Number(pt.amount) || 0,
                                category: pt.category || 'Sonstiges',
                                payment_status: (pt.status === 'gebucht' ? 'paid' : pt.status === 'ausstehend' ? 'open' : 'open') as PaymentStatus,
                                recipient_or_payer: pt.recipient_or_payer || pt.partner || pt.title || 'Unbekannt',
                                payment_method: 'bank_transfer',
                                invoice_number: pt.invoice_number || '',
                                invoice_date: pt.date ? pt.date.substring(0, 10) : '',
                                due_date: pt.due_date ? pt.due_date.substring(0, 10) : '',
                                paid_at: pt.status === 'gebucht' && pt.date ? pt.date.substring(0, 10) : '',
                                receipt_file: pt.receipt_file || '',
                                is_installment: !!pt.is_installment,
                                installment_current: pt.installment_current ? Number(pt.installment_current) : undefined,
                                installment_total_count: pt.installment_total_count ? Number(pt.installment_total_count) : undefined,
                                installment_total_amount: pt.installment_total_amount ? Number(pt.installment_total_amount) : undefined,
                                source: 'manual' as BudgetEntrySource,
                                is_invoice: false,
                                created: pt.created,
                                updated: pt.updated
                            })) as BudgetEntry[];
                    } catch {
                        return [];
                    }
                }),

                // 2. Laufende Verträge
                pb.collection('contracts').getFullList<Contract>({
                    filter: `user = "${userId}"`,
                    sort: 'partner_name',
                    requestKey: null
                }).catch(async () => {
                    try {
                        const fallbackContracts = await pb.collection('personal_contracts').getFullList({
                            filter: `user = "${userId}"`,
                            sort: 'title',
                            requestKey: null
                        });
                        return fallbackContracts.map((pc: any) => ({
                            id: pc.id,
                            collectionId: pc.collectionId || 'personal_contracts',
                            user: pc.user,
                            partner_name: pc.partner || pc.title || 'Unbekannter Partner',
                            contract_number: pc.contract_number || '',
                            amount: Number(pc.amount) || 0,
                            interval: (pc.interval || 'monthly') as ContractInterval,
                            next_due_date: pc.next_due_date ? pc.next_due_date.substring(0, 10) : '',
                            payment_status: 'open' as ContractPaymentStatus,
                            category: pc.category || 'Miete & Wohnen',
                            auto_book: false,
                            is_active: pc.is_active ?? true,
                            description: pc.notes || '',
                            created: pc.created,
                            updated: pc.updated
                        })) as Contract[];
                    } catch {
                        return [];
                    }
                }),

                // 3. Rechnungsbuchungen aus 'accounting' (automatische Einnahmen)
                pb.collection('accounting').getFullList({
                    filter: `createdby = "${userId}"`,
                    sort: '-transaction_date',
                    requestKey: null
                }).catch(() => [])
            ]);

            // Automatische Rechnungsbuchungen in BudgetEntry-Struktur transformieren
            const invoiceEntries: BudgetEntry[] = accountingRes
                .filter((a: any) => a.status !== 'Storniert' && a.transaction_type === 'Einnahme')
                .map((a: any) => {
                    const gross = Number(a.amount_gross) || Number(a.amount_net) || 0;
                    const net = Number(a.amount_net) || gross;
                    const dateStr = a.transaction_date ? a.transaction_date.substring(0, 10) : (a.created ? a.created.substring(0, 10) : '');
                    const title = a.title || 'Kundenrechnung';

                    let extractedInvoiceNr = '';
                    let partner = 'Kunde';
                    if (title.includes(' - ')) {
                        const parts = title.split(' - ');
                        partner = parts.slice(1).join(' - ').trim();
                        const match = parts[0].match(/Rechnung\s+([A-Za-z0-9\-_]+)/i);
                        if (match) extractedInvoiceNr = match[1];
                    } else {
                        const match = title.match(/Rechnung\s+([A-Za-z0-9\-_]+)/i);
                        if (match) extractedInvoiceNr = match[1];
                        partner = a.category || 'Kundenrechnung';
                    }

                    const receiptFileName = Array.isArray(a.receipt_file) ? a.receipt_file[0] : (a.receipt_file || '');

                    return {
                        id: a.id,
                        collectionId: a.collectionId || 'pbc_2473931125',
                        user: a.createdby || userId,
                        type: 'income' as BudgetEntryType,
                        title: title,
                        description: a.notes || 'Automatisch synchronisierte Kundenrechnung',
                        amount: gross,
                        amount_net: net,
                        tax_rate: a.tax_rate || '19',
                        category: a.category || 'Kundenrechnung',
                        payment_status: (a.status === 'Bezahlt' ? 'paid' : 'open') as PaymentStatus,
                        recipient_or_payer: partner,
                        payment_method: (a.payment_method === 'Bar' ? 'cash' : 'bank_transfer') as PaymentMethod,
                        invoice_number: extractedInvoiceNr,
                        invoice_date: dateStr,
                        due_date: dateStr,
                        paid_at: a.status === 'Bezahlt' ? dateStr : '',
                        receipt_file: receiptFileName,
                        source: 'accounting' as BudgetEntrySource,
                        is_invoice: true,
                        created: a.created,
                        updated: a.updated
                    } as BudgetEntry;
                });

            // Beide Quellen zusammenführen und chronologisch absteigend sortieren
            const mergedEntries = [...entriesRes, ...invoiceEntries];
            mergedEntries.sort((a, b) => {
                const dateA = new Date(getEffectiveEntryDate(a) || 0).getTime();
                const dateB = new Date(getEffectiveEntryDate(b) || 0).getTime();
                return dateB - dateA;
            });

            entries = mergedEntries;
            contracts = contractsRes;
        } catch (err) {
            console.error('Fehler beim Laden der Budget-Daten:', err);
            toastStore.error('Fehler beim Abrufen der Finanzdaten.');
        } finally {
            isLoading = false;
        }
    }

    // Reaktives Laden bei Wechsel des Nutzers
    $effect(() => {
        if (userId) {
            loadData();
        }
    });

    // -------------------------------------------------------------------------
    // MONAT- & JAHR-STEUERUNG
    // -------------------------------------------------------------------------
    function goToPrevMonth() {
        timeFilter = 'month';
        if (selectedMonth === 1) {
            selectedMonth = 12;
            selectedYear--;
        } else {
            selectedMonth--;
        }
    }

    function goToNextMonth() {
        timeFilter = 'month';
        if (selectedMonth === 12) {
            selectedMonth = 1;
            selectedYear++;
        } else {
            selectedMonth++;
        }
    }

    function goToCurrentMonth() {
        timeFilter = 'month';
        const now = new Date();
        selectedYear = now.getFullYear();
        selectedMonth = now.getMonth() + 1;
    }

    function setMonth(mNum: number) {
        timeFilter = 'month';
        selectedMonth = mNum;
    }

    // Verfügbare Jahre dynamisch aus den Buchungen und Verträgen berechnen
    let availableYears = $derived.by(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        years.add(selectedYear);
        for (const entry of entries) {
            const dStr = getEffectiveEntryDate(entry);
            if (dStr) {
                const y = new Date(dStr).getFullYear();
                if (!isNaN(y)) years.add(y);
            }
        }
        for (const contract of contracts) {
            if (contract.next_due_date) {
                const y = new Date(contract.next_due_date).getFullYear();
                if (!isNaN(y)) years.add(y);
            }
        }
        return Array.from(years).sort((a, b) => b - a);
    });

    // Stichtag: Beginn der aktuell ausgewählten Periode (zur sicheren Erkennung von Vorperioden)
    let periodStartDate = $derived.by(() => {
        if (timeFilter === 'year') {
            return new Date(selectedYear, 0, 1);
        } else if (timeFilter === 'quarter') {
            const startMonth = (Math.ceil(selectedMonth / 3) - 1) * 3;
            return new Date(selectedYear, startMonth, 1);
        }
        return new Date(selectedYear, selectedMonth - 1, 1);
    });

    /**
     * Prüft, ob eine Buchung ein überfälliger Zahlungsrückstand aus einem Vormonat ist
     */
    function isEntryArrear(entry: BudgetEntry): boolean {
        if (entry.payment_status !== 'open') return false;
        const dStr = entry.invoice_date || entry.due_date || entry.created;
        if (!dStr) return false;
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return false;
        return d.getTime() < periodStartDate.getTime();
    }

    // Alle unbezahlten Ausgaben & Raten aus Vormonaten
    let arrearsExpenseEntries = $derived(
        entries.filter((e) => e.type === 'expense' && isEntryArrear(e))
    );

    // Alle unbezahlten Kundenrechnungen aus Vormonaten
    let arrearsIncomeEntries = $derived(
        entries.filter((e) => e.type === 'income' && isEntryArrear(e))
    );

    // Indikator für Monate mit Buchungen im aktuell gewählten Jahr
    let monthsWithData = $derived.by(() => {
        const set = new Set<number>();
        for (const entry of entries) {
            const dStr = getEffectiveEntryDate(entry);
            if (!dStr) continue;
            const d = new Date(dStr);
            if (d.getFullYear() === selectedYear) {
                set.add(d.getMonth() + 1);
            }
        }
        return set;
    });

    // Indikator für Monate mit noch UNBEZAHLTEN Buchungen/Raten im gewählten Jahr (Warn-Radar)
    let monthsWithUnpaid = $derived.by(() => {
        const set = new Set<number>();
        for (const entry of entries) {
            if (entry.payment_status !== 'open') continue;
            const dStr = entry.invoice_date || entry.due_date || entry.created;
            if (!dStr) continue;
            const d = new Date(dStr);
            if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear) {
                set.add(d.getMonth() + 1);
            }
        }
        return set;
    });

    // Eindeutiger Identifikationsschlüssel für einen zusammenhängenden Ratenkauf
    function getInstallmentPlanKey(entry: BudgetEntry): string {
        return entry.invoice_number
            ? `inv_${entry.invoice_number.trim().toLowerCase()}`
            : `${entry.recipient_or_payer}_${entry.title}_${entry.installment_total_count || ''}`.trim().toLowerCase();
    }

    // Buchungen des aktuell zur Inspektion geöffneten Ratenplans
    let selectedInstallmentEntries = $derived.by(() => {
        if (!selectedInstallmentPlanKey) return [];
        return entries
            .filter((e) => e.is_installment && getInstallmentPlanKey(e) === selectedInstallmentPlanKey)
            .sort((a, b) => (Number(a.installment_current) || 1) - (Number(b.installment_current) || 1));
    });

    let selectedInstallmentPrimary = $derived(
        selectedInstallmentEntries[selectedInstallmentEntries.length - 1] || null
    );

    function openInstallmentPlanModal(entry: BudgetEntry) {
        selectedInstallmentPlanKey = getInstallmentPlanKey(entry);
    }

    // Mobiler Auto-Scroll für die horizontale Monatsleiste
    let monthPillsContainer = $state<HTMLElement | null>(null);

    function scrollToSelectedMonth() {
        if (!monthPillsContainer) return;
        const activeBtn = monthPillsContainer.querySelector(`[data-month="${selectedMonth}"]`) as HTMLElement;
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    $effect(() => {
        if (selectedMonth && monthPillsContainer) {
            scrollToSelectedMonth();
        }
    });

    // Menschenlesbare Bezeichnungen
    let selectedMonthName = $derived(
        new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('de-DE', { month: 'long' })
    );
    let selectedMonthShort = $derived(
        new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('de-DE', { month: 'short' })
    );

    let periodLabel = $derived.by(() => {
        if (timeFilter === 'month' || timeFilter === 'this_month') {
            return `${selectedMonthName} ${selectedYear}`;
        } else if (timeFilter === 'last_month') {
            const prev = new Date(selectedYear, selectedMonth - 2, 1);
            return `${prev.toLocaleString('de-DE', { month: 'long' })} ${prev.getFullYear()}`;
        } else if (timeFilter === 'quarter') {
            const q = Math.ceil(selectedMonth / 3);
            return `Q${q} ${selectedYear}`;
        } else if (timeFilter === 'year') {
            return `Gesamtjahr ${selectedYear}`;
        }
        return 'Gesamter Zeitraum';
    });

    // -------------------------------------------------------------------------
    // AKTION: RECHNUNGEN SYNCHRONISIEREN (ABGLEICH WIE IN KLASSISCHER ANSICHT)
    // -------------------------------------------------------------------------
    async function handleSyncInvoices() {
        if (!userId) return;
        isSyncingInvoices = true;
        toastStore.info('Prüfe und synchronisiere Kundenrechnungen...');
        try {
            const stats = await reconcileUserInvoicesAndAccounting(userId);
            await loadData();
            if (stats.created === 0 && stats.updated === 0) {
                toastStore.success(`Alle ${stats.total} Rechnungen sind bereits aktuell im Haushaltsbuch.`);
            } else {
                toastStore.success(`Abstimmung abgeschlossen: ${stats.created} neue Rechnungen verbucht, ${stats.updated} aktualisiert.`);
            }
        } catch (err) {
            console.error('Fehler bei Rechnungs-Synchronisation:', err);
            toastStore.error('Fehler beim Abgleich der Rechnungen mit dem Haushaltsbuch.');
        } finally {
            isSyncingInvoices = false;
        }
    }

    // -------------------------------------------------------------------------
    // FILTERUNG DER EINTRÄGE MIT GENAUER MONATSWAHL
    // -------------------------------------------------------------------------
    function matchesTimeFilter(dateStr?: string | null): boolean {
        if (timeFilter === 'all') return true;
        if (!dateStr) return false;

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;

        const entryYear = date.getFullYear();
        const entryMonth = date.getMonth(); // 0 - 11

        if (timeFilter === 'month' || timeFilter === 'this_month') {
            return entryYear === selectedYear && entryMonth === (selectedMonth - 1);
        } else if (timeFilter === 'last_month') {
            const lastMonthDate = new Date(selectedYear, selectedMonth - 2, 1);
            return entryYear === lastMonthDate.getFullYear() && entryMonth === lastMonthDate.getMonth();
        } else if (timeFilter === 'quarter') {
            const targetQuarter = Math.ceil(selectedMonth / 3);
            const entryQuarter = Math.floor(entryMonth / 3) + 1;
            return entryYear === selectedYear && entryQuarter === targetQuarter;
        } else if (timeFilter === 'year') {
            return entryYear === selectedYear;
        }
        return true;
    }

    let filteredEntries = $derived(
        entries.filter((entry) => {
            // Spezialfilter: Nur Zahlungsrückstände aus Vormonaten
            if (statusFilter === 'arrears') {
                if (entry.type !== 'expense' || !isEntryArrear(entry)) return false;
                if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const matchTitle = entry.title?.toLowerCase().includes(q);
                    const matchRecipient = entry.recipient_or_payer?.toLowerCase().includes(q);
                    const matchInvoice = entry.invoice_number?.toLowerCase().includes(q);
                    const matchCategory = entry.category?.toLowerCase().includes(q);
                    if (!matchTitle && !matchRecipient && !matchInvoice && !matchCategory) return false;
                }
                return true;
            }

            // Status- & Typ-Filter
            if (statusFilter === 'contracts') return false;
            if (statusFilter === 'invoices' && !entry.is_invoice && entry.source !== 'accounting') return false;
            if (statusFilter === 'installments' && !entry.is_installment) return false;
            if (statusFilter === 'open' && entry.payment_status !== 'open') return false;
            if (statusFilter === 'paid' && entry.payment_status !== 'paid') return false;

            // Zeitraum-Filter nach effektivem Datum
            const relevantDate = getEffectiveEntryDate(entry);
            if (!matchesTimeFilter(relevantDate)) return false;

            // Kategorie-Filter
            if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;

            // Suchfilter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchTitle = entry.title?.toLowerCase().includes(q);
                const matchRecipient = entry.recipient_or_payer?.toLowerCase().includes(q);
                const matchInvoice = entry.invoice_number?.toLowerCase().includes(q);
                const matchCategory = entry.category?.toLowerCase().includes(q);
                if (!matchTitle && !matchRecipient && !matchInvoice && !matchCategory) return false;
            }

            return true;
        })
    );

    let filteredContracts = $derived(
        contracts.filter((contract) => {
            if (statusFilter !== 'all' && statusFilter !== 'contracts') {
                if (statusFilter === 'open' && contract.payment_status !== 'open') return false;
                if (statusFilter === 'paid' && contract.payment_status !== 'paid') return false;
                if (statusFilter === 'installments' || statusFilter === 'invoices') return false;
            }

            if (categoryFilter !== 'all' && contract.category !== categoryFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchPartner = contract.partner_name?.toLowerCase().includes(q);
                const matchNumber = contract.contract_number?.toLowerCase().includes(q);
                const matchCategory = contract.category?.toLowerCase().includes(q);
                if (!matchPartner && !matchNumber && !matchCategory) return false;
            }

            return true;
        })
    );

    // -------------------------------------------------------------------------
    // KPI BERECHNUNGEN (LOGISCH & MATHEMATISCH EXAKT ABGESTIMMT)
    // -------------------------------------------------------------------------
    let totals = $derived.by((): BudgetTotals => {
        let totalIncome = 0;
        let invoiceIncome = 0;
        let personalIncome = 0;
        let totalExpense = 0;
        let openPayables = 0;      // Offene Ausgaben (Verbindlichkeiten, die noch bezahlt werden müssen)
        let openReceivables = 0;   // Offene Einnahmen (Forderungen an Kunden, die noch ausstehen)
        let invoicesCount = 0;

        // Ratenkäufe nach Plan deduplizieren, um Doppelzählungen bei Folgeraten zu verhindern
        const installmentPlans = new Map<string, { entry: BudgetEntry; maxRate: number }>();

        for (const entry of entries) {
            const relevantDate = getEffectiveEntryDate(entry);
            const inPeriod = matchesTimeFilter(relevantDate);

            const val = Number(entry.amount) || 0;
            const isInv = entry.is_invoice || entry.source === 'accounting';

            if (isInv && inPeriod) {
                invoicesCount++;
            }

            if (inPeriod) {
                if (entry.type === 'income') {
                    totalIncome += val;
                    if (isInv) {
                        invoiceIncome += val;
                    } else {
                        personalIncome += val;
                    }
                    if (entry.payment_status === 'open') {
                        openReceivables += val;
                    }
                } else {
                    totalExpense += val;
                    if (entry.payment_status === 'open') {
                        openPayables += val;
                    }
                }
            }

            // Ratenberechnung: Eindeutigen Plan ermitteln & aktuellste Rate zur Restschuldberechnung heranziehen
            if (entry.is_installment) {
                const planKey = entry.invoice_number
                    ? `inv_${entry.invoice_number.trim().toLowerCase()}`
                    : `${entry.recipient_or_payer}_${entry.title}_${entry.installment_total_count || ''}`.trim().toLowerCase();
                const currentRate = Number(entry.installment_current) || 1;
                const existing = installmentPlans.get(planKey);
                if (!existing || currentRate > existing.maxRate) {
                    installmentPlans.set(planKey, { entry, maxRate: currentRate });
                }
            }
        }

        // Restschuld aller aktiven Ratenpläne berechnen
        let installmentsCount = installmentPlans.size;
        let openInstallmentsTotal = 0;
        for (const { entry } of installmentPlans.values()) {
            const info = getInstallmentProgress(entry);
            if (!info.isFinished) {
                openInstallmentsTotal += info.remainingAmount;
            }
        }

        // Verträge: Monatliche Gesamtsumme & offene Verträge für den monatlichen Zyklus
        let fixedCostsMonthly = 0;
        let openFixedCostsMonthly = 0;

        for (const contract of contracts) {
            if (!contract.is_active) continue;
            const factor = CONTRACT_INTERVAL_METADATA[contract.interval]?.factorMonthly || 1;
            const monthlyValue = (Number(contract.amount) || 0) * factor;
            fixedCostsMonthly += monthlyValue;

            if (contract.payment_status === 'open') {
                openFixedCostsMonthly += monthlyValue;
            }
        }

        // Zahlungsrückstände aus Vormonaten (Arrears) berechnen
        let arrearsPayables = 0;
        let arrearsReceivables = 0;
        let arrearsInstallmentsCount = 0;

        for (const e of arrearsExpenseEntries) {
            arrearsPayables += Number(e.amount) || 0;
            if (e.is_installment) {
                arrearsInstallmentsCount++;
            }
        }

        for (const e of arrearsIncomeEntries) {
            arrearsReceivables += Number(e.amount) || 0;
        }

        return {
            totalIncome,
            invoiceIncome,
            personalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            openPayables,
            openReceivables,
            totalOpen: openPayables, // Primäre Kennzahl: Offene Zahlungsverpflichtungen im Monat
            fixedCostsMonthly,
            openFixedCostsMonthly,
            openInstallmentsTotal,
            installmentsCount,
            invoicesCount,
            entriesCount: entries.length,
            contractsCount: contracts.length,
            arrearsPayables,
            arrearsReceivables,
            arrearsInstallmentsCount,
            arrearsCount: arrearsExpenseEntries.length
        };
    });

    // -------------------------------------------------------------------------
    // AKTIONEN: STATUS-UMSCHALTUNG (1-TAP)
    // -------------------------------------------------------------------------
    async function handleToggleEntryStatus(entry: BudgetEntry, newStatus: 'paid' | 'open') {
        const todayIso = new Date().toISOString().split('T')[0];
        const updatedPaidAt = newStatus === 'paid' ? todayIso : '';

        const prevStatus = entry.payment_status;
        const prevPaidAt = entry.paid_at;
        entry.payment_status = newStatus;
        entry.paid_at = updatedPaidAt;
        entries = [...entries];

        try {
            if (entry.source === 'accounting') {
                await pb.collection('accounting').update(entry.id, {
                    status: newStatus === 'paid' ? 'Bezahlt' : 'Offen',
                    transaction_date: newStatus === 'paid' ? todayIso : (entry.invoice_date || todayIso)
                });
            } else {
                await pb.collection('budget_entries').update(entry.id, {
                    payment_status: newStatus,
                    paid_at: updatedPaidAt
                }).catch(async () => {
                    await pb.collection('personal_transactions').update(entry.id, {
                        status: newStatus === 'paid' ? 'gebucht' : 'ausstehend'
                    });
                });
            }

            if (newStatus === 'paid') {
                toastStore.success(`„${entry.title}“ als bezahlt markiert.`);
            } else {
                toastStore.info(`„${entry.title}“ wieder als offen markiert.`);
            }
        } catch (err) {
            console.error('Fehler beim Aktualisieren des Status:', err);
            entry.payment_status = prevStatus;
            entry.paid_at = prevPaidAt;
            entries = [...entries];
            toastStore.error('Status konnte nicht aktualisiert werden.');
        }
    }

    async function handleToggleContractStatus(contract: Contract, newStatus: 'paid' | 'open') {
        const prevStatus = contract.payment_status;
        contract.payment_status = newStatus;
        contracts = [...contracts];

        try {
            await pb.collection('contracts').update(contract.id, {
                payment_status: newStatus
            }).catch(async () => {});
            toastStore.success(`Vertrag „${contract.partner_name}“: Status aktualisiert.`);
        } catch (err) {
            contract.payment_status = prevStatus;
            contracts = [...contracts];
            toastStore.error('Vertragsstatus konnte nicht geändert werden.');
        }
    }

    // -------------------------------------------------------------------------
    // AKTION: JETZT VERBUCHEN (FÜR VERTRÄGE)
    // -------------------------------------------------------------------------
    async function handleBookContractNow(contract: Contract) {
        if (!userId) return;

        const targetDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const today = new Date().toISOString().split('T')[0];
        const effectiveDate = (timeFilter === 'month' && selectedYear === new Date().getFullYear() && selectedMonth === (new Date().getMonth() + 1)) ? today : targetDate;

        const newEntryData: Partial<BudgetEntry> = {
            user: userId,
            type: 'expense',
            title: `Vertrag: ${contract.partner_name}`,
            description: contract.description || `Regelmäßige Buchung (${contract.interval}) #${contract.contract_number || ''}`,
            amount: Number(contract.amount) || 0,
            category: contract.category || 'Miete & Wohnen',
            payment_status: 'paid',
            recipient_or_payer: contract.partner_name,
            payment_method: 'bank_transfer',
            paid_at: effectiveDate,
            due_date: effectiveDate,
            invoice_date: effectiveDate,
            contract_id: contract.id
        };

        try {
            let createdRecord: any;
            try {
                createdRecord = await pb.collection('budget_entries').create(newEntryData);
            } catch {
                createdRecord = await pb.collection('personal_transactions').create({
                    user: userId,
                    type: 'expense',
                    title: newEntryData.title,
                    amount: newEntryData.amount,
                    category: newEntryData.category,
                    date: effectiveDate,
                    notes: newEntryData.description,
                    status: 'gebucht',
                    recipient_or_payer: contract.partner_name
                });
            }

            contract.payment_status = 'paid';
            contracts = [...contracts];
            try {
                await pb.collection('contracts').update(contract.id, { payment_status: 'paid' });
            } catch {}

            entries = [{
                id: createdRecord.id,
                user: userId,
                type: 'expense',
                title: newEntryData.title!,
                description: newEntryData.description,
                amount: newEntryData.amount!,
                category: newEntryData.category!,
                payment_status: 'paid',
                recipient_or_payer: contract.partner_name,
                payment_method: 'bank_transfer',
                paid_at: effectiveDate,
                invoice_date: effectiveDate,
                due_date: effectiveDate,
                contract_id: contract.id,
                created: new Date().toISOString()
            }, ...entries];

            toastStore.success(`Vertrag „${contract.partner_name}“ erfolgreich als Buchung erfasst!`);
        } catch (err) {
            console.error('Fehler beim Verbuchen des Vertrags:', err);
            toastStore.error('Fehler beim Erstellen der Buchung.');
        }
    }

    // -------------------------------------------------------------------------
    // AKTION: RÜCKSTAND AUS VORMONAT JETZT BEGLEICHEN (WERTE IM AKTUELLEN MONAT)
    // -------------------------------------------------------------------------
    async function handlePayArrearNow(entry: BudgetEntry) {
        const todayIso = new Date().toISOString().split('T')[0];
        const confirmed = await confirmStore.ask(
            `Möchten Sie den Rückstand „${entry.title}“ (${formatCurrency(entry.amount)}) jetzt als überwiesen verbuchen? Die Wertstellung erfolgt mit heutigem Datum (${formatDate(todayIso)}), sodass die Ausgabe dem aktuellen Cashflow zugeordnet wird.`,
            'Rückstand jetzt begleichen',
            'Ja, als bezahlt buchen',
            'Abbrechen'
        );
        if (!confirmed) return;

        await handleToggleEntryStatus(entry, 'paid');
        toastStore.success(`Rückstand für „${entry.title}“ beglichen und im aktuellen Monat verbucht!`);
    }

    // -------------------------------------------------------------------------
    // AKTION: NÄCHSTE RATE VERBUCHEN (FÜR RATENZAHLUNGEN)
    // -------------------------------------------------------------------------
    async function handleBookNextInstallment(entry: BudgetEntry) {
        const nextRateNr = (Number(entry.installment_current) || 1) + 1;
        const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

        // Sicherheitsprüfung: Wenn vorherige Rate noch offen ist, Benutzer fragen/warnen
        if (entry.payment_status === 'open') {
            const markPaid = await confirmStore.ask(
                `Achtung: Rate ${entry.installment_current} von ${entry.installment_total_count || ''} ist noch als OFFEN (nicht überwiesen) markiert.\n\nMöchten Sie diese vorherige Rate zuerst als bezahlt markieren, bevor Sie Rate ${nextRateNr} erfassen?`,
                'Vorherige Rate noch unbezahlt',
                'Ja, vorherige Rate als bezahlt buchen',
                'Nein, nur Folge-Rate anlegen'
            );
            if (markPaid) {
                await handleToggleEntryStatus(entry, 'paid');
            }
        }

        editingEntry = null;
        entryForm = {
            type: entry.type,
            title: entry.title,
            description: entry.description || `Folgerate ${nextRateNr} von ${entry.installment_total_count || ''}`,
            amount: entry.amount,
            category: entry.category || 'Sonstiges',
            payment_status: 'paid',
            invoice_number: entry.invoice_number || '',
            invoice_date: defaultDate,
            due_date: defaultDate,
            paid_at: defaultDate,
            recipient_or_payer: entry.recipient_or_payer,
            payment_method: entry.payment_method || 'bank_transfer',
            contract_id: entry.contract_id || '',
            is_installment: true,
            installment_current: nextRateNr,
            installment_total_count: entry.installment_total_count || '',
            installment_total_amount: entry.installment_total_amount || ''
        };
        entryReceiptFile = null;
        isEntryModalOpen = true;
        toastStore.info(`Daten für Rate ${nextRateNr} vorausgefüllt.`);
    }

    // -------------------------------------------------------------------------
    // LÖSCHEN
    // -------------------------------------------------------------------------
    async function handleDeleteEntry(entry: BudgetEntry) {
        const isInvoice = entry.is_invoice || entry.source === 'accounting';
        const confirmed = await confirmStore.ask(
            `Möchten Sie ${isInvoice ? 'die Rechnungseinnahme' : 'die Buchung'} „${entry.title}“ (${formatCurrency(entry.amount)}) wirklich entfernen?`,
            isInvoice ? 'Rechnung entfernen / stornieren' : 'Buchung löschen',
            'Ja, entfernen',
            'Abbrechen',
            true
        );
        if (!confirmed) return;

        try {
            if (entry.source === 'accounting') {
                await pb.collection('accounting').update(entry.id, {
                    status: 'Storniert',
                    notes: `${entry.description || ''} [Im Haushaltsbuch storniert]`.trim()
                });
            } else {
                await pb.collection('budget_entries').delete(entry.id).catch(async () => {
                    await pb.collection('personal_transactions').delete(entry.id);
                });
            }
            entries = entries.filter((e) => e.id !== entry.id);
            toastStore.success('Eintrag erfolgreich entfernt.');
        } catch (err) {
            console.error('Fehler beim Löschen:', err);
            toastStore.error('Eintrag konnte nicht gelöscht werden.');
        }
    }

    async function handleDeleteContract(contract: Contract) {
        const confirmed = await confirmStore.ask(
            `Möchten Sie den Vertrag „${contract.partner_name}“ (${formatCurrency(contract.amount)}) wirklich löschen?`,
            'Vertrag löschen',
            'Ja, löschen',
            'Abbrechen',
            true
        );
        if (!confirmed) return;

        try {
            await pb.collection('contracts').delete(contract.id).catch(async () => {
                await pb.collection('personal_contracts').delete(contract.id);
            });
            contracts = contracts.filter((c) => c.id !== contract.id);
            toastStore.success('Vertrag gelöscht.');
        } catch (err) {
            console.error('Fehler beim Löschen:', err);
            toastStore.error('Vertrag konnte nicht gelöscht werden.');
        }
    }

    // -------------------------------------------------------------------------
    // BELEG ANSEHEN
    // -------------------------------------------------------------------------
    function handleViewReceipt(entry: BudgetEntry) {
        if (!entry.receipt_file) return;
        try {
            const url = (entry as any).collectionId
                ? pb.files.getURL(entry as any, entry.receipt_file)
                : pb.files.getURL({ collectionName: 'budget_entries', id: entry.id } as any, entry.receipt_file);
            selectedReceiptUrl = url;
            selectedReceiptTitle = `Beleg: ${entry.title} (#${entry.invoice_number || 'Ohne Nr.'})`;
            isReceiptModalOpen = true;
        } catch (err) {
            toastStore.error('Beleg konnte nicht geöffnet werden.');
        }
    }

    // -------------------------------------------------------------------------
    // MODAL FORMULARE: ÖFFNEN / SPEICHERN
    // -------------------------------------------------------------------------
    function openNewEntryModal() {
        const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        editingEntry = null;
        entryForm = {
            type: 'expense',
            title: '',
            description: '',
            amount: '',
            category: 'Büromaterial',
            payment_status: 'open',
            invoice_number: '',
            invoice_date: defaultDate,
            due_date: '',
            paid_at: '',
            recipient_or_payer: '',
            payment_method: 'bank_transfer',
            contract_id: '',
            is_installment: false,
            installment_current: 1,
            installment_total_count: 12,
            installment_total_amount: ''
        };
        entryReceiptFile = null;
        isEntryModalOpen = true;
    }

    function openEditEntryModal(entry: BudgetEntry) {
        editingEntry = entry;
        entryForm = {
            type: entry.type,
            title: entry.title,
            description: entry.description || '',
            amount: entry.amount,
            category: entry.category || 'Sonstiges',
            payment_status: entry.payment_status,
            invoice_number: entry.invoice_number || '',
            invoice_date: entry.invoice_date ? entry.invoice_date.substring(0, 10) : '',
            due_date: entry.due_date ? entry.due_date.substring(0, 10) : '',
            paid_at: entry.paid_at ? entry.paid_at.substring(0, 10) : '',
            recipient_or_payer: entry.recipient_or_payer || '',
            payment_method: entry.payment_method || 'bank_transfer',
            contract_id: entry.contract_id || '',
            is_installment: !!entry.is_installment,
            installment_current: entry.installment_current ?? 1,
            installment_total_count: entry.installment_total_count ?? 12,
            installment_total_amount: entry.installment_total_amount ?? ''
        };
        entryReceiptFile = null;
        isEntryModalOpen = true;
    }

    // Automatische bidirektionale Berechnungshilfe für Ratenzahlung
    function calculateInstallmentRate() {
        const tot = Number(entryForm.installment_total_amount);
        const count = Number(entryForm.installment_total_count);
        const amt = Number(entryForm.amount);

        if (tot > 0 && count > 0) {
            entryForm.amount = parseFloat((tot / count).toFixed(2));
        } else if (amt > 0 && count > 0 && (!tot || tot === 0)) {
            entryForm.installment_total_amount = parseFloat((amt * count).toFixed(2));
        }
    }

    async function handleSaveEntry() {
        if (!entryForm.title.trim()) {
            toastStore.warning('Bitte geben Sie einen Titel / Buchungszweck ein.');
            return;
        }
        if (!entryForm.recipient_or_payer.trim()) {
            toastStore.warning('Bitte geben Sie den Empfänger bzw. Zahler ein.');
            return;
        }
        if (entryForm.amount === '' || Number(entryForm.amount) <= 0) {
            toastStore.warning('Bitte geben Sie einen gültigen Betrag größer als 0 ein.');
            return;
        }

        if (editingEntry && editingEntry.source === 'accounting') {
            try {
                await pb.collection('accounting').update(editingEntry.id, {
                    title: entryForm.title.trim(),
                    amount_gross: Number(entryForm.amount),
                    category: entryForm.category,
                    status: entryForm.payment_status === 'paid' ? 'Bezahlt' : 'Offen',
                    payment_method: entryForm.payment_method === 'cash' ? 'Bar' : 'Banküberweisung',
                    notes: entryForm.description.trim()
                });
                const idx = entries.findIndex((e) => e.id === editingEntry!.id);
                if (idx !== -1) {
                    entries[idx] = {
                        ...entries[idx],
                        title: entryForm.title.trim(),
                        amount: Number(entryForm.amount),
                        category: entryForm.category,
                        payment_status: entryForm.payment_status,
                        payment_method: entryForm.payment_method,
                        description: entryForm.description.trim()
                    };
                    entries = [...entries];
                }
                toastStore.success('Rechnungsbuchung aktualisiert.');
                isEntryModalOpen = false;
                return;
            } catch (err) {
                console.error('Fehler beim Aktualisieren der Rechnungsbuchung:', err);
                toastStore.error('Speichern fehlgeschlagen.');
                return;
            }
        }

        const formData = new FormData();
        if (userId) formData.append('user', userId);
        formData.append('type', entryForm.type);
        formData.append('title', entryForm.title.trim());
        formData.append('description', entryForm.description.trim());
        formData.append('amount', String(entryForm.amount));
        formData.append('category', entryForm.category);
        formData.append('payment_status', entryForm.payment_status);
        formData.append('recipient_or_payer', entryForm.recipient_or_payer.trim());
        formData.append('payment_method', entryForm.payment_method);
        if (entryForm.invoice_number) formData.append('invoice_number', entryForm.invoice_number.trim());
        if (entryForm.invoice_date) formData.append('invoice_date', entryForm.invoice_date);
        if (entryForm.due_date) formData.append('due_date', entryForm.due_date);
        if (entryForm.paid_at) formData.append('paid_at', entryForm.paid_at);
        if (entryForm.contract_id) formData.append('contract_id', entryForm.contract_id);
        if (entryReceiptFile) formData.append('receipt_file', entryReceiptFile);

        formData.append('is_installment', String(entryForm.is_installment));
        if (entryForm.is_installment) {
            if (entryForm.installment_current) formData.append('installment_current', String(entryForm.installment_current));
            if (entryForm.installment_total_count) formData.append('installment_total_count', String(entryForm.installment_total_count));
            if (entryForm.installment_total_amount) formData.append('installment_total_amount', String(entryForm.installment_total_amount));
        }

        try {
            if (editingEntry) {
                const res = await pb.collection('budget_entries').update<BudgetEntry>(editingEntry.id, formData).catch(async () => {
                    return await pb.collection('personal_transactions').update(editingEntry!.id, formData);
                });
                const idx = entries.findIndex((e) => e.id === editingEntry!.id);
                if (idx !== -1) {
                    entries[idx] = { ...entries[idx], ...(res as any) };
                    entries = [...entries];
                }
                toastStore.success('Buchung erfolgreich aktualisiert.');
            } else {
                const res = await pb.collection('budget_entries').create<BudgetEntry>(formData).catch(async () => {
                    return await pb.collection('personal_transactions').create(formData);
                });
                entries = [res as any as BudgetEntry, ...entries];
                toastStore.success('Neue Buchung angelegt.');
            }
            isEntryModalOpen = false;
        } catch (err) {
            console.error('Fehler beim Speichern der Buchung:', err);
            toastStore.error('Speichern fehlgeschlagen.');
        }
    }

    function openNewContractModal() {
        const defaultDue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        editingContract = null;
        contractForm = {
            partner_name: '',
            contract_number: '',
            amount: '',
            interval: 'monthly',
            next_due_date: defaultDue,
            payment_status: 'open',
            category: 'Miete & Wohnen',
            auto_book: false,
            is_active: true,
            description: ''
        };
        isContractModalOpen = true;
    }

    function openEditContractModal(contract: Contract) {
        editingContract = contract;
        contractForm = {
            partner_name: contract.partner_name,
            contract_number: contract.contract_number || '',
            amount: contract.amount,
            interval: contract.interval,
            next_due_date: contract.next_due_date ? contract.next_due_date.substring(0, 10) : '',
            payment_status: contract.payment_status,
            category: contract.category || 'Miete & Wohnen',
            auto_book: contract.auto_book,
            is_active: contract.is_active,
            description: contract.description || ''
        };
        isContractModalOpen = true;
    }

    async function handleSaveContract() {
        if (!contractForm.partner_name.trim()) {
            toastStore.warning('Bitte geben Sie den Anbieter / Vertragspartner an.');
            return;
        }
        if (contractForm.amount === '' || Number(contractForm.amount) <= 0) {
            toastStore.warning('Bitte geben Sie einen gültigen Betrag ein.');
            return;
        }

        const payload: any = {
            user: userId,
            partner_name: contractForm.partner_name.trim(),
            contract_number: contractForm.contract_number.trim(),
            amount: Number(contractForm.amount),
            interval: contractForm.interval,
            next_due_date: contractForm.next_due_date,
            payment_status: contractForm.payment_status,
            category: contractForm.category,
            auto_book: contractForm.auto_book,
            is_active: contractForm.is_active,
            description: contractForm.description.trim()
        };

        try {
            if (editingContract) {
                const res = await pb.collection('contracts').update<Contract>(editingContract.id, payload).catch(async () => {
                    return await pb.collection('personal_contracts').update(editingContract!.id, {
                        title: payload.partner_name,
                        partner: payload.partner_name,
                        amount: payload.amount,
                        interval: payload.interval,
                        next_due_date: payload.next_due_date,
                        category: payload.category,
                        is_active: payload.is_active,
                        notes: payload.description
                    });
                });
                const idx = contracts.findIndex((c) => c.id === editingContract!.id);
                if (idx !== -1) {
                    contracts[idx] = { ...contracts[idx], ...(res as any) };
                    contracts = [...contracts];
                }
                toastStore.success('Vertrag erfolgreich aktualisiert.');
            } else {
                const res = await pb.collection('contracts').create<Contract>(payload).catch(async () => {
                    return await pb.collection('personal_contracts').create({
                        user: userId,
                        title: payload.partner_name,
                        partner: payload.partner_name,
                        amount: payload.amount,
                        interval: payload.interval,
                        next_due_date: payload.next_due_date,
                        category: payload.category,
                        is_active: payload.is_active,
                        notes: payload.description
                    });
                });
                contracts = [res as any as Contract, ...contracts];
                toastStore.success('Neuer Vertrag angelegt.');
            }
            isContractModalOpen = false;
        } catch (err) {
            console.error('Fehler beim Speichern des Vertrags:', err);
            toastStore.error('Speichern des Vertrags fehlgeschlagen.');
        }
    }
</script>

<div class="relative w-full space-y-5 pb-20">
    <!-- ========================================================================= -->
    <!-- 1. FINANZ-DASHBOARD & KENNZAHLEN FÜR GEWÄHLTEN MONAT                       -->
    <!-- ========================================================================= -->
    <header class="relative w-full space-y-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div class="w-full space-y-3">
            <!-- Titel- & Aktionsleiste -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Haushaltsbuch & Finanzen</span>
                        {#if isLoading}
                            <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
                        {/if}
                    </h1>
                    <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Zahlungsströme im Zeitraum: <strong class="font-bold text-indigo-600 dark:text-indigo-400">{periodLabel}</strong>
                    </p>
                </div>

                <!-- Haupt-Aktionsbuttons (Daumenergonomisch min 44x44 px) -->
                <div class="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <!-- Button: Rechnungen abgleichen / synchronisieren -->
                    <button
                        type="button"
                        onclick={handleSyncInvoices}
                        disabled={isSyncingInvoices || isLoading}
                        class="inline-flex min-h-[44px] items-center justify-center gap-1 sm:gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-teal-800 shadow-2xs hover:bg-teal-100 active:scale-95 transition-all dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 disabled:opacity-60 cursor-pointer"
                        title="Alle Kundenrechnungen automatisch als Einnahmen abgleichen"
                    >
                        <RefreshCw class="h-3.5 sm:h-4 w-3.5 sm:w-4 text-teal-600 dark:text-teal-400 {isSyncingInvoices ? 'animate-spin' : ''}" />
                        <span class="truncate"><span class="hidden sm:inline">Rechnungen </span>Sync</span>
                    </button>

                    <!-- Button: Neuer Vertrag -->
                    <button
                        type="button"
                        onclick={openNewContractModal}
                        class="inline-flex min-h-[44px] items-center justify-center gap-1 sm:gap-2 rounded-xl border border-slate-300 bg-white px-2 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        title="Neuen laufenden Vertrag oder Fixkosten anlegen"
                    >
                        <Repeat class="h-3.5 sm:h-4 w-3.5 sm:w-4 text-purple-600 dark:text-purple-400" />
                        <span class="truncate"><span class="hidden sm:inline">Neuer </span>Vertrag</span>
                    </button>

                    <!-- Button: Neue Buchung -->
                    <button
                        type="button"
                        onclick={openNewEntryModal}
                        class="inline-flex min-h-[44px] items-center justify-center gap-1 sm:gap-2 rounded-xl bg-indigo-600 px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all dark:bg-indigo-600 dark:hover:bg-indigo-500 cursor-pointer"
                        title="Neue Einnahme, Ausgabe oder Ratenzahlung erfassen"
                    >
                        <Plus class="h-4 w-4" />
                        <span class="truncate"><span class="hidden sm:inline">Neue </span>Buchung</span>
                    </button>
                </div>
            </div>

            <!-- KPI-Cards (3 Kennzahlen-Karten exakt bezogen auf die Monatswahl) -->
            <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
                <!-- 1. Einnahmen (Grün mit Kundenrechnungs-Aufteilung) -->
                <div class="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 sm:p-3.5 shadow-2xs dark:border-emerald-900/50 dark:bg-emerald-950/35">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                Einnahmen ({periodLabel})
                            </span>
                            <div class="text-lg sm:text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                                +{formatCurrency(totals.totalIncome)}
                            </div>
                        </div>
                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <TrendingUp class="h-5 w-5 stroke-[2.5]" />
                        </div>
                    </div>

                    <!-- Transparente Rechnungs-Info -->
                    <div class="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-emerald-200/70 pt-2 text-[11px] font-medium text-emerald-900 dark:border-emerald-900/50 dark:text-emerald-200">
                        <span class="inline-flex items-center gap-1">
                            <FileCheck class="h-3 w-3 text-teal-600 dark:text-teal-400" />
                            Rechnungen: <strong class="font-bold tabular-nums">+{formatCurrency(totals.invoiceIncome)}</strong>
                        </span>
                        {#if totals.personalIncome > 0}
                            <span class="inline-flex items-center gap-1">
                                • Sonstige: <strong class="font-bold tabular-nums">+{formatCurrency(totals.personalIncome)}</strong>
                            </span>
                        {/if}
                    </div>
                </div>

                <!-- 2. Ausgaben gesamt (Schwarz/Grau) -->
                <div class="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-800/60">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Ausgaben gesamt ({periodLabel})
                            </span>
                            <div class="text-lg sm:text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                                −{formatCurrency(totals.totalExpense)}
                            </div>
                        </div>
                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            <TrendingDown class="h-5 w-5 stroke-[2.5]" />
                        </div>
                    </div>

                    <!-- Saldo- & Sparquoten-Info -->
                    <div class="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-400">
                        <span>Saldo ({totals.totalIncome > 0 ? `${Math.round((totals.balance / totals.totalIncome) * 100)}% Sparquote` : 'Cashflow'}):</span>
                        <strong class="font-bold tabular-nums {totals.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                            {totals.balance >= 0 ? '+' : ''}{formatCurrency(totals.balance)}
                        </strong>
                    </div>
                </div>

                <!-- 3. Noch offen / Verbindlichkeiten (Orange/Rot mit Arrears-Warnung) -->
                <div class="flex flex-col justify-between rounded-xl border {totals.arrearsPayables > 0 ? 'border-rose-400 bg-rose-50/90 dark:border-rose-900/80 dark:bg-rose-950/40 shadow-xs' : 'border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/35 shadow-2xs'} p-3 sm:p-3.5">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-xs font-semibold uppercase tracking-wider {totals.arrearsPayables > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}">
                                Noch offen ({periodLabel})
                            </span>
                            <div class="text-lg sm:text-2xl font-black tabular-nums {totals.arrearsPayables > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}">
                                {formatCurrency(totals.totalOpen)}
                            </div>
                        </div>
                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl {totals.arrearsPayables > 0 ? 'bg-rose-500/20 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400' : 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400'}">
                            {#if totals.arrearsPayables > 0}
                                <AlertTriangle class="h-5 w-5 stroke-[2.5] animate-pulse" />
                            {:else}
                                <Clock class="h-5 w-5 stroke-[2.5]" />
                            {/if}
                        </div>
                    </div>

                    <!-- Hinweis & Differenzierung: Verbindlichkeiten vs Forderungen & RÜCKSTAND AUS VORMONATEN -->
                    <div class="mt-2 space-y-1 border-t {totals.arrearsPayables > 0 ? 'border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300' : 'border-amber-200/80 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'} pt-2 text-[11px]">
                        <div class="flex flex-wrap items-center justify-between gap-1">
                            <span>Verbindlichkeiten: <strong>{formatCurrency(totals.openPayables)}</strong></span>
                            {#if totals.openReceivables > 0}
                                <span class="text-emerald-700 dark:text-emerald-300">
                                    • Forderungen: <strong>+{formatCurrency(totals.openReceivables)}</strong>
                                </span>
                            {/if}
                        </div>
                        {#if totals.arrearsPayables > 0}
                            <div class="flex items-center justify-between gap-1 font-bold text-rose-700 dark:text-rose-300">
                                <span class="flex items-center gap-1">
                                    <AlertTriangle class="h-3.5 w-3.5 text-rose-600 animate-pulse shrink-0" />
                                    <span>+{formatCurrency(totals.arrearsPayables)} Rückstand ({totals.arrearsCount} Posten)!</span>
                                </span>
                                <button
                                    type="button"
                                    onclick={() => (statusFilter = 'arrears')}
                                    class="text-[10px] underline hover:text-rose-950 dark:hover:text-rose-100 cursor-pointer"
                                    title="Zeigt alle unbezahlten Posten aus den Vormonaten an"
                                >
                                    Rückstände filtern
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Zusammenfassende Info-Leiste für Verträge & Ratenverbindlichkeiten -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-100/90 p-2.5 text-xs text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                <!-- Verträge Info -->
                <div class="flex flex-wrap items-center justify-between gap-1.5 sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:pr-3">
                    <div class="flex items-center gap-1.5">
                        <Repeat class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        <span class="font-medium">Laufende Fixkosten:</span>
                        <strong class="font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(totals.fixedCostsMonthly)} / Monat
                        </strong>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="h-2 w-2 rounded-full {totals.openFixedCostsMonthly > 0 ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
                        <span class="text-[11px]">Diesen Monat offen:</span>
                        <strong class="font-bold {totals.openFixedCostsMonthly > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">
                            {formatCurrency(totals.openFixedCostsMonthly)}
                        </strong>
                    </div>
                </div>

                <!-- Ratenzahlungen Info -->
                <div class="flex flex-wrap items-center justify-between gap-1.5 sm:pl-1">
                    <div class="flex items-center gap-1.5">
                        <Layers class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span class="font-medium">Laufende Ratenkäufe:</span>
                        <strong class="font-bold text-slate-900 dark:text-slate-100">
                            {totals.installmentsCount} {totals.installmentsCount === 1 ? 'Plan' : 'Pläne'}
                        </strong>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[11px]">Verbleibende Restschuld:</span>
                        <strong class="font-bold text-indigo-700 dark:text-indigo-300">
                            {formatCurrency(totals.openInstallmentsTotal)}
                        </strong>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- ========================================================================= -->
    <!-- 2. ZEIT- & MONATSSTEUERUNG (HERVORRAGEND FÜR MOBIL & DESKTOP)              -->
    <!-- ========================================================================= -->
    <div class="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/95 space-y-3">
        <!-- Obere Steuerungszeile: Monat ◀ ▶, Jahr, Heute, Ansichtsmodi -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <!-- Links: Monats-Navigator mit ◀, Aktueller Monat Label, ▶ -->
            <div class="flex items-center justify-between sm:justify-start gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <button
                    type="button"
                    onclick={goToPrevMonth}
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white active:scale-95 transition-all dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                    title="Vorheriger Monat"
                >
                    <ChevronLeft class="h-5 w-5" />
                </button>

                <!-- Aktiver Monat & Jahr Anzeige -->
                <div class="flex items-center gap-2 px-2 sm:px-3 py-1.5">
                    <CalendarDays class="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span class="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 min-w-[120px] sm:min-w-[150px] text-center">
                        {selectedMonthName} {selectedYear}
                    </span>
                </div>

                <button
                    type="button"
                    onclick={goToNextMonth}
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white active:scale-95 transition-all dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                    title="Nächster Monat"
                >
                    <ChevronRight class="h-5 w-5" />
                </button>

                <!-- Schnelltaste "Heute" -->
                <button
                    type="button"
                    onclick={goToCurrentMonth}
                    class="min-h-[44px] px-3 rounded-xl text-xs font-bold text-indigo-600 hover:bg-white transition-all dark:text-indigo-400 dark:hover:bg-slate-700 ml-1 cursor-pointer"
                    title="Zum heutigen Monat springen"
                >
                    Heute
                </button>
            </div>

            <!-- Rechts: Jahr-Dropdown & Zeit-Modi (Monat, Quartal, Jahr, Gesamt) -->
            <div class="flex flex-wrap items-center justify-between sm:justify-end gap-2">
                <!-- Jahr-Auswahl -->
                <div class="relative">
                    <select
                        bind:value={selectedYear}
                        onchange={() => { timeFilter = 'month'; }}
                        aria-label="Haushaltsjahr auswählen"
                        class="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                        {#each availableYears as yr}
                            <option value={yr}>Jahr {yr}</option>
                        {/each}
                    </select>
                </div>

                <!-- Ansichts-Filter: Monat | Quartal | Jahr | Gesamt -->
                <div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    <button
                        type="button"
                        onclick={() => (timeFilter = 'month')}
                        class="min-h-[44px] px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer {timeFilter === 'month' || timeFilter === 'this_month'
                            ? 'bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                    >
                        Monat
                    </button>
                    <button
                        type="button"
                        onclick={() => (timeFilter = 'quarter')}
                        class="min-h-[44px] px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer {timeFilter === 'quarter'
                            ? 'bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                    >
                        Q{Math.ceil(selectedMonth / 3)}
                    </button>
                    <button
                        type="button"
                        onclick={() => (timeFilter = 'year')}
                        class="min-h-[44px] px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer {timeFilter === 'year'
                            ? 'bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                    >
                        Gesamtjahr
                    </button>
                    <button
                        type="button"
                        onclick={() => (timeFilter = 'all')}
                        class="min-h-[44px] px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer {timeFilter === 'all'
                            ? 'bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                    >
                        Alle
                    </button>
                </div>
            </div>
        </div>

        <!-- Untere Leiste: Die 12 Monate Jan - Dez als Klick-Pills (mit Datenindikator- & Rückstands-Punkt) -->
        <div bind:this={monthPillsContainer} class="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1 scroll-smooth touch-pan-x snap-x">
            {#each Array.from({ length: 12 }) as _, i}
                {@const mNum = i + 1}
                {@const mName = new Date(selectedYear, i, 1).toLocaleString('de-DE', { month: 'short' })}
                {@const isSelected = (timeFilter === 'month' || timeFilter === 'this_month') && selectedMonth === mNum}
                {@const hasData = monthsWithData.has(mNum)}
                {@const hasUnpaid = monthsWithUnpaid.has(mNum)}
                <button
                    type="button"
                    data-month={mNum}
                    onclick={() => setMonth(mNum)}
                    title={hasUnpaid ? `Achtung: Im ${mName} existieren noch unbezahlte Posten / Raten!` : (hasData ? `Buchungen im ${mName} vorhanden` : `Monat ${mName}`)}
                    class="relative min-h-[44px] min-w-[52px] sm:flex-1 shrink-0 flex flex-col items-center justify-center rounded-xl px-2 py-1 transition-all active:scale-95 touch-manipulation snap-center cursor-pointer {isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-xs ring-2 ring-indigo-600 ring-offset-1 dark:ring-offset-slate-900'
                        : hasUnpaid
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-700'}"
                >
                    <span class="text-xs sm:text-sm font-semibold">{mName}</span>
                    <span class="text-[9px] {isSelected ? 'text-indigo-100' : hasUnpaid ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-400 dark:text-slate-500'}">
                        {mNum < 10 ? `0${mNum}` : mNum}
                    </span>

                    <!-- Indikatorpunkt: Bernstein/Rot für unbezahlte Rückstände, Blau für gebuchte Daten -->
                    {#if hasUnpaid}
                        <span class="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" title="Unbezahlte Raten/Buchungen!"></span>
                    {:else if hasData && !isSelected}
                        <span class="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 3. FILTER- & SORTIERLEISTE (STATUS, KATEGORIE, SUCHE)                     -->
    <!-- ========================================================================= -->
    <div class="space-y-3">
        <!-- Suchfeld & Kategorie-Auswahl -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <!-- Suchfeld -->
            <div class="relative flex-1">
                <Search class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Suchen nach Kunde, Empfänger, Rechnungs-Nr., Zweck..."
                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                {#if searchQuery}
                    <button
                        type="button"
                        onclick={() => (searchQuery = '')}
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                        <X class="h-4 w-4" />
                    </button>
                {/if}
            </div>

            <!-- Kategorie-Filter Dropdown -->
            <div class="sm:w-60">
                <select
                    bind:value={categoryFilter}
                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                >
                    <option value="all">Alle Kategorien</option>
                    {#each BUDGET_CATEGORIES as cat}
                        <option value={cat.name}>{cat.name}</option>
                    {/each}
                </select>
            </div>
        </div>

        <!-- STATUS-CHIPS (INKLUSIVE RECHNUNGEN & RATENZAHLUNGEN) -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2">
            <span class="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 pr-1">Filter:</span>

            <button
                type="button"
                onclick={() => (statusFilter = 'all')}
                class="inline-flex min-h-[44px] shrink-0 items-center rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer {statusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
            >
                Alle Einträge ({entries.length})
            </button>

            <!-- Filter: Nur Rechnungen -->
            <button
                type="button"
                onclick={() => (statusFilter = 'invoices')}
                class="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer {statusFilter === 'invoices'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60'}"
            >
                <FileCheck class="h-4 w-4" />
                <span>Kundenrechnungen ({totals.invoicesCount})</span>
            </button>

            <!-- Filter: Überfällige Rückstände aus Vormonaten -->
            {#if totals.arrearsCount > 0}
                <button
                    type="button"
                    onclick={() => (statusFilter = 'arrears')}
                    class="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer {statusFilter === 'arrears'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'}"
                    title="Zeigt {totals.arrearsCount} unbezahlte Ausgaben / Raten aus vorherigen Monaten"
                >
                    <AlertTriangle class="h-4 w-4 animate-pulse text-rose-600 dark:text-rose-400" />
                    <span>⚠️ Rückstände ({totals.arrearsCount})</span>
                </button>
            {/if}

            <!-- Filter: Nur Offene -->
            <button
                type="button"
                onclick={() => (statusFilter = 'open')}
                class="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer {statusFilter === 'open'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60'}"
            >
                <Clock class="h-4 w-4" />
                <span>Nur Offene</span>
            </button>

            <!-- Filter: Bereits Bezahlt -->
            <button
                type="button"
                onclick={() => (statusFilter = 'paid')}
                class="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer {statusFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'}"
            >
                <CheckCircle2 class="h-4 w-4" />
                <span>Bereits Bezahlt</span>
            </button>

            <!-- Filter: Ratenzahlungen -->
            <button
                type="button"
                onclick={() => (statusFilter = 'installments')}
                class="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer {statusFilter === 'installments'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60'}"
            >
                <Layers class="h-4 w-4" />
                <span>Ratenzahlungen ({totals.installmentsCount})</span>
            </button>

            <!-- Filter: Laufende Verträge -->
            <button
                type="button"
                onclick={() => (statusFilter = 'contracts')}
                class="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer {statusFilter === 'contracts'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60'}"
            >
                <Repeat class="h-4 w-4" />
                <span>Laufende Verträge ({contracts.length})</span>
            </button>
        </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 4. BUCHUNGS- & VERTRAGSLISTE (MODERNE KARTEN)                              -->
    <!-- ========================================================================= -->
    <main class="space-y-6">
        <!-- FALL A: Reine Vertragsansicht gewählt -->
        {#if statusFilter === 'contracts'}
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Repeat class="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <span>Laufende Verträge & Fixkosten ({filteredContracts.length})</span>
                    </h2>
                </div>

                {#if filteredContracts.length === 0}
                    <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                        <Repeat class="mx-auto h-10 w-10 text-slate-400 mb-2" />
                        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Verträge gefunden</h3>
                        <p class="text-sm text-slate-500 mt-1">Legen Sie Daueraufträge, Versicherungen oder Software-Abos an.</p>
                        <button
                            type="button"
                            onclick={openNewContractModal}
                            class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 active:scale-95 cursor-pointer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>Vertrag anlegen</span>
                        </button>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {#each filteredContracts as contract (contract.id)}
                            <ContractCard
                                {contract}
                                onBookNow={handleBookContractNow}
                                onToggleStatus={handleToggleContractStatus}
                                onEdit={openEditContractModal}
                                onDelete={handleDeleteContract}
                            />
                        {/each}
                    </div>
                {/if}
            </section>
        {:else}
            <!-- FALL B: Buchungen (Kundenrechnungen, Ratenkäufe, private Buchungen) -->
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {#if statusFilter === 'arrears'}
                            <AlertTriangle class="h-5 w-5 text-rose-600 dark:text-rose-400" />
                            <span>Überfällige Zahlungsrückstände aus Vormonaten ({filteredEntries.length})</span>
                        {:else if statusFilter === 'invoices'}
                            <FileCheck class="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            <span>Kundenrechnungen & Einnahmen ({filteredEntries.length})</span>
                        {:else if statusFilter === 'installments'}
                            <Layers class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            <span>Laufende Ratenzahlungen & Finanzierungen ({filteredEntries.length})</span>
                        {:else}
                            <span>Buchungen für {periodLabel} ({filteredEntries.length})</span>
                        {/if}
                    </h2>
                </div>

                <!-- PROMINENTES RÜCKSTANDS-BANNER (Wenn unbezahlte Raten/Buchungen aus Vormonaten existieren) -->
                {#if arrearsExpenseEntries.length > 0 && statusFilter !== 'arrears' && timeFilter === 'month'}
                    <div class="rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-rose-50/80 p-4 sm:p-5 shadow-sm dark:border-amber-700/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/30 space-y-3">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3 dark:border-amber-900/60">
                            <div class="flex items-start gap-2.5">
                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                                    <AlertTriangle class="h-5 w-5 animate-pulse" />
                                </div>
                                <div>
                                    <h3 class="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                                        <span>Zahlungsrückstände aus Vormonaten!</span>
                                        <span class="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                                            {totals.arrearsCount} {totals.arrearsCount === 1 ? 'Posten' : 'Posten'}
                                        </span>
                                    </h3>
                                    <p class="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                                        {totals.arrearsInstallmentsCount > 0 ? `${totals.arrearsInstallmentsCount} unbezahlte Rate(n) ` : ''}im Gesamtwert von <strong>{formatCurrency(totals.arrearsPayables)}</strong> wurden in Vormonaten nicht überwiesen.
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                    type="button"
                                    onclick={() => (showArrearsInCurrentView = !showArrearsInCurrentView)}
                                    class="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-300 bg-white/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs hover:bg-white active:scale-95 transition-all dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-200 cursor-pointer"
                                >
                                    <span>{showArrearsInCurrentView ? 'Rückstände einklappen' : 'Rückstände einblenden'}</span>
                                </button>
                            </div>
                        </div>

                        {#if showArrearsInCurrentView}
                            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 pt-1">
                                {#each arrearsExpenseEntries as arrearEntry (arrearEntry.id)}
                                    <BudgetCard
                                        entry={arrearEntry}
                                        isArrear={true}
                                        onToggleStatus={handleToggleEntryStatus}
                                        onEdit={openEditEntryModal}
                                        onDelete={handleDeleteEntry}
                                        onViewReceipt={handleViewReceipt}
                                        onBookNextInstallment={handleBookNextInstallment}
                                        onPayArrearNow={handlePayArrearNow}
                                        onViewInstallmentPlan={openInstallmentPlanModal}
                                    />
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}

                {#if filteredEntries.length === 0}
                    <div class="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
                        {#if statusFilter === 'arrears'}
                            <CheckCircle2 class="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Zahlungsrückstände!</h3>
                            <p class="text-sm text-slate-500 mt-1">Alle Raten und Verbindlichkeiten aus den Vormonaten wurden planmäßig überwiesen.</p>
                            <button
                                type="button"
                                onclick={() => (statusFilter = 'all')}
                                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
                            >
                                <span>Zurück zu allen Buchungen</span>
                            </button>
                        {:else if statusFilter === 'invoices'}
                            <FileCheck class="mx-auto h-10 w-10 text-teal-400 mb-2" />
                            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Rechnungen im Zeitraum {periodLabel}</h3>
                            <p class="text-sm text-slate-500 mt-1">Klicken Sie oben auf „Rechnungen Sync“, um abgeschlossene Ausgangsrechnungen abzugleichen, oder wählen Sie einen anderen Monat.</p>
                            <button
                                type="button"
                                onclick={handleSyncInvoices}
                                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 active:scale-95 cursor-pointer"
                            >
                                <RefreshCw class="h-4 w-4" />
                                <span>Jetzt Rechnungen abgleichen</span>
                            </button>
                        {:else if statusFilter === 'installments'}
                            <Layers class="mx-auto h-10 w-10 text-slate-400 mb-2" />
                            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Ratenzahlungen vorhanden</h3>
                            <p class="text-sm text-slate-500 mt-1">Erfassen Sie eine Buchung und aktivieren Sie das Kontrollkästchen „Ratenzahlung“.</p>
                            <button
                                type="button"
                                onclick={openNewEntryModal}
                                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer"
                            >
                                <Plus class="h-4 w-4" />
                                <span>Neue Buchung anlegen</span>
                            </button>
                        {:else}
                            <DollarSign class="mx-auto h-10 w-10 text-slate-400 mb-2" />
                            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Buchungen für {periodLabel}</h3>
                            <p class="text-sm text-slate-500 mt-1">Nutzen Sie die Monatsleiste oben zum Wechseln oder erfassen Sie eine neue Buchung.</p>
                            <button
                                type="button"
                                onclick={openNewEntryModal}
                                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer"
                            >
                                <Plus class="h-4 w-4" />
                                <span>Neue Buchung anlegen</span>
                            </button>
                        {/if}
                    </div>
                {:else}
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {#each filteredEntries as entry (entry.id)}
                            <BudgetCard
                                {entry}
                                isArrear={isEntryArrear(entry)}
                                onToggleStatus={handleToggleEntryStatus}
                                onEdit={openEditEntryModal}
                                onDelete={handleDeleteEntry}
                                onViewReceipt={handleViewReceipt}
                                onBookNextInstallment={handleBookNextInstallment}
                                onPayArrearNow={handlePayArrearNow}
                                onViewInstallmentPlan={openInstallmentPlanModal}
                            />
                        {/each}
                    </div>
                {/if}
            </section>
        {/if}
    </main>

    <!-- ========================================================================= -->
    <!-- 5. MODAL: BUCHUNG ERSTELLEN / BEARBEITEN (INKL. RATENZAHLUNG)             -->
    <!-- ========================================================================= -->
    {#if isEntryModalOpen}
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
            <div class="relative w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-0 sm:my-8 overflow-hidden">
                <!-- Mobile Grab Handle -->
                <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0"></div>

                <!-- Modal Kopfzeile -->
                <div class="flex items-center justify-between border-b border-slate-100 px-5 pb-3 sm:pb-4 dark:border-slate-800 shrink-0">
                    <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {#if entryForm.is_installment}
                            <Layers class="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        {/if}
                        <span class="truncate">{editingEntry ? (editingEntry.source === 'accounting' ? 'Rechnungs-Einnahme bearbeiten' : 'Buchung bearbeiten') : (entryForm.is_installment ? 'Ratenzahlung erfassen' : 'Neue Buchung erfassen')}</span>
                    </h3>
                    <button
                        type="button"
                        onclick={() => (isEntryModalOpen = false)}
                        class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                    >
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <!-- Modal Inhalt / Formular mit separatem scrollbarem Body & festem Footer -->
                <form onsubmit={(e) => { e.preventDefault(); handleSaveEntry(); }} class="flex flex-col flex-1 overflow-hidden min-h-0">
                    <div class="overflow-y-auto flex-1 p-5 space-y-4">
                        <!-- Typ-Schalter: Einnahme vs Ausgabe -->
                        <div class="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                            <button
                                type="button"
                                onclick={() => (entryForm.type = 'expense')}
                                class="min-h-[44px] rounded-lg text-sm font-semibold transition-all cursor-pointer {entryForm.type === 'expense'
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400'}"
                            >
                                Ausgabe (−)
                            </button>
                            <button
                                type="button"
                                onclick={() => (entryForm.type = 'income')}
                                class="min-h-[44px] rounded-lg text-sm font-semibold transition-all cursor-pointer {entryForm.type === 'income'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400'}"
                            >
                                Einnahme (+)
                            </button>
                        </div>

                        <!-- Empfänger / Zahler & Betrag -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label for="recipient_payer" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {entryForm.type === 'income' ? 'Zahler / Klient / Kunde *' : 'Empfänger / Händler *'}
                                </label>
                                <input
                                    id="recipient_payer"
                                    type="text"
                                    bind:value={entryForm.recipient_or_payer}
                                    required
                                    placeholder="z. B. Max Mustermann, Otto, Vermieter"
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label for="entry_amount" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {entryForm.is_installment ? 'Betrag dieser Rate (EUR) *' : 'Betrag in EUR *'}
                                </label>
                                <input
                                    id="entry_amount"
                                    type="number"
                                    step="0.01"
                                    bind:value={entryForm.amount}
                                    oninput={calculateInstallmentRate}
                                    required
                                    placeholder="0,00"
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        <!-- Titel / Buchungszweck -->
                        <div>
                            <label for="entry_title" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Titel / Buchungszweck *
                            </label>
                            <input
                                id="entry_title"
                                type="text"
                                bind:value={entryForm.title}
                                required
                                placeholder="z. B. Rechnung RE-2026-0042, Waschmaschine Bosch"
                                class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                        </div>

                        <!-- SEKTION RATENZAHLUNG -->
                        <div class="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3">
                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    bind:checked={entryForm.is_installment}
                                    class="h-5 w-5 rounded-md border-indigo-300 text-indigo-600 focus:ring-indigo-500 dark:border-indigo-700"
                                />
                                <div class="flex items-center gap-1.5">
                                    <Layers class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <span class="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        Als Ratenzahlung erfassen
                                    </span>
                                </div>
                            </label>

                            {#if entryForm.is_installment}
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                                    <div>
                                        <label for="installment_curr" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Aktuelle Rate Nr.
                                        </label>
                                        <input
                                            id="installment_curr"
                                            type="number"
                                            min="1"
                                            bind:value={entryForm.installment_current}
                                            placeholder="z. B. 1"
                                            class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label for="installment_tot_count" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Anzahl Raten gesamt
                                        </label>
                                        <input
                                            id="installment_tot_count"
                                            type="number"
                                            min="1"
                                            bind:value={entryForm.installment_total_count}
                                            oninput={calculateInstallmentRate}
                                            placeholder="z. B. 12"
                                            class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between mb-1">
                                            <label for="installment_tot_amount" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                Gesamtsumme (€)
                                            </label>
                                            <button
                                                type="button"
                                                onclick={calculateInstallmentRate}
                                                class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                                title="Monatsrate berechnen"
                                            >
                                                Rate berechnen
                                            </button>
                                        </div>
                                        <input
                                            id="installment_tot_amount"
                                            type="number"
                                            step="0.01"
                                            bind:value={entryForm.installment_total_amount}
                                            oninput={calculateInstallmentRate}
                                            placeholder="z. B. 1200.00"
                                            class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                </div>
                            {/if}
                        </div>

                        <!-- Kategorie & Zahlungsart -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label for="entry_cat" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Kategorie
                                </label>
                                <select
                                    id="entry_cat"
                                    bind:value={entryForm.category}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                                >
                                    {#each BUDGET_CATEGORIES as cat}
                                        <option value={cat.name}>{cat.name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label for="entry_payment_method" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Zahlungsart
                                </label>
                                <select
                                    id="entry_payment_method"
                                    bind:value={entryForm.payment_method}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                                >
                                    {#each Object.entries(PAYMENT_METHOD_METADATA) as [key, meta]}
                                        <option value={key}>{meta.label}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <!-- Zahlungsstatus & Daten -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label for="entry_status" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Zahlungsstatus
                                </label>
                                <select
                                    id="entry_status"
                                    bind:value={entryForm.payment_status}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                                >
                                    <option value="paid">Bezahlt</option>
                                    <option value="open">Offen / Fällig</option>
                                    <option value="scheduled">Geplant / Dauerauftrag</option>
                                </select>
                            </div>
                            <div>
                                <label for="entry_invoice_date" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Rechnungsdatum
                                </label>
                                <input
                                    id="entry_invoice_date"
                                    type="date"
                                    bind:value={entryForm.invoice_date}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label for="entry_due_date" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Fälligkeitsdatum
                                </label>
                                <input
                                    id="entry_due_date"
                                    type="date"
                                    bind:value={entryForm.due_date}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        <!-- Rechnungsnummer & Beleg-Upload -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label for="entry_invoice_number" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Rechnungsnummer
                                </label>
                                <input
                                    id="entry_invoice_number"
                                    type="text"
                                    bind:value={entryForm.invoice_number}
                                    placeholder="z. B. RE-2026-0042"
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label for="entry_receipt_file" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Belegdatei (PDF/Bild)
                                </label>
                                <input
                                    id="entry_receipt_file"
                                    type="file"
                                    accept="application/pdf,image/*"
                                    onchange={(e) => {
                                        const target = e.target as HTMLInputElement;
                                        if (target.files && target.files[0]) {
                                            entryReceiptFile = target.files[0];
                                        }
                                    }}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:file:bg-slate-700 dark:file:text-slate-200"
                                />
                            </div>
                        </div>

                        <!-- Beschreibung / Notizen -->
                        <div>
                            <label for="entry_desc" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Notizen / Bemerkungen
                            </label>
                            <textarea
                                id="entry_desc"
                                bind:value={entryForm.description}
                                rows="2"
                                placeholder="Optionale Details oder Notizen..."
                                class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            ></textarea>
                        </div>
                    </div>

                    <!-- Fester Aktionsbereich (Sticky Footer für optimale Daumenergonomie) -->
                    <div class="border-t border-slate-100 bg-slate-50/90 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
                        <button
                            type="button"
                            onclick={() => (isEntryModalOpen = false)}
                            class="min-h-[44px] w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            class="min-h-[44px] w-full sm:w-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
                        >
                            {editingEntry ? 'Änderungen speichern' : 'Buchung anlegen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- ========================================================================= -->
    <!-- 6. MODAL: VERTRAG ERSTELLEN / BEARBEITEN                                  -->
    <!-- ========================================================================= -->
    {#if isContractModalOpen}
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
            <div class="relative w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-0 sm:my-8 overflow-hidden">
                <!-- Mobile Grab Handle -->
                <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0"></div>

                <!-- Modal Kopfzeile -->
                <div class="flex items-center justify-between border-b border-slate-100 px-5 pb-3 sm:pb-4 dark:border-slate-800 shrink-0">
                    <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                        {editingContract ? 'Vertrag bearbeiten' : 'Neuen Vertrag / Fixkosten anlegen'}
                    </h3>
                    <button
                        type="button"
                        onclick={() => (isContractModalOpen = false)}
                        class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                    >
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <!-- Modal Formular mit separatem scrollbarem Body & festem Footer -->
                <form onsubmit={(e) => { e.preventDefault(); handleSaveContract(); }} class="flex flex-col flex-1 overflow-hidden min-h-0">
                    <div class="overflow-y-auto flex-1 p-5 space-y-4">
                        <!-- Partner & Betrag -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label for="contract_partner" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Vertragspartner / Anbieter *
                                </label>
                                <input
                                    id="contract_partner"
                                    type="text"
                                    bind:value={contractForm.partner_name}
                                    required
                                    placeholder="z. B. Vodafone, Vermieter, Haftpflicht"
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label for="contract_amount" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Regelmäßiger Betrag (EUR) *
                                </label>
                                <input
                                    id="contract_amount"
                                    type="number"
                                    step="0.01"
                                    bind:value={contractForm.amount}
                                    required
                                    placeholder="0,00"
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        <!-- Vertragsnummer & Intervall -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label for="contract_number" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Vertrags- oder Kundennummer
                                </label>
                                <input
                                    id="contract_number"
                                    type="text"
                                    bind:value={contractForm.contract_number}
                                    placeholder="z. B. KD-892314-X"
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label for="contract_interval" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Intervall
                                </label>
                                <select
                                    id="contract_interval"
                                    bind:value={contractForm.interval}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                                >
                                    <option value="monthly">Monatlich</option>
                                    <option value="quarterly">Vierteljährlich</option>
                                    <option value="yearly">Jährlich</option>
                                </select>
                            </div>
                        </div>

                        <!-- Kategorie & Nächster Stichtag -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label for="contract_category" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Kategorie
                                </label>
                                <select
                                    id="contract_category"
                                    bind:value={contractForm.category}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                                >
                                    {#each BUDGET_CATEGORIES as cat}
                                        <option value={cat.name}>{cat.name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label for="contract_due" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Nächster Ausführungstag
                                </label>
                                <input
                                    id="contract_due"
                                    type="date"
                                    bind:value={contractForm.next_due_date}
                                    required
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        <!-- Status laufender Monat & Automatik -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label for="contract_status" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Status aktueller Zyklus
                                </label>
                                <select
                                    id="contract_status"
                                    bind:value={contractForm.payment_status}
                                    class="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                                >
                                    <option value="open">Offen für diesen Zyklus</option>
                                    <option value="paid">Bereits bezahlt</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2 pt-2 sm:pt-6">
                                <input
                                    id="auto_book"
                                    type="checkbox"
                                    bind:checked={contractForm.auto_book}
                                    class="h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 cursor-pointer"
                                />
                                <label for="auto_book" class="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Automatisch zum Stichtag verbuchen
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Fester Aktionsbereich (Sticky Footer) -->
                    <div class="border-t border-slate-100 bg-slate-50/90 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
                        <button
                            type="button"
                            onclick={() => (isContractModalOpen = false)}
                            class="min-h-[44px] w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            class="min-h-[44px] w-full sm:w-auto rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
                        >
                            {editingContract ? 'Änderungen speichern' : 'Vertrag anlegen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- ========================================================================= -->
    <!-- 7. MODAL: BELEG-VORSCHAU                                                  -->
    <!-- ========================================================================= -->
    {#if isReceiptModalOpen && selectedReceiptUrl}
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 p-0 sm:p-4 backdrop-blur-xs">
            <div class="relative flex max-h-[92vh] sm:max-h-[90vh] w-full max-w-3xl flex-col rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <!-- Mobile Grab Handle -->
                <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2 sm:hidden shrink-0"></div>

                <div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 shrink-0">
                    <h3 class="truncate text-base font-bold text-slate-900 dark:text-slate-100" title={selectedReceiptTitle}>
                        {selectedReceiptTitle}
                    </h3>
                    <div class="flex items-center gap-2">
                        <a
                            href={selectedReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="In neuem Tab öffnen / herunterladen"
                        >
                            <Download class="h-4 w-4" />
                        </a>
                        <button
                            type="button"
                            onclick={() => { isReceiptModalOpen = false; selectedReceiptUrl = null; }}
                            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <X class="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div class="mt-3 flex-1 overflow-auto rounded-xl bg-slate-100 p-2 dark:bg-slate-950 flex items-center justify-center min-h-[50vh]">
                    {#if selectedReceiptUrl.toLowerCase().includes('.pdf')}
                        <iframe
                            src={selectedReceiptUrl}
                            class="h-[60vh] w-full rounded-lg border-0"
                            title="PDF Beleg-Vorschau"
                        ></iframe>
                    {:else}
                        <img
                            src={selectedReceiptUrl}
                            alt="Beleg-Vorschau"
                            class="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md"
                        />
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- ========================================================================= -->
    <!-- 8. MODAL: RATENPLAN-INSPEKTOR & MONATSVERLAUF                             -->
    <!-- ========================================================================= -->
    {#if selectedInstallmentPlanKey && selectedInstallmentPrimary}
        {@const planInfo = getInstallmentProgress(selectedInstallmentPrimary)}
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
            <div class="relative w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-0 sm:my-8 overflow-hidden">
                <!-- Mobile Grab Handle -->
                <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0"></div>

                <!-- Modal Kopfzeile -->
                <div class="flex items-center justify-between border-b border-slate-100 px-5 pb-3 sm:pb-4 dark:border-slate-800 shrink-0">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 shrink-0">
                            <Layers class="h-5 w-5" />
                        </div>
                        <div class="min-w-0">
                            <h3 class="truncate text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                                Ratenplan: {selectedInstallmentPrimary.recipient_or_payer}
                            </h3>
                            <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                                {selectedInstallmentPrimary.title} • Gesamtsumme: {formatCurrency(planInfo.totalAmount)}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onclick={() => (selectedInstallmentPlanKey = null)}
                        class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                    >
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <!-- Scrollable Body -->
                <div class="overflow-y-auto flex-1 p-5 space-y-4">
                    <!-- Übersicht / Fortschritt -->
                    <div class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                        <div class="flex items-center justify-between text-sm font-bold text-indigo-900 dark:text-indigo-200">
                            <span>Status: {planInfo.current} von {planInfo.totalCount} Raten erfasst</span>
                            <span>{planInfo.percentage}%</span>
                        </div>
                        <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/60">
                            <div class="h-full rounded-full {planInfo.isFinished ? 'bg-emerald-500' : 'bg-indigo-600'} transition-all" style="width: {planInfo.percentage}%;"></div>
                        </div>
                        <div class="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <span>Restschuld: <strong class="text-indigo-700 dark:text-indigo-300">{formatCurrency(planInfo.remainingAmount)}</strong></span>
                            <span>{planInfo.remainingCount} Rate(n) noch ausstehend</span>
                        </div>
                    </div>

                    <!-- Einzelne Raten im Monatsverlauf -->
                    <div class="space-y-2">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ratenübersicht & Zahlungsstatus:</h4>
                        {#each selectedInstallmentEntries as rEntry}
                            {@const isPaid = rEntry.payment_status === 'paid'}
                            {@const isOverdue = !isPaid && isEntryArrear(rEntry)}
                            <div class="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm {isPaid ? 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40' : isOverdue ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black {isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : isOverdue ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
                                        {rEntry.installment_current || '•'}
                                    </span>
                                    <div class="min-w-0">
                                        <div class="truncate font-bold text-slate-900 dark:text-slate-100">
                                            Rate {rEntry.installment_current} von {rEntry.installment_total_count} ({formatCurrency(rEntry.amount)})
                                        </div>
                                        <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                                            {#if isPaid}
                                                Bezahlt am {formatDate(rEntry.paid_at || rEntry.invoice_date)}
                                            {:else if isOverdue}
                                                <span class="font-bold text-rose-600 dark:text-rose-400">⚠️ Nicht überwiesen ({formatDate(rEntry.invoice_date || rEntry.due_date)})</span>
                                            {:else}
                                                Fällig am {formatDate(rEntry.due_date || rEntry.invoice_date)}
                                            {/if}
                                        </div>
                                    </div>
                                </div>

                                <div class="shrink-0">
                                    {#if !isPaid}
                                        <button
                                            type="button"
                                            onclick={() => { handlePayArrearNow(rEntry); }}
                                            class="min-h-[38px] rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                        >
                                            Als bezahlt buchen
                                        </button>
                                    {:else}
                                        <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <Check class="h-4 w-4 stroke-[3]" /> Bezahlt
                                        </span>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Footer -->
                <div class="border-t border-slate-100 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                    <button
                        type="button"
                        onclick={() => (selectedInstallmentPlanKey = null)}
                        class="min-h-[44px] w-full sm:w-auto rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 cursor-pointer text-center"
                    >
                        Schließen
                    </button>
                    {#if !planInfo.isFinished}
                        <button
                            type="button"
                            onclick={() => { selectedInstallmentPlanKey = null; handleBookNextInstallment(selectedInstallmentPrimary); }}
                            class="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>Folge-Rate buchen</span>
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
