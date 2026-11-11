<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice.ts";
    import { getClient, getPdfUrl, getStatusClass } from "$lib/utils/invoiceHelpers";
    import { getRowBgClass } from "./invoiceListHelper";
    import { pb } from "$lib/services/pocketbase";
    import { FileText, Clock, RefreshCw, Mail, Trash2, ChevronDown } from "lucide-svelte";
    import { getReplacedBy } from "$lib/services/invoiceCorrectionHelper";
    import InvoiceDetailAccordion from "./InvoiceDetailAccordion.svelte";
    import { triggerHaptic } from "$lib/services/hapticFeedback";
    import { swipeAction } from "$lib/actions/swipeAction";

    let {
        inv,
        isSelected,
        isRegenerating,
        onToggleSelection,
        onUpdateStatus,
        onRegenerate,
        onPreviewPdf,
        onEmail,
        onDelete,
        onCancel,
        onCorrect
    }: {
        inv: InvoicePayload;
        isSelected: boolean;
        isRegenerating: boolean;
        onToggleSelection: (id: string) => void;
        onUpdateStatus: (id: string, status: string) => void;
        onRegenerate: (invs: InvoicePayload[]) => void;
        onPreviewPdf: (inv: InvoicePayload, index: number, prefix: string) => void;
        onEmail: (inv: InvoicePayload, isMahnung?: boolean, mLevel?: number) => void;
        onDelete: (id: string) => void;
        onCancel?: (id: string) => void;
        onCorrect?: (inv: InvoicePayload) => void;
    } = $props();

    let isExpanded = $state(false);
</script>

<div 
    use:swipeAction={{
        onSwipeLeft: () => {
            triggerHaptic('selection');
            if (getPdfUrl(inv, 0, pb)) onPreviewPdf(inv, 0, 'Rechnung');
            else isExpanded = !isExpanded;
        },
        onSwipeRight: () => {
            triggerHaptic('tap');
            onToggleSelection(inv.id);
        }
    }}
    class="flex flex-col border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs transition-all overflow-hidden touch-manipulation {getRowBgClass(inv, isSelected, true)}"
>
    <!-- Header-Area mit barrierefreiem Auf-/Zuklappen -->
    <div class="p-4">
        <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div class="flex items-start gap-2.5 min-w-0">
                <input 
                    type="checkbox" 
                    aria-label="Rechnung {inv.invoice_nr} auswählen" 
                    checked={isSelected} 
                    onchange={() => onToggleSelection(inv.id)} 
                    class="w-5 h-5 mt-0.5 text-violet-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-violet-500" 
                />
                <button 
                    type="button" 
                    onclick={() => isExpanded = !isExpanded}
                    class="min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer group/title focus-visible:outline-none"
                    aria-expanded={isExpanded}
                    aria-label="Rechnungsdetails für {inv.invoice_nr || 'Unbekannt'} {isExpanded ? 'schließen' : 'öffnen'}"
                >
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <ChevronDown class="w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 {isExpanded ? 'rotate-180 text-violet-600 dark:text-violet-400' : ''}" />
                        <span class="font-black text-slate-900 dark:text-slate-100 text-base leading-tight truncate group-hover/title:text-violet-600 dark:group-hover/title:text-violet-400">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                        {#if inv.is_cancellation}
                            <span class="text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded shadow-2xs">Storno</span>
                        {/if}
                        {#if inv.dispute_hold}
                            <span class="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">⚠️ Mahnstopp</span>
                        {/if}
                        {#if getReplacedBy(inv)}
                            <span class="text-[9px] font-bold bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-300 dark:border-violet-800 px-1.5 py-0.5 rounded-full shadow-2xs">Ersetzt durch {getReplacedBy(inv)}</span>
                        {/if}
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        Vom {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </p>
                </button>
            </div>

            <div class="text-right shrink-0">
                {#if inv.is_cancellation || inv.brutto < 0}
                    <span class="font-black text-rose-600 dark:text-rose-400 text-lg leading-none block">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
                {:else if inv.brutto > 0}
                    <span class="font-black text-slate-900 dark:text-white text-lg leading-none block">{(inv.brutto ?? 0).toFixed(2).replace('.', ',')} €</span>
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
                        <option value="Abgelehnt">Abgelehnt</option>
                        <option value="Abgeschlossen">Bezahlt</option>
                        <option value="Entwurf">Entwurf</option>
                        <option value="Eingereicht">Gesendet</option>
                        <option value="In Bearbeitung">In Arbeit</option>
                        <option value="Storniert">Storniert</option>
                        <option value="Teilweise bezahlt">Teilweise bezahlt</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Middle Row: Klienteninfo & Mahnung -->
        <div class="pt-2.5 flex items-center justify-between gap-3 text-xs">
            <button 
                type="button" 
                onclick={() => isExpanded = !isExpanded} 
                class="flex items-center gap-2.5 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-none"
                aria-expanded={isExpanded}
                aria-label="Klientendetails aufklappen"
            >
                <div class="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner" aria-hidden="true">
                    {(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}
                </div>
                <div class="min-w-0">
                    <p class="font-bold text-slate-800 dark:text-slate-200 truncate">{getClient(inv) ? `${getClient(inv).name_first} ${getClient(inv).name_last}` : 'Ohne Klient'}</p>
                    <p class="text-[11px] text-slate-400 truncate">{Array.isArray(inv.appointments) ? inv.appointments.length : (inv.appointments ? 1 : 0)} Termin(e)</p>
                </div>
            </button>

            <div class="text-right shrink-0 text-[11px]">
                {#if inv.status !== 'Abgeschlossen' && (inv as any).due_date}
                    <p class="text-rose-500 font-semibold">Fällig: {new Date((inv as any).due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</p>
                {/if}
                {#if inv.status === 'Abgeschlossen' && inv.paid_at}
                    <p class="text-emerald-600 font-semibold">Bezahlt: {new Date(inv.paid_at as unknown as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</p>
                {/if}
                {#if inv.status !== 'Abgeschlossen' && inv.issue_date}
                    {@const days = Math.max(0, Math.floor((new Date().getTime() - new Date(inv.issue_date).getTime()) / 86400000))}
                    {#if ['Eingereicht', 'In Bearbeitung'].includes(inv.status) && days >= 14 && !inv.dispute_hold}
                        {@const mLevel = days >= 30 ? 3 : (days >= 21 ? 2 : 1)}
                        <button type="button" aria-label="Mahnung senden" onclick={() => onEmail(inv, true, mLevel)} class="text-rose-700 dark:text-rose-300 font-bold bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded mt-0.5 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer text-[10px]">
                            ⚠️ {mLevel}. Mahnung
                        </button>
                    {/if}
                {/if}
            </div>
        </div>
    </div>

    <!-- Aktionsleiste (Direktklick) -->
    <div class="p-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div class="flex items-center gap-1.5 flex-nowrap shrink-0">
            {#if isRegenerating}
                <button type="button" disabled class="h-9 w-9 min-w-9 flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800 cursor-wait shadow-2xs" title="PDF wird neu generiert...">
                    <RefreshCw class="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                </button>
            {:else}
                <button type="button" aria-label="Layout neu generieren" onclick={() => onRegenerate([inv])} class="h-9 w-9 min-w-9 flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 rounded-xl transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs" title="PDF neu generieren">
                    <RefreshCw class="w-4 h-4" />
                </button>
            {/if}

            {#if getPdfUrl(inv, 0, pb)}
                <button type="button" aria-label="Rechnung PDF ansehen" onclick={() => onPreviewPdf(inv, 0, 'Rechnung')} class="h-9 w-9 min-w-9 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs" title="Rechnung PDF direkt öffnen">
                    <FileText class="w-4 h-4" />
                </button>
            {/if}

            {#if getPdfUrl(inv, 1, pb)}
                <button type="button" aria-label="Zeitnachweis PDF ansehen" onclick={() => onPreviewPdf(inv, 1, 'Zeitnachweis')} class="h-9 w-9 min-w-9 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs" title="Zeitnachweis PDF direkt öffnen">
                    <Clock class="w-4 h-4" />
                </button>
            {/if}

            {#if getPdfUrl(inv, 0, pb) || getPdfUrl(inv, 1, pb)}
                <button type="button" aria-label="Per E-Mail versenden" onclick={() => onEmail(inv)} class="h-9 w-9 min-w-9 flex items-center justify-center text-cyan-600 dark:text-cyan-300 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 rounded-xl transition-colors border border-cyan-200 dark:border-cyan-800 cursor-pointer shadow-2xs" title="Per E-Mail versenden">
                    <Mail class="w-4 h-4" />
                </button>
            {/if}
        </div>

        <button type="button" aria-label="Rechnung löschen" onclick={() => onDelete(inv.id)} class="h-9 w-9 min-w-9 flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 rounded-xl transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer shadow-2xs" title="Rechnung löschen">
            <Trash2 class="w-4 h-4" />
        </button>
    </div>

    <!-- Ausgeklappte Rechnungsdetails -->
    {#if isExpanded}
        <InvoiceDetailAccordion 
            {inv} 
            {isRegenerating}
            onOpenPdf={(index) => onPreviewPdf(inv, index, index === 0 ? 'Rechnung' : 'Zeitnachweis')}
            onEmail={() => onEmail(inv)}
            onRegenerate={() => onRegenerate([inv])}
            onCancel={onCancel ? () => onCancel(inv.id) : undefined}
            onCorrect={onCorrect ? () => onCorrect(inv) : undefined}
        />
    {/if}
</div>
