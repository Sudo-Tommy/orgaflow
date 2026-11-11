<script lang="ts">
    import { Edit, Download, Mail, XCircle, AlertTriangle, CalendarPlus, Phone, Check } from "lucide-svelte";
    import { isInvoiceOverdue, extendInvoiceDueDate, getInvoiceClientPhone } from "$lib/services/invoiceQuickActions";

    interface Props {
        invoice: any;
        isDownloadingPdf: boolean;
        onEdit: () => void;
        onDownloadPdf: (index: number, name: string) => void;
        onSendEmail: () => void;
        onSendMahnung?: () => void;
        onMarkPaid?: () => void;
        onOpenStorno: () => void;
        getPdfUrl: (index: number) => string | null;
    }

    let {
        invoice,
        isDownloadingPdf,
        onEdit,
        onDownloadPdf,
        onSendEmail,
        onSendMahnung,
        onMarkPaid,
        onOpenStorno,
        getPdfUrl
    }: Props = $props();

    const isOverdue = $derived(isInvoiceOverdue(invoice));
    const clientPhone = $derived(getInvoiceClientPhone(invoice));
</script>

<div class="space-y-3">
    {#if isOverdue}
        <div class="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-2.5 animate-enter">
            <div class="flex items-center justify-between flex-wrap gap-2">
                <span class="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle class="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Rechnung ist überfällig (Mahnwesen & Schnellaktionen)</span>
                </span>
                {#if invoice.dunning_level}
                    <span class="orga-pill-badge bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 border border-rose-300">
                        Aktuell: {invoice.dunning_level}. Mahnstufe
                    </span>
                {/if}
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                {#if onSendMahnung}
                    <button
                        type="button"
                        onclick={onSendMahnung}
                        class="orga-pill-action bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 shadow-sm"
                        title="Zahlungserinnerung oder Mahnung verfassen und senden"
                    >
                        <Mail class="w-3.5 h-3.5" />
                        <span>Mahnung / Erinnerung senden</span>
                    </button>
                {/if}
                <button
                    type="button"
                    onclick={() => extendInvoiceDueDate(invoice, 7)}
                    class="orga-pill-action bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100"
                    title="Zahlungsziel um 7 Tage verlängern"
                >
                    <CalendarPlus class="w-3.5 h-3.5 text-amber-600" />
                    <span>+7 Tage Frist</span>
                </button>
                <button
                    type="button"
                    onclick={() => extendInvoiceDueDate(invoice, 14)}
                    class="orga-pill-action bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100"
                    title="Zahlungsziel um 14 Tage verlängern"
                >
                    <CalendarPlus class="w-3.5 h-3.5 text-amber-600" />
                    <span>+14 Tage Frist</span>
                </button>
                {#if clientPhone}
                    <a
                        href="tel:{clientPhone}"
                        class="orga-pill-action bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                        title="Klient telefonisch kontaktieren"
                    >
                        <Phone class="w-3.5 h-3.5 text-emerald-600" />
                        <span>Anrufen ({clientPhone})</span>
                    </a>
                {/if}
                {#if onMarkPaid}
                    <button
                        type="button"
                        onclick={onMarkPaid}
                        class="orga-pill-action bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700"
                        title="Rechnung direkt als bezahlt markieren"
                    >
                        <Check class="w-3.5 h-3.5" />
                        <span>Als bezahlt markieren</span>
                    </button>
                {/if}
            </div>
        </div>
    {/if}

    <div class="grid grid-cols-2 sm:grid-cols-4 {getPdfUrl(1) ? 'lg:grid-cols-5' : ''} gap-3">
        <button onclick={onEdit} class="orga-button-ghost bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex-col h-24 shadow-sm cursor-pointer">
            <Edit class="w-6 h-6 mb-1 text-violet-500" />
            <span class="text-xs font-bold">Bearbeiten</span>
        </button>
        <button onclick={() => onDownloadPdf(0, 'Rechnung')} disabled={!getPdfUrl(0) || isDownloadingPdf} class="orga-button-ghost bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex-col h-24 shadow-sm {!getPdfUrl(0) ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}">
            <Download class="w-6 h-6 mb-1 text-cyan-600" />
            <span class="text-xs font-bold">{getPdfUrl(1) ? 'Rechnung PDF' : 'Download'}</span>
        </button>
        {#if getPdfUrl(1)}
            <button onclick={() => onDownloadPdf(1, 'Zeitnachweis')} disabled={isDownloadingPdf} class="orga-button-ghost bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex-col h-24 shadow-sm cursor-pointer">
                <Download class="w-6 h-6 mb-1 text-cyan-600" />
                <span class="text-xs font-bold">Zeitnachweis PDF</span>
            </button>
        {/if}
        <button onclick={onSendEmail} class="orga-button-ghost bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex-col h-24 shadow-sm cursor-pointer">
            <Mail class="w-6 h-6 mb-1 text-emerald-500" />
            <span class="text-xs font-bold">Senden</span>
        </button>
        {#if invoice.is_cancellation}
            <button disabled class="orga-button-ghost bg-slate-100 dark:bg-slate-800/50 flex-col h-24 shadow-sm opacity-50 cursor-not-allowed">
                <XCircle class="w-6 h-6 mb-1 text-slate-400" />
                <span class="text-xs font-bold">Stornorechnung</span>
            </button>
        {:else if invoice.status === 'Storniert'}
            <button disabled class="orga-button-ghost bg-rose-50 dark:bg-rose-950/40 flex-col h-24 shadow-sm opacity-60 cursor-not-allowed">
                <XCircle class="w-6 h-6 mb-1 text-rose-400" />
                <span class="text-xs font-bold">Bereits storniert</span>
            </button>
        {:else}
            <button onclick={onOpenStorno} class="orga-button-ghost bg-white dark:bg-slate-800 flex-col h-24 shadow-sm hover:border-rose-300 hover:bg-rose-50/40 dark:hover:bg-rose-950/40 cursor-pointer">
                <XCircle class="w-6 h-6 mb-1 text-rose-500" />
                <span class="text-xs font-bold">Stornieren</span>
            </button>
        {/if}
    </div>
</div>
