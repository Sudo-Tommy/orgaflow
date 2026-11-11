import type { BudgetEntry, Contract } from '$lib/types/budget';
import type { EntryFormState, ContractFormState, BudgetActions } from './useBudgetActions.svelte';

export class BudgetModalState {
    isEntryModalOpen = $state(false);
    isContractModalOpen = $state(false);
    isReceiptModalOpen = $state(false);
    selectedReceiptUrl = $state<string | null>(null);
    selectedReceiptTitle = $state<string>('');
    showArrearsInCurrentView = $state(true);
    selectedInstallmentPlanKey = $state<string | null>(null);

    editingEntry = $state<BudgetEntry | null>(null);
    editingContract = $state<Contract | null>(null);

    entryForm = $state<EntryFormState>({
        type: 'expense',
        title: '',
        description: '',
        amount: '',
        category: 'Sonstiges',
        payment_status: 'open',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        paid_at: '',
        recipient_or_payer: '',
        payment_method: 'bank_transfer',
        contract_id: '',
        is_installment: false,
        installment_current: 1,
        installment_total_count: 12,
        installment_total_amount: ''
    });
    entryReceiptFile = $state<File | null>(null);

    contractForm = $state<ContractFormState>({
        partner_name: '',
        contract_number: '',
        amount: '',
        interval: 'monthly',
        next_due_date: new Date().toISOString().split('T')[0],
        payment_status: 'open',
        category: 'Miete & Wohnen',
        auto_book: false,
        is_active: true,
        description: ''
    });

    openNewEntryModal(selectedYear: number, selectedMonth: number) {
        const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        this.editingEntry = null;
        this.entryForm = {
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
        this.entryReceiptFile = null;
        this.isEntryModalOpen = true;
    }

    openEditEntryModal(entry: BudgetEntry) {
        this.editingEntry = entry;
        this.entryForm = {
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
        this.entryReceiptFile = null;
        this.isEntryModalOpen = true;
    }

    openNewContractModal(selectedYear: number, selectedMonth: number) {
        const defaultDue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        this.editingContract = null;
        this.contractForm = {
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
        this.isContractModalOpen = true;
    }

    openEditContractModal(contract: Contract) {
        this.editingContract = contract;
        this.contractForm = {
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
        this.isContractModalOpen = true;
    }

    calculateInstallmentRate(direction: 'from_totals' | 'from_amount' = 'from_totals') {
        if (!this.entryForm.is_installment) return;
        const tot = Number(this.entryForm.installment_total_amount);
        const count = Number(this.entryForm.installment_total_count);
        const amt = Number(this.entryForm.amount);
        if (direction === 'from_totals') {
            if (tot > 0 && count > 0) this.entryForm.amount = parseFloat((tot / count).toFixed(2));
        } else if (direction === 'from_amount') {
            if (amt > 0 && count > 0) this.entryForm.installment_total_amount = parseFloat((amt * count).toFixed(2));
        }
    }

    async handleSaveEntry(actions: BudgetActions, userId: string) {
        const ok = await actions.handleSaveEntry(this.entryForm, this.entryReceiptFile, this.editingEntry, userId);
        if (ok) this.isEntryModalOpen = false;
    }

    async handleSaveContract(actions: BudgetActions, userId: string) {
        const ok = await actions.handleSaveContract(this.contractForm, this.editingContract, userId);
        if (ok) this.isContractModalOpen = false;
    }

    handleViewReceipt(actions: BudgetActions, entry: BudgetEntry) {
        const result = actions.handleViewReceipt(entry);
        if (result) {
            this.selectedReceiptUrl = result.url;
            this.selectedReceiptTitle = result.title;
            this.isReceiptModalOpen = true;
        }
    }

    async handleBookNextInstallment(actions: BudgetActions, entry: BudgetEntry, selectedYear: number, selectedMonth: number) {
        const prefilled = await actions.handleBookNextInstallment(entry, selectedYear, selectedMonth);
        if (prefilled) {
            this.editingEntry = null;
            this.entryForm = { ...this.entryForm, ...prefilled };
            this.entryReceiptFile = null;
            this.isEntryModalOpen = true;
        }
    }
}
