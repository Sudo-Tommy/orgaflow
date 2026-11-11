<script lang="ts">
    import { User, Check, Phone, Mail, Home, X } from "lucide-svelte";

    let {
        inheritorData,
        inheritors = [],
        isLoading = false,
        onOpenContact,
        onRemoveInheritor
    }: {
        inheritorData: {
            name: string;
            relation: string;
            phone: string;
            email: string;
            hasPowerOfAttorney: boolean;
            notes: string;
        };
        inheritors: any[];
        isLoading?: boolean;
        onOpenContact: (contact: any) => void;
        onRemoveInheritor: (id: string) => void;
    } = $props();
</script>

<div class="space-y-4">
    <!-- 1. Gesetzlicher Erbe / Bevollmächtigter -->
    {#if inheritorData.name}
        <div class="w-full bg-neutral-50/60 dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-indigo-500 p-4 rounded-2xl shadow-xs transition-all">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/60 dark:border-slate-700/60 pb-2 mb-2">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                        <User class="w-4 h-4" />
                    </div>
                    <div>
                        <p class="text-sm font-bold text-neutral-900 dark:text-white">{inheritorData.name}</p>
                        <p class="text-[11px] text-neutral-500 dark:text-slate-400 font-medium">{inheritorData.relation || 'Rechtlicher Vertreter'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    {#if inheritorData.hasPowerOfAttorney}
                        <span class="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check class="w-3 h-3" /> Vollmacht erteilt
                        </span>
                    {/if}
                    <span class="text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        Erbe / Bevollmächtigte/r
                    </span>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-slate-300 pt-1">
                {#if inheritorData.phone}
                    <a href="tel:{inheritorData.phone}" class="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium touch-manipulation">
                        <Phone class="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" /> {inheritorData.phone}
                    </a>
                {/if}
                {#if inheritorData.email}
                    <a href="mailto:{inheritorData.email}" class="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium touch-manipulation">
                        <Mail class="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" /> {inheritorData.email}
                    </a>
                {/if}
                {#if inheritorData.notes}
                    <span class="text-neutral-500 dark:text-slate-400 italic">Hinweis: {inheritorData.notes}</span>
                {/if}
            </div>
        </div>
    {/if}

    <!-- 2. Verknüpfte Pflegepersonen (Kontakte) -->
    {#if inheritors.length > 0}
        <div class="space-y-2">
            <p class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider">Verknüpfte Kontaktpersonen für Verhinderungspflege</p>
            <div class="grid grid-cols-1 gap-2.5">
                {#each inheritors as inheritor (inheritor.id)}
                    <div class="w-full flex items-start justify-between bg-neutral-50/60 dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-teal-500 p-3.5 rounded-2xl shadow-xs hover:border-teal-400 dark:hover:border-teal-500 transition-all group">
                        <button type="button" onclick={() => onOpenContact(inheritor)} class="min-w-0 pr-2 text-left flex-1 cursor-pointer touch-manipulation">
                            <div class="flex items-center gap-2">
                                <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">{inheritor.name_first} {inheritor.name_last}</p>
                                <span class="text-[9px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded-full">Hauptpflegeperson</span>
                            </div>
                            {#if inheritor.company_name}<p class="text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-1 truncate">{inheritor.company_name}</p>{/if}
                            <div class="flex flex-col gap-1 text-xs text-neutral-600 dark:text-slate-300 mt-1.5">
                                {#if inheritor.phone}<span class="flex items-center gap-1.5 truncate"><Phone class="w-3 h-3 text-neutral-400 dark:text-slate-500" /> {inheritor.phone}</span>{/if}
                                {#if inheritor.email}<span class="flex items-center gap-1.5 truncate"><Mail class="w-3 h-3 text-neutral-400 dark:text-slate-500" /> {inheritor.email}</span>{/if}
                                {#if inheritor.street}<span class="flex items-center gap-1.5 truncate"><Home class="w-3 h-3 text-neutral-400 dark:text-slate-500" /> {inheritor.street} {inheritor.housenr || ''}, {inheritor.zip || ''} {inheritor.city || ''}</span>{/if}
                            </div>
                        </button>
                        <button type="button" onclick={(e) => { e.stopPropagation(); onRemoveInheritor(inheritor.id); }} disabled={isLoading} class="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-neutral-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer touch-manipulation" title="Verknüpfung aufheben">
                            <X class="w-4 h-4" />
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
