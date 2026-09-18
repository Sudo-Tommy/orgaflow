<!-- src/lib/components/invoices/InvoiceList.svelte -->
<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice.ts";
    import { getClient, getPdfUrl, getStatusClass } from "$lib/utils/invoiceHelpers";
    import { pb } from "$lib/services/pocketbase";
    // @ts-ignore
    import { Building2, FileText, Clock, RefreshCw, Mail, Trash2, ChevronRight, AlertTriangle } from "lucide-svelte";

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
            case 'Teilweise bezahlt': return `${baseBg} hover:bg-amber-50/80 ${isMobile ? 'border-amber-300' : ''} ${hover}`;
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
    <!-- Desktop View (>= xl: 1280px, No horizontal scrolling) -->
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
                    <th class="w-10 px-2.5 py-3 text-center"><input type="checkbox" aria-label="Alle Rechnungen auswählen" checked={filterService.filtered.length > 0 && selectedInvoiceIds.length === filterService.filtered.length} onchange={onToggleAll} class="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none" title="Alle auswählen" /></th>
                    <th class="px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Rechnung</th>
                    <th class="px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Klient</th>
                    <th class="w-28 px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right whitespace-nowrap">Betrag</th>
                    <th class="w-32 px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                    <th class="w-48 px-3 sm:px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right whitespace-nowrap">Aktionen</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {#each groupedInvoices as [companyName, invoices]}
                <tr class="bg-slate-100 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                    <td colspan="6" class="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                        <div class="flex items-center gap-2">
                            <Building2 class="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                            <span>{companyName}</span>
                        </div>
                    </td>
                </tr>
                {#each invoices as inv (inv.id)}
                    <tr class="transition-colors group {getRowBgClass(inv, selectedInvoiceIds.includes(inv.id), false)}">
                        <td class="w-10 px-2.5 py-3 text-center align-middle">
                            <input type="checkbox" aria-label="Rechnung {inv.invoice_nr} auswählen" checked={selectedInvoiceIds.includes(inv.id)} onchange={() => onToggleSelection(inv.id)} class="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none align-middle" />
                        </td>
                        <td class="px-3 sm:px-4 py-3 align-middle">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                                    {#if inv.is_cancellation}
                                        <span class="text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded shadow-2xs">Storno</span>
                                    {/if}
                                    {#if inv.dispute_hold}
                                        <span class="text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded shadow-2xs">⚠️ Mahnstopp</span>
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
                                <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner" aria-hidden="true">{(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}</div>
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
                                <span class="font-black text-indigo-700 dark:text-indigo-400 text-base">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                            {:else}
                                <span class="font-bold text-slate-400 text-sm">0,00 €</span>
                            {/if}
                        </td>
                        <td class="w-32 px-3 sm:px-4 py-3 text-center align-middle whitespace-nowrap">
                            <select 
                                aria-label="Status für {inv.invoice_nr} auswählen"
                                value={inv.status}
                                onchange={(e) => { e.stopPropagation(); onUpdateStatus(inv.id, e.currentTarget.value); }}
                                class="px-2.5 py-1 text-xs font-bold rounded-xl border {getStatusClass(inv.status)} cursor-pointer bg-white dark:bg-slate-900 shadow-2xs transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                            >
                                <option value="Entwurf">Entwurf</option>
                                <option value="Eingereicht">Gesendet</option>
                                <option value="In Bearbeitung">In Arbeit</option>
                                <option value="Teilweise bezahlt">Teilweise bezahlt</option>
                                <option value="Abgeschlossen">Bezahlt</option>
                                <option value="Storniert">Storniert</option>
                                <option value="Abgelehnt">Abgelehnt</option>
                            </select>
                        </td>
                        <td class="w-48 px-3 sm:px-4 py-3 align-middle text-right whitespace-nowrap">
                            <!-- Dauerhaft sichtbare Aktionen überall nebeneinander mit ausreichendem Padding -->
                            <div class="flex items-center justify-end gap-1.5 flex-nowrap">
                                <button type="button" aria-label="Layout neu generieren" onclick={() => onRegenerate([inv])} class="w-8 h-8 min-w-8 flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-lg transition-colors border border-amber-200 dark:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer shadow-2xs" title="PDF neu generieren">
                                    <RefreshCw class="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                {#if getPdfUrl(inv, 0, pb)}
                                    <button type="button" aria-label="Rechnung ansehen" onclick={() => onPreviewPdf(inv, 0, 'Rechnung')} class="w-8 h-8 min-w-8 flex items-center justify-center text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none cursor-pointer" title="Rechnung ansehen">
                                        <FileText class="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                {/if}
                                {#if getPdfUrl(inv, 1, pb)}
                                    <button type="button" aria-label="Zeitnachweis ansehen" onclick={() => onPreviewPdf(inv, 1, 'Zeitnachweis')} class="w-8 h-8 min-w-8 flex items-center justify-center text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none cursor-pointer" title="Zeitnachweis ansehen">
                                        <Clock class="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                {/if}
                                {#if getPdfUrl(inv, 0, pb) || getPdfUrl(inv, 1, pb)}
                                    <button type="button" aria-label="Per E-Mail versenden" onclick={() => onEmail(inv)} class="w-8 h-8 min-w-8 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-200 dark:border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer shadow-2xs" title="Per E-Mail versenden">
                                        <Mail class="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                {/if}
                                <button aria-label="Rechnung löschen" onclick={() => onDelete(inv.id)} class="w-8 h-8 min-w-8 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-lg transition-colors border border-rose-200 dark:border-rose-800 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer shadow-2xs" title="Rechnung löschen">
                                    <Trash2 class="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            </div>
                        </td>
                    </tr>
                {/each}
            {/each}
            </tbody>
        </table>
    </div>

    <!-- Mobile & Tablet View (Card Layout, No Horizontal Scroll) -->
    <div class="block xl:hidden">
        {#if filterService.filtered.length > 0}
            <label class="p-3 sm:p-3.5 min-h-11 bg-white dark:bg-slate-900 flex items-center gap-3 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-2xs rounded-2xl mb-4 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:outline-none">
                <input type="checkbox" aria-label="Alle Rechnungen wählen" checked={selectedInvoiceIds.length === filterService.filtered.length && filterService.filtered.length > 0} onchange={onToggleAll} class="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer focus:ring-0 shadow-2xs" />
                <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Alle {filterService.filtered.length} Rechnungen wählen</span>
            </label>
        {/if}

        <div class="flex flex-col gap-6">
        {#each groupedInvoices as [companyName, invoices]}
            <div class="flex flex-col gap-3">
                <div class="font-bold text-neutral-400 dark:text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2 ml-1">
                    <Building2 class="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" /> {companyName}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {#each invoices as inv (inv.id)}
                    <div class="flex flex-col border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs transition-all overflow-hidden p-4 {getRowBgClass(inv, selectedInvoiceIds.includes(inv.id), true)}">
                        <!-- Top Row: Checkbox, Number, Amount, Badges -->
                        <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                            <div class="flex items-start gap-2.5 min-w-0">
                                <input 
                                    type="checkbox" 
                                    aria-label="Rechnung {inv.invoice_nr} auswählen" 
                                    checked={selectedInvoiceIds.includes(inv.id)} 
                                    onchange={() => onToggleSelection(inv.id)} 
                                    class="w-5 h-5 mt-0.5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer shrink-0" 
                                />
                                <div class="min-w-0">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        <span class="font-black text-slate-900 dark:text-slate-100 text-base leading-tight truncate">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                                        {#if inv.is_cancellation}
                                            <span class="text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded shadow-2xs">Storno</span>
                                        {/if}
                                        {#if inv.dispute_hold}
                                            <span class="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">⚠️ Mahnstopp</span>
                                        {/if}
                                    </div>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                                        Vom {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                    </p>
                                </div>
                            </div>
                            <div class="text-right shrink-0">
                                {#if inv.is_cancellation || inv.brutto < 0}
                                    <span class="font-black text-rose-600 dark:text-rose-400 text-lg leading-none block">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                                {:else if inv.brutto > 0}
                                    <span class="font-black text-indigo-600 dark:text-indigo-400 text-lg leading-none block">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                                {:else}
                                    <span class="font-bold text-slate-400 text-sm block">0,00 €</span>
                                {/if}
                                <div class="mt-1">
                                    <select 
                                        aria-label="Status für {inv.invoice_nr} auswählen"
                                        value={inv.status}
                                        onchange={(e) => onUpdateStatus(inv.id, e.currentTarget.value)}
                                        class="px-2 py-0.5 text-[11px] font-bold rounded-lg border {getStatusClass(inv.status)} cursor-pointer bg-white dark:bg-slate-900 shadow-2xs"
                                    >
                                        <option value="Entwurf">Entwurf</option>
                                        <option value="Eingereicht">Gesendet</option>
                                        <option value="In Bearbeitung">In Arbeit</option>
                                        <option value="Teilweise bezahlt">Teilweise bezahlt</option>
                                        <option value="Abgeschlossen">Bezahlt</option>
                                        <option value="Storniert">Storniert</option>
                                        <option value="Abgelehnt">Abgelehnt</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Middle Row: Client Info & Mahnung/Due Date -->
                        <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner" aria-hidden="true">
                                    {(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}
                                </div>
                                <div class="min-w-0">
                                    <p class="font-bold text-slate-800 dark:text-slate-200 truncate">{getClient(inv) ? `${getClient(inv).name_first} ${getClient(inv).name_last}` : 'Ohne Klient'}</p>
                                    <p class="text-[11px] text-slate-400 truncate">{Array.isArray(inv.appointments) ? inv.appointments.length : (inv.appointments ? 1 : 0)} Termin(e)</p>
                                </div>
                            </div>

                            <div class="text-right shrink-0 text-[11px]">
                                {#if inv.status !== 'Abgeschlossen' && (inv as any).due_date}
                                    <p class="text-rose-500 font-semibold">Fällig: {new Date((inv as any).due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</p>
                                {/if}
                                {#if inv.status === 'Abgeschlossen' && inv.paid_at}
                                    <p class="text-emerald-600 font-semibold">Bezahlt: {new Date(inv.paid_at as unknown as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</p>
                                {/if}
                                {#if inv.status === 'Teilweise bezahlt'}
                                    <p class="text-amber-700 font-semibold">Teil: {(inv.paid_amount || 0).toFixed(2).replace('.', ',')} €</p>
                                {/if}
                                {#if inv.write_off_amount && inv.write_off_amount > 0}
                                    <p class="text-rose-600 font-semibold">Verlust: {inv.write_off_amount.toFixed(2).replace('.', ',')} €</p>
                                {/if}
                                {#if inv.status !== 'Abgeschlossen' && inv.issue_date}
                                    {@const days = Math.max(0, Math.floor((new Date().getTime() - new Date(inv.issue_date).getTime()) / 86400000))}
                                    {#if ['Eingereicht', 'In Bearbeitung'].includes(inv.status) && days >= 14 && !inv.dispute_hold}
                                        {@const mLevel = days >= 30 ? 3 : (days >= 21 ? 2 : 1)}
                                        <button type="button" aria-label="Mahnung senden" onclick={() => onEmail(inv, true, mLevel)} class="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer text-[10px]">
                                            ⚠️ {mLevel}. Mahnung
                                        </button>
                                    {/if}
                                {/if}
                            </div>
                        </div>

                        <!-- Action Bar (PERMANENTLY VISIBLE, ZERO HOVER, FITS IN ONE ROW) -->
                        <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                            <div class="flex items-center gap-1.5 flex-nowrap shrink-0">
                                {#if getPdfUrl(inv, 0, pb)}
                                    <button 
                                        type="button" 
                                        aria-label="Rechnung PDF ansehen"
                                        onclick={() => onPreviewPdf(inv, 0, 'Rechnung')}
                                        class="h-9 w-9 min-w-9 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 rounded-xl transition-colors border border-indigo-200/80 dark:border-indigo-800 cursor-pointer shadow-2xs"
                                        title="Rechnung PDF anzeigen"
                                    >
                                        <FileText class="w-4 h-4" />
                                    </button>
                                {/if}

                                {#if getPdfUrl(inv, 1, pb)}
                                    <button 
                                        type="button" 
                                        aria-label="Zeitnachweis PDF ansehen"
                                        onclick={() => onPreviewPdf(inv, 1, 'Zeitnachweis')}
                                        class="h-9 w-9 min-w-9 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                                        title="Zeitnachweis PDF anzeigen"
                                    >
                                        <Clock class="w-4 h-4" />
                                    </button>
                                {/if}

                                {#if getPdfUrl(inv, 0, pb) || getPdfUrl(inv, 1, pb)}
                                    <button 
                                        type="button" 
                                        aria-label="Per E-Mail versenden"
                                        onclick={() => onEmail(inv)}
                                        class="h-9 w-9 min-w-9 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 rounded-xl transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer shadow-2xs"
                                        title="Per E-Mail versenden"
                                    >
                                        <Mail class="w-4 h-4" />
                                    </button>
                                {/if}

                                <button 
                                    type="button" 
                                    aria-label="Layout neu generieren"
                                    onclick={() => onRegenerate([inv])}
                                    class="h-9 w-9 min-w-9 flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 rounded-xl transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
                                    title="PDF neu generieren"
                                >
                                    <RefreshCw class="w-4 h-4" />
                                </button>
                            </div>

                            <div class="flex items-center gap-1.5 shrink-0 flex-nowrap">
                                <button 
                                    type="button" 
                                    aria-label="Rechnung löschen"
                                    onclick={() => onDelete(inv.id)}
                                    class="h-9 w-9 min-w-9 flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 rounded-xl transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer shadow-2xs"
                                    title="Rechnung löschen"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                                <button 
                                    type="button" 
                                    aria-label="Aktionsmenü öffnen"
                                    onclick={() => onOpenMobileActions(inv)}
                                    class="h-9 w-9 min-w-9 flex items-center justify-center text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                                    title="Weitere Aktionen"
                                >
                                    <ChevronRight class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
                </div>
            </div>
        {/each}
        </div>
    </div>
</div>