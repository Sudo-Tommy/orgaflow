<script lang="ts">
    import { Eye, Download, Clock, AlertCircle, Loader2 } from "lucide-svelte";
    import { getInvoiceStatusStyle, isInsuranceInvoice, formatCurrency } from "./portalInvoiceHelper";

    interface Props {
        inv: any;
        downloadingInvoiceKey: string | null;
        onPreview: (inv: any, e: Event, fileIndex: number) => void;
        onDownload: (inv: any, e: Event, fileIndex: number) => void;
    }

    let { inv, downloadingInvoiceKey, onPreview, onDownload }: Props = $props();

    let isOverdue = $derived(
        !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status) &&
        inv.due_date &&
        new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0)
    );

    let style = $derived(
        isOverdue 
            ? { color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-900/60', icon: AlertCircle, label: 'Überfällig' }
            : getInvoiceStatusStyle(inv.status)
    );

    let Icon = $derived(style.icon);
    let gross = $derived(inv.brutto || inv.total_gross || 0);
    let hasTimesheet = $derived(
        (Array.isArray(inv.pdf) && inv.pdf.length > 1) ||
        (Array.isArray(inv.files) && inv.files.length > 1) ||
        inv.files?.some((f: any) => f.isTimesheet)
    );
    let tsIdx = $derived(
        (inv.files?.findIndex((f: any) => f.isTimesheet) ?? -1) >= 0
            ? inv.files.findIndex((f: any) => f.isTimesheet)
            : 1
    );
    let isInsurance = $derived(isInsuranceInvoice(inv));
</script>

<div
    role="button"
    tabindex="0"
    onclick={(e) => onPreview(inv, e, 0)}
    onkeydown={(e) => e.key === 'Enter' && onPreview(inv, e, 0)}
    class="w-full text-left bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border {isOverdue ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60 dark:hover:bg-rose-950/30' : 'border-neutral-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/50 hover:bg-neutral-50/50 dark:hover:bg-slate-800/50'} transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
>
    <div class="flex items-center gap-4 min-w-0">
        <div class="w-12 h-12 rounded-2xl {style.bg} {style.color} flex items-center justify-center shrink-0 border {style.border} shadow-2xs group-hover:scale-105 transition-transform">
            <Icon class="w-6 h-6" />
        </div>

        <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-black text-neutral-900 dark:text-white text-base group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                    {inv.invoice_nr || 'Rechnung'}
                </h4>
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border {style.border} {style.bg} {style.color}">
                    {style.label}
                </span>
                {#if isInsurance}
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                        🛡️ Pflegekasse / § 45b
                    </span>
                {/if}
            </div>

            <p class="text-xs font-medium text-neutral-500 dark:text-slate-400 mt-1 truncate">
                {#if inv.expand?.client}
                    <span class="font-bold text-neutral-800 dark:text-slate-200">{inv.expand.client.name_first} {inv.expand.client.name_last} &bull; </span>
                {/if}
                <span>Rechnungsdatum: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Datum'}</span>
            </p>
        </div>
    </div>

    <div class="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-neutral-100 dark:border-slate-800 shrink-0">
        <!-- Betrag & Fälligkeit -->
        <div class="text-left sm:text-right">
            <p class="font-black text-lg {gross > 0 ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-slate-500'}">
                {formatCurrency(gross)}
            </p>

            <div class="text-[11px] mt-0.5 font-medium">
                {#if inv.status === 'Abgeschlossen'}
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ Bezahlt {inv.paid_at ? `am ${new Date(inv.paid_at).toLocaleDateString('de-DE')}` : ''}
                    </span>
                {:else if isOverdue}
                    <span class="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 sm:justify-end">
                        <AlertCircle class="w-3 h-3" /> Fällig war {new Date(inv.due_date).toLocaleDateString('de-DE')}
                    </span>
                {:else if inv.due_date}
                    <span class="text-blue-600 dark:text-blue-400 font-semibold">
                        Fällig bis {new Date(inv.due_date).toLocaleDateString('de-DE')}
                    </span>
                {:else}
                    <span class="text-neutral-400 dark:text-slate-500">Offen</span>
                {/if}
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div class="flex items-center gap-1 bg-neutral-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-neutral-200 dark:border-slate-700">
                <button
                    type="button"
                    onclick={(e) => onPreview(inv, e, 0)}
                    class="min-w-[40px] min-h-[40px] px-3 py-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation"
                    title="Rechnung ansehen"
                    aria-label="Rechnung ansehen"
                >
                    <Eye class="w-4 h-4" />
                    <span>Rechnung</span>
                </button>
                <button
                    type="button"
                    onclick={(e) => onDownload(inv, e, 0)}
                    disabled={downloadingInvoiceKey === `${inv.id}_0`}
                    class="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Rechnung PDF herunterladen"
                    aria-label="Rechnung PDF herunterladen"
                >
                    {#if downloadingInvoiceKey === `${inv.id}_0`}
                        <Loader2 class="w-4 h-4 animate-spin text-brand-600" />
                    {:else}
                        <Download class="w-4 h-4" />
                    {/if}
                </button>
            </div>

            {#if hasTimesheet}
                <div class="flex items-center gap-1 bg-indigo-50/80 dark:bg-indigo-950/60 p-1.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/80">
                    <button
                        type="button"
                        onclick={(e) => onPreview(inv, e, tsIdx)}
                        class="min-w-[40px] min-h-[40px] px-3 py-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-manipulation"
                        title="Zeitnachweis ansehen"
                        aria-label="Zeitnachweis ansehen"
                    >
                        <Clock class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Zeitnachweis</span>
                    </button>
                    <button
                        type="button"
                        onclick={(e) => onDownload(inv, e, tsIdx)}
                        disabled={downloadingInvoiceKey === `${inv.id}_${tsIdx}`}
                        class="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Zeitnachweis PDF herunterladen"
                        aria-label="Zeitnachweis PDF herunterladen"
                    >
                        {#if downloadingInvoiceKey === `${inv.id}_${tsIdx}`}
                            <Loader2 class="w-4 h-4 animate-spin text-indigo-600" />
                        {:else}
                            <Download class="w-4 h-4" />
                        {/if}
                    </button>
                </div>
            {/if}
        </div>
    </div>
</div>
