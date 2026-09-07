<script lang="ts">
    import { Clock, MapPin, ArrowRight, Calendar } from "lucide-svelte";
    import type { NextAppointmentProps } from "$lib/types/appointment";

    let {
        appointment,
        clientName = '',
        userType = 'client',
        onSelectDetails,
        onRequestAppointment
    }: NextAppointmentProps = $props();

    // Intelligente Bereinigung redundanter Namensnennungen im Titel & Ort
    const cleanDescription = $derived.by(() => {
        const raw = appointment?.description || 'Betreuungstermin';
        if (!clientName || clientName.length < 3) return raw;

        const escapedName = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameWithoutSalutation = clientName.replace(/^(Frau|Herr|Divers)\s+/i, '').trim();
        const escapedNameNoSal = nameWithoutSalutation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let cleaned = raw;
        // Ersetze Phrasen wie "bei/mit/für [Name]"
        cleaned = cleaned.replace(new RegExp(`\\b(bei|mit|für)\\s+(${escapedName}|${escapedNameNoSal})\\b`, 'gi'), '');
        // Ersetze reines Vorkommen des Namens
        cleaned = cleaned.replace(new RegExp(`\\b(${escapedName}|${escapedNameNoSal})\\b`, 'gi'), '');
        // Bereinige verwaiste Satzzeichen & Trenner
        cleaned = cleaned.replace(/^[\s\-:–—,]+|[\s\-:–—,]+$/g, '').trim();

        return cleaned || 'Betreuungstermin';
    });

    const cleanLocation = $derived.by(() => {
        let loc = '';
        if (appointment?.expand?.appointment_at?.[0]) {
            const at = appointment.expand.appointment_at[0];
            loc = `${at.company_name || ''} ${at.name_first || ''} ${at.name_last || ''}`.trim();
        } else if (appointment?.location_address) {
            loc = appointment.location_address;
        }
        if (!loc) return '';
        if (!clientName || clientName.length < 3) return loc;

        const escapedName = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameWithoutSalutation = clientName.replace(/^(Frau|Herr|Divers)\s+/i, '').trim();
        const escapedNameNoSal = nameWithoutSalutation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let cleaned = loc;
        cleaned = cleaned.replace(new RegExp(`\\b(bei|mit|für)\\s+(${escapedName}|${escapedNameNoSal})\\b`, 'gi'), '');
        cleaned = cleaned.replace(new RegExp(`\\b(${escapedName}|${escapedNameNoSal})\\b`, 'gi'), '');
        cleaned = cleaned.replace(/^[\s,:\-–—]+|[\s,:\-–—]+$/g, '').trim();

        return cleaned || loc;
    });

    const appointmentDate = $derived(appointment?.appointment ? new Date(appointment.appointment) : null);
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col group hover:shadow-2xl hover:border-brand-200 dark:hover:border-brand-500/40 transition-all">
    <!-- Kontext-Header: Exakt einmalige, klare Zuordnung -->
    <div class="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/75 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm"></div>
            <h2 class="text-xs font-black text-neutral-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                {#if userType === 'client'}
                    <span>Ihr nächster Termin</span>
                {:else if clientName}
                    <span>Nächster Termin:</span>
                    <span class="text-brand-600 dark:text-brand-400 font-extrabold normal-case tracking-normal">{clientName}</span>
                {:else}
                    <span>Nächster Termin</span>
                {/if}
            </h2>
        </div>
    </div>
    
    {#if appointment && appointmentDate}
        <!-- Termin-Inhalt (Bereinigt von doppelten Namens-Badges) -->
        <div class="p-6 md:p-8 flex flex-col sm:flex-row gap-6 sm:items-center">
            <!-- Kalender-Block -->
            <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex flex-col items-center justify-center shadow-inner border border-brand-100 dark:border-brand-900/50 shrink-0 group-hover:scale-105 transition-transform select-none">
                <span class="text-4xl sm:text-5xl font-black leading-none">{appointmentDate.getDate()}</span>
                <span class="text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1">{appointmentDate.toLocaleDateString('de-DE', { month: 'short' })}</span>
            </div>

            <!-- Termin-Metadaten -->
            <div class="flex-1 min-w-0">
                <h3 class="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mb-3 leading-tight truncate" title={cleanDescription}>
                    {cleanDescription}
                </h3>
                <div class="space-y-2.5">
                    <p class="text-sm font-semibold text-neutral-600 dark:text-slate-300 flex items-center gap-3">
                        <Clock class="w-4 h-4 text-brand-500 shrink-0" />
                        <span>{appointmentDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                    </p>
                    {#if cleanLocation}
                        <p class="text-sm font-semibold text-neutral-600 dark:text-slate-300 flex items-start gap-3">
                            <MapPin class="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                            <span class="line-clamp-2 leading-snug">{cleanLocation}</span>
                        </p>
                    {/if}
                </div>
            </div>

            <!-- Interaktion: Details mit barrierefreier Touch-Fläche (min 44px) -->
            <div class="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                <button 
                    type="button"
                    onclick={() => onSelectDetails?.(appointment)} 
                    class="w-full sm:w-auto bg-brand-50 dark:bg-slate-800 hover:bg-brand-100 dark:hover:bg-slate-700 text-brand-700 dark:text-brand-300 font-bold px-8 min-h-[48px] rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2.5 shadow-sm border border-brand-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none cursor-pointer"
                    aria-label="Details zum nächsten Termin ansehen"
                >
                    <span>Details</span>
                    <ArrowRight class="w-4 h-4" />
                </button>
            </div>
        </div>
    {:else}
        <!-- Empty State -->
        <div class="p-12 text-center flex flex-col items-center">
            <div class="w-16 h-16 bg-neutral-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-inner">🍃</div>
            <p class="text-xl font-bold text-neutral-900 dark:text-white mb-2">Keine anstehenden Termine</p>
            <p class="text-sm text-neutral-500 dark:text-slate-400 max-w-sm">Es sind aktuell keine zukünftigen Termine für {userType === 'client' ? 'Sie' : 'Ihre Klienten'} geplant.</p>
            {#if onRequestAppointment}
                <button 
                    type="button"
                    onclick={onRequestAppointment} 
                    class="mt-8 orga-button-primary bg-neutral-900 dark:bg-brand-600 hover:bg-neutral-800 dark:hover:bg-brand-700 shadow-neutral-900/20 min-h-[48px] px-10 cursor-pointer"
                >
                    Neuen Termin anfragen
                </button>
            {/if}
        </div>
    {/if}
</div>
