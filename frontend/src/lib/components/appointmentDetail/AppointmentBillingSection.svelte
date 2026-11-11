<script lang="ts">
    import { Banknote } from "lucide-svelte";
    import type { BillingType } from "./appointmentDetailTypes";
    import AppointmentBillingSummaryCards from "./billing/AppointmentBillingSummaryCards.svelte";
    import AppointmentExpendituresList from "./billing/AppointmentExpendituresList.svelte";

    interface Props {
        appointment: any;
        expenditures: any[];
        totalExpenditure: number;
        totalRecordedMinutes: number;
        totalKm: number;
        driveRecords?: any[];
        onToggleSettled: () => void;
        onSaveBillingType: (type: BillingType) => Promise<boolean>;
        onOpenExpenditureModal: (exp?: any) => void;
        onOpenPdfPreview: (url: string, title: string, filename: string) => void;
        onDeleteExpenditure: (id: string) => void;
    }

    let {
        appointment,
        expenditures,
        totalExpenditure,
        totalRecordedMinutes,
        totalKm,
        driveRecords = [],
        onToggleSettled,
        onSaveBillingType,
        onOpenExpenditureModal,
        onOpenPdfPreview,
        onDeleteExpenditure
    }: Props = $props();

    let currentBillingType = $derived<BillingType>((appointment?.billing_type as BillingType) || '');
    let isSettled = $derived(Boolean(appointment?.settled));
    let isSavingType = $state(false);

    const billingOptions: Array<{
        id: BillingType;
        label: string;
        code: string;
        desc: string;
        activeClass: string;
    }> = [
        {
            id: 'EL',
            label: 'Entlastungsleistungen',
            code: 'EL',
            desc: '§ 45b SGB XI (Entlastungsbetrag 131 €/Monat)',
            activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
        },
        {
            id: 'Kombi',
            label: 'Kombinationsleistungen',
            code: 'Kombi',
            desc: '§ 36/38 SGB XI (Pflegesachleistung & Pflegegeldanteil)',
            activeClass: 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/30'
        },
        {
            id: 'Privat',
            label: 'Privatzahler / Selbstzahler',
            code: 'Privat',
            desc: 'Rechnung direkt an Klienten / Angehörige',
            activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
        },
        {
            id: '45a',
            label: 'Umwandlungsleistung 40% § 45a',
            code: '40% §45a',
            desc: '§ 45a SGB XI (Bis zu 40% Umwandlung ambulanter Pflegesachleistungen)',
            activeClass: 'bg-cyan-600 text-white border-cyan-600 shadow-md ring-2 ring-cyan-500/30'
        },
        {
            id: 'VHP',
            label: 'Verhinderungspflege',
            code: 'VHP',
            desc: '§ 39 SGB XI (Stunden- oder tageweise Ersatzpflege)',
            activeClass: 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-500/30'
        }
    ];

    async function selectBillingType(type: BillingType) {
        if (isSavingType) return;
        const newType = currentBillingType === type ? '' : type;
        isSavingType = true;
        await onSaveBillingType(newType);
        isSavingType = false;
    }
</script>

<div class="space-y-4 sm:space-y-5">
    <!-- 1. Abrechnungsart (Leistungstopf) -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-2xs">
                    <Banknote class="w-4 h-4" />
                </span>
                <div>
                    <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Abrechnungsart & Leistungstopf
                    </h3>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Bestimmt, über welches Budget oder welche Kassenleistung dieser Termin abgerechnet wird.
                    </p>
                </div>
            </div>

            {#if currentBillingType}
                <span class="px-2.5 py-1 text-xs font-black rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                    {currentBillingType === '45a' ? '40% §45a' : currentBillingType} gewählt
                </span>
            {:else}
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                    Nicht zugewiesen
                </span>
            {/if}
        </div>

        <!-- 5 Abrechnungsarten Kacheln -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {#each billingOptions as opt (opt.id)}
                {@const active = currentBillingType === opt.id}
                <button
                    type="button"
                    onclick={() => selectBillingType(opt.id)}
                    disabled={isSavingType}
                    class="p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer flex flex-col justify-between gap-2 shadow-2xs relative overflow-hidden touch-manipulation min-h-12 {active 
                        ? opt.activeClass 
                        : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/90 dark:border-slate-700/80'}"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="px-2 py-0.5 rounded-lg text-xs font-black {active ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}">
                                {opt.code}
                            </span>
                            <span class="text-xs font-black truncate {active ? 'text-white' : 'text-slate-900 dark:text-white'}">
                                {opt.label}
                            </span>
                        </div>
                        {#if active}
                            <span class="w-5 h-5 rounded-full bg-white text-indigo-600 flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                                ✓
                            </span>
                        {/if}
                    </div>
                    <p class="text-[11px] {active ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'} font-medium leading-relaxed">
                        {opt.desc}
                    </p>
                </button>
            {/each}
        </div>
    </div>

    <!-- 2. Abrechnungsstatus & Kennzahlen-Zusammenfassung -->
    <AppointmentBillingSummaryCards
        {isSettled}
        {totalRecordedMinutes}
        {totalKm}
        {driveRecords}
        {totalExpenditure}
        expendituresCount={expenditures.length}
        {onToggleSettled}
    />

    <!-- 3. Sonderausgaben & Belege -->
    <AppointmentExpendituresList
        {expenditures}
        {totalExpenditure}
        {onOpenExpenditureModal}
        {onOpenPdfPreview}
        {onDeleteExpenditure}
    />
</div>
