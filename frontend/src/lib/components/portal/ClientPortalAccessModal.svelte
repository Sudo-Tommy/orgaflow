<script lang="ts">
    import { printElement } from "$lib/utils/print";
    import PortalAccessCardPrint from "$lib/components/portal/PortalAccessCardPrint.svelte";
    import QuickAccessMailModal from "$lib/components/portal/QuickAccessMailModal.svelte";
    import PortalAccessManageView from "$lib/components/portal/PortalAccessManageView.svelte";
    import { createPortalAccessState, type PortalTarget } from "./portalAccessState.svelte";
    import { ShieldCheck, Printer, Mail, X, Sliders, FileText, Send } from "lucide-svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    // svelte-ignore non_reactive_update
    let printRef: ReturnType<typeof PortalAccessCardPrint>;
    let quickMailModal = $state() as any;

    const accessState = createPortalAccessState();

    let activeView = $state<'manage' | 'print'>('manage');
    let copiedPin = $state(false);
    let copiedLink = $state(false);

    export async function open(clientData: any, type?: 'client' | 'contact') {
        if (!clientData) return;
        activeView = 'manage';
        copiedPin = false;
        copiedLink = false;
        dialog?.showModal();
        await accessState.init(clientData, type);
    }

    export function close() {
        dialog?.close();
        accessState.reset();
    }

    function handleCopyPin() {
        if (!accessState.portalPin) return;
        accessState.copyToClipboard(accessState.portalPin, 'PIN');
        copiedPin = true;
        setTimeout(() => { copiedPin = false; }, 2500);
    }

    function handleCopyLink() {
        if (!accessState.fullPortalUrl) return;
        accessState.copyToClipboard(accessState.fullPortalUrl, 'Direkt-Zugangs-Link');
        copiedLink = true;
        setTimeout(() => { copiedLink = false; }, 2500);
    }

    function handleOpenWhatsApp(mode?: 'mobile' | 'landline' | 'share') {
        const url = accessState.getWhatsAppShareUrl(mode);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }

    function triggerPrint() {
        activeView = 'print';
        setTimeout(() => {
            if (printRef?.printCard) {
                printRef.printCard();
            } else {
                printElement('portal-access-card-print-area', {
                    title: `Zugangskarte - ${accessState.displayName}`,
                    pageOrientation: 'portrait',
                    pageMargin: '10mm'
                });
            }
        }, 300);
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-4xl mx-auto my-6 sm:my-10 rounded-3xl border-none shadow-2xl" 
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-slate-50 dark:bg-slate-950 rounded-3xl w-full flex flex-col relative shadow-2xl border border-slate-200 dark:border-slate-800">
        <!-- MODAL HEADER -->
        <div class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 sm:px-7 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 sticky top-0 z-20">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl shadow-xs shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                    <ShieldCheck class="w-6 h-6" />
                </div>
                <div class="truncate">
                    <h2 class="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                        {accessState.roleTitle}: {accessState.displayName || 'Lade...'}
                    </h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Zugangsdaten & QR-Code für den sicheren Login ({accessState.isContact ? 'Betreuer / Pflegeheim' : 'Klient'})
                    </p>
                </div>
            </div>

            <!-- Toolbar / Aktionen -->
            <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div class="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs font-bold border border-slate-200/80 dark:border-slate-700">
                    <button 
                        type="button"
                        onclick={() => activeView = 'manage'}
                        class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 min-h-[36px] cursor-pointer {activeView === 'manage' ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-300 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
                        <Sliders class="w-3.5 h-3.5" />
                        <span>Verwalten</span>
                    </button>
                    <button 
                        type="button"
                        onclick={() => activeView = 'print'}
                        class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 min-h-[36px] cursor-pointer {activeView === 'print' ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-300 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">
                        <FileText class="w-3.5 h-3.5" />
                        <span>Druckkarte</span>
                    </button>
                </div>

                <button 
                    type="button"
                    onclick={() => quickMailModal?.open(accessState.client)} 
                    class="orga-button-ghost py-2 px-3 sm:px-3.5 text-xs font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs min-h-[44px] cursor-pointer"
                    title="E-Mail Vorlage mit Zugangslink öffnen">
                    <Mail class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span class="hidden md:inline">Quick-Mail Vorlage</span>
                </button>

                <button 
                    type="button"
                    onclick={() => quickMailModal?.open(accessState.client, { autoOpenComposer: true })} 
                    class="orga-button-primary py-2 px-3 sm:px-3.5 text-xs font-bold inline-flex items-center gap-1.5 shadow-brand-600/20 min-h-[44px] cursor-pointer"
                    title="Zugangsdaten direkt per E-Mail versenden">
                    <Send class="w-4 h-4" />
                    <span class="hidden md:inline">Direkt per Mail</span>
                </button>

                <button 
                    type="button"
                    onclick={triggerPrint} 
                    class="orga-button-ghost py-2 px-3 sm:px-4 text-xs font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs min-h-[44px] cursor-pointer">
                    <Printer class="w-4 h-4" />
                    <span class="hidden sm:inline">Karte drucken</span>
                </button>

                <button 
                    aria-label="Schließen" 
                    onclick={close} 
                    class="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0">
                    <X class="w-5 h-5" />
                </button>
            </div>
        </div>

        <!-- MODAL BODY -->
        <div class="p-4 sm:p-7 flex-1 space-y-6">
            {#if accessState.isLoading && !accessState.portalPin}
                <div class="flex flex-col items-center justify-center py-20 text-slate-500">
                    <div class="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                    <p class="text-sm font-bold">Lade Zugangsdaten...</p>
                </div>
            {:else if accessState.errorMsg && !accessState.portalPin}
                <div class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 p-6 rounded-2xl text-center space-y-3">
                    <p class="font-bold">⚠️ {accessState.errorMsg}</p>
                    <button onclick={() => accessState.loadAccessData('get')} class="orga-button-primary text-xs px-5 py-2.5 min-h-[44px]">
                        Erneut versuchen
                    </button>
                </div>
            {:else if activeView === 'print'}
                <div class="py-2">
                    <PortalAccessCardPrint 
                        bind:this={printRef}
                        clientName={accessState.displayName}
                        clientEmail={accessState.client?.email || ''}
                        portalPin={accessState.portalPin}
                        portalCode={accessState.portalCode}
                        portalUrl={accessState.fullPortalUrl}
                        roleTitle={accessState.roleTitle}
                        subtitle="Ihre persönliche Zugangskarte"
                        nameLabel={accessState.nameLabel}
                    />
                </div>
            {:else}
                <PortalAccessManageView 
                    {accessState}
                    {copiedPin}
                    {copiedLink}
                    onCopyPin={handleCopyPin}
                    onCopyLink={handleCopyLink}
                    onOpenWhatsApp={handleOpenWhatsApp}
                    onTriggerPrint={triggerPrint}
                />
            {/if}
        </div>
    </div>
</dialog>

<!-- Quick-Mail Vorlage Dialog -->
<QuickAccessMailModal bind:this={quickMailModal} />
