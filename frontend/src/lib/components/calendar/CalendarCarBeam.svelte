<script lang="ts">
    import { getCarBookingLabel, getCarBookingTimes, isAppointmentOwner } from './calendarUtils';

    interface Props {
        carBookings: any[];
        currentUser?: any;
        isSuperAdmin?: boolean;
        onOpenDetail?: (id: string) => void;
        onOpenGoogleDetail?: (event: any) => void;
    }

    let { carBookings, currentUser = null, isSuperAdmin = false, onOpenDetail, onOpenGoogleDetail }: Props = $props();
</script>

<div class="flex flex-col gap-2 shrink-0 py-0.5" aria-label="Fahrzeugbuchung Strahl">
    {#each carBookings as carApp (carApp.id || carApp.appointment)}
        {@const times = getCarBookingTimes(carApp)}
        {@const isOwner = isAppointmentOwner(carApp, currentUser?.id) || isSuperAdmin}
        {@const label = isOwner ? getCarBookingLabel(carApp) : 'BELEGT'}
        <button
            type="button"
            disabled={!isOwner}
            onclick={isOwner ? () => carApp.is_google ? onOpenGoogleDetail?.(carApp) : onOpenDetail?.(carApp.id) : undefined}
            class="group relative flex flex-col items-center justify-between w-11 py-2.5 px-0.5 rounded-2xl transition-all shadow-xs flex-1 min-h-[140px] {isOwner 
                ? 'cursor-pointer bg-gradient-to-b from-rose-500/10 via-red-500/5 to-rose-500/10 dark:from-rose-950/40 dark:via-red-950/30 dark:to-rose-950/40 border border-rose-200/90 dark:border-rose-800/80 hover:border-rose-400 dark:hover:border-rose-500 hover:shadow-md text-rose-700 dark:text-rose-300' 
                : 'opacity-40 pointer-events-none cursor-default bg-neutral-200/40 dark:bg-slate-800/40 border border-dashed border-neutral-300 dark:border-slate-700 text-neutral-600 dark:text-neutral-400'}"
            title={isOwner ? `${carApp.description || carApp.title || 'Fahrzeugbuchung'}: ${times.full} (Klicken für Details)` : `Fahrzeug reserviert: ${times.full}`}
        >
            <!-- Oberer Anker: Auto-Icon & Startzeit -->
            <div class="flex flex-col items-center gap-0.5 shrink-0">
                <div class="w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-xs transition-all {isOwner ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white group-hover:scale-110 group-hover:shadow-rose-500/30' : 'bg-neutral-400 dark:bg-slate-600 text-white'}">
                    🚗
                </div>
                {#if times.start}
                    <span class="text-[9px] sm:text-[10px] font-black tracking-tight mt-1 leading-none font-mono {isOwner ? 'text-rose-900 dark:text-rose-100' : 'text-neutral-700 dark:text-neutral-300'}">
                        {times.start}
                    </span>
                {/if}
            </div>

            <!-- Mittelteil: Der leuchtende vertikale Strahl mit vertikalem Label -->
            <div class="flex-1 my-2 flex flex-col items-center justify-center relative w-full min-h-[50px]">
                <div class="w-1.5 h-full rounded-full transition-all {isOwner ? 'bg-gradient-to-b from-rose-500 via-red-500 to-rose-600 dark:from-rose-400 dark:via-red-500 dark:to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)] group-hover:w-2' : 'bg-neutral-400 dark:bg-slate-600'}"></div>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span class="[writing-mode:vertical-rl] rotate-180 text-[8px] sm:text-[9px] font-black uppercase tracking-widest select-none py-1 px-0.5 rounded backdrop-blur-2xs {isOwner ? 'text-rose-700 dark:text-rose-300 bg-white/70 dark:bg-slate-900/70' : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100/80 dark:bg-slate-800/80'}">
                        {label}
                    </span>
                </div>
            </div>

            <!-- Unterer Anker: Endzeit -->
            {#if times.end}
                <div class="shrink-0 flex flex-col items-center">
                    <span class="text-[9px] sm:text-[10px] font-black tracking-tight leading-none font-mono {isOwner ? 'text-rose-900 dark:text-rose-100' : 'text-neutral-700 dark:text-neutral-300'}">
                        {times.end}
                    </span>
                </div>
            {/if}
        </button>
    {/each}
</div>
