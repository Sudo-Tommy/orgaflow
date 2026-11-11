<script lang="ts">
    import { Calendar, Clock, AlertTriangle, Check, Car, FileText, Banknote, ChevronDown, Wrench } from "lucide-svelte";
    import { getAppHours, getAppKm, isAppReady } from "./unsettledHelper";
    import { isPrivateMismatch } from "./unsettledPayerHelper";
    import { isAppointmentOwner } from "../calendar/calendarUtils";
    import { pb } from "$lib/services/pocketbase";
    import UnsettledAppointmentDetail from "./UnsettledAppointmentDetail.svelte";
    import UnsettledBillingUserBadge from "./UnsettledBillingUserBadge.svelte";
    import type { BillingUserOption } from "./unsettledBillingUserHelper";

    interface Props {
        app: any;
        client?: any;
        isSelected: boolean;
        isExpanded: boolean;
        isProcessing: boolean;
        allUsers?: any[];
        userOptions?: BillingUserOption[];
        canReassign?: boolean;
        onToggleSelection: (id: string) => void;
        onToggleExpand: (id: string) => void;
        onMarkSettled: (app: any) => void;
        onOpenDetail: (id: string) => void;
        onUpdateBillingType: (app: any, type: string) => void;
        onUpdateBillingUser?: (app: any, newUserId: string | null) => void;
    }

    let {
        app,
        client,
        isSelected,
        isExpanded,
        isProcessing,
        allUsers = [],
        userOptions = [],
        canReassign = true,
        onToggleSelection,
        onToggleExpand,
        onMarkSettled,
        onOpenDetail,
        onUpdateBillingType,
        onUpdateBillingUser = () => {}
    }: Props = $props();

    let appHours = $derived(getAppHours(app));
    let appKm = $derived(getAppKm(app));
    let taskCount = $derived(app.expand?.tasks?.length || 0);
    let ready = $derived(isAppReady(app));
    let isOwner = $derived(isAppointmentOwner(app, pb.authStore.model?.id));
    let isMismatch = $derived(isPrivateMismatch(app, client || app.expand?.client?.[0]));

    let scheduledTimeStr = $derived.by(() => {
        if (!app.appointment) return '';
        const s = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        if (app.appointment_end) {
            const e = new Date(app.appointment_end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            return `${s} – ${e} Uhr`;
        }
        return `${s} Uhr`;
    });
</script>

<div class="rounded-2xl border transition-all shadow-xs min-w-0 overflow-hidden {isSelected ? 'border-cyan-400 dark:border-cyan-600 bg-cyan-50/30 dark:bg-cyan-950/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-cyan-300 dark:hover:border-cyan-700'}">
    <div class="flex min-w-0">
        <div class="w-1.5 shrink-0 rounded-l-2xl {ready ? 'bg-emerald-400' : 'bg-amber-400'}"></div>
        <div class="flex-1 p-2.5 sm:p-3.5 flex flex-col min-w-0">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 min-w-0">
                <div class="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <div class="pt-0.5 shrink-0">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onchange={() => onToggleSelection(app.id)}
                            class="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer transition-colors"
                            disabled={isProcessing || !ready}
                            title={ready ? "Termin zur Abrechnung auswählen" : "Termin unvollständig (Zeiten/Leistungen fehlen)"}
                        />
                    </div>
                    <div
                        class="min-w-0 flex-1 cursor-pointer select-none"
                        onclick={() => onToggleExpand(app.id)}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(app.id); } }}
                    >
                        <div class="flex flex-wrap items-center gap-1.5 mb-1 min-w-0">
                            {#if isOwner}
                                <span class="text-[9px] font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-md">Mein Termin</span>
                            {/if}
                            <span class="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                <Calendar class="w-3 h-3 shrink-0" />
                                {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </span>
                            <span class="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Clock class="w-3 h-3 shrink-0" />
                                {scheduledTimeStr}
                            </span>
                            {#if ready}
                                <span class="text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5">
                                    <Check class="w-2.5 h-2.5" /> Bereit
                                </span>
                            {:else}
                                <span class="text-[9px] font-extrabold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                                    <AlertTriangle class="w-2.5 h-2.5" /> Prüfen
                                </span>
                            {/if}
                            {#if isMismatch}
                                <span
                                    class="text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 flex items-center gap-1"
                                    title="Termin steht auf 'Privat', obwohl der Klient Kassenleistungen hat."
                                >
                                    <AlertTriangle class="w-2.5 h-2.5 shrink-0" /> Privat (Kasse)
                                </span>
                            {/if}
                        </div>

                        <div class="flex items-center gap-2 min-w-0">
                            <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex-1 min-w-0">
                                {app.description || 'Regulärer Einsatz'}
                            </p>
                            <ChevronDown class="w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 {isExpanded ? 'rotate-180 text-cyan-600' : ''}" />
                        </div>

                        <!-- Status Chips -->
                        <div class="flex flex-wrap gap-1 sm:gap-1.5 mt-2 min-w-0">
                            {#if appHours > 0}
                                <span class="inline-flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                    <Clock class="w-3 h-3 shrink-0" /> {appHours.toFixed(1)} h Arbeitszeit
                                </span>
                            {:else}
                                <span class="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                    <AlertTriangle class="w-3 h-3 shrink-0" /> Zeiterfassung fehlt
                                </span>
                            {/if}
                            {#if taskCount > 0}
                                <span class="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                    <Check class="w-3 h-3 shrink-0" /> {taskCount} {taskCount === 1 ? 'Leistung' : 'Leistungen'}
                                </span>
                            {:else}
                                <span class="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                    <AlertTriangle class="w-3 h-3 shrink-0" /> Leistung fehlt
                                </span>
                            {/if}
                            {#if appKm > 0}
                                <span class="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                    <Car class="w-3 h-3 shrink-0" /> {appKm} km
                                </span>
                            {/if}
                            {#if app.report}
                                <span class="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                    <FileText class="w-3 h-3 shrink-0" /> Bericht
                                </span>
                            {/if}

                            <!-- Abrechnungsart Badge & Selector -->
                            <div class="relative inline-flex items-center">
                                <select
                                    value={app.billing_type || ''}
                                    onclick={(e) => e.stopPropagation()}
                                    onchange={(e) => onUpdateBillingType(app, e.currentTarget.value)}
                                    class="appearance-none cursor-pointer pl-5 sm:pl-6 pr-4 sm:pr-5 py-0.5 rounded-lg text-[10px] font-black shadow-2xs border transition-all text-left focus:outline-none focus:ring-1 {
                                        app.billing_type === 'EL' ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700' :
                                        app.billing_type === 'VHP' ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-700' :
                                        app.billing_type === 'Kombi' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700' :
                                        app.billing_type === 'Privat' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' :
                                        'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                    }"
                                >
                                    <option value="" disabled selected={!app.billing_type}>⚠️ Art fehlt</option>
                                    <option value="EL">EL (§45b)</option>
                                    <option value="Kombi">Kombi (§36/38)</option>
                                    <option value="Privat">Privat</option>
                                    <option value="45a">Umwandlung § 45a</option>
                                    <option value="VHP">VHP (§39)</option>
                                </select>
                                <div class="pointer-events-none absolute left-1.5 flex items-center">
                                    <Banknote class="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                </div>
                                <div class="pointer-events-none absolute right-1 flex items-center opacity-60">
                                    <ChevronDown class="w-2.5 h-2.5" />
                                </div>
                            </div>

                            <!-- Abrechner Zuweisung & Badge -->
                            <UnsettledBillingUserBadge
                                {app}
                                {client}
                                {allUsers}
                                {userOptions}
                                {canReassign}
                                {isProcessing}
                                onUpdateUser={onUpdateBillingUser}
                            />
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-700 justify-end flex-wrap">
                    {#if ready}
                        <button
                            type="button"
                            onclick={() => onMarkSettled(app)}
                            class="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-1 active:scale-95 cursor-pointer min-h-[32px] sm:min-h-[36px]"
                            title="Diesen Termin als abgerechnet markieren"
                        >
                            <Check class="w-3.5 h-3.5" />
                            <span>Abrechnen</span>
                        </button>
                    {:else}
                        <button
                            type="button"
                            onclick={() => onOpenDetail(app.id)}
                            class="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer min-h-[32px] sm:min-h-[36px]"
                            title="Fehlende Zeiten/Leistungen jetzt erfassen"
                        >
                            <Wrench class="w-3.5 h-3.5" />
                            <span>Nachbereiten</span>
                        </button>
                    {/if}
                    <button
                        type="button"
                        onclick={() => onOpenDetail(app.id)}
                        class="px-2.5 py-1 sm:py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 active:scale-95 cursor-pointer min-h-[32px] sm:min-h-[36px]"
                    >
                        <span>Details</span>
                    </button>
                </div>
            </div>

            <!-- AUFKLAPPBARER DETAILBEREICH -->
            {#if isExpanded}
                <UnsettledAppointmentDetail {app} {appHours} {taskCount} />
            {/if}
        </div>
    </div>
</div>
