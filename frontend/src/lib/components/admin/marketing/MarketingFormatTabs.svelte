<script lang="ts">
    import type { MarketingFormat } from './marketingDefaults';

    interface Props {
        activeFormat: MarketingFormat;
        onSelectFormat: (fmt: MarketingFormat) => void;
    }

    let { activeFormat, onSelectFormat }: Props = $props();

    const FORMATS = [
        { key: 'poster' as MarketingFormat, label: '🪧 Aushang / Plakat', desc: 'DIN A4 Praxis-Aushang' },
        { key: 'flyer' as MarketingFormat, label: '📄 6-Seiter Flyer', desc: 'Wickelfalz DIN Lang' },
        { key: 'social_sheet' as MarketingFormat, label: '📱 Social-Media Sheet', desc: 'Post-Vorlagen & Hooks' },
        { key: 'insert' as MarketingFormat, label: '📬 Beileger / Postkarte', desc: 'DIN A6 Übergabekarte' },
        { key: 'factsheet' as MarketingFormat, label: '📋 Infoblatt Kassen', desc: 'DIN A4 Entlastungsbetrag' },
        { key: 'voucher' as MarketingFormat, label: '🎟️ Gutschein-Karte', desc: 'Kennenlern-Angebot' }
    ];
</script>

<div class="print:hidden flex gap-2 overflow-x-auto pb-2 border-b border-neutral-200 custom-scrollbar">
    {#each FORMATS as fmt}
        <button 
            type="button"
            onclick={() => onSelectFormat(fmt.key)}
            class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex flex-col items-start min-h-[44px] cursor-pointer touch-manipulation active:scale-95
            {activeFormat === fmt.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
        >
            <span>{fmt.label}</span>
            <span class="text-[10px] font-normal opacity-80">{fmt.desc}</span>
        </button>
    {/each}
</div>
