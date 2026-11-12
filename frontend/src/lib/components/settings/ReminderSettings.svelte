<script lang="ts">
    import { onMount } from 'svelte';
    import { Capacitor } from '@capacitor/core';
    import { Bell, Plus, X, Clock, CalendarCheck } from 'lucide-svelte';
    import { reminderScheduler } from '$lib/services/reminders/reminderScheduler';
    import { DEFAULT_REMINDER_PREFS, formatOffsetLabel, normalizeOffsets, type ReminderPrefs } from '$lib/services/reminders/reminderRules';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';

    let prefs = $state<ReminderPrefs>({ ...DEFAULT_REMINDER_PREFS });
    let customMinutes = $state<number>(30);
    let isLoaded = $state(false);
    let isSaving = $state(false);
    let isNative = $state(false);

    const quickOptions = [5, 10, 15, 30, 60, 120, 1440];

    onMount(async () => {
        isNative = Capacitor.isNativePlatform();
        prefs = await reminderScheduler.loadPrefs();
        isLoaded = true;
    });

    async function persistAndPlan() {
        isSaving = true;
        try {
            await reminderScheduler.savePrefs(prefs);
            const count = await reminderScheduler.rescheduleAll(
                orgaStore.appointments?.data || [],
                orgaStore.clients?.data || []
            );
            toastStore.success(isNative ? `Erinnerungen gespeichert (${count} geplant).` : 'Erinnerungseinstellungen gespeichert.');
        } finally {
            isSaving = false;
        }
    }

    function addOffset(mins: number) {
        if (!Number.isFinite(mins) || mins < 1 || mins > 10080) {
            toastStore.warning('Bitte einen Wert zwischen 1 Minute und 7 Tagen wählen.');
            return;
        }
        prefs.offsets = normalizeOffsets([...prefs.offsets, mins]);
        persistAndPlan();
    }

    function removeOffset(mins: number) {
        prefs.offsets = prefs.offsets.filter((m) => m !== mins);
        persistAndPlan();
    }

    async function handleTest() {
        if (!isNative) {
            toastStore.info('Test-Erinnerung ist in der Android-App verfügbar.');
            return;
        }
        const ok = await reminderScheduler.sendTestNotification();
        if (ok) toastStore.success('Test-Erinnerung erscheint in 3 Sekunden.');
        else toastStore.warning('Bitte erlauben Sie Benachrichtigungen in den Handy-Einstellungen.');
    }
</script>

<div class="orga-card-white p-6 md:p-8 dark:bg-slate-900 dark:border-slate-800">
    <div class="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
        <div class="flex items-center gap-3">
            <span class="w-9 h-9 flex items-center justify-center bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                <Bell class="w-5 h-5" />
            </span>
            <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Termin-Erinnerungen</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Zuverlässige Hinweise auf dem Handy – auch ohne Internet</p>
            </div>
        </div>
        {#if isNative}
            <button type="button" onclick={handleTest} class="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 active:scale-95 transition-all cursor-pointer">
                Test senden
            </button>
        {/if}
    </div>

    {#if isLoaded}
        <div class="space-y-6">
            <div>
                <p class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Erinnern vor jedem Termin</p>
                <div class="flex flex-wrap gap-2 mb-3">
                    {#each prefs.offsets as mins}
                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800 text-xs font-bold">
                            <Clock class="w-3.5 h-3.5" />
                            <span>{formatOffsetLabel(mins)}</span>
                            <button type="button" onclick={() => removeOffset(mins)} aria-label="Entfernen" class="p-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-900 cursor-pointer">
                                <X class="w-3.5 h-3.5" />
                            </button>
                        </span>
                    {:else}
                        <span class="text-xs text-slate-400">Keine Vorab-Erinnerungen aktiv</span>
                    {/each}
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    {#each quickOptions.filter((q) => !prefs.offsets.includes(q)) as mins}
                        <button type="button" onclick={() => addOffset(mins)} disabled={isSaving} class="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer">
                            <Plus class="w-3 h-3" /> {formatOffsetLabel(mins).replace(' vorher', '')}
                        </button>
                    {/each}
                </div>

                <div class="mt-3 flex items-center gap-2 max-w-xs">
                    <input type="number" min="1" max="10080" bind:value={customMinutes} class="orga-input-clear py-2 px-3 text-sm w-24 dark:bg-slate-800 dark:border-slate-700" aria-label="Eigene Minuten" />
                    <span class="text-xs text-slate-500 dark:text-slate-400">Min. vorher</span>
                    <button type="button" onclick={() => addOffset(customMinutes)} disabled={isSaving} class="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold cursor-pointer">
                        Hinzufügen
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-3">
                    <div>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-100 block">Tagesübersicht morgens</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">Zeigt die heutigen Termine an</span>
                    </div>
                    <input type="time" value={prefs.dailyTime} onchange={(e) => { prefs.dailyTime = e.currentTarget.value; persistAndPlan(); }} class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100" aria-label="Uhrzeit Tagesübersicht" />
                </div>

                <label class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-100 block">Nach Termin-Ende</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">Erinnert an Fahrt &amp; Beleg</span>
                    </div>
                    <input type="checkbox" bind:checked={prefs.afterEnd} onchange={persistAndPlan} class="w-5 h-5 accent-violet-600 rounded" />
                </label>

                <label class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-3 cursor-pointer sm:col-span-2">
                    <div class="flex items-center gap-2.5">
                        <CalendarCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                            <span class="text-sm font-bold text-slate-800 dark:text-slate-100 block">Urlaub- &amp; Abwesenheitshinweise</span>
                            <span class="text-xs text-slate-500 dark:text-slate-400">Hinweis am Vorabend vor eingetragenen Sperrzeiten</span>
                        </div>
                    </div>
                    <input type="checkbox" bind:checked={prefs.absences} onchange={persistAndPlan} class="w-5 h-5 accent-violet-600 rounded" />
                </label>
            </div>
        </div>
    {/if}
</div>
