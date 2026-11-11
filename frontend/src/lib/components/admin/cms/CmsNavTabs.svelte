<script lang="ts">
    import { landingCmsStore, type CmsData } from '$lib/services/landingCmsStore.svelte';

    interface Props {
        activeSection: keyof CmsData;
        onSelect: (key: keyof CmsData) => void;
    }

    let { activeSection, onSelect }: Props = $props();

    const tabs: Array<{ key: keyof CmsData; label: string; desc: string }> = [
        { key: 'hero', label: '🚀 Hero & Start', desc: 'Überschrift, Buttons & Vertrauen' },
        { key: 'services', label: '🛠️ Leistungen', desc: 'Dynamische Leistungsbausteine' },
        { key: 'process', label: '👣 Unser Weg', desc: 'Ablauf & Schritte' },
        { key: 'team', label: '👥 Team & Standorte', desc: 'Mitarbeiterprofile & Fotos' },
        { key: 'cooperation', label: '💶 Kassen & Kooperation', desc: '§45b, Kassen & Szenarien' },
        { key: 'quality', label: '🛡️ Qualität & Schutz', desc: 'Vertrauensmerkmale' },
        { key: 'faq', label: '❓ FAQ', desc: 'Häufige Fragen & Antworten' },
        { key: 'appointment', label: '📅 Terminanfrage', desc: 'Aufforderung zur Kontaktaufnahme' },
        { key: 'contact', label: '📞 Kontakt & Zeiten', desc: 'Zentrale, Standorte & Zeiten' }
    ];
</script>

<div class="flex flex-wrap gap-2 pb-2 border-b border-neutral-200 dark:border-slate-800">
    {#each tabs as tab}
        {@const isAct = landingCmsStore.meta[tab.key]?.is_active ?? true}
        <button 
            type="button"
            onclick={() => onSelect(tab.key)}
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex flex-col items-start relative min-h-[46px] cursor-pointer
            {activeSection === tab.key 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'bg-white dark:bg-slate-900 text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 border border-neutral-200 dark:border-slate-800'}"
        >
            <div class="flex items-center gap-1.5 w-full">
                <span>{tab.label}</span>
                {#if !isAct}
                    <span class="w-2 h-2 rounded-full bg-rose-400 shrink-0" title="Sektion auf Website deaktiviert"></span>
                {:else}
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Aktiv"></span>
                {/if}
            </div>
            <span class="text-[10px] font-normal opacity-75">{tab.desc}</span>
        </button>
    {/each}
</div>
