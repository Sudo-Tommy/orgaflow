<script lang="ts">
    import { Check, AlertTriangle } from "lucide-svelte";

    interface Props {
        totalGross: number;
        isSubmitting: boolean;
        onConfirmFull: () => void;
        onSwitchPartial: () => void;
    }

    let { totalGross, isSubmitting, onConfirmFull, onSwitchPartial }: Props = $props();
</script>

<div class="space-y-6 text-center py-2">
    <div class="max-w-md mx-auto">
        <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Wurde der Betrag vollständig bezahlt?
        </h3>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Wurde der gesamte Rechnungsbetrag in Höhe von 
            <strong class="text-neutral-800 dark:text-neutral-200">
                {totalGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </strong> 
            vom Kostenträger bzw. Klienten ohne Kürzungen beglichen?
        </p>
    </div>

    <!-- Zwei prominente Aktions-Schaltflächen -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
        <!-- JA, VOLLSTÄNDIG BEZAHLT -->
        <button 
            type="button" 
            disabled={isSubmitting}
            onclick={onConfirmFull}
            class="group p-5 rounded-2xl border-2 border-emerald-500/50 hover:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-left transition-all shadow-sm hover:shadow-md flex flex-col justify-between gap-3 cursor-pointer"
        >
            <div class="flex items-center justify-between">
                <span class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Check class="w-5 h-5 stroke-[3]" />
                </span>
                <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                    1-Klick Abschluss
                </span>
            </div>
            <div>
                <h4 class="font-bold text-emerald-900 dark:text-emerald-200 text-base">Ja, vollständig bezahlt</h4>
                <p class="text-xs text-emerald-700/80 dark:text-emerald-400 mt-1 leading-relaxed">
                    Bucht {totalGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} als bezahlt und schließt die Rechnung direkt ab.
                </p>
            </div>
        </button>

        <!-- NEIN, KÜRZUNG / TEILZAHLUNG -->
        <button 
            type="button" 
            disabled={isSubmitting}
            onclick={onSwitchPartial}
            class="group p-5 rounded-2xl border-2 border-amber-400/60 hover:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 text-left transition-all shadow-sm hover:shadow-md flex flex-col justify-between gap-3 cursor-pointer"
        >
            <div class="flex items-center justify-between">
                <span class="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <AlertTriangle class="w-5 h-5 stroke-[2.5]" />
                </span>
                <span class="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                    Kassenkürzung
                </span>
            </div>
            <div>
                <h4 class="font-bold text-amber-900 dark:text-amber-200 text-base">Nein, gekürzt / Teilbetrag</h4>
                <p class="text-xs text-amber-700/80 dark:text-amber-400 mt-1 leading-relaxed">
                    Öffnet den geführten Decision Tree zur automatisierten Auflösung der Kürzungsdifferenz.
                </p>
            </div>
        </button>
    </div>
</div>
