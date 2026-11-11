<script lang="ts">
    import { Calendar, DollarSign, FileText, File as FileIcon, ArrowUpRight, Users } from "lucide-svelte";
    import { formatCurrency } from "$lib/services/clientDetailHelper";
    import { rbacService } from "$lib/services/rbacService.svelte";

    interface Props {
        nextAppointment: any;
        totalAvailableBudget: number;
        currentYear: number;
        openInvoicesCount: number;
        openInvoicesTotal: number;
        totalDocumentsCount: number;
        uploadedCount: number;
        systemCount: number;
        onTabChange: (tab: 'overview' | 'budget' | 'appointments' | 'documents' | 'network') => void;
    }

    let {
        nextAppointment,
        totalAvailableBudget,
        currentYear,
        openInvoicesCount,
        openInvoicesTotal,
        totalDocumentsCount,
        uploadedCount,
        systemCount,
        onTabChange
    }: Props = $props();
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
    <!-- 1. Next Appointment -->
    <button
        type="button"
        onclick={() => onTabChange('appointments')}
        class="orga-card-white p-3 sm:p-3.5 text-left border-l-4 border-l-indigo-500 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer relative"
        title="Zum Termine-Reiter wechseln"
    >
        <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nächster Termin</span>
            <div class="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Calendar class="w-3.5 h-3.5" />
            </div>
        </div>
        {#if nextAppointment}
            <p class="text-xs sm:text-sm font-black text-neutral-900 dark:text-white truncate">{nextAppointment.description || 'Termin'}</p>
            <p class="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 truncate">
                {new Date(nextAppointment.appointment || '').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}, {new Date(nextAppointment.appointment || '').toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </p>
        {:else}
            <p class="text-xs font-bold text-neutral-400 dark:text-slate-400 italic">Kein Termin</p>
            <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline inline-flex items-center gap-0.5 mt-0.5">
                + Planen <ArrowUpRight class="w-2.5 h-2.5" />
            </span>
        {/if}
    </button>

    {#if rbacService.canAccessFinances}
        <!-- 2. Budget Snapshot -->
        <button
            type="button"
            onclick={() => onTabChange('budget')}
            class="orga-card-white p-3 sm:p-3.5 text-left border-l-4 border-l-emerald-500 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
            title="Zum Budget-Reiter wechseln"
        >
            <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Restbudget ({currentYear})</span>
                <div class="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <DollarSign class="w-3.5 h-3.5" />
                </div>
            </div>
            <p class="text-xs sm:text-base font-black text-emerald-600 dark:text-emerald-400 truncate">{formatCurrency(totalAvailableBudget)}</p>
            <p class="text-[10px] text-neutral-500 dark:text-slate-400 truncate mt-0.5">§ 45b & § 39 verfügbar</p>
        </button>

        <!-- 3. Open Invoices -->
        <button
            type="button"
            onclick={() => onTabChange('budget')}
            class="orga-card-white p-3 sm:p-3.5 text-left border-l-4 border-l-blue-500 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
            title="Rechnungen im Budget ansehen"
        >
            <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Offene Rechnungen</span>
                <div class="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <FileText class="w-3.5 h-3.5" />
                </div>
            </div>
            <p class="text-xs sm:text-base font-black text-blue-700 dark:text-blue-400 truncate">{openInvoicesCount} offen</p>
            <p class="text-[10px] text-neutral-500 dark:text-slate-400 truncate mt-0.5">{formatCurrency(openInvoicesTotal)} ausstehend</p>
        </button>
    {:else}
        <!-- Alternative 2: Netzwerk & Kontakte für Mitarbeiter -->
        <button
            type="button"
            onclick={() => onTabChange('network')}
            class="orga-card-white p-3 sm:p-3.5 text-left border-l-4 border-l-emerald-500 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
            title="Zum Netzwerk-Reiter wechseln"
        >
            <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Netzwerk & Ärzte</span>
                <div class="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Users class="w-3.5 h-3.5" />
                </div>
            </div>
            <p class="text-xs sm:text-base font-black text-slate-900 dark:text-white truncate">Kontakte</p>
            <p class="text-[10px] text-neutral-500 dark:text-slate-400 truncate mt-0.5">Angehörige & Ärzte einsehen</p>
        </button>

        <!-- Alternative 3: Akten & Dokumente -->
        <button
            type="button"
            onclick={() => onTabChange('documents')}
            class="orga-card-white p-3 sm:p-3.5 text-left border-l-4 border-l-blue-500 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
            title="Zum Dokumente-Reiter wechseln"
        >
            <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Berichte & Akten</span>
                <div class="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <FileText class="w-3.5 h-3.5" />
                </div>
            </div>
            <p class="text-xs sm:text-base font-black text-slate-900 dark:text-white truncate">{totalDocumentsCount} Dokumente</p>
            <p class="text-[10px] text-neutral-500 dark:text-slate-400 truncate mt-0.5">Berichte & Nachweise</p>
        </button>
    {/if}

    <!-- 4. Documents & Records -->
    <button
        type="button"
        onclick={() => onTabChange('documents')}
        class="orga-card-white p-3 sm:p-3.5 text-left border-l-4 border-l-purple-500 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
        title="Zum Dokumente-Reiter wechseln"
    >
        <div class="flex items-center justify-between text-neutral-500 dark:text-slate-400 mb-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dokumente & Akten</span>
            <div class="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <FileIcon class="w-3.5 h-3.5" />
            </div>
        </div>
        <p class="text-xs sm:text-base font-black text-neutral-900 dark:text-white truncate">{totalDocumentsCount} hinterlegt</p>
        <p class="text-[10px] text-neutral-500 dark:text-slate-400 truncate mt-0.5">{uploadedCount} Dateien • {systemCount} Vorlagen</p>
    </button>
</div>
