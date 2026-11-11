<script lang="ts">
    import { Check, CheckCircle2, AlertTriangle, Calendar, XCircle } from "lucide-svelte";
    import { isAppointmentEnded, isAppointmentOverdue, isWorkAppointment } from "$lib/services/appointmentStatusHelper";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import AppointmentMissingBadge from "./AppointmentMissingBadge.svelte";

    interface Props {
        app: any;
        onOpenDetail?: (appId: string) => void;
        compact?: boolean;
    }

    let { app, onOpenDetail, compact = false }: Props = $props();

    let isEnded = $derived(isAppointmentEnded(app));
    let isSettled = $derived(Boolean(app?.settled));
    let isCancelled = $derived(app?.status === 'abgesagt');
    let isOverdue = $derived(isAppointmentOverdue(app));
    let isWork = $derived(isWorkAppointment(app));
</script>

<div class="inline-flex items-center gap-1.5 flex-wrap">
    {#if isSettled && rbacService.canAccessFinances}
        <span 
            class="orga-pill-badge bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
            title="Dieser Termin ist vollständig abgerechnet"
        >
            <Check class="w-3 h-3 stroke-[2.5] text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Abgerechnet</span>
        </span>
    {:else if isCancelled}
        <span 
            class="orga-pill-badge bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            title="Dieser Termin wurde abgesagt"
        >
            <XCircle class="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Abgesagt</span>
        </span>
    {:else if isEnded}
        <span 
            class="orga-pill-badge bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-600 animate-enter"
            title={rbacService.canAccessFinances ? "Dieser Termin ist beendet und abrechnungsbereit" : "Dieser Termin ist beendet"}
        >
            <CheckCircle2 class="w-3 h-3 stroke-[2] text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Beendet</span>
        </span>
    {:else if isOverdue}
        <span 
            class="orga-pill-badge bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80"
            title="Termin ist vergangen, aber noch nicht abgeschlossen"
        >
            <AlertTriangle class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Nachbereitung ausstehend</span>
        </span>
    {:else if isWork}
        <span 
            class="orga-pill-badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
            title="Termin ist geplant und noch nicht beendet"
        >
            <Calendar class="w-3 h-3 text-slate-400 shrink-0" />
            <span>Geplant</span>
        </span>
    {/if}

    <!-- Hinweisbadge für fehlende Daten (Bericht, Fahrten, To-Dos) -->
    {#if !isSettled && !isCancelled}
        <AppointmentMissingBadge {app} {onOpenDetail} />
    {/if}
</div>
