<!-- src/lib/components/invoices/InvoiceList.svelte -->
<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice.ts";
    import InvoiceDesktopTable from "./InvoiceDesktopTable.svelte";
    import InvoiceMobileCards from "./InvoiceMobileCards.svelte";

    let {
        groupedInvoices,
        filterService,
        selectedInvoiceIds,
        regeneratingInvoiceIds = [],
        onToggleAll,
        onToggleSelection,
        onUpdateStatus,
        onRegenerate,
        onPreviewPdf,
        onEmail,
        onDelete,
        onCancel,
        onCorrect,
        onOpenMobileActions
    }: {
        groupedInvoices: [string, InvoicePayload[]][];
        filterService: any;
        selectedInvoiceIds: string[];
        regeneratingInvoiceIds?: string[];
        onToggleAll: () => void;
        onToggleSelection: (id: string) => void;
        onUpdateStatus: (id: string, status: string) => void;
        onRegenerate: (invs: InvoicePayload[]) => void;
        onPreviewPdf: (inv: InvoicePayload, index: number, prefix: string) => void;
        onEmail: (inv: InvoicePayload, isMahnung?: boolean, mLevel?: number) => void;
        onDelete: (id: string) => void;
        onCancel?: (id: string) => void;
        onCorrect?: (inv: InvoicePayload) => void;
        onOpenMobileActions: (inv: InvoicePayload) => void;
    } = $props();

    function isRegenerating(id: string): boolean {
        return (regeneratingInvoiceIds || []).includes(id);
    }
</script>

<div class="overflow-hidden bg-transparent border-0 shadow-none">
    <InvoiceDesktopTable
        {groupedInvoices}
        {filterService}
        {selectedInvoiceIds}
        {isRegenerating}
        {onToggleAll}
        {onToggleSelection}
        {onUpdateStatus}
        {onRegenerate}
        {onPreviewPdf}
        {onEmail}
        {onDelete}
        {onCancel}
        {onCorrect}
    />

    <InvoiceMobileCards
        {groupedInvoices}
        {filterService}
        {selectedInvoiceIds}
        {isRegenerating}
        {onToggleAll}
        {onToggleSelection}
        {onUpdateStatus}
        {onRegenerate}
        {onPreviewPdf}
        {onEmail}
        {onDelete}
        {onCancel}
        {onCorrect}
    />
</div>
