<script lang="ts">
    interface Props {
        suspectedRetirementHomes: any[];
        onConvertAll: () => Promise<void>;
    }

    let {
        suspectedRetirementHomes,
        onConvertAll
    }: Props = $props();

    let isConverting = $state(false);

    async function handleConvert() {
        if (isConverting) return;
        isConverting = true;
        try {
            await onConvertAll();
        } finally {
            isConverting = false;
        }
    }
</script>

<div class="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-50/50 dark:to-slate-900 border-2 border-amber-500/40 dark:border-amber-500/30 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div class="flex items-start sm:items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
            🏥
        </div>
        <div>
            <h4 class="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>{suspectedRetirementHomes.length === 1 ? '1 Pflegeheim als Kontakt eingeordnet' : `${suspectedRetirementHomes.length} Pflegeheime als Kontakte eingeordnet`}</span>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">Korrektur empfohlen</span>
            </h4>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                {suspectedRetirementHomes.length === 1 ? 'Der Kontakt' : 'Die Kontakte'} 
                <strong>„{suspectedRetirementHomes.map((c: any) => c.company_name || `${c.name_first || ''} ${c.name_last || ''}`.trim()).slice(0, 3).join('“, „')}{suspectedRetirementHomes.length > 3 ? '...' : ''}“</strong> 
                {suspectedRetirementHomes.length === 1 ? 'scheint eine Pflegeeinrichtung zu sein' : 'scheinen Pflegeeinrichtungen zu sein'}.
            </p>
        </div>
    </div>
    <button
        type="button"
        disabled={isConverting}
        onclick={handleConvert}
        class="orga-button-primary min-h-[44px] py-2.5 px-4 text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white border-none shadow-amber-600/20 cursor-pointer flex items-center justify-center gap-2 active:scale-95 transition-all w-full md:w-auto shrink-0 disabled:opacity-50"
    >
        <span>🏥</span>
        <span>{suspectedRetirementHomes.length === 1 ? 'Jetzt in Heime verschieben' : `Alle ${suspectedRetirementHomes.length} Heime verschieben`}</span>
    </button>
</div>
