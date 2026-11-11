<script lang="ts">
    import { CheckSquare, CheckCircle2, Circle, Trash2, Plus } from 'lucide-svelte';

    interface Props {
        checklist: Array<{ text: string; done: boolean }>;
        onToggle: (index: number) => void;
        onAdd: (text: string) => void;
        onRemove: (index: number) => void;
    }

    let { checklist = [], onToggle, onAdd, onRemove }: Props = $props();

    let newChecklistText = $state('');

    function handleAdd() {
        const text = newChecklistText.trim();
        if (!text) return;
        onAdd(text);
        newChecklistText = '';
    }
</script>

<div class="space-y-2.5">
    <div class="flex items-center justify-between">
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare class="w-4 h-4 text-indigo-500" />
            <span>Aufgaben & Tätigkeiten</span>
        </label>
        <span class="text-xs text-slate-400">
            {checklist.filter(c => c.done).length} von {checklist.length} erledigt
        </span>
    </div>

    <!-- Vorhandene Punkte -->
    {#if checklist.length > 0}
        <div class="space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
            {#each checklist as item, idx}
                <div class="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
                    <button 
                        type="button"
                        onclick={() => onToggle(idx)}
                        class="flex-1 min-h-11 px-2 flex items-center gap-3 text-left min-w-0 {item.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}"
                    >
                        {#if item.done}
                            <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
                        {:else}
                            <Circle class="w-5 h-5 text-slate-400 shrink-0" />
                        {/if}
                        <span class="text-xs sm:text-sm font-semibold truncate">{item.text}</span>
                    </button>

                    <button 
                        type="button"
                        onclick={() => onRemove(idx)}
                        aria-label="Aufgabe löschen"
                        class="min-h-11 min-w-11 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                    >
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Neuen Punkt hinzufügen -->
    <form 
        onsubmit={(e) => { e.preventDefault(); handleAdd(); }}
        class="flex gap-2"
    >
        <input 
            type="text"
            bind:value={newChecklistText}
            placeholder="Neue Tätigkeit hinzufügen (z.B. Medikation verabreicht)..."
            class="flex-1 min-h-11 px-3.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
        />
        <button
            type="submit"
            disabled={!newChecklistText.trim()}
            class="min-h-11 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
        >
            <Plus class="w-4 h-4" />
            <span>Hinzufügen</span>
        </button>
    </form>
</div>
