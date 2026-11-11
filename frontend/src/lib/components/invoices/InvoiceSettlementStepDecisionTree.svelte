<script lang="ts">
    import { ShieldAlert, FilePlus2, TrendingDown } from "lucide-svelte";

    interface Props {
        totalGross: number;
        differenceAmount: number;
        receivedAmount: number;
        referenceNr: string;
        notes: string;
        selectedDecision: 'dispute' | 'bill_client_privat' | 'write_off';
    }

    let {
        totalGross,
        differenceAmount,
        receivedAmount = $bindable(),
        referenceNr = $bindable(),
        notes = $bindable(),
        selectedDecision = $bindable()
    }: Props = $props();
</script>

<div class="space-y-6 animate-enter">
    <!-- EINGABEFELDER: Erhaltener Betrag & Live-Differenz -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <label for="received-amount" class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Tatsächlich erhaltener Betrag (€)
            </label>
            <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                <input 
                    id="received-amount"
                    type="number" 
                    step="0.01" 
                    min="0"
                    max={totalGross}
                    bind:value={receivedAmount}
                    class="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-lg font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    placeholder="0.00"
                    required
                />
            </div>
            <span class="text-[11px] text-slate-400 mt-1 block">Laut Kontoauszug oder Kassenabrechnung</span>
        </div>

        <!-- Live Differenz-Anzeige -->
        <div class="p-4 rounded-2xl border {differenceAmount > 0 ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'} flex flex-col justify-center">
            <span class="text-xs font-bold uppercase tracking-wider {differenceAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}">
                Kürzungsdifferenz (Offener Betrag)
            </span>
            <span class="text-2xl font-black {differenceAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'} mt-1">
                {differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {differenceAmount > 0 ? 'Kürzungsbetrag, der nun aufgelöst werden muss' : 'Keine Differenz festgestellt'}
            </span>
        </div>
    </div>

    <!-- Kassen-Aktenzeichen / Kürzungsvermerk -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <label for="reference-nr" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kassen-Aktenzeichen / Bescheid-Nr.
            </label>
            <input 
                id="reference-nr"
                type="text"
                bind:value={referenceNr}
                placeholder="z. B. AZ-2026-8849-KK"
                class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
        </div>
        <div>
            <label for="notes" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kürzungsvermerk / Begründung
            </label>
            <input 
                id="notes"
                type="text"
                bind:value={notes}
                placeholder="z. B. Anfahrt gekürzt, Budget überschritten"
                class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
        </div>
    </div>

    <!-- MULTIPLE-CHOICE ENTSCHEIDUNGSBAUM -->
    <div class="space-y-3 pt-2">
        <p class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Wie soll die Kürzung aufgelöst werden? (Decision Tree)
        </p>

        <!-- Option 1: Widerspruch einlegen -->
        <label class="relative flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer {selectedDecision === 'dispute' ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-xs' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}">
            <input 
                type="radio" 
                name="decision" 
                value="dispute" 
                bind:group={selectedDecision} 
                class="mt-1 text-amber-600 focus:ring-amber-500" 
            />
            <div class="flex-1">
                <div class="flex items-center gap-2">
                    <ShieldAlert class="w-4 h-4 text-amber-600 shrink-0" />
                    <span class="font-bold text-sm text-slate-900 dark:text-slate-100">1. Widerspruch einlegen (Kürzung unberechtigt)</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Verbuche Teilbetrag als <span class="font-semibold text-amber-700 dark:text-amber-300">Teilweise bezahlt</span>, aktiviere den 
                    <span class="font-semibold text-amber-700 dark:text-amber-300">Mahnstopp</span> und lege automatisch eine Nachforderungs-Aufgabe mit 
                    <span class="font-semibold text-amber-700 dark:text-amber-300">14-Tage-Frist</span> zur Klärung des Bescheids an.
                </p>
            </div>
        </label>

        <!-- Option 2: Privat an Klienten weiterberechnen (FIFO an Termine) -->
        <label class="relative flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer {selectedDecision === 'bill_client_privat' ? 'border-violet-600 bg-violet-50/60 dark:bg-violet-950/30 shadow-xs' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}">
            <input 
                type="radio" 
                name="decision" 
                value="bill_client_privat" 
                bind:group={selectedDecision} 
                class="mt-1 text-violet-600 focus:ring-violet-500" 
            />
            <div class="flex-1">
                <div class="flex items-center gap-2">
                    <FilePlus2 class="w-4 h-4 text-violet-600 shrink-0" />
                    <span class="font-bold text-sm text-slate-900 dark:text-slate-100">2. Privat an Klienten weiterberechnen</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Schließt die Kassenrechnung ab und überträgt den offenen Restbetrag (<span class="font-semibold text-violet-700 dark:text-violet-300">{differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>) 
                    per FIFO an die Termine. Diese stehen sofort als <span class="font-semibold text-violet-700 dark:text-violet-300">offene Teilforderungen</span> für die nächste Privatrechnung dieses Klienten bereit.
                </p>
            </div>
        </label>

        <!-- Option 3: Als Verlust ausbuchen -->
        <label class="relative flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer {selectedDecision === 'write_off' ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 shadow-xs' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}">
            <input 
                type="radio" 
                name="decision" 
                value="write_off" 
                bind:group={selectedDecision} 
                class="mt-1 text-rose-600 focus:ring-rose-500" 
            />
            <div class="flex-1">
                <div class="flex items-center gap-2">
                    <TrendingDown class="w-4 h-4 text-rose-600 shrink-0" />
                    <span class="font-bold text-sm text-slate-900 dark:text-slate-100">3. Als Verlust ausbuchen (Kürzung akzeptieren)</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Schließt die Kassenrechnung mit Restforderung 0 € ab (<span class="font-semibold text-emerald-600">Bezahlt</span>), bucht den Differenzbetrag revisionssicher als 
                    <span class="font-semibold text-rose-600">Verlustausbuchung</span> im Haushaltsbuch und hinterlegt den Kürzungsvermerk.
                </p>
            </div>
        </label>
    </div>
</div>
