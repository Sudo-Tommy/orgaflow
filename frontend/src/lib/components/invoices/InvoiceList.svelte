<!-- src/lib/components/invoices/InvoiceList.svelte -->
<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice.ts";
    import { getClient, getPdfUrl, getStatusClass } from "$lib/utils/invoiceHelpers";
    import { pb } from "$lib/services/pocketbase";
    // @ts-ignore
    import { Building2, FileText, Clock, RefreshCw, Mail, Trash2, ChevronRight } from "lucide-svelte";

    let {
        groupedInvoices,
        filterService,
        selectedInvoiceIds,
        onToggleAll,
        onToggleSelection,
        onUpdateStatus,
        onRegenerate,
        onPreviewPdf,
        onEmail,
        onDelete,
        onOpenMobileActions
    }: {
        groupedInvoices: [string, InvoicePayload[]][];
        filterService: any;
        selectedInvoiceIds: string[];
        onToggleAll: () => void;
        onToggleSelection: (id: string) => void;
        onUpdateStatus: (id: string, status: string) => void;
        onRegenerate: (invs: InvoicePayload[]) => void;
        onPreviewPdf: (inv: InvoicePayload, index: number, prefix: string) => void;
        onEmail: (inv: InvoicePayload, isMahnung?: boolean, mLevel?: number) => void;
        onDelete: (id: string) => void;
        onOpenMobileActions: (inv: InvoicePayload) => void;
    } = $props();

    function getRowBgClass(inv: any, isSelected: boolean, isMobile: boolean = false) {
        if (isSelected) return isMobile ? 'bg-indigo-50/20 border-indigo-500 ring-2 ring-indigo-500' : 'bg-indigo-50/50';
        
        const baseBg = isMobile ? 'bg-white' : 'bg-transparent';
        const hover = isMobile ? 'hover:shadow-md' : '';
        const isOverdue = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status) && inv.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0);

        if (isOverdue) return `${baseBg} hover:bg-rose-100 ${isMobile ? 'border-rose-200' : ''} ${hover}`;

        switch (inv.status) {
            case 'Abgeschlossen': return `${baseBg} hover:bg-emerald-50/80 ${isMobile ? 'border-emerald-200' : ''} ${hover}`;
            case 'Eingereicht':
            case 'Offen': return `${baseBg} hover:bg-blue-50/80 ${isMobile ? 'border-blue-200' : ''} ${hover}`;
            case 'In Bearbeitung': return `${baseBg} hover:bg-amber-50/80 ${isMobile ? 'border-amber-200' : ''} ${hover}`;
            case 'Storniert':
            case 'Abgelehnt': return `${baseBg} hover:bg-neutral-100 ${isMobile ? 'border-neutral-200' : ''} ${hover}`;
            default: return `${baseBg} hover:bg-neutral-50/80 ${isMobile ? 'border-neutral-200' : ''} ${hover}`;
        }
    }
</script>

<div class="orga-card-white overflow-hidden bg-transparent">
    <!-- Desktop View -->
    <div class="hidden lg:block overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-200" aria-label="Rechnungsliste">
            <thead class="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                <tr>
                    <th class="p-4 w-12"><input type="checkbox" aria-label="Alle Rechnungen auswählen" checked={filterService.filtered.length > 0 && selectedInvoiceIds.length === filterService.filtered.length} onchange={onToggleAll} class="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none" title="Alle auswählen" /></th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Rechnung</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Klient</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right">Betrag</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-center">Status</th>
                    <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right">Aktionen</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {#each groupedInvoices as [companyName, invoices]}
                <tr class="bg-slate-100 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                    <td colspan="6" class="p-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                        <Building2 class="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" /> {companyName}
                    </td>
                </tr>
                {#each invoices as inv (inv.id)}
                    <tr class="transition-colors group {getRowBgClass(inv, selectedInvoiceIds.includes(inv.id), false)}">
                        <td class="p-4">
                            <input type="checkbox" aria-label="Rechnung {inv.invoice_nr} auswählen" checked={selectedInvoiceIds.includes(inv.id)} onchange={() => onToggleSelection(inv.id)} class="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none" />
                        </td>
                        <td class="p-4">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                                    {#if inv.is_cancellation}
                                        <span class="text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded shadow-2xs">Storno</span>
                                    {/if}
                                </div>
                                <div class="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-col gap-0.5">
                                    <span>Vom: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                                    {#if inv.status !== 'Abgeschlossen' && inv.issue_date}
                                        {@const days = Math.max(0, Math.floor((new Date().getTime() - new Date(inv.issue_date).getTime()) / 86400000))}
                                        {#if ['Eingereicht', 'In Bearbeitung'].includes(inv.status)}
                                            <span>Gesendet vor {days} Tag{#if days !== 1}en{/if}</span>
                                            {#if days >= 14}
                                                {@const mLevel = days >= 30 ? 3 : (days >= 21 ? 2 : 1)}
                                                <button type="button" aria-label="Mahnung senden" onclick={(e) => { e.stopPropagation(); onEmail(inv, true, mLevel); }} class="text-rose-700 dark:text-rose-300 font-bold bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded w-max mt-0.5 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer text-xs">
                                                    ⚠️ {mLevel}. Mahnung fällig
                                                </button>
                                            {/if}
                                        {/if}
                                    {/if}
                                    {#if inv.status !== 'Abgeschlossen' && (inv as any).due_date}
                                        <span class="text-rose-600 dark:text-rose-400 font-semibold">Fällig: {new Date((inv as any).due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                    {/if}
                                    {#if inv.status === 'Abgeschlossen' && inv.paid_at}
                                        <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Bezahlt: {new Date(inv.paid_at as unknown as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                    {/if}
                                </div>
                            </div>
                        </td>
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner" aria-hidden="true">{(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}</div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{getClient(inv) ? `${getClient(inv).name_first} ${getClient(inv).name_last}` : 'Ohne Klient'}</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">{Array.isArray(inv.appointments) ? inv.appointments.length : (inv.appointments ? 1 : 0)} Termin(e)</p>
                                </div>
                            </div>
                        </td>
                        <td class="p-4 text-right tabular-nums">
                            {#if inv.is_cancellation || inv.brutto < 0}
                                <span class="font-black text-rose-600 dark:text-rose-400 text-lg">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                            {:else if inv.brutto > 0}
                                <span class="font-black text-indigo-700 dark:text-indigo-400 text-lg">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                            {:else}
                                <span class="font-bold text-slate-400 text-sm">0,00 €</span>
                            {/if}
                        </td>
                        <td class="p-4 text-center">
                            <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-max mx-auto shadow-inner" role="group" aria-label="Statusauswahl">
                                {#each [{val: 'Entwurf', label: 'Entwurf'}, {val: 'Eingereicht', label: 'Gesendet'}, {val: 'In Bearbeitung', label: 'In Arbeit'}, {val: 'Abgeschlossen', label: 'Bezahlt'}] as s}
                                    <button 
                                        type="button" 
                                        aria-label="Status auf {s.label} setzen"
                                        onclick={(e) => { e.stopPropagation(); onUpdateStatus(inv.id, s.val); }}
                                        class="px-3 py-2 min-h-8 text-xs font-bold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none {inv.status === s.val ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400 ' + (s.val === 'Abgeschlossen' ? 'hover:bg-indigo-50 dark:hover:bg-slate-800' : 'pointer-events-none') : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'}"
                                    >
                                        {s.label}
                                    </button>
                                {/each}
                                {#if !['Entwurf', 'Eingereicht', 'In Bearbeitung', 'Abgeschlossen'].includes(inv.status)}
                                    <span class="px-2.5 py-1 text-xs font-bold text-rose-600 rounded-full bg-white dark:bg-slate-800 shadow-sm">{inv.status}</span>
                                {/if}
                            </div>
                        </td>
                        <td class="p-4">
                            <div class="flex items-center justify-end gap-1.5 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                                <button type="button" aria-label="Layout neu generieren" onclick={() => onRegenerate([inv])} class="p-3 min-w-12 min-h-12 flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-lg transition-colors border border-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none" title="PDF neu generieren">
                                    <RefreshCw class="w-4 h-4" aria-hidden="true" />
                                </button>
                                {#if getPdfUrl(inv, 0, pb)}
                                    <button type="button" aria-label="Rechnung ansehen" onclick={() => onPreviewPdf(inv, 0, 'Rechnung')} class="flex items-center justify-center gap-1.5 p-3 min-w-12 min-h-12 text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none" title="Rechnung ansehen">
                                        <FileText class="w-4 h-4" aria-hidden="true" />
                                    </button>
                                {/if}
                                {#if getPdfUrl(inv, 1, pb)}
                                    <button type="button" aria-label="Zeitnachweis ansehen" onclick={() => onPreviewPdf(inv, 1, 'Zeitnachweis')} class="flex items-center justify-center gap-1.5 p-3 min-w-12 min-h-12 text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none" title="Zeitnachweis ansehen">
                                        <Clock class="w-4 h-4" aria-hidden="true" />
                                    </button>
                                {/if}
                                {#if getPdfUrl(inv, 0, pb) || getPdfUrl(inv, 1, pb)}
                                    <button type="button" aria-label="Per E-Mail versenden" onclick={() => onEmail(inv)} class="p-3 min-w-12 min-h-12 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none" title="Per E-Mail versenden">
                                        <Mail class="w-4 h-4" aria-hidden="true" />
                                    </button>
                                {/if}
                                <button aria-label="Rechnung löschen" onclick={() => onDelete(inv.id)} class="p-3 min-w-12 min-h-12 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-lg transition-colors border border-rose-100 ml-1 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none" title="Rechnung löschen">
                                    <Trash2 class="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>
                        </td>
                    </tr>
                {/each}
            {/each}
            </tbody>
        </table>
    </div>

    <!-- Mobile View (Card Layout) -->
    <div class="block lg:hidden">
        {#if filterService.filtered.length > 0}
            <label class="p-4 min-h-12 bg-white flex items-center gap-3 border border-neutral-200 cursor-pointer shadow-sm rounded-xl mb-4 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:outline-none">
                <input type="checkbox" aria-label="Alle Rechnungen wählen" checked={selectedInvoiceIds.length === filterService.filtered.length && filterService.filtered.length > 0} onchange={onToggleAll} class="w-6 h-6 text-indigo-600 rounded border-neutral-300 cursor-pointer focus:ring-0 shadow-sm" />
                <span class="text-sm font-bold text-neutral-700">Alle {filterService.filtered.length} Rechnungen wählen</span>
            </label>
        {/if}
        <div class="flex flex-col gap-4">
        {#each groupedInvoices as [companyName, invoices]}
            <div class="flex flex-col gap-2">
                <div class="font-bold text-neutral-400 text-[10px] uppercase tracking-wider flex items-center gap-2 ml-1">
                    <Building2 class="w-3 h-3 text-neutral-400" aria-hidden="true" /> {companyName}
                </div>
                {#each invoices as inv (inv.id)}
                    <div class="flex items-stretch border rounded-2xl shadow-sm transition-all overflow-hidden {getRowBgClass(inv, selectedInvoiceIds.includes(inv.id), true)}">
                        <!-- Checkbox Hit Area -->
                        <button type="button" aria-label="Rechnung {inv.invoice_nr} auswählen" onclick={(e) => { e.stopPropagation(); onToggleSelection(inv.id); }} class="pl-4 pr-3 py-4 min-w-12 min-h-12 flex items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none">
                            <input type="checkbox" aria-hidden="true" checked={selectedInvoiceIds.includes(inv.id)} tabindex="-1" class="w-6 h-6 text-indigo-600 rounded border-neutral-300 pointer-events-none shadow-sm" />
                        </button>
                        
                        <!-- Content Hit Area -->
                        <button type="button" aria-label="Aktionsmenü für {inv.invoice_nr} öffnen" class="flex-1 p-4 pl-2 min-h-12 flex flex-col gap-3 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none active:scale-95" onclick={() => onOpenMobileActions(inv)}>
                            <div class="flex justify-between items-start gap-3 w-full">
                                <div class="min-w-0">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        <span class="font-black text-neutral-900 text-base block truncate leading-tight">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                                        {#if inv.is_cancellation}
                                            <span class="text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded">Storno</span>
                                        {/if}
                                    </div>
                                    <div class="text-[11px] font-semibold text-neutral-400 mt-1 flex flex-col gap-0.5">
                                        <span>Vom: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                                        {#if inv.status !== 'Abgeschlossen' && inv.issue_date}
                                            {@const days = Math.max(0, Math.floor((new Date().getTime() - new Date(inv.issue_date).getTime()) / 86400000))}
                                            {#if ['Eingereicht', 'In Bearbeitung'].includes(inv.status)}
                                                <span>Gesendet vor {days} Tag{#if days !== 1}en{/if}</span>
                                                {#if days >= 14}
                                                    {@const mLevel = days >= 30 ? 3 : (days >= 21 ? 2 : 1)}
                                                    <!-- svelte-ignore node_invalid_placement_ssr -->
                                                    <button type="button" aria-label="Mahnung senden" onclick={(e) => { e.stopPropagation(); onEmail(inv, true, mLevel); }} class="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded w-max mt-0.5 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer text-[10px]">
                                                        ⚠️ {mLevel}. Mahnung fällig
                                                    </button>
                                                {/if}
                                            {/if}
                                        {/if}
                                        {#if inv.status !== 'Abgeschlossen' && (inv as any).due_date}
                                            <span class="text-rose-500">Fällig: {new Date((inv as any).due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        {/if}
                                        {#if inv.status === 'Abgeschlossen' && inv.paid_at}
                                            <span class="text-emerald-600">Bezahlt: {new Date(inv.paid_at as unknown as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="text-right shrink-0">
                                    {#if inv.is_cancellation || inv.brutto < 0}
                                        <span class="font-black text-rose-600 text-lg leading-none block">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                                    {:else if inv.brutto > 0}
                                        <span class="font-black text-indigo-600 text-lg leading-none block">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                                    {:else}
                                        <span class="font-bold text-neutral-400 text-xs block">0,00 €</span>
                                    {/if}
                                    <span class="inline-block mt-1.5 px-3 py-1 text-[10px] font-bold rounded-full {getStatusClass(inv.status)} border truncate max-w-25 text-center">{inv.status}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 pt-3 border-t border-neutral-100 w-full">
                                <div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner" aria-hidden="true">{(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}</div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs font-bold text-neutral-700 truncate">{getClient(inv) ? `${getClient(inv).name_first} ${getClient(inv).name_last}` : 'Ohne Klient'}</p>
                                </div>
                                <div class="shrink-0 text-neutral-400 bg-neutral-50 rounded-full p-2 active:bg-neutral-200 transition-colors" aria-hidden="true">
                                    <ChevronRight class="w-5 h-5" />
                                </div>
                            </div>
                        </button>
                    </div>
                {/each}
            </div>
        {/each}
        </div>
    </div>
</div>