<script lang="ts">
    interface Props {
        is_installment: boolean;
        installment_current: number | "";
        installment_total_count: number | "";
        installment_total_amount: number | "";
        is_storno: boolean;
        storno_reason: string;
        isScanningReceipt: boolean;
        isLoading: boolean;
    }

    let {
        is_installment = $bindable(),
        installment_current = $bindable(),
        installment_total_count = $bindable(),
        installment_total_amount = $bindable(),
        is_storno = $bindable(),
        storno_reason = $bindable(),
        isScanningReceipt,
        isLoading
    }: Props = $props();
</script>

<div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
    <label class="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" bind:checked={is_installment} class="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500" disabled={isScanningReceipt || isLoading} />
        <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Ratenzahlung</span>
    </label>
    {#if is_installment}
        <div class="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200 animate-enter">
            <div>
                <label for="trans-rate-nr" class="block text-xs font-semibold text-neutral-700 mb-1">Rate Nr.</label>
                <input id="trans-rate-nr" type="number" bind:value={installment_current} class="orga-input-clear py-2 text-sm min-h-[38px]" placeholder="z.B. 3" disabled={isScanningReceipt || isLoading} />
            </div>
            <div>
                <label for="trans-rate-tot" class="block text-xs font-semibold text-neutral-700 mb-1">von (Gesamt)</label>
                <input id="trans-rate-tot" type="number" bind:value={installment_total_count} class="orga-input-clear py-2 text-sm min-h-[38px]" placeholder="z.B. 12" disabled={isScanningReceipt || isLoading} />
            </div>
        </div>
        <div class="pt-2 border-t border-neutral-200 animate-enter">
            <label for="trans-rate-total-amount" class="block text-xs font-semibold text-neutral-700 mb-1">Gesamtsumme der Anschaffung (€)</label>
            <input id="trans-rate-total-amount" type="number" step="0.01" bind:value={installment_total_amount} class="orga-input-clear py-2 text-sm min-h-[38px]" placeholder="z.B. 1200.00" disabled={isScanningReceipt || isLoading} />
        </div>
    {/if}
</div>

<!-- GoBD Storno Option -->
<div class="bg-neutral-50 p-3.5 sm:p-4 rounded-xl border border-neutral-200 space-y-3">
    <label class="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" bind:checked={is_storno} class="w-4 h-4 text-rose-600 rounded border-neutral-300 focus:ring-rose-500" disabled={isScanningReceipt || isLoading} />
        <div class="flex-1">
            <span class="text-sm font-semibold text-neutral-800">GoBD-Storno</span>
            <span class="text-[11px] text-neutral-500 block">Buchung stornieren (wird rechnerisch neutralisiert)</span>
        </div>
    </label>
    {#if is_storno}
        <div class="pt-2 border-t border-neutral-200 animate-enter">
            <label for="trans-storno-reason" class="block text-xs font-semibold text-neutral-700 mb-1">Stornobegründung *</label>
            <input id="trans-storno-reason" type="text" bind:value={storno_reason} placeholder="z.B. Fehlbuchung / Duplikat" class="orga-input-clear py-2 text-sm min-h-[38px]" required={is_storno} disabled={isScanningReceipt || isLoading} />
        </div>
    {/if}
</div>
