<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { getPdfUrl } from "$lib/utils/invoiceHelpers";
    import { getReplacedBy } from "$lib/services/invoiceCorrectionHelper";
    import { 
        FileText, 
        Clock, 
        Mail, 
        RefreshCw, 
        XCircle, 
        Calendar, 
        Receipt, 
        AlertTriangle, 
        Pencil
    } from "lucide-svelte";

    let {
        inv,
        isRegenerating = false,
        onOpenPdf,
        onEmail,
        onRegenerate,
        onCancel,
        onCorrect
    }: {
        inv: InvoicePayload;
        isRegenerating?: boolean;
        onOpenPdf: (index: number) => void;
        onEmail: () => void;
        onRegenerate: () => void;
        onCancel?: () => void;
        onCorrect?: () => void;
    } = $props();

    function formatCurrency(val: number | null | undefined): string {
        return (val ?? 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    function formatDate(d: string | null | undefined): string {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    let positions = $derived.by(() => {
        const raw = (inv as any).table_positions;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    });

    let appointments = $derived.by(() => {
        const raw = Array.isArray(inv.appointments) ? inv.appointments : (inv.appointments ? [inv.appointments] : []);
        const ids = raw.map((a: any) => (typeof a === 'string' ? a : a?.id)).filter(Boolean);
        return (orgaStore.appointments?.data || [])
            .filter((a: any) => ids.includes(a.id))
            .sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    });

    let adjustments = $derived.by(() => {
        return (orgaStore.invoice_adjustments?.data || []).filter((adj: any) => {
            const rel = Array.isArray(adj.invoice) ? adj.invoice[0] : adj.invoice;
            const id = typeof rel === 'string' ? rel : rel?.id;
            return id === inv.id;
        });
    });
</script>

<div class="p-4 sm:p-6 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200/80 dark:border-slate-800 rounded-b-2xl space-y-5 text-slate-800 dark:text-slate-200">
    <!-- Kennzahlen & Finanzübersicht -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Rechnungsdatum</span>
            <span class="font-bold text-sm text-slate-900 dark:text-slate-100">{formatDate(inv.issue_date)}</span>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Fälligkeitsdatum</span>
            <span class="font-bold text-sm {(inv as any).due_date ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}">{formatDate((inv as any).due_date)}</span>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Nettobetrag</span>
            <span class="font-bold text-sm text-slate-900 dark:text-slate-100">{formatCurrency(inv.netto ?? inv.brutto)}</span>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Gesamt (Brutto)</span>
            <span class="font-black text-sm text-violet-600 dark:text-violet-400">{formatCurrency(inv.brutto)}</span>
        </div>
    </div>

    <!-- Teilzahlung / Ausbuchungshinweis falls vorhanden -->
    {#if inv.paid_amount || inv.remaining_amount || inv.write_off_amount}
        <div class="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
            <div class="flex flex-wrap gap-x-4 gap-y-1">
                {#if inv.paid_amount}<span>Bezahlt: <strong>{formatCurrency(inv.paid_amount)}</strong></span>{/if}
                {#if inv.remaining_amount}<span>Offen: <strong>{formatCurrency(inv.remaining_amount)}</strong></span>{/if}
                {#if inv.write_off_amount}<span>Ausgebucht: <strong class="text-rose-600 dark:text-rose-400">{formatCurrency(inv.write_off_amount)}</strong></span>{/if}
            </div>
        </div>
    {/if}

    {#if getReplacedBy(inv)}
        <div class="flex items-center gap-2.5 p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl text-xs text-violet-900 dark:text-violet-200">
            <span class="text-base">ℹ️</span>
            <span>Diese Rechnung wurde storniert und durch Rechnung <strong>{getReplacedBy(inv)}</strong> ersetzt.</span>
        </div>
    {/if}

    <!-- Positionstabelle -->
    <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Receipt class="w-4 h-4 text-violet-500" />
            <span>Rechnungspositionen ({positions.length})</span>
        </h4>
        {#if positions.length > 0}
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table class="w-full text-left text-xs border-collapse">
                    <thead class="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                        <tr>
                            <th class="py-2 px-3 w-10">Pos.</th>
                            <th class="py-2 px-3">Datum</th>
                            <th class="py-2 px-3">Beschreibung</th>
                            <th class="py-2 px-3 text-right">Menge</th>
                            <th class="py-2 px-3 text-right">Einzelpreis</th>
                            <th class="py-2 px-3 text-right">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        {#each positions as pos, idx}
                            <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                <td class="py-2 px-3 font-mono text-slate-400">{pos.pos || idx + 1}</td>
                                <td class="py-2 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{pos.date || '-'}</td>
                                <td class="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{pos.title || pos.description || '-'}</td>
                                <td class="py-2 px-3 text-right whitespace-nowrap">{pos.duration || pos.quantity || 1}</td>
                                <td class="py-2 px-3 text-right whitespace-nowrap">{formatCurrency(pos.price)}</td>
                                <td class="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatCurrency(pos.total)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <p class="text-xs text-slate-400 italic bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3">Keine Positionen hinterlegt.</p>
        {/if}
    </div>

    <!-- Verknüpfte Termine -->
    {#if appointments.length > 0}
        <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Calendar class="w-4 h-4 text-violet-500" />
                <span>Zugehörige Termine ({appointments.length})</span>
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {#each appointments as app}
                    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 text-xs shadow-2xs">
                        <p class="font-bold text-slate-800 dark:text-slate-200 truncate">{app.title || 'Termin'}</p>
                        <p class="text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(app.appointment)}</p>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Kürzungs-Historie (falls vorhanden) -->
    {#if adjustments.length > 0}
        <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle class="w-4 h-4 text-amber-500" />
                <span>Kürzungs- & Zahlungshistorie</span>
            </h4>
            <div class="space-y-1.5">
                {#each adjustments as adj}
                    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 text-xs flex items-center justify-between gap-3 shadow-2xs">
                        <div>
                            <span class="font-bold text-slate-800 dark:text-slate-200">{adj.action_type || 'Buchung'}</span>
                            {#if adj.notes}<span class="text-slate-500 dark:text-slate-400 ml-2">({adj.notes})</span>{/if}
                        </div>
                        <div class="text-right">
                            <span class="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(adj.amount)}</span>
                            <span class="text-[10px] text-slate-400 block">{formatDate(adj.created)}</span>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Schnell-Aktionen Leiste -->
    <div class="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
            {#if getPdfUrl(inv, 0, pb)}
                <button type="button" onclick={() => onOpenPdf(0)} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer" title="Rechnung direkt in neuem Tab öffnen">
                    <FileText class="w-4 h-4" />
                    <span>Rechnung (PDF)</span>
                </button>
            {/if}
            {#if getPdfUrl(inv, 1, pb)}
                <button type="button" onclick={() => onOpenPdf(1)} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer" title="Zeitnachweis direkt in neuem Tab öffnen">
                    <Clock class="w-4 h-4" />
                    <span>Zeitnachweis (PDF)</span>
                </button>
            {/if}
            {#if getPdfUrl(inv, 0, pb) || getPdfUrl(inv, 1, pb)}
                <button type="button" onclick={onEmail} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-600 hover:text-white border border-cyan-200 dark:border-cyan-800 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer" title="Per E-Mail versenden">
                    <Mail class="w-4 h-4" />
                    <span>Per E-Mail</span>
                </button>
            {/if}
            <button type="button" onclick={onRegenerate} disabled={isRegenerating} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50" title="PDFs aktualisieren">
                <RefreshCw class="w-4 h-4 {isRegenerating ? 'animate-spin' : ''}" />
                <span>{isRegenerating ? 'Generiere...' : 'Aktualisieren'}</span>
            </button>
            {#if onCorrect}
                <button type="button" onclick={onCorrect} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-200 dark:border-violet-800 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer" title="Rechnung korrigieren">
                    <Pencil class="w-4 h-4" />
                    <span>Korrigieren</span>
                </button>
            {/if}
        </div>

        {#if onCancel && !inv.is_cancellation && inv.status !== 'Storniert'}
            <button type="button" onclick={onCancel} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer" title="Rechnung stornieren">
                <XCircle class="w-4 h-4" />
                <span>Stornieren</span>
            </button>
        {/if}
    </div>
</div>
