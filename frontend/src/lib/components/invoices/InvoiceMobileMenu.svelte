<!-- src/lib/components/invoices/InvoiceMobileMenu.svelte -->
<script lang="ts">
    import type { InvoicePayload } from "$lib/utils/invoice";
    import { getClient, getPdfUrl } from "$lib/utils/invoiceHelpers";
    import { pb } from "$lib/services/pocketbase";
    // @ts-ignore
    import { X, FileEdit, Send, Hourglass, Check, FileText, Clock, RefreshCw, Trash2, Mail, XCircle, AlertTriangle } from "lucide-svelte";

    let {
        activeMobileInvoice = $bindable(),
        dialog = $bindable(),
        onUpdateStatus,
        onPreviewPdf,
        onEmail,
        onRegenerate,
        onDelete,
        onCancel
    }: {
        activeMobileInvoice: InvoicePayload | null;
        dialog: HTMLDialogElement | undefined;
        onUpdateStatus: (id: string, status: string) => void;
        onPreviewPdf: (inv: InvoicePayload, index: number, prefix: string) => void;
        onEmail: (inv: InvoicePayload, isMahnung?: boolean, mLevel?: number) => void;
        onRegenerate: (invs: InvoicePayload[]) => void;
        onDelete: (id: string) => void;
        onCancel: (id: string) => void;
    } = $props();

    function closeMenu() {
        dialog?.close();
        setTimeout(() => {
            activeMobileInvoice = null;
        }, 300);
    }
</script>

<dialog aria-label="Aktionsmenü" bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto mt-auto mb-0 sm:my-auto rounded-t-3xl sm:rounded-3xl shadow-2xl" onclick={(e) => { if (e.target === dialog) closeMenu(); }}>
    {#if activeMobileInvoice}
    <div class="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full flex flex-col gap-6 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]">
        <div class="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto -mt-2 mb-2 sm:hidden" aria-hidden="true"></div>

        <div class="flex justify-between items-start border-b border-neutral-100 pb-4">
            <div>
                <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-black text-neutral-900 text-xl">{activeMobileInvoice.invoice_nr ?? 'RE-Unbekannt'}</h3>
                    {#if activeMobileInvoice.dispute_hold}
                        <span class="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">⚠️ Mahnstopp</span>
                    {/if}
                </div>
                <p class="text-sm text-neutral-500 font-medium mt-0.5">{getClient(activeMobileInvoice) ? `${getClient(activeMobileInvoice).name_first ?? ''} ${getClient(activeMobileInvoice).name_last ?? ''}` : 'Ohne Klient'}</p>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px] font-semibold">
                    <span class="text-neutral-400">Vom: {activeMobileInvoice.issue_date ? new Date(activeMobileInvoice.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                    {#if activeMobileInvoice.status !== 'Abgeschlossen' && activeMobileInvoice.issue_date}
                        {@const days = Math.max(0, Math.floor((new Date().getTime() - new Date(activeMobileInvoice.issue_date).getTime()) / 86400000))}
                        {#if ['Eingereicht', 'In Bearbeitung'].includes(activeMobileInvoice.status)}
                            <span class="text-neutral-400 border-l border-neutral-200 pl-2">Gesendet vor {days} Tag{#if days !== 1}en{/if}</span>
                            {#if days >= 14}
                                {@const mLevel = days >= 30 ? 3 : (days >= 21 ? 2 : 1)}
                                <button type="button" aria-label="Mahnung senden" onclick={(e) => { e.stopPropagation(); onEmail(activeMobileInvoice!, true, mLevel); closeMenu(); }} class="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded hover:bg-rose-500 hover:text-white transition-colors cursor-pointer ml-1">
                                    ⚠️ {mLevel}. Mahnung fällig
                                </button>
                            {/if}
                        {/if}
                    {/if}
                    {#if activeMobileInvoice.status !== 'Abgeschlossen' && (activeMobileInvoice as any).due_date}
                        <span class="text-rose-500 border-l border-neutral-200 pl-2">Fällig: {new Date((activeMobileInvoice as any).due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    {/if}
                    {#if activeMobileInvoice.status === 'Abgeschlossen' && activeMobileInvoice.paid_at}
                        <span class="text-emerald-600 border-l border-neutral-200 pl-2">Bezahlt: {new Date(activeMobileInvoice.paid_at as unknown as string).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    {/if}
                    {#if activeMobileInvoice.status === 'Teilweise bezahlt'}
                        <span class="text-amber-700 border-l border-neutral-200 pl-2">Teilbezahlt: {(activeMobileInvoice.paid_amount || 0).toFixed(2).replace('.', ',')} €</span>
                    {/if}
                </div>
            </div>
            <button aria-label="Menü schließen" onclick={closeMenu} class="w-10 h-10 min-w-10 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500 font-bold active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none">
                <X class="w-5 h-5" />
            </button>
        </div>

        <div>
            <p class="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3 pl-1">Status ändern</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-100" role="group" aria-label="Status auswählen">
                <button aria-label="Status auf Entwurf ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Entwurf'); closeMenu(); }} class="flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none {activeMobileInvoice.status === 'Entwurf' ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10' : 'bg-transparent border-transparent text-neutral-500 active:bg-neutral-200/50'}">
                    <FileEdit class="w-5 h-5 mb-0.5" /> Entwurf
                </button>
                <button aria-label="Status auf Gesendet ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Eingereicht'); closeMenu(); }} class="flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none {activeMobileInvoice.status === 'Eingereicht' ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10' : 'bg-transparent border-transparent text-neutral-500 active:bg-neutral-200/50'}">
                    <Send class="w-5 h-5 mb-0.5" /> Gesendet
                </button>
                <button aria-label="Status auf In Arbeit ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'In Bearbeitung'); closeMenu(); }} class="flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none {activeMobileInvoice.status === 'In Bearbeitung' ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10' : 'bg-transparent border-transparent text-neutral-500 active:bg-neutral-200/50'}">
                    <Hourglass class="w-5 h-5 mb-0.5" /> In Arbeit
                </button>
                <button aria-label="Status auf Bezahlt ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Abgeschlossen'); closeMenu(); }} class="flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none {activeMobileInvoice.status === 'Abgeschlossen' ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10' : 'bg-transparent border-transparent text-neutral-500 active:bg-neutral-200/50'}">
                    <Check class="w-5 h-5 mb-0.5" /> Bezahlt
                </button>
                <button aria-label="Status auf Teilweise bezahlt / Kürzung ändern" onclick={() => { onUpdateStatus(activeMobileInvoice!.id, 'Teilweise bezahlt'); closeMenu(); }} class="col-span-2 sm:col-span-1 flex flex-col items-center justify-center min-h-16 gap-1.5 p-3 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none {activeMobileInvoice.status === 'Teilweise bezahlt' ? 'bg-white border-amber-300 text-amber-800 shadow-sm ring-1 ring-amber-500/10' : 'bg-transparent border-transparent text-neutral-500 active:bg-neutral-200/50'}">
                    <AlertTriangle class="w-5 h-5 mb-0.5 text-amber-500" /> Kürzung melden
                </button>
            </div>
        </div>

        <div>
            <p class="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3 pl-1">Aktionen</p>
            <div class="flex flex-col gap-3">
                {#if getPdfUrl(activeMobileInvoice, 0, pb)}<button aria-label="Rechnung ansehen" onclick={() => { onPreviewPdf(activeMobileInvoice!, 0, 'Rechnung'); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-white border border-neutral-200 rounded-2xl hover:bg-neutral-50 active:scale-95 transition-all text-sm font-bold text-neutral-800 shadow-sm focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none"><FileText class="w-5 h-5 text-neutral-500" /> Rechnung ansehen</button>{/if}
                {#if getPdfUrl(activeMobileInvoice, 1, pb)}<button aria-label="Zeiten ansehen" onclick={() => { onPreviewPdf(activeMobileInvoice!, 1, 'Zeitnachweis'); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-white border border-neutral-200 rounded-2xl hover:bg-neutral-50 active:scale-95 transition-all text-sm font-bold text-neutral-800 shadow-sm focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none"><Clock class="w-5 h-5 text-neutral-500" /> Zeiten ansehen</button>{/if}
                {#if getPdfUrl(activeMobileInvoice, 0, pb) || getPdfUrl(activeMobileInvoice, 1, pb)}<button aria-label="Rechnung per E-Mail senden" onclick={() => { onEmail(activeMobileInvoice!); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-blue-50 border border-blue-100 rounded-2xl active:scale-95 transition-all text-sm font-bold text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"><Mail class="w-5 h-5 text-blue-600" /> Per E-Mail versenden</button>{/if}
                <button aria-label="Rechnung stornieren" onclick={() => { onCancel(activeMobileInvoice!.id); closeMenu(); }} class="flex items-center gap-3 p-4 min-h-14 bg-rose-50 border border-rose-100 rounded-2xl active:scale-95 transition-all text-sm font-bold text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"><XCircle class="w-5 h-5 text-rose-600" /> Rechnung stornieren</button>
                <div class="grid grid-cols-2 gap-3 mt-2">
                    <button aria-label="Layout neu generieren" onclick={() => { onRegenerate([activeMobileInvoice!]); closeMenu(); }} class="flex flex-col items-center justify-center gap-1.5 p-4 min-h-16 bg-amber-50 border border-amber-100 rounded-2xl active:scale-95 transition-all text-[11px] font-bold text-amber-700 text-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"><RefreshCw class="w-5 h-5" /> Layout Refresh</button>
                    <button aria-label="Rechnung löschen" onclick={() => { onDelete(activeMobileInvoice!.id); closeMenu(); }} class="flex flex-col items-center justify-center gap-1.5 p-4 min-h-16 bg-rose-50 border border-rose-100 rounded-2xl active:scale-95 transition-all text-[11px] font-bold text-rose-700 text-center focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"><Trash2 class="w-5 h-5" /> Löschen</button>
                </div>
            </div>
        </div>
    </div>
    {/if}
</dialog>