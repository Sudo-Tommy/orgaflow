<script lang="ts">
    import { User, AlignLeft, Ban } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import type { AppointmentModalState } from "./appointmentModalState.svelte";

    interface Props {
        state: AppointmentModalState;
    }
    let { state }: Props = $props();

    function autoResize(node: HTMLTextAreaElement) {
        function resize() {
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
        }
        node.addEventListener('input', resize);
        setTimeout(resize, 0);
        return { destroy: () => node.removeEventListener('input', resize) };
    }
</script>

<div class="space-y-5 animate-enter">
    {#if state.is_blocked}
        <div class="p-6 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Ban class="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p class="text-sm font-semibold">Der Tag ist gesperrt. Für Blockierungen wird kein Klient zugeordnet.</p>
        </div>
    {:else}
        <div class="space-y-4">
            <!-- Mitarbeiter Auswahl (SuperAdmin / Admin) -->
            {#if state.isSuperAdmin}
                <div class="space-y-1.5">
                    <label for="app-user" class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                        <User class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Zuständiger Mitarbeiter *</span>
                    </label>
                    <select
                        id="app-user"
                        name="appUser"
                        bind:value={state.selectedUserId}
                        onchange={() => hapticFeedback.selection()}
                        class="orga-input-clear min-h-12 py-2 text-sm cursor-pointer"
                        required
                        disabled={state.isLoading}
                    >
                        <option value="">Bitte Mitarbeiter wählen...</option>
                        {#each state.users as u (u.id)}
                            <option value={u.id}>{u.name_first} {u.name_last}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            <!-- Zugeordneter Klient Info (falls in Tab 1 ausgewählt) -->
            {#if state.selectedClientRecord}
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                        <User class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Zugeordneter Klient</span>
                    </label>
                    <div class="p-3 bg-neutral-50 dark:bg-slate-800/80 rounded-2xl border border-neutral-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                                {state.selectedClientRecord.name_first?.[0] || ''}{state.selectedClientRecord.name_last?.[0] || ''}
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <p class="text-sm font-bold text-neutral-900 dark:text-slate-100 truncate">{state.selectedClientRecord.name_first} {state.selectedClientRecord.name_last}</p>
                                    {#if state.selectedClientRecord.level_of_care}
                                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">PG {state.selectedClientRecord.level_of_care}</span>
                                    {/if}
                                </div>
                                <p class="text-xs text-neutral-500 dark:text-slate-400 truncate">{[state.selectedClientRecord.street, state.selectedClientRecord.city].filter(Boolean).join(', ') || 'Keine Adresse hinterlegt'}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick={() => { hapticFeedback.tap(); state.activeTab = 'time'; }}
                            class="min-h-11 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer shrink-0"
                        >
                            In Tab 1 ändern
                        </button>
                    </div>

                    <!-- Client Notes Alert -->
                    {#if state.selectedClientRecord?.notes}
                        <div class="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5 shadow-sm animate-enter">
                            <span class="text-amber-500 text-base leading-none mt-0.5">💡</span>
                            <div>
                                <p class="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-0.5">Wichtige Notizen zu diesem Klienten</p>
                                <p class="text-xs text-amber-950 dark:text-amber-200 font-medium whitespace-pre-wrap leading-relaxed">{state.selectedClientRecord.notes}</p>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Interne Notizen -->
            <div class="space-y-1.5 pt-2">
                <label for="app-notes" class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                    <AlignLeft class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Interne Notizen (fürs Team)</span>
                </label>
                <textarea
                    id="app-notes"
                    name="appNotes"
                    use:autoResize
                    bind:value={state.internalNotes}
                    rows="2"
                    class="orga-input-clear min-h-14 py-2.5 text-sm overflow-hidden"
                    placeholder="Zusätzliche Infos, To-Dos oder Hinweise fürs Team..."
                    disabled={state.isLoading}
                ></textarea>
            </div>
        </div>
    {/if}
</div>
