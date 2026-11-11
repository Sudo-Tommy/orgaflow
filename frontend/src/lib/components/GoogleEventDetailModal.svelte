<script lang="ts">
    let dialog: HTMLDialogElement;
    let isOpen = $state(false);
    let eventData = $state<any>(null);

    export function open(event: any) {
        eventData = event;
        isOpen = true;
        dialog?.showModal();
    }

    export function close() {
        isOpen = false;
        eventData = null;
        dialog?.close();
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

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    {#if isOpen && eventData}
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors my-auto animate-enter">
            <!-- Header -->
            <div class="p-6 bg-gradient-to-r from-blue-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 text-lg">
                        🗓️
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                                Google Kalender
                            </span>
                            <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400">
                                Nur-Lese-Ansicht
                            </span>
                        </div>
                        <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                            {eventData.description || 'Google Kalender Termin'}
                        </h3>
                    </div>
                </div>

                <button 
                    type="button" 
                    onclick={close}
                    class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Schließen"
                >
                    ✕
                </button>
            </div>

            <!-- Details Body -->
            <div class="p-6 space-y-4">
                <!-- Datum & Zeit -->
                <div class="flex items-center gap-3 p-3.5 bg-neutral-50 dark:bg-slate-800/60 rounded-2xl border border-neutral-100 dark:border-slate-700/60">
                    <span class="text-xl">⏰</span>
                    <div class="text-xs">
                        <p class="font-bold text-neutral-900 dark:text-white">
                            {formatDate(eventData.appointment)}
                        </p>
                        <p class="text-neutral-500 dark:text-slate-400 mt-0.5">
                            {formatTime(eventData.appointment)}
                            {#if eventData.expand?.time_record?.[0]?.end}
                                – {formatTime(eventData.expand.time_record[0].end)}
                            {/if}
                            Uhr
                        </p>
                    </div>
                </div>

                <!-- Ort / Adresse -->
                {#if eventData.location_address}
                    <div class="flex items-start gap-3 p-3.5 bg-neutral-50 dark:bg-slate-800/60 rounded-2xl border border-neutral-100 dark:border-slate-700/60">
                        <span class="text-xl">📍</span>
                        <div class="text-xs flex-1">
                            <p class="font-bold text-neutral-900 dark:text-white">Ort / Adresse</p>
                            <p class="text-neutral-600 dark:text-slate-300 mt-0.5">{eventData.location_address}</p>
                            <a 
                                href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(eventData.location_address)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
                            >
                                <span>In Maps öffnen</span>
                                <span>↗</span>
                            </a>
                        </div>
                    </div>
                {/if}

                <!-- Notizen / Beschreibung -->
                {#if eventData.notes}
                    <div class="p-3.5 bg-neutral-50 dark:bg-slate-800/60 rounded-2xl border border-neutral-100 dark:border-slate-700/60 text-xs">
                        <p class="font-bold text-neutral-900 dark:text-white mb-1">Beschreibung</p>
                        <p class="text-neutral-600 dark:text-slate-300 whitespace-pre-wrap">{eventData.notes}</p>
                    </div>
                {/if}

                <!-- Mitarbeiter (falls verknüpfter Kalender) -->
                {#if eventData.expand?.user}
                    <div class="flex items-start gap-3 p-3.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                        <span class="text-xl">👤</span>
                        <div class="text-xs flex-1">
                            <p class="font-bold text-blue-900 dark:text-blue-200">Mitarbeiter-Kalender</p>
                            <p class="text-blue-700 dark:text-blue-300 mt-0.5 font-medium">{eventData.expand.user.name_first} {eventData.expand.user.name_last || ''} ({eventData.expand.user.email})</p>
                        </div>
                    </div>
                {/if}

                <div class="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <span>ℹ️</span>
                    <span>{eventData.expand?.user ? `Dieser Termin stammt aus dem verknüpften Google Kalender von ${eventData.expand.user.name_first || 'einem Mitarbeiter'}.` : 'Dieser Termin stammt aus Ihrem persönlichen Google Kalender und dient zur Kollisions- und Terminübersicht.'}</span>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button 
                    type="button" 
                    onclick={close}
                    class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                    Schließen
                </button>

                {#if eventData.htmlLink}
                    <a 
                        href={eventData.htmlLink}
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="orga-button-primary py-2.5 px-4 text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                        <span>In Google Kalender öffnen</span>
                        <span>↗</span>
                    </a>
                {/if}
            </div>
        </div>
    {/if}
</dialog>
