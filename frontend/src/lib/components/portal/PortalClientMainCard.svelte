<script lang="ts">
    import { Edit2, Phone, Mail, CalendarPlus } from "lucide-svelte";

    let {
        client,
        onEdit = () => {},
        onRequestAppointment = () => {}
    }: {
        client: any;
        onEdit?: () => void;
        onRequestAppointment?: () => void;
    } = $props();

    const insuranceObj = $derived(Array.isArray(client.expand?.insurance) ? client.expand.insurance[0] : client.expand?.insurance);
</script>

<div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden">
    <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-2xl shrink-0 shadow-inner border border-indigo-200 dark:border-indigo-800">
                {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
            </div>
            <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                        {client.name_first} {client.name_last}
                    </h2>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border {client.level_of_care && client.level_of_care !== '0' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'}">
                        {client.level_of_care && client.level_of_care !== '0' ? `Pflegegrad ${client.level_of_care}` : 'Kein Pflegegrad'}
                    </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {client.birthdate ? `Geboren am ${new Date(client.birthdate).toLocaleDateString('de-DE')}` : 'Klienten-Akte'}
                </p>
            </div>
        </div>

        <div class="flex items-center gap-2 self-start flex-wrap">
            <button 
                type="button" 
                onclick={onRequestAppointment} 
                class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
                <CalendarPlus class="w-3.5 h-3.5" /> Termin anfragen
            </button>
            <button 
                type="button" 
                onclick={onEdit} 
                class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
                <Edit2 class="w-3.5 h-3.5" /> Stammdaten bearbeiten
            </button>
        </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Wohnort / Anschrift</span>
            <p class="font-bold text-slate-900 dark:text-slate-100 text-sm">{client.street || ''} {client.housenr || ''}</p>
            <p class="text-slate-600 dark:text-slate-400">{client.zip || ''} {client.city || 'Keine Adresse hinterlegt'}</p>
        </div>

        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Krankenkasse & Pflegekasse</span>
            <p class="font-bold text-slate-900 dark:text-slate-100 text-sm">{insuranceObj?.name || 'Keine Angabe'}</p>
            <p class="text-slate-600 dark:text-slate-400 font-mono text-[11px]">Vers.-Nr: {client.insurance_nr || '-'}</p>
        </div>

        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Direkter Klientenkontakt</span>
            {#if client.phone || client.handy}
                <a href="tel:{client.phone || client.handy}" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    <Phone class="w-3 h-3" /> {client.phone || client.handy}
                </a>
            {:else}
                <p class="text-slate-400 italic">Keine Rufnummer</p>
            {/if}
            {#if client.email}
                <a href="mailto:{client.email}" class="text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1 truncate">
                    <Mail class="w-3 h-3 text-slate-400" /> {client.email}
                </a>
            {/if}
        </div>
    </div>
</div>
