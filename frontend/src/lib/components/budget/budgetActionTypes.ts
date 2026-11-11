import type {
    BudgetEntryType,
    PaymentStatus,
    PaymentMethod,
    ContractInterval
} from '$lib/types/budget';

export type EntryFormState = {
    type: BudgetEntryType;
    title: string;
    description: string;
    amount: number | '';
    category: string;
    payment_status: PaymentStatus;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    paid_at: string;
    recipient_or_payer: string;
    payment_method: PaymentMethod;
    contract_id: string;
    is_installment: boolean;
    installment_current: number | '';
    installment_total_count: number | '';
    installment_total_amount: number | '';
};

export type ContractFormState = {
    partner_name: string;
    contract_number: string;
    amount: number | '';
    interval: ContractInterval;
    next_due_date: string;
    payment_status: 'open' | 'paid';
    category: string;
    auto_book: boolean;
    is_active: boolean;
    description: string;
};
