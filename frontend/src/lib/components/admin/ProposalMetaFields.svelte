<script lang="ts">
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';

    let {
        category = $bindable('Core Engine & API'),
        priority = $bindable('medium'),
        status = $bindable('idea')
    }: {
        category: ImprovementProposalRecord['category'];
        priority: ImprovementProposalRecord['priority'];
        status: ImprovementProposalRecord['status'];
    } = $props();

    const CATEGORY_OPTIONS = [
        { value: 'Core Engine & API', label: 'Core Engine & API-Resilienz' },
        { value: 'Dokumente & Vorlagen', label: 'Dokumente, PDF & DIN 5008' },
        { value: 'Haushaltsbuch & Finanzen', label: 'Haushaltsbuch & Finanzen' },
        { value: 'Sicherheit & Audit', label: 'Sicherheit & Audit-Trail' },
        { value: 'Sonstiges', label: 'Sonstiges' },
        { value: 'Termine & Außendienst', label: 'Termine & Außendienst' },
        { value: 'UI/UX & Design', label: 'UI/UX & Mobile Ergonomie' }
    ];
</script>

<!-- Kategorie & Priorität -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- Kategorie -->
    <div class="space-y-1.5">
        <label for="prop-category" class="block text-xs font-bold text-neutral-800 dark:text-slate-200">
            Bereich / Modul
        </label>
        <select
            id="prop-category"
            bind:value={category}
            class="orga-input-clear text-xs py-2.5 px-3 min-h-11 cursor-pointer w-full touch-manipulation"
        >
            {#each CATEGORY_OPTIONS as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
            {/each}
        </select>
    </div>

    <!-- Priorität -->
    <div class="space-y-1.5">
        <span class="block text-xs font-bold text-neutral-800 dark:text-slate-200">Priorität</span>
        <div class="grid grid-cols-4 gap-1 p-0.5 bg-neutral-100 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
            <button
                type="button"
                onclick={() => priority = 'low'}
                class="min-h-10 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer touch-manipulation {priority === 'low' ? 'bg-emerald-500 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'}"
            >
                Niedrig
            </button>
            <button
                type="button"
                onclick={() => priority = 'medium'}
                class="min-h-10 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer touch-manipulation {priority === 'medium' ? 'bg-blue-500 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'}"
            >
                Mittel
            </button>
            <button
                type="button"
                onclick={() => priority = 'high'}
                class="min-h-10 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer touch-manipulation {priority === 'high' ? 'bg-amber-500 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'}"
            >
                Hoch
            </button>
            <button
                type="button"
                onclick={() => priority = 'critical'}
                class="min-h-10 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer touch-manipulation {priority === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'}"
            >
                Kritisch
            </button>
        </div>
    </div>
</div>

<!-- Status (Buttons statt Dropdown) -->
<div class="space-y-1.5">
    <span class="block text-xs font-bold text-neutral-800 dark:text-slate-200">Aktueller Bearbeitungsstatus</span>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-neutral-100 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <button
            type="button"
            onclick={() => status = 'idea'}
            class="min-h-10 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation {status === 'idea' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'}"
        >
            <span>💡</span>
            <span>Idee</span>
        </button>
        <button
            type="button"
            onclick={() => status = 'planned'}
            class="min-h-10 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation {status === 'planned' ? 'bg-blue-500 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'}"
        >
            <span>📋</span>
            <span>Geplant</span>
        </button>
        <button
            type="button"
            onclick={() => status = 'in_progress'}
            class="min-h-10 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation {status === 'in_progress' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'}"
        >
            <span>⚙️</span>
            <span>In Arbeit</span>
        </button>
        <button
            type="button"
            onclick={() => status = 'implemented'}
            class="min-h-10 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation {status === 'implemented' ? 'bg-emerald-600 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'}"
        >
            <span>✅</span>
            <span>Umgesetzt</span>
        </button>
    </div>
</div>
