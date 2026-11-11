<script lang="ts">
    import { timeTrackingStore, extractClientFromAppointment } from "$lib/stores/timeTracking.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { Square, Pause, Play, Clock, User, AlertTriangle, X, ExternalLink, RefreshCw } from "lucide-svelte";
    import { appointmentModalService } from "$lib/services/appointmentModalService.svelte";
    import { appointmentCompleteService } from "$lib/services/appointmentCompleteService.svelte";

    let showStopConfirm = $state(false);
    let stopConfirmDialog = $state<HTMLDialogElement>();

    $effect(() => {
        if (showStopConfirm && stopConfirmDialog && !stopConfirmDialog.open) {
            stopConfirmDialog.showModal();
        } else if (!showStopConfirm && stopConfirmDialog && stopConfirmDialog.open) {
            stopConfirmDialog.close();
        }
    });

    let activeEntryId = $derived(timeTrackingStore.activeEntryId);
    let isPaused = $derived(timeTrackingStore.isPaused);
    let timeStr = $derived(timeTrackingStore.formattedTime);
    let clientName = $derived(timeTrackingStore.clientName);
    let serviceType = $derived(timeTrackingStore.serviceType);
    let appointmentId = $derived(timeTrackingStore.appointmentId);
    let clientId = $derived(timeTrackingStore.clientId);
    let isSubmitting = $derived(timeTrackingStore.isSubmitting);
    let isSyncing = $derived(timeTrackingStore.isSyncing);
    let isVisible = $derived(timeTrackingStore.isVisibleForCurrentUser);

    let displayClientName = $derived.by(() => {
        if (clientName && clientName.trim() && clientName !== 'Kein Klient zugeordnet') return clientName;
        if (appointmentId && orgaStore.appointments) {
            const app = orgaStore.appointments.getById(appointmentId) || orgaStore.appointments.data?.find((a: any) => a.id === appointmentId);
            if (app) {
                const info = extractClientFromAppointment(app);
                if (info.name) return info.name;
            }
        }
        if (clientId && orgaStore.clients) {
            const c = orgaStore.clients.getById(clientId) || orgaStore.clients.data?.find((c: any) => c.id === clientId);
            if (c) {
                const name = `${c.name_first || ''} ${c.name_last || ''}`.trim() || c.company_name || '';
                if (name) return name;
            }
        }
        return '';
    });

    function handleOpenStopConfirm() { showStopConfirm = true; }
    function handleCancelStop() { showStopConfirm = false; }

    async function handleConfirmStop() {
        const targetAppId = appointmentId;
        showStopConfirm = false;
        await timeTrackingStore.stop();
        if (targetAppId) {
            appointmentCompleteService.open(targetAppId);
        }
    }

    function handleOpenDetail() {
        if (appointmentId) appointmentModalService.open(appointmentId);
    }
</script>

{#if isVisible}
    <div
        role="region"
        aria-label="Aktive Zeiterfassung Statusleiste"
        class="fixed bottom-[calc(theme(spacing.16)+env(safe-area-inset-bottom,0px)+0.5rem)] lg:bottom-6 left-0 right-0 lg:left-72 lg:right-8 z-40 pointer-events-none px-3 sm:px-6 transition-all duration-300"
    >
        <div class="max-w-4xl mx-auto pointer-events-auto bg-slate-900/95 dark:bg-slate-900/95 text-white p-2.5 sm:p-3.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] border border-slate-700/80 backdrop-blur-xl flex items-center justify-between min-h-[58px] gap-2 animate-enter">
            <!-- Klickbarer Info-Bereich -->
            <button
                type="button"
                onclick={handleOpenDetail}
                class="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 text-left rounded-xl p-1.5 -m-1 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Details zum laufenden Einsatz aufrufen{displayClientName ? ` für ${displayClientName}` : ''}"
                title={appointmentId || clientId ? "Einsatzdetails öffnen" : "Laufende Erfassung"}
            >
                <div class="relative flex items-center justify-center shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl {isPaused ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
                    <Clock class="w-5 h-5" />
                    <span class="absolute -top-1 -right-1 flex h-3 w-3">
                        {#if isPaused}
                            <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-400 border-2 border-slate-900"></span>
                        {:else}
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
                        {/if}
                    </span>
                </div>

                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span role="timer" aria-live="off" class="text-base sm:text-lg font-mono font-black tracking-wider {isPaused ? 'text-amber-400' : 'text-emerald-400'}">
                            {timeStr}
                        </span>
                        {#if isPaused}
                            <span class="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">Pausiert</span>
                        {/if}
                        {#if isSyncing}
                            <span class="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                <RefreshCw class="w-3 h-3 animate-spin" />
                                Synchronisiere...
                            </span>
                        {/if}
                    </div>

                    <div class="flex items-center gap-1.5 text-xs text-slate-300 truncate mt-0.5">
                        {#if displayClientName}
                            <User class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span class="font-bold text-white truncate">{displayClientName}</span>
                            <span class="text-slate-500">·</span>
                        {/if}
                        <span class="text-slate-400 truncate">{serviceType || 'Betreuung'}</span>
                    </div>
                </div>
            </button>

            <!-- Steuerungsbuttons -->
            <div class="flex items-center gap-1 sm:gap-2 shrink-0">
                {#if isPaused}
                    <button
                        type="button"
                        onclick={() => timeTrackingStore.resume()}
                        disabled={isSubmitting}
                        class="h-11 min-h-[44px] px-3 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 touch-manipulation"
                        aria-label="Zeiterfassung fortsetzen"
                    >
                        <Play class="w-4 h-4 fill-current" />
                        <span class="hidden sm:inline">Weiter</span>
                    </button>
                {:else}
                    <button
                        type="button"
                        onclick={() => timeTrackingStore.pause()}
                        disabled={isSubmitting}
                        class="h-11 min-h-[44px] px-3 sm:px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/40 transition-colors cursor-pointer disabled:opacity-50 touch-manipulation"
                        aria-label="Zeiterfassung pausieren"
                    >
                        <Pause class="w-4 h-4 fill-current" />
                        <span class="hidden sm:inline">Pause</span>
                    </button>
                {/if}

                <button
                    type="button"
                    onclick={handleOpenStopConfirm}
                    disabled={isSubmitting}
                    class="h-11 w-11 min-w-[44px] min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 touch-manipulation"
                    aria-label="Zeiterfassung stoppen und abschließen"
                    title="Zeiterfassung beenden"
                >
                    <Square class="w-5 h-5 fill-current" />
                </button>
            </div>
        </div>
    </div>
{/if}

<dialog
    bind:this={stopConfirmDialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm w-full max-w-md mx-auto my-auto rounded-2xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === stopConfirmDialog) handleCancelStop(); }}
    oncancel={(e) => { e.preventDefault(); handleCancelStop(); }}
>
    {#if showStopConfirm}
        <div class="relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-enter">
            <button
                type="button"
                onclick={handleCancelStop}
                class="absolute top-4 right-4 h-11 w-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Dialog schließen"
            >
                <X class="w-5 h-5" />
            </button>

            <div class="flex items-center gap-3 mb-4">
                <div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/80">
                    <AlertTriangle class="w-6 h-6" />
                </div>
                <div>
                    <h2 class="text-lg font-bold text-slate-900 dark:text-white">Zeiterfassung beenden?</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                        {appointmentId ? 'Der Zeiteintrag wird gespeichert. Sie können den Termin anschließend direkt abschließen.' : 'Der Zeiteintrag wird gespeichert und synchronisiert.'}
                    </p>
                </div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/70 mb-6 space-y-2 text-xs">
                <div class="flex justify-between items-center">
                    <span class="text-slate-500 dark:text-slate-400">Erfasste Dauer:</span>
                    <span class="font-mono font-bold text-sm text-slate-900 dark:text-white">{timeStr}</span>
                </div>
                {#if displayClientName}
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500 dark:text-slate-400">Klient:</span>
                        <span class="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">{displayClientName}</span>
                    </div>
                {/if}
            </div>

            <div class="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                <button
                    type="button"
                    onclick={handleCancelStop}
                    class="w-full sm:w-auto h-11 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors cursor-pointer"
                >
                    Weiterlaufen lassen
                </button>
                <button
                    type="button"
                    onclick={handleConfirmStop}
                    disabled={isSubmitting}
                    class="w-full sm:w-auto h-11 min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                    Beenden &amp; Speichern
                </button>
            </div>
        </div>
    {/if}
</dialog>
