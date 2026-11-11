<script lang="ts">
    import { Layers } from "lucide-svelte";

    let {
        entryForm,
        onCalculateInstallmentRate
    }: {
        entryForm: any;
        onCalculateInstallmentRate: (d: 'from_totals' | 'from_amount') => void;
    } = $props();
</script>

<div class="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3">
    <label class="flex items-center gap-2.5 cursor-pointer select-none">
        <input
            type="checkbox"
            bind:checked={entryForm.is_installment}
            class="h-4 w-4 rounded-md border-indigo-300 text-indigo-600 focus:ring-indigo-500 dark:border-indigo-700"
        />
        <div class="flex items-center gap-1.5">
            <Layers class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span class="text-xs font-bold text-slate-900 dark:text-slate-100">
                Als Ratenzahlung erfassen
            </span>
        </div>
    </label>

    {#if entryForm.is_installment}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
                <label for="entry_installment_current" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Aktuelle Rate #
                </label>
                <input
                    id="entry_installment_current"
                    type="number"
                    min="1"
                    bind:value={entryForm.installment_current}
                    class="orga-input"
                />
            </div>
            <div>
                <label for="entry_installment_total" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Gesamtzahl Raten
                </label>
                <input
                    id="entry_installment_total"
                    type="number"
                    min="1"
                    bind:value={entryForm.installment_total_count}
                    oninput={() => onCalculateInstallmentRate('from_totals')}
                    class="orga-input"
                />
            </div>
            <div>
                <label for="entry_installment_amount" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Gesamtsumme (€)
                </label>
                <input
                    id="entry_installment_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    bind:value={entryForm.installment_total_amount}
                    oninput={() => onCalculateInstallmentRate('from_totals')}
                    placeholder="z. B. 1200,00"
                    class="orga-input"
                />
            </div>
        </div>
    {/if}
</div>
