<script lang="ts">
    import { FileText, Download, Eye, CheckCircle2, Clock, AlertCircle } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { slide } from "svelte/transition";

    let { invoices, onPreview } = $props<{
        invoices: any[];
        onPreview: (url: string, title: string, filename: string) => void;
    }>();

    let showUnpaidFirst = $state(true);

    let sortedInvoices = $derived.by(() => {
        if (!showUnpaidFirst) return invoices;
        return [...invoices].sort((a, b) => {
            const aIsOpen = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(a.status);
            const bIsOpen = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(b.status);
            if (aIsOpen && !bIsOpen) return -1;
            if (!aIsOpen && bIsOpen) return 1;
            return 0;
        });
    });

    function getStatusStyle(status: string) {
        switch (status) {
            case 'Abgeschlossen': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 };
            case 'Eingereicht':
            case 'Offen': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: FileText };
            case 'In Bearbeitung': return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock };
            case 'Storniert': return { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertCircle };
            default: return { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200', icon: FileText };
        }
    }

    function handlePreview(inv: any, e: Event) {
        e.stopPropagation();
        if (!inv.pdf) return;
        const filename = Array.isArray(inv.pdf) ? inv.pdf[0] : inv.pdf;
        let url = pb.files.getURL(inv, filename);
        if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
        onPreview(url, `Rechnung ${inv.invoice_nr || ''}`, filename);
    }

    function handleDownload(inv: any, e: Event) {
        e.stopPropagation();
        if (!inv.pdf) return;
        const filename = Array.isArray(inv.pdf) ? inv.pdf[0] : inv.pdf;
        let url = pb.files.getURL(inv, filename);
        if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    let userType = $state("client");
    $effect(() => {
        if (typeof window !== 'undefined') {
            const t = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            if (t) try { userType = JSON.parse(atob(t.split('.')[1])).type; } catch(e){}
        }
    });
</script>

<div class="bg-white p-4 sm:p-8 rounded-3xl border border-neutral-100 shadow-xl overflow-hidden animate-enter">
    <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-black text-neutral-900 hidden sm:block">{userType === 'client' ? 'Ihre Dokumente & Rechnungen' : 'Dokumente & Rechnungen der Klienten'}</h3>
        <p class="text-xs font-bold text-neutral-500 uppercase tracking-widest sm:hidden">Dokumente</p>
        <div class="flex items-center gap-3">
            {#if invoices.length > 0}
                <label class="hidden sm:flex items-center gap-2 text-xs font-bold text-neutral-600 cursor-pointer bg-neutral-50 hover:bg-neutral-100 px-3 py-1.5 rounded-lg transition-colors border border-neutral-100">
                    <input type="checkbox" bind:checked={showUnpaidFirst} class="w-4 h-4 text-brand-600 rounded border-neutral-300 focus:ring-brand-500" />
                    Offene zuerst
                </label>
            {/if}
            <span class="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-bold">{invoices.length} Einträge</span>
        </div>
    </div>

    {#if invoices.length > 0}
        <label class="sm:hidden flex items-center justify-center gap-2 text-sm font-bold text-neutral-600 cursor-pointer bg-neutral-50 hover:bg-neutral-100 px-4 py-3 rounded-xl transition-colors mb-6 border border-neutral-100 shadow-sm">
            <input type="checkbox" bind:checked={showUnpaidFirst} class="w-4 h-4 text-brand-600 rounded border-neutral-300 focus:ring-brand-500" />
            Offene Rechnungen zuerst anzeigen
        </label>
    {/if}

    {#if invoices.filter((inv: any) => !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status) && inv.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0)).length > 0}
        {@const overdueInvoices = invoices.filter((inv: any) => !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status) && inv.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0))}
        <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-sm animate-enter">
            <span class="text-xl shrink-0">⚠️</span>
            <div>
                <h4 class="font-bold text-rose-900 text-sm">Zahlungserinnerung</h4>
                <p class="text-xs text-rose-700 mt-1 leading-relaxed">
                    Es {overdueInvoices.length > 1 ? 'sind' : 'ist'} aktuell <strong>{overdueInvoices.length} Rechnung{overdueInvoices.length > 1 ? 'en' : ''}</strong> überfällig. Bitte prüfen Sie die untenstehenden Dokumente und überweisen Sie die offenen Beträge zeitnah unter Angabe der Rechnungsnummer.
                </p>
            </div>
        </div>
    {:else}
        <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-sm animate-enter">
            <span class="text-xl shrink-0">💡</span>
            <div>
                <h4 class="font-bold text-blue-900 text-sm">Hinweise zur Abrechnung</h4>
                <p class="text-xs text-blue-700 mt-1 leading-relaxed">Hier finden Sie alle gestellten Rechnungen und Zeitnachweise. Bitte geben Sie bei Überweisungen stets die <strong>Rechnungsnummer</strong> als Verwendungszweck an. Bei offenen Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            </div>
        </div>
    {/if}

    {#if invoices.length === 0}
        <div class="flex flex-col items-center justify-center py-16 opacity-60">
            <FileText class="w-12 h-12 text-neutral-300 mb-4" />
            <p class="text-sm font-bold text-neutral-600">Aktuell liegen noch keine Rechnungen vor.</p>
        </div>
    {:else}
        <div class="flex flex-col gap-3">
            {#each sortedInvoices as inv (inv.id)}
                {@const isOverdue = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status) && inv.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0)}
                {@const style = isOverdue ? { color: 'text-rose-700', bg: 'bg-white', border: 'border-rose-200', icon: AlertCircle } : getStatusStyle(inv.status)}
                {@const Icon = style.icon}
                <button type="button" onclick={(e) => handlePreview(inv, e)} class="w-full text-left {isOverdue ? 'bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-300' : 'bg-white border-neutral-100 hover:border-brand-300'} p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md group active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-brand-500 outline-none">
                    <div class="flex items-center gap-4 min-w-0">
                        <div class="w-12 h-12 rounded-xl {style.bg} {style.color} flex items-center justify-center shrink-0 border {style.border}">
                            <Icon class="w-5 h-5" />
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-black text-neutral-900 text-base truncate">{inv.invoice_nr || 'Dokument'}</h4>
                            <p class="text-xs font-medium text-neutral-500 mt-0.5 truncate">
                                {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Kein Datum'}
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-neutral-100 shrink-0">
                        <div class="text-left sm:text-right">
                            <p class="font-black text-lg {inv.brutto > 0 ? 'text-neutral-900' : 'text-neutral-400'}">{(inv.brutto || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</p>
                            <div class="flex flex-col sm:items-end mt-0.5">
                                <p class="text-[10px] font-bold uppercase tracking-widest {style.color}">{inv.status}</p>
                                {#if inv.status !== 'Abgeschlossen' && inv.due_date}
                                    <p class="text-[10px] text-rose-500 font-semibold mt-0.5">Fällig: {new Date(inv.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                {:else if inv.status === 'Abgeschlossen' && inv.paid_at}
                                    <p class="text-[10px] text-emerald-600 font-semibold mt-0.5">Bezahlt: {new Date(inv.paid_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                {/if}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <div class="w-10 h-10 bg-neutral-50 hover:bg-brand-50 text-neutral-500 hover:text-brand-600 border border-neutral-200 hover:border-brand-200 rounded-xl flex items-center justify-center transition-colors shadow-sm"><Eye class="w-4 h-4" /></div>
                            <div role="button" tabindex="0" onclick={(e) => handleDownload(inv, e)} onkeydown={(e) => e.key === 'Enter' && handleDownload(inv, e)} class="w-10 h-10 bg-neutral-50 hover:bg-brand-50 text-neutral-500 hover:text-brand-600 border border-neutral-200 hover:border-brand-200 rounded-xl flex items-center justify-center transition-colors shadow-sm"><Download class="w-4 h-4" /></div>
                        </div>
                    </div>
                </button>
            {/each}
        </div>
    {/if}
</div>