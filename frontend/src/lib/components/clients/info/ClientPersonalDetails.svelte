<script lang="ts">
    import { Cake, Heart, Phone, Mail, Home, MapPin } from "lucide-svelte";
    import { safeFormatDate } from "./clientBudgetCalculations";

    let {
        client,
        age
    }: {
        client: any;
        age: number | null;
    } = $props();
</script>

<div class="space-y-5">
    {#if client.birthdate}
        <div class="flex items-start gap-3.5 p-3 rounded-2xl bg-neutral-50/60 dark:bg-slate-800/40 border border-neutral-100 dark:border-slate-800">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                <Cake class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                    <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider">Geburtsdatum</p>
                    {#if age !== null}
                        <span class="text-[10px] font-bold text-neutral-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 px-2 py-0.5 rounded-md shadow-xs">
                            {age ?? 0} Jahre
                        </span>
                    {/if}
                </div>
                <p class="text-sm font-bold text-neutral-900 dark:text-white">{safeFormatDate(client.birthdate)}</p>
            </div>
        </div>
    {/if}
    
    {#if client.level_of_care}
        <div class="flex items-start gap-3.5 p-3 rounded-2xl bg-neutral-50/60 dark:bg-slate-800/40 border border-neutral-100 dark:border-slate-800">
            <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Heart class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Pflegegrad</p>
                <div class="flex items-center gap-2">
                    <p class="text-sm font-bold text-neutral-900 dark:text-white">Grad {client.level_of_care}</p>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Anspruch VHP & ELB
                    </span>
                </div>
            </div>
        </div>
    {/if}

    <div class="flex items-start gap-3.5 p-3 rounded-2xl bg-neutral-50/60 dark:bg-slate-800/40 border border-neutral-100 dark:border-slate-800">
        <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Phone class="w-5 h-5" />
        </div>
        <div class="flex-1 min-w-0">
            <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Telefon</p>
            {#if client.phone}
                <a href="tel:{client.phone}" class="text-sm font-bold text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block min-h-[36px] flex items-center touch-manipulation">
                    {client.phone}
                </a>
            {:else}
                <p class="text-sm font-medium text-neutral-400 dark:text-slate-500">Nicht hinterlegt</p>
            {/if}
        </div>
    </div>

    <div class="flex items-start gap-3.5 p-3 rounded-2xl bg-neutral-50/60 dark:bg-slate-800/40 border border-neutral-100 dark:border-slate-800">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Mail class="w-5 h-5" />
        </div>
        <div class="flex-1 min-w-0">
            <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">E-Mail</p>
            {#if client.email}
                <a href="mailto:{client.email}" class="text-sm font-bold text-neutral-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors break-all block min-h-[36px] flex items-center touch-manipulation">
                    {client.email}
                </a>
            {:else}
                <p class="text-sm font-medium text-neutral-400 dark:text-slate-500">Nicht hinterlegt</p>
            {/if}
        </div>
    </div>

    <div class="flex items-start gap-3.5 p-3 rounded-2xl bg-neutral-50/60 dark:bg-slate-800/40 border border-neutral-100 dark:border-slate-800">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Home class="w-5 h-5" />
        </div>
        <div class="flex-1 min-w-0">
            <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Wohnadresse</p>
            <p class="text-sm font-bold text-neutral-900 dark:text-white leading-relaxed">
                {#if client.street || client.city}
                    {client.street || ''} {client.housenr || ''}<br />
                    <span class="text-xs text-neutral-500 dark:text-slate-400 font-medium">{client.zip || ''} {client.city || ''}</span>
                {:else}
                    <span class="text-sm font-medium text-neutral-400 dark:text-slate-500">Nicht hinterlegt</span>
                {/if}
            </p>
            {#if client.street || client.city}
                <a
                    href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${client.street || ''} ${client.housenr || ''}, ${client.zip || ''} ${client.city || ''}`)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-2 rounded-xl transition-all border border-blue-200 dark:border-blue-800/60 shadow-xs active:scale-95 min-h-[44px] touch-manipulation"
                >
                    <MapPin class="w-3.5 h-3.5" />
                    <span>In Google Maps öffnen</span>
                </a>
            {/if}
        </div>
    </div>
</div>
