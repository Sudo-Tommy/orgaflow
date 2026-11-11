<script lang="ts">
    import { ShieldCheck, ChevronDown, ChevronUp, Car, Utensils, Building2, Receipt } from "lucide-svelte";

    let isOpen = $state(false);
</script>

<div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-xs no-print transition-all border border-slate-800">
    <!-- Header-Zeile mit Toggle-Schalter -->
    <div class="p-3.5 sm:p-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center shrink-0">
                <ShieldCheck class="w-4 h-4 text-indigo-300" />
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h2 class="font-bold text-indigo-100 text-xs sm:text-sm">
                        Die 4 Säulen der Reisekostenabrechnung
                    </h2>
                    <span class="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30 hidden sm:inline">
                        § 9 Abs. 4a EStG & BMF
                    </span>
                </div>
                <p class="text-[11px] text-indigo-300/80 hidden md:block">
                    Rechtskonforme Pauschalen für Fahrtkosten, Verpflegung, Übernachtung und Nebenkosten
                </p>
            </div>
        </div>

        <button 
            type="button"
            onclick={() => isOpen = !isOpen}
            class="h-9 min-h-[36px] px-3 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/15 rounded-xl text-xs font-semibold text-indigo-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            aria-expanded={isOpen}
            aria-label="Erklärung der 4 Säulen ein- oder ausblenden"
        >
            <span>{isOpen ? 'Einklappen' : 'Details anzeigen'}</span>
            {#if isOpen}
                <ChevronUp class="w-3.5 h-3.5" />
            {:else}
                <ChevronDown class="w-3.5 h-3.5" />
            {/if}
        </button>
    </div>

    <!-- Einklappbarer Inhalt -->
    {#if isOpen}
        <div class="px-3.5 pb-4 pt-1 border-t border-white/10">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
                <!-- 1. Säule: Fahrtkosten -->
                <div class="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                        <Car class="w-4 h-4" /> 1. Fahrtkosten
                    </div>
                    <p class="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                        <strong>0,30 €/km</strong> PKW-Pauschale oder tatsächliche Ticketkosten (Bahn, ÖPNV, Taxi).
                    </p>
                </div>

                <!-- 2. Säule: VMA -->
                <div class="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div class="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                        <Utensils class="w-4 h-4" /> 2. Verpflegung (VMA)
                    </div>
                    <p class="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                        <strong>14 €</strong> (>8h / An- & Abreise), <strong>28 €</strong> (24h). Kürzungen: F -5,60 €, M/A -11,20 €.
                    </p>
                </div>

                <!-- 3. Säule: Übernachtung -->
                <div class="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div class="font-bold text-sky-300 flex items-center gap-1.5 text-xs">
                        <Building2 class="w-4 h-4" /> 3. Übernachtung
                    </div>
                    <p class="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                        Tatsächliche Hotelkosten laut Beleg oder <strong>20,00 €</strong> Pauschale ohne Nachweis.
                    </p>
                </div>

                <!-- 4. Säule: Reisenebenkosten -->
                <div class="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div class="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                        <Receipt class="w-4 h-4" /> 4. Nebenkosten
                    </div>
                    <p class="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                        Parkgebühren, Maut, Gepäck, Trinkgelder. Private Ausgaben sind ausgeschlossen.
                    </p>
                </div>
            </div>
        </div>
    {/if}
</div>
