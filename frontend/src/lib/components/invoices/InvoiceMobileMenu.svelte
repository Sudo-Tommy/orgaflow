<!-- src/lib/components/invoices/InvoiceMobileMenu.svelte -->
<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice";
    import { getClient, getPdfUrl } from "$lib/utils/invoiceHelpers";
    import { pb } from "$lib/services/pocketbase";
    import { triggerHaptic } from "$lib/services/hapticFeedback";
    import { isInvoiceOverdue, extendInvoiceDueDate, getInvoiceClientPhone } from "$lib/services/invoiceQuickActions";
    import { X, FileEdit, Send, Hourglass, Check, FileText, Clock, RefreshCw, Trash2, Mail, XCircle, AlertTriangle, Pencil, CalendarPlus, Phone } from "lucide-svelte";

    let {
        activeMobileInvoice = $bindable(),
        dialog = $bindable(),
        onUpdateStatus,
        onPreviewPdf,
        onEmail,
        onRegenerate,
        onDelete,
        onCancel,
        onCorrect,
        isRegenerating = () => false
    }: {
        activeMobileInvoice: InvoicePayload | null;
        dialog: HTMLDialogElement | undefined;
        onUpdateStatus: (id: string, status: string) => void;
        onPreviewPdf: (inv: InvoicePayload, index: number, prefix: string) => void;
        onEmail: (inv: InvoicePayload, isMahnung?: boolean, mLevel?: number) => void;
        onRegenerate: (invs: InvoicePayload[]) => void;
        onDelete: (id: string) => void;
        onCancel: (id: string) => void;
        onCorrect?: (inv: InvoicePayload) => void;
        isRegenerating?: (id: string) => boolean;
    } = $props();

    function closeMenu() {
        triggerHaptic('tap');
        dialog?.close();
        setTimeout(() => {
            activeMobileInvoice = null;
        }, 300);
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs w-full max-w-lg mx-auto mb-0 sm:my-auto rounded-t-3xl sm:rounded-3xl shadow-2xl border-none outline-none"
    onclick={(e) => { if (e.target === dialog) closeMenu(); }}
    oncancel={(e) => { e.preventDefault(); closeMenu(); }}
>
    {#if activeMobileInvoice}
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-5 animate-enter shadow-2xl">
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-black text-slate-900 dark:text-slate-100 text-xl">{activeMobileInvoice.invoice_nr ?? 'RE-Unbekannt'}</h3>
                    {#if activeMobileInvoice.dispute_hold}
                        <span class="text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded shadow-2xs">⚠️ Mahnstopp</span>
                    {/if}
                    {#if activeMobileInvoice.dunning_level}
                        <span class="orga-pill-badge bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300">
                            {activeMobileInvoice.dunning_level}. Mahnstufe
                        </span>
                    {/if}
                </div>
                <p class="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">{getClient(activeMobileInvoice) ? `${getClient(activeMobileInvoice).name_first ?? ''} ${getClient(activeMobileInvoice).name_last ?? ''}` : 'Ohne Klient'}</p>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px] font-semibold">
                    <span class="text-slate-400">Vom: {activeMobileInvoice.issue_date ? new Date(activeMobileInvoice.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                    {#if activeMobileInvoice.status !== 'Abgeschlossen' && activeMobileInvoice.issue_date}
                        {@const days = Math.max(0, Math.floor((new Date().getTime() - new Date(activeMobileInvoice.issue_date).getTime()) / 86400000))}
                        {#if ['Eingereicht', 'In Bearbeitung'].includes(activeMobileInvoice.status)}
                            <span class="text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2">Gesendet vor {days} Tag{#if days !== 1}en{/if}</span>
                        {/if}
                    {/if}
                    {#if activeMobileInvoice.status !== 'Abgeschlossen' && (activeMobileInvoice as any).due_date}
                        <span class="text-rose-500 dark:text-rose-400 border-l border-slate-200 dark:border-slate-700 pl-2">Fällig: {new Date((activeMobileInvoice as any).due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                    {/if}
                    {#if activeMobileInvoice.status === 'Abgeschlossen' && activeMobileInvoice.paid_at}
                        <span class="text-emerald-600 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-700 pl-2">Bezahlt: {new Date(activeMobileInvoice.paid_at as unknown as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                    {/if}
                </div>
            </div>
            <button aria-label="Menü schließen" onclick={closeMenu} class="w-10 h-10 min-w-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none cursor-pointer">
                <X class="w-5 h-5" />
            </button>
        </div>

        {#if isInvoiceOverdue(activeMobileInvoice)}
            <div class="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2.5">
                <p class="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle class="w-3.5 h-3.5 text-rose-600" /> Überfällig · Schnellaktionen
                </p>
                <div class="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onclick={() => { onEmail(activeMobileInvoice!, true, Math.min(3, (activeMobileInvoice!.dunning_level || 0) + 1)); closeMenu(); }}
                        class="p-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                        <Mail class="w-4 h-4" /> Mahnung senden
                    </button>
                    <button
                        type="button"
                        onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Abgeschlossen'); closeMenu(); }}
                        class="p-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                        <Check class="w-4 h-4" /> Als bezahlt
                    </button>
                    <button
                        type="button"
                        onclick={() => { extendInvoiceDueDate(activeMobileInvoice!, 7); closeMenu(); }}
                        class="p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 active:scale-95 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <CalendarPlus class="w-4 h-4 text-amber-600" /> +7 Tage Frist
                    </button>
                    {#if getInvoiceClientPhone(activeMobileInvoice)}
                        <a
                            href="tel:{getInvoiceClientPhone(activeMobileInvoice)}"
                            onclick={closeMenu}
                            class="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 active:scale-95 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            <Phone class="w-4 h-4 text-emerald-600" /> Anrufen
                        </a>
                    {:else}
                        <button
                            type="button"
                            onclick={() => { extendInvoiceDueDate(activeMobileInvoice!, 14); closeMenu(); }}
                            class="p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 active:scale-95 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                            <CalendarPlus class="w-4 h-4 text-amber-600" /> +14 Tage Frist
                        </button>
                    {/if}
                </div>
            </div>
        {/if}

        <div>
            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">Status ändern</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80" role="group" aria-label="Status auswählen">
                <button aria-label="Status auf Entwurf ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Entwurf'); closeMenu(); }} class="flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none cursor-pointer {activeMobileInvoice.status === 'Entwurf' ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-sm' : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 active:bg-slate-200/50 dark:active:bg-slate-700/50'}">
                    <FileEdit class="w-5 h-5 mb-0.5" /> Entwurf
                </button>
                <button aria-label="Status auf Gesendet ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Eingereicht'); closeMenu(); }} class="flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer {activeMobileInvoice.status === 'Eingereicht' ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200 shadow-sm' : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 active:bg-slate-200/50 dark:active:bg-slate-700/50'}">
                    <Send class="w-5 h-5 mb-0.5" /> Gesendet
                </button>
                <button aria-label="Status auf In Arbeit ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'In Bearbeitung'); closeMenu(); }} class="flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer {activeMobileInvoice.status === 'In Bearbeitung' ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 shadow-sm' : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 active:bg-slate-200/50 dark:active:bg-slate-700/50'}">
                    <Hourglass class="w-5 h-5 mb-0.5" /> In Arbeit
                </button>
                <button aria-label="Status auf Bezahlt ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Abgeschlossen'); closeMenu(); }} class="flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer {activeMobileInvoice.status === 'Abgeschlossen' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 shadow-sm' : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 active:bg-slate-200/50 dark:active:bg-slate-700/50'}">
                    <Check class="w-5 h-5 mb-0.5" /> Bezahlt
                </button>
                <button aria-label="Status auf Teilweise bezahlt / Kürzung ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Teilweise bezahlt'); closeMenu(); }} class="col-span-2 sm:col-span-1 flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer {activeMobileInvoice.status === 'Teilweise bezahlt' ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 shadow-sm' : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 active:bg-slate-200/50 dark:active:bg-slate-700/50'}">
                    <AlertTriangle class="w-5 h-5 mb-0.5 text-amber-500" /> Kürzung melden
                </button>
            </div>
        </div>

        <div>
            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">Aktionen</p>
            <div class="flex flex-col gap-3">
                {#if getPdfUrl(activeMobileInvoice, 0, pb)}<button aria-label="Rechnung ansehen" onclick={() => { onPreviewPdf(activeMobileInvoice!, 0, 'Rechnung'); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-sm font-bold text-slate-800 dark:text-slate-200 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none cursor-pointer"><FileText class="w-5 h-5 text-slate-500" /> Rechnung ansehen</button>{/if}
                {#if getPdfUrl(activeMobileInvoice, 1, pb)}<button aria-label="Zeiten ansehen" onclick={() => { onPreviewPdf(activeMobileInvoice!, 1, 'Zeitnachweis'); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-sm font-bold text-slate-800 dark:text-slate-200 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none cursor-pointer"><Clock class="w-5 h-5 text-slate-500" /> Zeiten ansehen</button>{/if}
                {#if getPdfUrl(activeMobileInvoice, 0, pb) || getPdfUrl(activeMobileInvoice, 1, pb)}<button aria-label="Rechnung per E-Mail senden" onclick={() => { onEmail(activeMobileInvoice!); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 rounded-2xl hover:bg-cyan-100 dark:hover:bg-cyan-900/60 active:scale-95 transition-all text-sm font-bold text-cyan-700 dark:text-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer"><Mail class="w-5 h-5 text-cyan-600" /> Per E-Mail versenden</button>{/if}
                {#if onCorrect}<button aria-label="Rechnung korrigieren" onclick={() => { onCorrect(activeMobileInvoice!); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 rounded-2xl hover:bg-violet-100 dark:hover:bg-violet-900/60 active:scale-95 transition-all text-sm font-bold text-violet-700 dark:text-violet-300 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none cursor-pointer"><Pencil class="w-5 h-5 text-violet-600" /> Rechnung korrigieren</button>{/if}
                <button aria-label="Rechnung stornieren" onclick={() => { onCancel(activeMobileInvoice!.id); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 transition-all text-sm font-bold text-rose-700 dark:text-rose-300 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"><XCircle class="w-5 h-5 text-rose-600" /> Rechnung stornieren</button>
                <div class="grid grid-cols-2 gap-3 mt-2">
                    <button aria-label="Layout neu generieren" onclick={() => { onRegenerate([activeMobileInvoice!]); closeMenu(); }} disabled={Boolean(activeMobileInvoice && isRegenerating(activeMobileInvoice.id))} class="flex flex-col items-center justify-center gap-1.5 p-4 min-h-16 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-2xl hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95 transition-all text-[11px] font-bold text-amber-700 dark:text-amber-300 text-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer {activeMobileInvoice && isRegenerating(activeMobileInvoice.id) ? 'opacity-80 cursor-wait' : ''}"><RefreshCw class="w-5 h-5 {activeMobileInvoice && isRegenerating(activeMobileInvoice.id) ? 'animate-spin' : ''}" /> Layout Refresh</button>
                    <button aria-label="Rechnung löschen" onclick={() => { onDelete(activeMobileInvoice!.id); closeMenu(); }} class="flex flex-col items-center justify-center gap-1.5 p-4 min-h-16 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 transition-all text-[11px] font-bold text-rose-700 dark:text-rose-300 text-center focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"><Trash2 class="w-5 h-5" /> Löschen</button>
                </div>
            </div>
        </div>
    </div>
    {/if}
</dialog>
