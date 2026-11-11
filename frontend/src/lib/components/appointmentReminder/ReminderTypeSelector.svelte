<script lang="ts">
    import type { AppointmentMessageType } from "./multiAppointmentReminderHelper";
    import { Bell, Info, RefreshCw, FileText } from "lucide-svelte";

    interface Props {
        activeType: AppointmentMessageType;
        onSelectType: (type: AppointmentMessageType) => void;
        disabled?: boolean;
    }

    let { activeType, onSelectType, disabled = false }: Props = $props();

    interface TypeOption {
        id: AppointmentMessageType;
        label: string;
        subline: string;
        icon: typeof Bell;
        activeClasses: string;
    }

    const options: TypeOption[] = [
        {
            id: 'reminder',
            label: 'Erinnerung',
            subline: 'Vorab mit Ankunftszeit',
            icon: Bell,
            activeClasses: 'bg-violet-600 text-white shadow-md shadow-violet-600/20 border-violet-600'
        },
        {
            id: 'info',
            label: 'Termin-Info',
            subline: 'Normale Nachricht',
            icon: Info,
            activeClasses: 'bg-sky-600 text-white shadow-md shadow-sky-600/20 border-sky-600'
        },
        {
            id: 'change',
            label: 'Terminänderung',
            subline: 'Verschiebung / Update',
            icon: RefreshCw,
            activeClasses: 'bg-amber-600 text-white shadow-md shadow-amber-600/20 border-amber-600'
        },
        {
            id: 'report',
            label: 'Besuchsbericht',
            subline: 'Für Betreuer & Angehörige',
            icon: FileText,
            activeClasses: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 border-emerald-600'
        }
    ];
</script>

<div class="space-y-1.5">
    <div class="flex items-center justify-between">
        <span class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Nachrichten-Anlass wählen
        </span>
        <span class="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            Vorlage passt sich an
        </span>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-neutral-100 dark:bg-slate-800/80 rounded-2xl border border-neutral-200/80 dark:border-slate-700">
        {#each options as opt}
            {@const isActive = activeType === opt.id}
            {@const IconComponent = opt.icon}
            <button
                type="button"
                onclick={() => onSelectType(opt.id)}
                {disabled}
                class="group p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[58px] {isActive ? opt.activeClasses : 'bg-white dark:bg-slate-800/60 border-neutral-200/70 dark:border-slate-700/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-slate-700/50'}"
            >
                <div class="flex items-center gap-1.5">
                    <IconComponent class="w-3.5 h-3.5 {isActive ? 'text-white' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-brand-600 dark:group-hover:text-brand-400'}" />
                    <span class="text-xs font-bold truncate leading-tight">{opt.label}</span>
                </div>
                <span class="text-[10px] leading-tight truncate mt-1 opacity-80 {isActive ? 'text-white/90' : 'text-neutral-400 dark:text-neutral-500'}">
                    {opt.subline}
                </span>
            </button>
        {/each}
    </div>
</div>
