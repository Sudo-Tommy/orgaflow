<script lang="ts">
    import { CheckCircle2, AlertCircle, Banknote, Lock, Unlock, Eye, EyeOff, Repeat, Ban, RotateCcw } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { appointmentCompleteService } from "$lib/services/appointmentCompleteService.svelte";
    import { canManageAppointmentCompletion } from "$lib/services/appointmentStatusHelper";

    interface Props {
        appointment: any;
        onToggleSettled: () => void;
        onTogglePrivate: () => void;
        onToggleVisibility: () => void;
        onOpenCancelModal: () => void;
        onSelectTab?: (tab: any) => void;
        onToggleBillingType?: () => void;
    }

    let {
        appointment,
        onToggleSettled,
        onTogglePrivate,
        onToggleVisibility,
        onOpenCancelModal,
        onSelectTab,
        onToggleBillingType
    }: Props = $props();

    let isCancelled = $derived(appointment?.status === 'abgesagt');
    let isEnded = $derived(appointment?.status === 'beendet');
    let currentUserId = $derived(pb.authStore.model?.id);
    let isSuperAdmin = $derived(pb.authStore.isSuperuser || ['developer', 'superadmin', 'admin'].includes(pb.authStore.model?.role));
    let canManage = $derived(canManageAppointmentCompletion(appointment, currentUserId, isSuperAdmin, isSuperAdmin));
</script>

<div class="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-100/80 dark:bg-slate-800/70 border-t border-slate-200/90 dark:border-slate-700/70">
    <div class="flex flex-wrap items-center gap-2">
        <!-- 1. Termin beenden / Beendet Status & Wiedereröffnen -->
        {#if !isCancelled}
            {#if isEnded}
                <button
                    type="button"
                    onclick={() => canManage && appointmentCompleteService.reopen(appointment)}
                    disabled={!canManage}
                    class="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs border bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 {canManage ? 'cursor-pointer hover:bg-emerald-200' : 'cursor-default'}"
                    title={canManage ? "Termin ist beendet (Klicken zum Wiedereröffnen)" : "Termin ist beendet"}
                >
                    <CheckCircle2 class="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>Beendet</span>
                    {#if canManage}
                        <span class="text-[10px] opacity-75 font-normal ml-0.5 flex items-center gap-0.5">
                            <RotateCcw class="w-3 h-3" /> Wiedereröffnen
                        </span>
                    {/if}
                </button>
            {:else if canManage}
                <button
                    type="button"
                    onclick={() => appointmentCompleteService.open(appointment)}
                    class="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs border bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                    title="Diesen Termin jetzt verbindlich als beendet markieren"
                >
                    <CheckCircle2 class="w-4 h-4 text-white shrink-0" />
                    <span>Termin beenden</span>
                </button>
            {/if}
        {/if}

        <!-- 2. Status Abgesagt / Aktiv Button -->
        <button
            type="button"
            onclick={onOpenCancelModal}
            class="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs border {
                isCancelled
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800 animate-pulse'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-300 border-slate-200/90 dark:border-slate-700'
            }"
            title={isCancelled ? "Termin ist abgesagt (Klicken zum Ändern oder Reaktivieren)" : "Termin als abgesagt markieren"}
        >
            <Ban class="w-4 h-4 {isCancelled ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'} shrink-0" />
            <span>
                {#if isCancelled}
                    Abgesagt
                {:else}
                    Termin absagen
                {/if}
            </span>
        </button>

        {#if rbacService.canAccessFinances}
            <!-- 3. Abrechnungsstatus -->
            <button
                type="button"
                onclick={onToggleSettled}
                class="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs border {appointment?.settled ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'}"
            >
                {#if appointment?.settled}
                    <CheckCircle2 class="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>Abgerechnet</span>
                {:else}
                    <AlertCircle class="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>Nicht abgerechnet</span>
                {/if}
            </button>

            <!-- 4. Abrechnungsart -->
            <button
                type="button"
                onclick={() => onToggleBillingType ? onToggleBillingType() : onSelectTab?.('billing')}
                class="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs border {
                    appointment?.billing_type === 'EL' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800' :
                    appointment?.billing_type === 'VHP' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800' :
                    appointment?.billing_type === 'Kombi' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800' :
                    appointment?.billing_type === '45a' ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800' :
                    appointment?.billing_type === 'Privat' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' :
                    'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400'
                }"
                title="Abrechnungsart umschalten"
            >
                <Banknote class="w-4 h-4 {appointment?.billing_type ? (appointment?.billing_type === '45a' ? 'text-cyan-600 dark:text-cyan-400' : 'text-indigo-600 dark:text-indigo-400') : 'text-slate-400'} shrink-0" />
                <span>{appointment?.billing_type ? `Abrechnung: ${appointment.billing_type === '45a' ? '40% §45a' : appointment.billing_type}` : '+ Abrechnungsart'}</span>
            </button>
        {/if}

        <!-- 5. Privat / Beruflich -->
        <button
            type="button"
            onclick={onTogglePrivate}
            class="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs border {appointment?.is_private ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700'}"
        >
            {#if appointment?.is_private}
                <Lock class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Privat</span>
            {:else}
                <Unlock class="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>Beruflich</span>
            {/if}
        </button>

        <!-- 6. Portal Sichtbarkeit -->
        <button
            type="button"
            onclick={onToggleVisibility}
            class="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs border {appointment?.is_visible ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-800' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/90 dark:border-slate-700'}"
        >
            {#if appointment?.is_visible}
                <Eye class="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Portal: Sichtbar</span>
            {:else}
                <EyeOff class="w-4 h-4 text-slate-400 shrink-0" />
                <span>Portal: Verborgen</span>
            {/if}
        </button>

        <!-- 7. Serientermin Info -->
        {#if appointment?.is_series}
            <span class="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center gap-1.5 shadow-2xs">
                <Repeat class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Serie</span>
            </span>
        {/if}
    </div>
</div>
