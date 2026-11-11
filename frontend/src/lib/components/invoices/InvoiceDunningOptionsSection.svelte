<script lang="ts">
    import { AlertTriangle, ShieldAlert, BellRing } from "lucide-svelte";

    let {
        mahnungLevel = $bindable(1),
        dunningFee = $bindable(0),
        onChange
    }: {
        mahnungLevel: number;
        dunningFee: number;
        onChange: (level: number, fee: number) => void;
    } = $props();

    function setLevel(lvl: number) {
        mahnungLevel = lvl;
        onChange(mahnungLevel, dunningFee);
    }

    function setFee(fee: number) {
        dunningFee = fee;
        onChange(mahnungLevel, dunningFee);
    }
</script>

<div class="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
    <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle class="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Mahnstufe auswählen</span>
        </span>
        <span class="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            {mahnungLevel === 1 ? '1. Zahlungserinnerung' : (mahnungLevel === 2 ? '2. Mahnung' : '3. Letzte Mahnung')}
        </span>
    </div>

    <!-- 3 Stufen Auswahl -->
    <div class="grid grid-cols-3 gap-2">
        <button
            type="button"
            onclick={() => setLevel(1)}
            class="py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer
            {mahnungLevel === 1 ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'}"
        >
            <BellRing class="w-4 h-4" />
            <span>1. Erinnerung</span>
        </button>

        <button
            type="button"
            onclick={() => setLevel(2)}
            class="py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer
            {mahnungLevel === 2 ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-orange-950/40'}"
        >
            <AlertTriangle class="w-4 h-4" />
            <span>2. Mahnung</span>
        </button>

        <button
            type="button"
            onclick={() => setLevel(3)}
            class="py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer
            {mahnungLevel === 3 ? 'bg-rose-600 text-white border-rose-700 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'}"
        >
            <ShieldAlert class="w-4 h-4" />
            <span>3. Letzte Mahnung</span>
        </button>
    </div>

    <!-- Mahngebühr Eingabe & Schnellwahltasten -->
    <div class="pt-2 border-t border-amber-200/50 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <label for="dunning-fee-input" class="font-bold text-slate-700 dark:text-slate-300">
            Mahngebühr (optional):
        </label>
        <div class="flex items-center gap-1.5">
            <button type="button" onclick={() => setFee(0)} class="px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer {dunningFee === 0 ? 'bg-amber-200/80 dark:bg-amber-900/60 font-bold border-amber-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">0 €</button>
            <button type="button" onclick={() => setFee(2.5)} class="px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer {dunningFee === 2.5 ? 'bg-amber-200/80 dark:bg-amber-900/60 font-bold border-amber-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">2,50 €</button>
            <button type="button" onclick={() => setFee(5.0)} class="px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer {dunningFee === 5.0 ? 'bg-amber-200/80 dark:bg-amber-900/60 font-bold border-amber-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">5,00 €</button>
            <div class="flex items-center gap-1 ml-1">
                <input
                    id="dunning-fee-input"
                    type="number"
                    step="0.50"
                    min="0"
                    value={dunningFee}
                    oninput={(e) => setFee(parseFloat((e.target as HTMLInputElement).value) || 0)}
                    class="w-16 py-1 px-1.5 text-center text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <span class="font-bold">€</span>
            </div>
        </div>
    </div>
</div>

