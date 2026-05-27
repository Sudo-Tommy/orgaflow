<script lang="ts">
    let { currentBWA } = $props<any>();
</script>

<div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-6 group hover:shadow-md transition-shadow">
    <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg mb-6"><span class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-inner">📉</span> Aufwandsstruktur</h3>
    {#if currentBWA}
        {@const totalExpenses = currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses || 1}
        <div class="space-y-5 flex-1 flex flex-col justify-center">
            <div><div class="flex justify-between text-xs font-bold mb-1.5"><span class="text-neutral-600">Material / Fremdl.</span><span class="text-neutral-900">{((currentBWA.materialCosts / totalExpenses) * 100).toFixed(1)}%</span></div>
            <div class="w-full bg-neutral-100 rounded-full h-2 shadow-inner"><div class="bg-amber-400 h-2 rounded-full transition-all duration-1000" style="width: {(currentBWA.materialCosts / totalExpenses) * 100}%"></div></div></div>
            <div><div class="flex justify-between text-xs font-bold mb-1.5"><span class="text-neutral-600">Personalkosten</span><span class="text-neutral-900">{((currentBWA.personnelCosts / totalExpenses) * 100).toFixed(1)}%</span></div>
            <div class="w-full bg-neutral-100 rounded-full h-2 shadow-inner"><div class="bg-rose-400 h-2 rounded-full transition-all duration-1000" style="width: {(currentBWA.personnelCosts / totalExpenses) * 100}%"></div></div></div>
            <div><div class="flex justify-between text-xs font-bold mb-1.5"><span class="text-neutral-600">Raum & Sonstiges</span><span class="text-neutral-900">{(((currentBWA.roomCosts + currentBWA.otherOperatingExpenses + currentBWA.operatingTaxes) / totalExpenses) * 100).toFixed(1)}%</span></div>
            <div class="w-full bg-neutral-100 rounded-full h-2 shadow-inner"><div class="bg-blue-400 h-2 rounded-full transition-all duration-1000" style="width: {(((currentBWA.roomCosts + currentBWA.otherOperatingExpenses + currentBWA.operatingTaxes) / totalExpenses) * 100)}%"></div></div></div>
        </div>
    {/if}
</div>