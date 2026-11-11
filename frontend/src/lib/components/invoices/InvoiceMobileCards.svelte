<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice.ts";
    import { Building2 } from "lucide-svelte";
    import InvoiceMobileCard from "./InvoiceMobileCard.svelte";

    let {
        groupedInvoices,
        filterService,
        selectedInvoiceIds,
        isRegenerating,
        onToggleAll,
        onToggleSelection,
        onUpdateStatus,
        onRegenerate,
        onPreviewPdf,
        onEmail,
        onDelete,
        onCancel,
        onCorrect
    }: {
        groupedInvoices: [string, InvoicePayload[]][];
        filterService: any;
        selectedInvoiceIds: string[];
        isRegenerating: (id: string) => boolean;
        onToggleAll: () => void;
        onToggleSelection: (id: string) => void;
        onUpdateStatus: (id: string, status: string) => void;
        onRegenerate: (invs: InvoicePayload[]) => void;
        onPreviewPdf: (inv: InvoicePayload, index: number, prefix: string) => void;
        onEmail: (inv: InvoicePayload, isMahnung?: boolean, mLevel?: number) => void;
        onDelete: (id: string) => void;
        onCancel?: (id: string) => void;
        onCorrect?: (inv: InvoicePayload) => void;
    } = $props();
</script>

<div class="block xl:hidden">
    {#if filterService.filtered.length > 0}
        <label class="p-3 sm:p-3.5 min-h-11 bg-white dark:bg-slate-900 flex items-center gap-3 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-2xs rounded-2xl mb-4 focus-within:ring-2 focus-within:ring-violet-500 focus-within:outline-none">
            <input type="checkbox" aria-label="Alle Rechnungen wählen" checked={selectedInvoiceIds.length === filterService.filtered.length && filterService.filtered.length > 0} onchange={onToggleAll} class="w-5 h-5 text-violet-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer focus:ring-0 shadow-2xs" />
            <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Alle {filterService.filtered.length} Rechnungen wählen</span>
        </label>
    {/if}

    <div class="flex flex-col gap-6">
    {#each groupedInvoices as [companyName, invoices]}
        <div class="flex flex-col gap-3">
            <div class="font-bold text-slate-400 dark:text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2 ml-1">
                <Building2 class="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" /> {companyName}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {#each invoices as inv (inv.id)}
                <InvoiceMobileCard 
                    {inv}
                    isSelected={selectedInvoiceIds.includes(inv.id)}
                    isRegenerating={isRegenerating(inv.id)}
                    {onToggleSelection}
                    {onUpdateStatus}
                    {onRegenerate}
                    {onPreviewPdf}
                    {onEmail}
                    {onDelete}
                    {onCancel}
                    {onCorrect}
                />
            {/each}
            </div>
        </div>
    {/each}
    </div>
</div>
