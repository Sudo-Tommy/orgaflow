<!-- src/lib/components/support/AiClarificationBanner.svelte -->
<script lang="ts">
    import { AlertCircle } from 'lucide-svelte';

    interface Props {
        problemSummary: string;
        selectedCategory: string;
        selectedPriority: 'low' | 'normal' | 'urgent';
        categories: string[];
        onConfirm: () => void;
        onCancel: () => void;
    }

    let {
        problemSummary,
        selectedCategory = $bindable(),
        selectedPriority = $bindable(),
        categories,
        onConfirm,
        onCancel
    }: Props = $props();
</script>

<div class="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl space-y-2.5 animate-in fade-in">
    <div class="flex items-start gap-2">
        <AlertCircle class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
            <span class="text-xs font-bold text-amber-900 dark:text-amber-200">Problemzusammenfassung prüfen:</span>
            <p class="text-xs text-amber-800 dark:text-amber-300 mt-0.5 line-clamp-3">„{problemSummary}“</p>
        </div>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
        <select bind:value={selectedCategory} class="text-xs font-bold py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-200">
            {#each categories as cat}<option value={cat}>{cat}</option>{/each}
        </select>
        <select bind:value={selectedPriority} class="text-xs font-bold py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-200">
            <option value="low">Niedrig</option>
            <option value="normal">Normal</option>
            <option value="urgent">Dringend</option>
        </select>
        <button type="button" onclick={onConfirm} class="ml-auto px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs active:scale-95">✓ Ja, Ticket erstellen</button>
        <button type="button" onclick={onCancel} class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">Nein, weiter erklären</button>
    </div>
</div>

