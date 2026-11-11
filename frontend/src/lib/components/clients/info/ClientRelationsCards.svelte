<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { safeFormatDate } from "./clientBudgetCalculations";
    import {
        ShieldCheck, Scale, HeartHandshake, FileText, Check
    } from "lucide-svelte";

    let {
        client,
        onUnlinkInsurance,
        onOpenLinkInsurance,
        onUnlinkCaregiver
    }: {
        client: any;
        onUnlinkInsurance: () => void;
        onOpenLinkInsurance: () => void;
        onUnlinkCaregiver: () => void;
    } = $props();
</script>

<div class="space-y-4">
    <!-- Krankenkasse -->
    <div class="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800/80">
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-teal-500 shadow-xs">
            <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                    <ShieldCheck class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider">Krankenkasse</p>
                        <div class="flex items-center gap-2">
                            {#if client.insurance || client.expand?.insurance}
                                <button
                                    type="button"
                                    onclick={onUnlinkInsurance}
                                    class="text-xs font-bold text-rose-500 hover:text-rose-700 dark:text-rose-400 transition-colors cursor-pointer py-1 px-1.5 touch-manipulation min-h-[36px] flex items-center"
                                    title="Verknüpfung zur Krankenkasse aufheben"
                                >Trennen</button>
                                <span class="text-neutral-300 dark:text-slate-600">·</span>
                            {/if}
                            <button
                                type="button"
                                onclick={onOpenLinkInsurance}
                                class="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer py-1 px-1.5 touch-manipulation min-h-[36px] flex items-center"
                            >Ändern</button>
                        </div>
                    </div>
                    <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">{client.expand?.insurance?.name || 'Keine / Unbekannt'}</p>
                    {#if client.insurance_nr}
                        <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1">Vers-Nr: <span class="font-mono bg-neutral-100 dark:bg-slate-900 text-neutral-800 dark:text-slate-200 px-1.5 py-0.5 rounded-md border border-neutral-200/60 dark:border-slate-800">{client.insurance_nr}</span></p>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <!-- Gesetzl. Betreuung -->
    {#if client.expand?.caregiver}
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-amber-500 shadow-xs">
            <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Scale class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider">Gesetzl. Betreuung</p>
                        <button
                            type="button"
                            onclick={onUnlinkCaregiver}
                            class="text-xs font-bold text-rose-500 hover:text-rose-700 dark:text-rose-400 transition-colors cursor-pointer py-1 px-1.5 touch-manipulation min-h-[36px] flex items-center"
                            title="Verknüpfung zur Betreuung aufheben"
                        >Trennen</button>
                    </div>
                    <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">{client.expand.caregiver.name_first} {client.expand.caregiver.name_last}</p>
                    {#if client.expand.caregiver.phone}
                        <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1">Tel: {client.expand.caregiver.phone}</p>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- Verhinderungspflege (§ 39 SGB XI) / Pflegeperson -->
    {#if client.inheritor_info?.name || client.expand?.inheritor}
        {@const info = client.inheritor_info || {}}
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-indigo-500 shadow-xs">
            <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <HeartHandshake class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider">Antrag Verhinderungspflege</p>
                        {#if info.reason}
                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">{info.reason}</span>
                        {/if}
                    </div>
                    <p class="text-sm font-bold text-neutral-900 dark:text-white">{info.name || 'Pflegeperson hinterlegt'} {#if info.relation}<span class="text-xs font-normal text-neutral-500 dark:text-slate-400">({info.relation})</span>{/if}</p>
                    {#if info.birthdate}
                        <p class="text-xs text-neutral-600 dark:text-slate-300 mt-0.5">Geb.: {safeFormatDate(info.birthdate)}</p>
                    {/if}
                    {#if info.address || info.street}
                        <p class="text-xs text-neutral-600 dark:text-slate-300 mt-0.5 truncate">{info.address || `${info.street || ''} ${info.housenr || ''}, ${info.zip || ''} ${info.city || ''}`}</p>
                    {/if}
                    {#if info.phone}
                        <p class="text-xs text-neutral-600 dark:text-slate-300 mt-0.5">Tel: {info.phone}</p>
                    {/if}
                    {#if info.email}
                        <p class="text-xs text-neutral-600 dark:text-slate-300 mt-0.5">E-Mail: {info.email}</p>
                    {/if}
                    <div class="mt-2.5 flex flex-wrap gap-1.5">
                        {#if info.pre_care_fulfilled !== false}
                            <span class="text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Check class="w-3 h-3" /> Vorpflegezeit ≥ 6 Mon.
                            </span>
                        {/if}
                        <span class="text-[9px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">{info.care_type === 'tageweise' ? 'Tageweise' : 'Stundenweise (< 8h)'}</span>
                    </div>
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Abrechnungskonditionen -->
    <div class="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800/80">
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-blue-500 shadow-xs">
            <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-3">Abrechnungskonditionen</p>
            <div class="grid grid-cols-3 gap-3 bg-neutral-50/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-neutral-200/50 dark:border-slate-800">
                <div>
                    <p class="text-[9px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Stundensatz</p>
                    <p class="text-sm font-black text-neutral-900 dark:text-white">{client.hourly_rate ?? 40} €</p>
                </div>
                <div>
                    <p class="text-[9px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Fahrtkosten</p>
                    <p class="text-sm font-black text-neutral-900 dark:text-white">{client.km_rate ?? 0.3} €/km</p>
                </div>
                <div>
                    <p class="text-[9px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Steuersatz</p>
                    <p class="text-sm font-black text-neutral-900 dark:text-white">{client.tax_rate != null ? client.tax_rate : '0'} %</p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Unterschrift -->
    {#if client.sign}
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-purple-500 shadow-xs">
            <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-3">Unterschrift</p>
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/60 dark:border-slate-700 p-4 flex justify-center shadow-inner">
                {#if client.sign.toLowerCase().endsWith('.pdf')}
                    <a href={pb.files.getURL(client, client.sign)} target="_blank" rel="noopener noreferrer" class="flex flex-col items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors min-h-[44px] justify-center touch-manipulation">
                        <FileText class="w-8 h-8" />
                        <span class="text-xs font-bold">PDF-Dokument öffnen</span>
                    </a>
                {:else}
                    <img src={pb.files.getURL(client, client.sign)} alt="Unterschrift von {client.name_first}" class="max-h-24 object-contain rounded-lg p-1 safe-signature" />
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    :global(.theme-negative) .safe-signature {
        filter: invert(1) hue-rotate(180deg);
    }
</style>
