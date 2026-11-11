<script lang="ts">
    import { Ban, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-svelte";
    import * as appService from "./appointmentDetailService";

    interface Props {
        appointment: any;
        onSaved?: () => void;
    }

    let { appointment, onSaved }: Props = $props();

    let dialog = $state<HTMLDialogElement | null>(null);
    let isSaving = $state(false);
    let selectedQuickReason = $state("");
    let customReason = $state("");

    const QUICK_REASONS = [
        "Klient krank",
        "Ärztin / Arzt krank",
        "Terminkollision",
        "Vom Klienten abgesagt",
        "Vom Betreuer abgesagt",
        "Krankenhausaufenthalt"
    ];

    let isCurrentlyCancelled = $derived(appointment?.status === 'abgesagt');
    let effectiveReason = $derived(customReason.trim() || selectedQuickReason);

    export function open() {
        if (appointment) {
            customReason = appointment.cancellation_reason || "";
            selectedQuickReason = QUICK_REASONS.includes(customReason) ? customReason : "";
        } else {
            customReason = "";
            selectedQuickReason = "";
        }
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function selectQuickReason(reason: string) {
        if (selectedQuickReason === reason) {
            selectedQuickReason = "";
            if (customReason === reason) customReason = "";
        } else {
            selectedQuickReason = reason;
            customReason = reason;
        }
    }

    async function handleConfirmCancel() {
        if (!appointment?.id || isSaving) return;
        isSaving = true;
        try {
            const ok = await appService.setAppointmentStatus(appointment.id, 'abgesagt', effectiveReason);
            if (ok) {
                onSaved?.();
                close();
            }
        } finally {
            isSaving = false;
        }
    }

    async function handleReactivate() {
        if (!appointment?.id || isSaving) return;
        isSaving = true;
        try {
            const ok = await appService.setAppointmentStatus(appointment.id, 'geplant', '');
            if (ok) {
                onSaved?.();
                close();
            }
        } finally {
            isSaving = false;
        }
    }

    async function handleUpdateReason() {
        if (!appointment?.id || isSaving) return;
        isSaving = true;
        try {
            const ok = await appService.setAppointmentStatus(appointment.id, 'abgesagt', effectiveReason);
            if (ok) {
                onSaved?.();
                close();
            }
        } finally {
            isSaving = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl shadow-2xl border-0 z-60 outline-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full border border-neutral-100 dark:border-slate-800 overflow-hidden shadow-2xl">
        <!-- Header Bild-3-Design -->
        <div class="p-6 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 text-lg shrink-0">
                    <Ban class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
                            Terminstatus
                        </span>
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400">
                            {isCurrentlyCancelled ? 'Bereits abgesagt' : 'Absage erfassen'}
                        </span>
                    </div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                        {isCurrentlyCancelled ? 'Termin ist abgesagt' : 'Termin absagen'}
                    </h3>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={close}
                class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer"
            >✕</button>
        </div>

        <div class="p-6 space-y-4 flex-1">
            {#if !isCurrentlyCancelled}
                <div class="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
                    <AlertTriangle class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                        Abgesagte Termine werden im Kalender ausgegraut und von offenen Abrechnungsstatistiken ausgenommen.
                    </p>
                </div>
            {:else}
                <div class="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 flex items-start gap-3">
                    <AlertTriangle class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <p class="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                        Dieser Termin ist aktuell abgesagt. Du kannst den Grund anpassen oder den Termin wieder aktivieren.
                    </p>
                </div>
            {/if}

            <!-- Schnellauswahl Grund -->
            <div>
                <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Absagegrund wählen (Optional)
                </span>
                <div class="flex flex-wrap gap-1.5">
                    {#each QUICK_REASONS as reason}
                        <button
                            type="button"
                            onclick={() => selectQuickReason(reason)}
                            class="px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer {
                                customReason === reason
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                    : 'bg-neutral-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700 border-neutral-200 dark:border-slate-700'
                            }"
                        >
                            {reason}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Freitext Grund -->
            <div>
                <label for="cancellation-reason-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Freitext / Spezifischer Grund
                </label>
                <input
                    id="cancellation-reason-input"
                    type="text"
                    bind:value={customReason}
                    onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (isCurrentlyCancelled) handleUpdateReason(); else handleConfirmCancel(); } }}
                    placeholder="z. B. Ärztin krank, Klient im Urlaub..."
                    class="w-full px-3.5 py-2.5 rounded-xl text-sm bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
            </div>
        </div>

        <!-- Aktions-Footer Bild-3-Design -->
        <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
                type="button"
                onclick={close}
                class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
                Schließen
            </button>

            <div class="flex items-center gap-2">
                {#if isCurrentlyCancelled}
                    <button
                        type="button"
                        onclick={handleReactivate}
                        disabled={isSaving}
                        class="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <RefreshCw class="w-3.5 h-3.5" />
                        <span>Reaktivieren</span>
                    </button>
                    <button
                        type="button"
                        onclick={handleUpdateReason}
                        disabled={isSaving}
                        class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <CheckCircle2 class="w-4 h-4" />
                        <span>Grund speichern</span>
                    </button>
                {:else}
                    <button
                        type="button"
                        onclick={handleConfirmCancel}
                        disabled={isSaving}
                        class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Ban class="w-4 h-4" />
                        <span>Als abgesagt markieren</span>
                    </button>
                {/if}
            </div>
        </div>
    </div>
</dialog>
