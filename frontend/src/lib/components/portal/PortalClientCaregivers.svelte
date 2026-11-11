<script lang="ts">
    import { UserCheck, ShieldCheck, Phone, Mail, MapPin } from "lucide-svelte";

    let { client }: { client: any } = $props();

    const caregiverObj = $derived(Array.isArray(client.expand?.caregiver) ? client.expand.caregiver[0] : client.expand?.caregiver);
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col justify-between">
        <div>
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <UserCheck class="w-4 h-4 text-emerald-600" /> Zuständige Seniorenassistenz
                </span>
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">Aktiv zugeteilt</span>
            </div>

            {#if client.assigned_employee}
                <div class="flex items-start gap-3.5 mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0 border border-emerald-200">
                        {(client.assigned_employee.name_first?.charAt(0) || '')}{(client.assigned_employee.name_last?.charAt(0) || '')}
                    </div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                            {client.assigned_employee.name_first} {client.assigned_employee.name_last}
                        </h4>
                        <p class="text-xs text-slate-500 mt-0.5">Ihre persönliche Ansprechperson im Alltag</p>
                    </div>
                </div>

                <div class="space-y-2 text-xs">
                    {#if client.assigned_employee.phone}
                        <a href="tel:{client.assigned_employee.phone}" class="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-between font-semibold">
                            <span class="flex items-center gap-2"><Phone class="w-4 h-4 text-emerald-600" /> {client.assigned_employee.phone}</span>
                            <span class="text-[11px] font-bold text-emerald-600">Anrufen</span>
                        </a>
                    {/if}
                    {#if client.assigned_employee.email}
                        <a href="mailto:{client.assigned_employee.email}" class="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-between font-semibold">
                            <span class="flex items-center gap-2 truncate"><Mail class="w-4 h-4 text-indigo-600" /> {client.assigned_employee.email}</span>
                            <span class="text-[11px] font-bold text-indigo-600 shrink-0 ml-2">E-Mail</span>
                        </a>
                    {/if}
                </div>
            {:else}
                <div class="py-6 text-center text-slate-400 text-xs">
                    <p>Ihr Team der Seniorenassistenz ist für Sie da.</p>
                    <p class="mt-1">Kontaktieren Sie uns gern über die Startseite oder per Termin-Anfrage.</p>
                </div>
            {/if}
        </div>
    </div>

    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col justify-between">
        <div>
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck class="w-4 h-4 text-indigo-600" /> Gesetzliche(r) Betreuer(in)
                </span>
                {#if caregiverObj}<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">Hinterlegt</span>{/if}
            </div>

            {#if caregiverObj}
                <div class="flex items-start gap-3.5 mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base shrink-0 border border-indigo-200">
                        {(caregiverObj.name_first?.charAt(0) || '')}{(caregiverObj.name_last?.charAt(0) || '')}
                    </div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">{caregiverObj.name_first} {caregiverObj.name_last}</h4>
                        <p class="text-xs text-indigo-600 font-medium mt-0.5">{caregiverObj.company_name || 'Gesetzliche Vertretung / Bevollmächtigung'}</p>
                    </div>
                </div>

                <div class="space-y-2 text-xs">
                    {#if caregiverObj.phone || caregiverObj.handy}
                        <a href="tel:{caregiverObj.phone || caregiverObj.handy}" class="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-between font-semibold">
                            <span class="flex items-center gap-2"><Phone class="w-4 h-4 text-indigo-600" /> {caregiverObj.phone || caregiverObj.handy}</span>
                            <span class="text-[11px] font-bold text-indigo-600">Anrufen</span>
                        </a>
                    {/if}
                    {#if caregiverObj.email}
                        <a href="mailto:{caregiverObj.email}" class="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-between font-semibold">
                            <span class="flex items-center gap-2 truncate"><Mail class="w-4 h-4 text-indigo-600" /> {caregiverObj.email}</span>
                            <span class="text-[11px] font-bold text-indigo-600 shrink-0 ml-2">E-Mail</span>
                        </a>
                    {/if}
                    {#if caregiverObj.city}
                        <p class="text-slate-500 text-xs px-2 pt-1 flex items-center gap-1.5">
                            <MapPin class="w-3.5 h-3.5" /> {caregiverObj.street} {caregiverObj.housenr}, {caregiverObj.zip} {caregiverObj.city}
                        </p>
                    {/if}
                </div>
            {:else}
                <div class="py-6 text-center text-slate-400 text-xs">
                    <p>Kein gesetzlicher Betreuer hinterlegt.</p>
                    <p class="mt-1">Der Klient verwaltet seine Belange eigenständig oder durch Bevollmächtigte.</p>
                </div>
            {/if}
        </div>
    </div>
</div>
