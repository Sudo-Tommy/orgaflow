<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice.ts";
    import { getClient, getPdfUrl, getStatusClass } from "$lib/utils/invoiceHelpers";
    import { getRowBgClass } from "./invoiceListHelper";
    import { pb } from "$lib/services/pocketbase";
    // @ts-ignore
    import { Building2, FileText, Clock, RefreshCw, Mail, Trash2, ChevronDown, Pencil } from "lucide-svelte";
    import { getReplacedBy } from "$lib/services/invoiceCorrectionHelper";
    import { extendInvoiceDueDate } from "$lib/services/invoiceQuickActions";
    import InvoiceDetailAccordion from "./InvoiceDetailAccordion.svelte";

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

    let expandedInvoiceId = $state<string | null>(null);
    function toggleExpand(id: string) {
        expandedInvoiceId = expandedInvoiceId === id ? null : id;
    }
</script>

<div class="hidden xl:block overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
    <table class="w-full text-left border-collapse table-auto" aria-label="Rechnungsliste">
        <colgroup>
            <col class="w-10" />
            <col class="w-auto" />
            <col class="w-auto" />
            <col class="w-28" />
            <col class="w-32" />
            <col class="w-48" />
        </colgroup>
        <thead class="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
            <tr>
                <th class="w-10 px-2.5 py-3 text-center"><input type="checkbox" aria-label="Alle Rechnungen auswählen" checked={filterService.filtered.length > 0 && selectedInvoiceIds.length === filterService.filtered.length} onchange={onToggleAll} class="w-5 h-5 text-violet-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none" title="Alle auswählen" /></th>
                <th class="px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Rechnung</th>
                <th class="px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Klient</th>
                <th class="w-28 px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right whitespace-nowrap">Betrag</th>
                <th class="w-32 px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                <th class="w-48 px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right whitespace-nowrap">Aktionen</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
        {#each groupedInvoices as [companyName, invoices]}
            <tr class="bg-slate-100/80 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
                <td colspan="6" class="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                    <div class="flex items-center gap-2">
                        <Building2 class="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                        <span>{companyName}</span>
                    </div>
                </td>
            </tr>
            {#each invoices as inv (inv.id)}
                <tr onclick={() => toggleExpand(inv.id)} class="transition-colors group cursor-pointer {getRowBgClass(inv, selectedInvoiceIds.includes(inv.id), false)}">
                    <td class="w-10 px-2.5 py-3 text-center align-middle" onclick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label="Rechnung {inv.invoice_nr} auswählen" checked={selectedInvoiceIds.includes(inv.id)} onchange={() => onToggleSelection(inv.id)} class="w-5 h-5 text-violet-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none align-middle" />
                    </td>
                    <td class="px-3 sm:px-4 py-3 align-middle">
                        <div class="flex flex-col">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <ChevronDown class="w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 {expandedInvoiceId === inv.id ? 'rotate-180 text-violet-600 dark:text-violet-400' : ''}" />
                                <span class="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                                {#if inv.is_cancellation}
                                    <span class="text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded shadow-2xs">Storno</span>
                                {/if}
                                {#if inv.dispute_hold}
                                    <span class="text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded shadow-2xs">⚠️ Mahnstopp</span>
                                {/if}
                                {#if getReplacedBy(inv)}
                                    <span class="text-[10px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-300 dark:border-violet-800 px-1.5 py-0.5 rounded-full shadow-2xs">Ersetzt durch {getReplacedBy(inv)}</span>
                                {/if}
                            </div>
                            <div class="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-col gap-0.5">
                                <span>Vom: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                                {#if inv.status !== 'Abgeschlossen' && inv.issue_date}
                                    {@const days = Math.max(0, Math.floor((new Date().getTime() - new Date(inv.issue_date).getTime()) / 86400000))}
                                    {#if ['Eingereicht', 'In Bearbeitung'].includes(inv.status)}
                                        <span>Gesendet vor {days} Tag{#if days !== 1}en{/if}</span>
                                        {#if days >= 14 && !inv.dispute_hold}
                                            {@const mLevel = days >= 30 ? 3 : (days >= 21 ? 2 : 1)}
                                            <div class="flex items-center gap-1 mt-1 flex-wrap">
                                                <button type="button" aria-label="Mahnung senden" onclick={(e) => { e.stopPropagation(); onEmail(inv, true, mLevel); }} class="orga-pill-action text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 hover:bg-rose-500 hover:text-white">
                                                    ⚠️ {mLevel}. Mahnung fällig
                                                </button>
                                                <button type="button" aria-label="Frist um 7 Tage verlängern" onclick={(e) => { e.stopPropagation(); extendInvoiceDueDate(inv, 7); }} class="orga-pill-action bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" title="Zahlungsziel um 7 Tage verlängern">
                                                    +7T
                                                </button>
                                                <button type="button" aria-label="Frist um 14 Tage verlängern" onclick={(e) => { e.stopPropagation(); extendInvoiceDueDate(inv, 14); }} class="orga-pill-action bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" title="Zahlungsziel um 14 Tage verlängern">
                                                    +14T
                                                </button>
                                            </div>
                                        {/if}
                                    {/if}
                                {/if}
                                {#if inv.status !== 'Abgeschlossen' && (inv as any).due_date}
                                    <span class="text-rose-600 dark:text-rose-400 font-semibold">Fällig: {new Date((inv as any).due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                {/if}
                                {#if inv.status === 'Abgeschlossen' && inv.paid_at}
                                    <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Bezahlt: {new Date(inv.paid_at as unknown as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                {/if}
                                {#if inv.status === 'Teilweise bezahlt'}
                                    <span class="text-amber-700 dark:text-amber-400 font-semibold">Teilbezahlt: {(inv.paid_amount || 0).toFixed(2).replace('.', ',')} € (Offen: {(inv.remaining_amount || 0).toFixed(2).replace('.', ',')} €)</span>
                                {/if}
                                {#if inv.write_off_amount && inv.write_off_amount > 0}
                                    <span class="text-rose-600 dark:text-rose-400 font-semibold">Ausgebucht: {inv.write_off_amount.toFixed(2).replace('.', ',')} €</span>
                                {/if}
                            </div>
                        </div>
                    </td>
                    <td class="px-3 sm:px-4 py-3 align-middle">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner" aria-hidden="true">{(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}</div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{getClient(inv) ? `${getClient(inv).name_first} ${getClient(inv).name_last}` : 'Ohne Klient'}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">{Array.isArray(inv.appointments) ? inv.appointments.length : (inv.appointments ? 1 : 0)} Termin(e)</p>
                            </div>
                        </div>
                    </td>
                    <td class="w-28 px-3 sm:px-4 py-3 text-right tabular-nums align-middle whitespace-nowrap">
                        {#if inv.is_cancellation || inv.brutto < 0}
                            <span class="font-black text-rose-600 dark:text-rose-400 text-base">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                        {:else if inv.brutto > 0}
                            <span class="font-black text-slate-900 dark:text-white text-base">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                        {:else}
                            <span class="font-bold text-slate-400 text-sm">0,00 €</span>
                        {/if}
                    </td>
                    <td class="w-32 px-3 sm:px-4 py-3 text-center align-middle whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
                        <select 
                            aria-label="Status für {inv.invoice_nr} auswählen"
                            value={inv.status}
                            onchange={(e) => { e.stopPropagation(); onUpdateStatus(inv.id, e.currentTarget.value); }}
                            class="px-2.5 py-1 text-xs font-bold rounded-xl border {getStatusClass(inv.status)} cursor-pointer bg-white dark:bg-slate-900 shadow-2xs transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
                        >
                            <option value="Abgelehnt">Abgelehnt</option>
                            <option value="Abgeschlossen">Bezahlt</option>
                            <option value="Entwurf">Entwurf</option>
                            <option value="Eingereicht">Gesendet</option>
                            <option value="In Bearbeitung">In Arbeit</option>
                            <option value="Storniert">Storniert</option>
                            <option value="Teilweise bezahlt">Teilweise bezahlt</option>
                        </select>
                    </td>
                    <td class="w-48 px-3 sm:px-4 py-3 align-middle text-right whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
                        <div class="flex items-center justify-end gap-1.5 flex-nowrap">
                            {#if isRegenerating(inv.id)}
                                <button type="button" disabled class="w-8 h-8 min-w-8 flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800 cursor-wait shadow-2xs" title="PDF wird neu generiert...">
                                    <RefreshCw class="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                </button>
                            {:else}
                                <button type="button" aria-label="Layout neu generieren" onclick={() => onRegenerate([inv])} class="w-8 h-8 min-w-8 flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 rounded-lg transition-colors border border-amber-200 dark:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer shadow-2xs" title="PDF neu generieren">
                                    <RefreshCw class="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            {/if}
                            {#if getPdfUrl(inv, 0, pb)}
                                <button type="button" aria-label="Rechnung ansehen" onclick={() => onPreviewPdf(inv, 0, 'Rechnung')} class="w-8 h-8 min-w-8 flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none cursor-pointer" title="Rechnung ansehen">
                                    <FileText class="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            {/if}
                            {#if getPdfUrl(inv, 1, pb)}
                                <button type="button" aria-label="Zeitnachweis ansehen" onclick={() => onPreviewPdf(inv, 1, 'Zeitnachweis')} class="w-8 h-8 min-w-8 flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none cursor-pointer" title="Zeitnachweis ansehen">
                                    <Clock class="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            {/if}
                            {#if getPdfUrl(inv, 0, pb) || getPdfUrl(inv, 1, pb)}
                                <button type="button" aria-label="Per E-Mail versenden" onclick={() => onEmail(inv)} class="w-8 h-8 min-w-8 flex items-center justify-center text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-600 dark:hover:bg-cyan-600 hover:text-white rounded-lg transition-colors border border-cyan-200 dark:border-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer shadow-2xs" title="Per E-Mail versenden">
                                    <Mail class="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            {/if}
                            {#if onCorrect}
                                <button type="button" aria-label="Rechnung korrigieren" onclick={() => onCorrect(inv)} class="w-8 h-8 min-w-8 flex items-center justify-center text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-600 dark:hover:bg-violet-600 hover:text-white rounded-lg transition-colors border border-violet-200 dark:border-violet-800 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none cursor-pointer shadow-2xs" title="Rechnung korrigieren">
                                    <Pencil class="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            {/if}
                            <button aria-label="Rechnung löschen" onclick={() => onDelete(inv.id)} class="w-8 h-8 min-w-8 flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white rounded-lg transition-colors border border-rose-200 dark:border-rose-800 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer shadow-2xs" title="Rechnung löschen">
                                <Trash2 class="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                        </div>
                    </td>
                </tr>
                {#if expandedInvoiceId === inv.id}
                    <tr class="bg-slate-50/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
                        <td colspan="6" class="p-0">
                            <InvoiceDetailAccordion 
                                {inv}
                                isRegenerating={isRegenerating(inv.id)}
                                onOpenPdf={(index) => onPreviewPdf(inv, index, index === 0 ? 'Rechnung' : 'Zeitnachweis')}
                                onEmail={() => onEmail(inv)}
                                onRegenerate={() => onRegenerate([inv])}
                                onCancel={onCancel ? () => onCancel(inv.id) : undefined}
                                onCorrect={onCorrect ? () => onCorrect(inv) : undefined}
                            />
                        </td>
                    </tr>
                {/if}
            {/each}
        {/each}
        </tbody>
    </table>
</div>
