<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { 
        AlertCircle, Calendar, Clock, FileText, CheckCircle2, 
        ChevronDown, Lock, CheckSquare, Check, User, Car, Pencil, Banknote 
    } from "lucide-svelte";
    import { isAppointmentOwner } from "../calendar/calendarUtils";
    import { 
        checkMissingTime, 
        checkMissingTasks, 
        checkMissingReport, 
        getAppHours, 
        getAppKm 
    } from "./missingFollowUpsHelper";

    let {
        app,
        isSelected = false,
        isProcessing = false,
        onToggleSelect,
        onMarkPrivate,
        onOpenDetail,
        onUpdateBillingType
    }: {
        app: any;
        isSelected: boolean;
        isProcessing: boolean;
        onToggleSelect: (id: string) => void;
        onMarkPrivate: (app: any) => void;
        onOpenDetail: (id: string) => void;
        onUpdateBillingType: (app: any, type: string) => void;
    } = $props();

    let isExpanded = $state(false);

    let isMissingTime = $derived(checkMissingTime(app));
    let isMissingTasks = $derived(checkMissingTasks(app));
    let isMissingReport = $derived(checkMissingReport(app));
    let appHours = $derived(getAppHours(app));
    let appKm = $derived(getAppKm(app));
    let taskCount = $derived(app.expand?.tasks?.length || 0);
    let isOwner = $derived(isAppointmentOwner(app, pb.authStore.model?.id));
    let missingCount = $derived((isMissingTime ? 1 : 0) + (isMissingTasks ? 1 : 0) + (isMissingReport ? 1 : 0));
</script>

<div class="rounded-2xl border transition-all shadow-xs min-w-0 overflow-hidden {isSelected ? 'border-amber-400 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-amber-300 dark:hover:border-amber-700'}">
    <div class="flex min-w-0">
        <div class="w-1.5 shrink-0 rounded-l-2xl {missingCount >= 3 ? 'bg-rose-500' : missingCount === 2 ? 'bg-orange-500' : missingCount === 1 ? 'bg-amber-400' : 'bg-emerald-400'}"></div>

        <div class="flex-1 p-3 sm:p-3.5 flex flex-col min-w-0">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
                <div class="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div class="pt-0.5 shrink-0">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onchange={() => { hapticFeedback.tap(); onToggleSelect(app.id); }}
                            class="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer transition-colors"
                            disabled={isProcessing}
                        />
                    </div>

                    <div
                        class="min-w-0 flex-1 cursor-pointer select-none"
                        onclick={() => { hapticFeedback.tap(); isExpanded = !isExpanded; }}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isExpanded = !isExpanded; } }}
                    >
                        <div class="flex flex-wrap items-center gap-1.5 mb-1 min-w-0">
                            {#if isOwner}
                                <span class="text-[9px] sm:text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-md">Mein Termin</span>
                            {/if}
                            <span class="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                <Calendar class="w-3 h-3 shrink-0" />
                                {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </span>
                            <span class="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Clock class="w-3 h-3 shrink-0" />
                                {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </span>
                            {#if app.is_private}
                                <span class="text-[9px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 flex items-center gap-0.5"><Lock class="w-2.5 h-2.5" /> Privat</span>
                            {/if}
                        </div>

                        <div class="flex items-center gap-2 min-w-0">
                            <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex-1 min-w-0">{app.description || 'Termin ohne Beschreibung'}</p>
                            <ChevronDown class="w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 {isExpanded ? 'rotate-180 text-amber-600' : ''}" />
                        </div>

                        <div class="flex flex-wrap gap-1.5 mt-2 min-w-0">
                            {#if isMissingTime}
                                <span class="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg text-[10px] font-bold"><Clock class="w-3 h-3 shrink-0" /> Zeit fehlt</span>
                            {:else}
                                <span class="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg text-[10px] font-bold"><CheckCircle2 class="w-3 h-3 shrink-0" /> {appHours > 0 ? `${appHours.toFixed(1)} h` : 'Zeit erfasst'}</span>
                            {/if}
                            {#if isMissingTasks}
                                <span class="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded-lg text-[10px] font-bold"><CheckSquare class="w-3 h-3 shrink-0" /> Leistung fehlt</span>
                            {:else}
                                <span class="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg text-[10px] font-bold"><CheckCircle2 class="w-3 h-3 shrink-0" /> {taskCount} {taskCount === 1 ? 'Leistung' : 'Leistungen'}</span>
                            {/if}
                            {#if isMissingReport}
                                <span class="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-lg text-[10px] font-bold"><FileText class="w-3 h-3 shrink-0" /> Bericht fehlt</span>
                            {:else}
                                <span class="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg text-[10px] font-bold"><CheckCircle2 class="w-3 h-3 shrink-0" /> Bericht vorh.</span>
                            {/if}
                            {#if appKm > 0}
                                <span class="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-lg text-[10px] font-bold"><Car class="w-3 h-3 shrink-0" /> {appKm} km</span>
                            {/if}

                            {#if rbacService.canAccessFinances}
                                <div class="relative inline-flex items-center">
                                    <select
                                        value={app.billing_type || ''}
                                        onclick={(e) => e.stopPropagation()}
                                        onchange={(e) => { hapticFeedback.selection(); onUpdateBillingType(app, e.currentTarget.value); }}
                                        class="appearance-none cursor-pointer pl-6 pr-5 py-0.5 rounded-lg text-[10px] font-black shadow-2xs border transition-all text-left focus:outline-none focus:ring-2 {
                                            app.billing_type === 'EL' ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700' :
                                            app.billing_type === 'VHP' ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-700' :
                                            app.billing_type === 'Kombi' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700' :
                                            app.billing_type === 'Privat' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' :
                                            app.billing_type === '45a' ? 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-950 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700' :
                                            'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                        }"
                                    >
                                        <option value="" disabled selected={!app.billing_type}>⚠️ Art fehlt</option>
                                        <option value="EL">EL (§45b)</option>
                                        <option value="Kombi">Kombi (§36/38)</option>
                                        <option value="Privat">Privat</option>
                                        <option value="45a">Umwandlung 40% §45a</option>
                                        <option value="VHP">VHP (§39)</option>
                                    </select>
                                    <div class="pointer-events-none absolute left-2 flex items-center">
                                        {#if !app.billing_type}<AlertCircle class="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />{:else}<Banknote class="w-3 h-3 shrink-0" />{/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-700 justify-end flex-wrap">
                    <button
                        type="button"
                        onclick={() => { hapticFeedback.tap(); onMarkPrivate(app); }}
                        class="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 active:scale-95 cursor-pointer min-h-11 sm:min-h-[36px] touch-manipulation"
                        title="Als privat markieren"
                    >
                        <Lock class="w-3.5 h-3.5 text-slate-500" />
                        <span class="hidden sm:inline">Privat</span>
                    </button>

                    <button
                        type="button"
                        onclick={() => { hapticFeedback.tap(); onOpenDetail(app.id); }}
                        class="px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm shadow-orange-500/20 min-h-11 sm:min-h-[36px] touch-manipulation"
                        title="Termin öffnen & nachtragen"
                    >
                        <Pencil class="w-3.5 h-3.5" />
                        <span>Nachbereiten</span>
                    </button>
                </div>
            </div>

            {#if isExpanded}
                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs flex flex-col gap-2.5 min-w-0">
                    {#if app.description}
                        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 min-w-0">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Beschreibung:</span>
                            <p class="text-xs text-slate-900 dark:text-slate-200 font-medium whitespace-pre-wrap break-words">{app.description}</p>
                        </div>
                    {/if}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 min-w-0">
                        <div class="p-3 rounded-xl border min-w-0 {isMissingTime ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-900' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-900'}">
                            <div class="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-current/10">
                                <span class="flex items-center gap-1.5"><Clock class="w-3.5 h-3.5 shrink-0" /> Arbeitszeit:</span>
                                <span class="text-[10px] uppercase font-black">{isMissingTime ? 'Fehlt' : `${appHours > 0 ? `${appHours.toFixed(1)} Std.` : 'Erfasst'}`}</span>
                            </div>
                            {#if app.expand?.time_record && app.expand.time_record.length > 0}
                                <ul class="space-y-1 text-[11px] min-w-0">
                                    {#each app.expand.time_record as tr}
                                        <li class="flex items-center justify-between gap-1 py-0.5">
                                            <span>{new Date(tr.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – {tr.end ? new Date(tr.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Offen'} Uhr</span>
                                            {#if tr.break_minutes}<span class="text-[10px] opacity-70">({tr.break_minutes} Min. Pause)</span>{/if}
                                        </li>
                                    {/each}
                                </ul>
                            {:else}
                                <p class="text-[11px] opacity-80">Keine Zeit gestoppt oder erfasst.</p>
                            {/if}
                        </div>

                        <div class="p-3 rounded-xl border min-w-0 {isMissingTasks ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 text-orange-900' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-900'}">
                            <div class="flex items-center justify-between font-bold mb-1.5 pb-1 border-b border-current/10">
                                <span class="flex items-center gap-1.5"><CheckSquare class="w-3.5 h-3.5 shrink-0" /> Leistungen:</span>
                                <span class="text-[10px] uppercase font-black">{isMissingTasks ? 'Fehlt' : `${taskCount} erfasst`}</span>
                            </div>
                            {#if app.expand?.tasks && app.expand.tasks.length > 0}
                                <ul class="space-y-1 text-[11px] min-w-0">
                                    {#each app.expand.tasks as t}
                                        <li class="flex items-center gap-1.5 py-0.5 font-medium"><Check class="w-3 h-3 text-emerald-600" /><span>{t.title || t.name || 'Leistung'}</span></li>
                                    {/each}
                                </ul>
                            {:else}
                                <p class="text-[11px] opacity-80">Keine Einzelleistungen zugewiesen.</p>
                            {/if}
                        </div>
                    </div>

                    {#if app.report || app.notes || app.internal_notes}
                        <div class="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 min-w-0">
                            <span class="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><FileText class="w-3 h-3" /> Notizen & Dokumentation:</span>
                            <p class="text-[11px] whitespace-pre-wrap break-words italic leading-relaxed opacity-90">{app.report || app.notes || app.internal_notes}</p>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>
