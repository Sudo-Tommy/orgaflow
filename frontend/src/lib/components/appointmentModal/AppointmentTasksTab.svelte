<script lang="ts">
    import { ListTodo, Ban } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import type { AppointmentModalState } from "./appointmentModalState.svelte";

    interface Props {
        state: AppointmentModalState;
    }
    let { state }: Props = $props();

    let sortedTasks = $derived.by(() => {
        const tasks = orgaStore.tasks?.data || [];
        return sortAlphabetical(tasks, (t: any) => t.title || t.name || "");
    });
</script>

<div class="space-y-5 animate-enter">
    {#if state.is_blocked}
        <div class="p-6 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Ban class="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p class="text-sm font-semibold">Der Tag ist gesperrt. Für Abwesenheiten werden keine Tätigkeiten hinterlegt.</p>
        </div>
    {:else}
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ListTodo class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Abrechenbare Leistungen</span>
                </label>
                {#if state.selectedTasks.length > 0}
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white animate-enter">
                        {state.selectedTasks.length} ausgewählt
                    </span>
                {/if}
            </div>

            <div class="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-neutral-200 dark:border-slate-700 space-y-3 shadow-2xs">
                <p class="text-xs font-medium text-neutral-500 dark:text-slate-400">Wählen Sie Leistungen für diesen Termin aus:</p>
                <div class="flex flex-wrap gap-2 p-1">
                    {#each sortedTasks as t (t.id)}
                        {@const isSelected = state.selectedTasks.includes(t.id)}
                        <button
                            type="button"
                            onclick={() => { hapticFeedback.tap(); state.toggleTask(t.id); }}
                            class="min-h-11 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 touch-manipulation {isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-neutral-50 dark:bg-slate-900 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'}"
                            disabled={state.isLoading}
                        >
                            <span class="font-bold">{isSelected ? '✓' : '+'}</span>
                            <span>{t.title || t.name}</span>
                        </button>
                    {/each}
                    {#if sortedTasks.length === 0}
                        <p class="text-xs text-neutral-400 dark:text-slate-500 italic">Keine abrechenbaren Leistungen vorhanden.</p>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
