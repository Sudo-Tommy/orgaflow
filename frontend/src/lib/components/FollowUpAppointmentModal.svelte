<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    // Ausgangs-Termin & Klient
    let sourceAppointment = $state<any>(null);
    let selectedClient = $state<any>(null);

    // Formular-State
    let targetDate = $state(""); // YYYY-MM-DD
    let startTime = $state("09:00"); // HH:mm
    let durationMinutes = $state(90); // 90 min (1.5h Standard)
    let locationAddress = $state("");
    let internalNotes = $state("");
    let selectedTasks = $state<string[]>([]);
    let selectedUserId = $state("");

    // Berechnete Endzeit
    let endTime = $derived.by(() => {
        if (!startTime) return "10:30";
        const [h, m] = startTime.split(":").map(Number);
        const totalMinutes = h * 60 + m + durationMinutes;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
    });

    // Kollisionsprüfung mit bestehenden Terminen
    let collisionWarning = $derived.by(() => {
        if (!targetDate || !startTime || !endTime || !orgaStore.appointments?.data) return null;
        const proposedStart = new Date(`${targetDate}T${startTime}:00`).getTime();
        const proposedEnd = new Date(`${targetDate}T${endTime}:00`).getTime();

        const conflicts = orgaStore.appointments.data.filter((app: any) => {
            if (!app.appointment) return false;
            // Nur Termine desselben Mitarbeiters prüfen
            const appUser = Array.isArray(app.user) ? app.user[0] : app.user;
            if (selectedUserId && appUser && appUser !== selectedUserId) return false;

            const timeRecords = app.expand?.time_record || [];
            if (timeRecords.length > 0) {
                return timeRecords.some((tr: any) => {
                    if (!tr.start || !tr.end) return false;
                    const trStart = new Date(tr.start).getTime();
                    const trEnd = new Date(tr.end).getTime();
                    return proposedStart < trEnd && proposedEnd > trStart;
                });
            } else {
                const appStart = new Date(app.appointment).getTime();
                const appEnd = appStart + 90 * 60 * 1000;
                return proposedStart < appEnd && proposedEnd > appStart;
            }
        });

        if (conflicts.length > 0) {
            const conflict = conflicts[0];
            const timeStr = conflict.appointment ? new Date(conflict.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
            return `Kollision: Es existiert bereits ein Termin um ${timeStr} Uhr (${conflict.description || 'Belegt'}).`;
        }
        return null;
    });

    function getLocalDateString(date: Date) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    export function open(sourceApp: any) {
        const myUserId = pb.authStore.model?.id;
        const isAdmin = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin';
        
        if (sourceApp) {
            const isMyApp = sourceApp.user === myUserId || (Array.isArray(sourceApp.user) && sourceApp.user.includes(myUserId));
            if (!isMyApp && !isAdmin) {
                toastStore.error("Ein schneller Folgetermin kann nur für eigene Termine oder durch Administratoren vereinbart werden.");
                return;
            }
        }

        sourceAppointment = sourceApp;
        errorMsg = "";
        
        // Klient ermitteln
        const clientId = Array.isArray(sourceApp?.client) ? sourceApp.client[0] : sourceApp?.client;
        selectedClient = orgaStore.clients?.data?.find((c: any) => c.id === clientId) || sourceApp?.expand?.client;

        // Adresse vorbefüllen
        locationAddress = sourceApp?.location_address || 
            (selectedClient?.street ? `${selectedClient.street} ${selectedClient.housenr || ''}, ${selectedClient.zip || ''} ${selectedClient.city || ''}`.trim() : "");

        // Mitarbeiter: Zugewiesener Mitarbeiter des Termins oder eingeloggter User
        const assignedUser = Array.isArray(sourceApp?.user) ? sourceApp.user[0] : sourceApp?.user;
        selectedUserId = assignedUser || myUserId || "";

        // Aufgaben vorbefüllen
        selectedTasks = sourceApp?.tasks || [];

        // Standard: In 1 Woche zur gleichen Startzeit
        let baseDate = sourceApp?.appointment ? new Date(sourceApp.appointment) : new Date();
        if (isNaN(baseDate.getTime())) baseDate = new Date();

        const defaultNextWeek = new Date(baseDate);
        defaultNextWeek.setDate(defaultNextWeek.getDate() + 7);
        targetDate = getLocalDateString(defaultNextWeek);

        // Startzeit aus Zeitaufzeichnung oder Termin übernehmen
        const firstTr = sourceApp?.expand?.time_record?.[0];
        if (firstTr?.start) {
            const s = new Date(firstTr.start);
            startTime = `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
            if (firstTr.end) {
                const diffMin = Math.round((new Date(firstTr.end).getTime() - s.getTime()) / 60000);
                if (diffMin > 0) durationMinutes = diffMin;
            }
        } else if (sourceApp?.appointment) {
            const s = new Date(sourceApp.appointment);
            startTime = `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
        }

        internalNotes = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    // Schnellauswahl Wochentag / Rhythmus
    function applyRhythm(daysOffset: number) {
        let base = sourceAppointment?.appointment ? new Date(sourceAppointment.appointment) : new Date();
        if (isNaN(base.getTime())) base = new Date();
        
        const next = new Date(base);
        next.setDate(next.getDate() + daysOffset);
        targetDate = getLocalDateString(next);
    }

    // Schnellauswahl Zeitfenster
    function applyTimeSlot(slotTime: string, duration?: number) {
        startTime = slotTime;
        if (duration) durationMinutes = duration;
    }

    // Schnellauswahl Dauer
    function applyDuration(minutes: number) {
        durationMinutes = minutes;
    }

    async function handleSave() {
        if (!targetDate || !startTime) {
            errorMsg = "Bitte Datum und Uhrzeit wählen.";
            return;
        }
        if (!selectedClient?.id && !sourceAppointment?.client) {
            errorMsg = "Kein Klient zugeordnet.";
            return;
        }

        isLoading = true;
        errorMsg = "";

        try {
            const startDateTime = new Date(`${targetDate}T${startTime}:00`);
            const endDateTime = new Date(`${targetDate}T${endTime}:00`);
            const clientId = selectedClient?.id || (Array.isArray(sourceAppointment.client) ? sourceAppointment.client[0] : sourceAppointment.client);
            const clientName = selectedClient ? `${selectedClient.name_first} ${selectedClient.name_last}` : 'Klient';

            // 1. Termin erstellen
            const newAppointment = await pb.collection('appointments').create({
                appointment: startDateTime.toISOString(),
                description: `Folgetermin: ${clientName}`,
                client: [clientId],
                user: selectedUserId ? [selectedUserId] : [],
                location_address: locationAddress,
                internal_notes: internalNotes,
                tasks: selectedTasks,
                is_private: false,
                settled: false,
                status: 'confirmed'
            });

            // 2. Zeitaufzeichnung erstellen
            try {
                const tr = await pb.collection('time_records').create({
                    start: startDateTime.toISOString(),
                    end: endDateTime.toISOString(),
                    appointment: newAppointment.id
                });
                await pb.collection('appointments').update(newAppointment.id, {
                    time_record: [tr.id]
                });
            } catch (trErr) {
                console.warn("[FollowUp] Zeitaufzeichnung konnte nicht direkt erstellt werden:", trErr);
            }

            // 3. Store aktualisieren
            const expandedRecord = await pb.collection('appointments').getOne(newAppointment.id, {
                expand: 'client,user,time_record,drive_record,tasks',
                requestKey: null
            });
            if (orgaStore.appointments?.data) {
                orgaStore.appointments.data.unshift(expandedRecord as any);
            }

            if (navigator.vibrate) navigator.vibrate(50);
            toastStore.success(`Folgetermin für ${clientName} am ${new Date(targetDate).toLocaleDateString('de-DE')} um ${startTime} Uhr erfolgreich gebucht!`);
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Erstellen des Folgetermins.";
            toastStore.error(errorMsg);
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-lg m-0 sm:m-auto fixed sm:relative inset-x-0 bottom-0 sm:bottom-auto max-h-[94dvh] rounded-t-3xl sm:rounded-3xl border-none shadow-2xl z-9999 touch-pan-y"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <!-- Mobile Drag Handle -->
    <div class="pt-3 pb-1 sm:hidden flex justify-center shrink-0">
        <div class="w-12 h-1.5 bg-neutral-300 rounded-full"></div>
    </div>

    <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full flex flex-col max-h-[94dvh] overflow-hidden">
        
        <!-- Header -->
        <div class="px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-xl">⚡</span>
                    <h2 class="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">Schneller Folgetermin</h2>
                </div>
                {#if selectedClient}
                    <p class="text-xs text-neutral-500 mt-0.5">
                        Für <strong class="text-neutral-800">{selectedClient.name_first} {selectedClient.name_last}</strong>
                    </p>
                {/if}
            </div>
            <button 
                type="button" 
                onclick={close} 
                class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors text-sm font-bold shrink-0"
                aria-label="Schließen"
            >
                ✕
            </button>
        </div>

        <!-- Body -->
        <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
            
            {#if errorMsg}
                <div class="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                    {errorMsg}
                </div>
            {/if}

            {#if collisionWarning}
                <div class="p-3 bg-amber-50 text-amber-800 text-xs font-medium rounded-xl border border-amber-200 flex items-start gap-2">
                    <span class="text-base leading-none">⚠️</span>
                    <span>{collisionWarning}</span>
                </div>
            {/if}

            <!-- 1. Schnellauswahl Rhythmus (1-Tap Chips) -->
            <div>
                <span class="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    1. Rhythmus / Datum wählen
                </span>
                <div class="grid grid-cols-3 gap-2 mb-3">
                    <button 
                        type="button" 
                        onclick={() => applyRhythm(7)}
                        class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs min-h-[44px]
                        {targetDate && sourceAppointment?.appointment && Math.round((new Date(targetDate).getTime() - new Date(sourceAppointment.appointment).getTime()) / 86400000) === 7 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'}"
                    >
                        <span>+1 Woche</span>
                        <span class="text-[10px] font-normal opacity-80">Gleicher Tag</span>
                    </button>
                    <button 
                        type="button" 
                        onclick={() => applyRhythm(14)}
                        class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs min-h-[44px]
                        {targetDate && sourceAppointment?.appointment && Math.round((new Date(targetDate).getTime() - new Date(sourceAppointment.appointment).getTime()) / 86400000) === 14 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'}"
                    >
                        <span>+2 Wochen</span>
                        <span class="text-[10px] font-normal opacity-80">14 Tage</span>
                    </button>
                    <button 
                        type="button" 
                        onclick={() => applyRhythm(7)}
                        class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs min-h-[44px]
                        {targetDate && sourceAppointment?.appointment && Math.round((new Date(targetDate).getTime() - new Date(sourceAppointment.appointment).getTime()) / 86400000) === 7 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'}"
                    >
                        <span>Wochentag</span>
                        <span class="text-[10px] font-normal opacity-80">Gleiche Zeit</span>
                    </button>
                    <button 
                        type="button" 
                        onclick={() => applyRhythm(21)}
                        class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs min-h-[44px]
                        {targetDate && sourceAppointment?.appointment && Math.round((new Date(targetDate).getTime() - new Date(sourceAppointment.appointment).getTime()) / 86400000) === 21 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'}"
                    >
                        <span>+3 Wochen</span>
                        <span class="text-[10px] font-normal opacity-80">21 Tage</span>
                    </button>
                    <button 
                        type="button" 
                        onclick={() => applyRhythm(1)}
                        class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs min-h-[44px]
                        {targetDate && sourceAppointment?.appointment && Math.round((new Date(targetDate).getTime() - new Date(sourceAppointment.appointment).getTime()) / 86400000) === 1 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'}"
                    >
                        <span>Morgen</span>
                        <span class="text-[10px] font-normal opacity-80">+1 Tag</span>
                    </button>
                    <button 
                        type="button" 
                        onclick={() => applyRhythm(2)}
                        class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs min-h-[44px]
                        {targetDate && sourceAppointment?.appointment && Math.round((new Date(targetDate).getTime() - new Date(sourceAppointment.appointment).getTime()) / 86400000) === 2 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'}"
                    >
                        <span>In 2 Tagen</span>
                        <span class="text-[10px] font-normal opacity-80">+2 Tage</span>
                    </button>
                </div>
                <div class="flex items-center gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200 min-h-[44px]">
                    <span class="text-sm">📅</span>
                    <input 
                        type="date" 
                        aria-label="Folgetermin Datum"
                        bind:value={targetDate} 
                        class="bg-transparent text-sm font-bold text-neutral-900 w-full outline-none"
                    />
                </div>
            </div>

            <!-- 2. Startzeit & Zeitfenster -->
            <div>
                <span class="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    2. Zeitfenster & Dauer
                </span>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    <button 
                        type="button" 
                        onclick={() => applyTimeSlot("09:00", 180)}
                        class="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 min-h-[44px] {startTime === '09:00' && durationMinutes === 180 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}"
                    >
                        Vormittags (09-12)
                    </button>
                    <button 
                        type="button" 
                        onclick={() => applyTimeSlot("14:00", 180)}
                        class="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 min-h-[44px] {startTime === '14:00' && durationMinutes === 180 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}"
                    >
                        Nachmittags (14-17)
                    </button>
                    <button 
                        type="button" 
                        onclick={() => applyTimeSlot("11:00", 90)}
                        class="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 min-h-[44px] col-span-2 sm:col-span-1 {startTime === '11:00' && durationMinutes === 90 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}"
                    >
                        Mittags (11-12:30)
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <span class="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Startzeit</span>
                        <input 
                            type="time" 
                            aria-label="Startzeit"
                            bind:value={startTime} 
                            class="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 min-h-[44px]"
                        />
                    </div>
                    <div>
                        <span class="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Berechnetes Ende</span>
                        <div class="p-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-600 flex items-center justify-between min-h-[44px]">
                            <span>{endTime} Uhr</span>
                            <span class="text-xs font-normal text-neutral-400">({durationMinutes / 60} Std.)</span>
                        </div>
                    </div>
                </div>

                <!-- Schnellauswahl Dauer -->
                <div class="flex items-center gap-2">
                    <span class="text-xs text-neutral-500 font-medium">Dauer:</span>
                    {#each [60, 90, 120, 180] as d}
                        <button 
                            type="button" 
                            onclick={() => applyDuration(d)}
                            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] {durationMinutes === d ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}"
                        >
                            {d / 60}h
                        </button>
                    {/each}
                </div>
            </div>

            <!-- 3. Ort & Notizen -->
            <div class="space-y-3 pt-2 border-t border-neutral-100">
                <div>
                    <label for="fu-location" class="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Einsatzort / Adresse
                    </label>
                    <input 
                        id="fu-location"
                        type="text" 
                        bind:value={locationAddress} 
                        placeholder="Adresse des Klienten"
                        class="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 min-h-[44px]"
                    />
                </div>
                <div>
                    <label for="fu-notes" class="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Kurznotiz für Folgetermin (Optional)
                    </label>
                    <input 
                        id="fu-notes"
                        type="text" 
                        bind:value={internalNotes} 
                        placeholder="z. B. Arztbegleitung, Einkauf, Spaziergang..."
                        class="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 min-h-[44px]"
                    />
                </div>
            </div>
        </div>

        <!-- Footer Actions (Große Touch-Targets) -->
        <div class="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50 shrink-0 flex gap-3 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <button 
                type="button" 
                onclick={close} 
                class="flex-1 py-3.5 px-4 bg-white hover:bg-neutral-100 text-neutral-700 text-sm font-bold rounded-xl border border-neutral-200 transition-colors shadow-xs min-h-[48px]"
                disabled={isLoading}
            >
                Abbrechen
            </button>
            <button 
                type="button" 
                onclick={handleSave} 
                class="flex-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 min-h-[48px]"
                disabled={isLoading}
            >
                {#if isLoading}
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Wird gebucht...</span>
                {:else}
                    <span>⚡ Folgetermin buchen</span>
                {/if}
            </button>
        </div>
    </div>
</dialog>
