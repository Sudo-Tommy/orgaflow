<script lang="ts">
    import { fade, scale } from 'svelte/transition';

    let isOpen = $state(false);
    let eventData = $state<any>(null);

    export function open(event: any) {
        eventData = event;
        isOpen = true;
    }

    export function close() {
        isOpen = false;
        eventData = null;
    }

    function formatDate(dateStr?: string) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }

    function formatTime(dateStr?: string) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
</script>

{#if isOpen && eventData}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 150 }}
        onclick={close}
    >
        <!-- Modal Card -->
        <div 
            class="bg-white rounded-3xl shadow-2xl border border-neutral-100 max-w-lg w-full overflow-hidden"
            transition:scale={{ start: 0.95, duration: 150 }}
            onclick={(e) => e.stopPropagation()}
        >
            <!-- Header -->
            <div class="p-6 bg-gradient-to-r from-blue-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 flex items-start justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 text-lg">
                        🗓️
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                                Google Kalender
                            </span>
                            <span class="text-[10px] font-semibold text-neutral-400">
                                Nur-Lese-Ansicht
                            </span>
                        </div>
                        <h3 class="text-lg font-bold text-neutral-900 mt-1 line-clamp-2">
                            {eventData.description || eventData.title || 'Privater Termin'}
                        </h3>
                    </div>
                </div>
                <button 
                    onclick={close}
                    class="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition-colors text-sm"
                    title="Schließen"
                >
                    ✕
                </button>
            </div>

            <!-- Content Body -->
            <div class="p-6 space-y-4">
                <!-- Datum & Zeit -->
                <div class="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <span class="text-xl">⏰</span>
                    <div class="text-xs">
                        <p class="font-bold text-neutral-800">
                            {formatDate(eventData.appointment)}
                        </p>
                        <p class="text-neutral-500 mt-0.5 font-medium">
                            {#if eventData.expand?.time_record?.[0]}
                                {formatTime(eventData.expand.time_record[0].start)} – {formatTime(eventData.expand.time_record[0].end)} Uhr
                            {:else}
                                Ganztägig / Zeitspanne
                            {/if}
                        </p>
                    </div>
                </div>

                <!-- Ort -->
                {#if eventData.location_address}
                    <div class="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <span class="text-xl">📍</span>
                        <div class="text-xs flex-1">
                            <p class="font-bold text-neutral-800">Ort</p>
                            <p class="text-neutral-600 mt-0.5 leading-relaxed">{eventData.location_address}</p>
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventData.location_address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-1.5"
                            >
                                In Google Maps öffnen ↗
                            </a>
                        </div>
                    </div>
                {/if}

                <!-- Beschreibung / Notizen -->
                {#if eventData.notes}
                    <div class="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <span class="text-xl">📝</span>
                        <div class="text-xs flex-1">
                            <p class="font-bold text-neutral-800">Beschreibung</p>
                            <p class="text-neutral-600 mt-0.5 whitespace-pre-wrap leading-relaxed">{eventData.notes}</p>
                        </div>
                    </div>
                {/if}

                <div class="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                    <span>ℹ️</span>
                    <span>Dieser Termin stammt aus Ihrem persönlichen Google Kalender und dient zur Kollisions- und Terminübersicht.</span>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3">
                <button 
                    type="button" 
                    onclick={close}
                    class="orga-button-ghost py-2.5 px-4 text-xs"
                >
                    Schließen
                </button>

                {#if eventData.htmlLink}
                    <a 
                        href={eventData.htmlLink}
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="orga-button-primary py-2.5 px-4 text-xs flex items-center gap-1.5 shadow-sm"
                    >
                        <span>In Google Kalender öffnen</span>
                        <span>↗</span>
                    </a>
                {/if}
            </div>
        </div>
    </div>
{/if}
