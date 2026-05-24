<script lang="ts">
    import { submitAppointmentRequest } from "$lib/services/appointmentRequestService";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";
    import { env } from '$env/dynamic/public';

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    
    let isLoading = $state(false);
    let successMsg = $state("");
    let errorMsg = $state("");

    let companies = $state<any[]>([]);
    let company_id = $state("");

    // Form Data
    let sender_name = $state("");
    let email = $state("");
    let phone = $state("");
    let street = $state("");
    let zip_city = $state("");
    let request_text = $state("");
    let time = $state("");
    let preferredContact = $state<"phone" | "email" | "mail">("phone");

    let isValidContact = $derived.by(() => {
        if (preferredContact === 'email') return email.trim().length >= 5 && email.includes('@');
        if (preferredContact === 'phone') return phone.trim().length >= 6;
        if (preferredContact === 'mail') return street.trim().length >= 3 && zip_city.trim().length >= 5;
        return false;
    });

    // Calendar State
    let currentDate = $state(new Date());
    let selectedDate = $state<Date | null>(null);
    let occupiedDates = $state<string[]>([]);
    let occupiedTimesByDate = $state<Record<string, string[]>>({});

    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const firstDay = new Date(y, m, 1);
        let startDay = firstDay.getDay() || 7; // 1 = Mo, 7 = So
        startDay -= 1;

        const days = [];
        const prevLastDay = new Date(y, m, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ date: new Date(y, m - 1, prevLastDay - i), isCurrentMonth: false });
        }
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            days.push({ date: new Date(y, m, i), isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(y, m + 1, i), isCurrentMonth: false });
        }
        return days;
    });

    onMount(async () => {
        try {
            companies = await pb.collection('company').getFullList({ sort: 'city', requestKey: null });
            if (companies.length > 0) company_id = companies[0].id;
        } catch (e) {
            console.warn("Firmen konnten nicht geladen werden.");
        }
    });

    $effect(() => {
        if (company_id) {
            loadOccupiedDates(company_id);
        }
    });

    async function loadOccupiedDates(compId: string) {
        occupiedDates = [];
        occupiedTimesByDate = {};
        try {
            // Termindaten aus der View laden
            const res = await pb.collection('public_busy_days').getFullList({ requestKey: null });
            
            // Frontend-Filterung: Trennt Standorte messerscharf anhand der Firma des zugewiesenen Mitarbeiters
            const filteredRes = res.filter((r: any) => {
                // Blendet alle Termine und Sperren aus, die nicht ausdrücklich als öffentlich sichtbar markiert wurden
                if (r.is_visible !== true) return false;

                let c = r.company;
                if (!c) return false;
                
                if (typeof c === 'string') {
                    if (c.startsWith('[')) { 
                        try { c = JSON.parse(c); } catch { return false; } 
                    } else {
                        return c === compId || c.includes(compId);
                    }
                }
                
                if (Array.isArray(c)) return c.includes(compId);
                return false;
            });
            
            const counts: Record<string, number> = {};
            const times: Record<string, string[]> = {};
            
            filteredRes.forEach((r: any) => {
                if (r.appointment) {
                    // ISO-String parsen und sauber in die deutsche, lokale Zeitzone verschieben
                    const dObj = new Date(r.appointment.replace(' ', 'T'));
                    if (isNaN(dObj.getTime())) return;
                    const d = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    
                    // Wenn der Termin als blockiert markiert ist, sperren wir den Tag künstlich
                    if (r.is_blocked || (r.description && r.description.includes('[BLOCK]'))) {
                        counts[d] = (counts[d] || 0) + 100;
                    } else {
                        counts[d] = (counts[d] || 0) + 1;
                    }

                    // Die Zeiten von expliziten "Block"-Terminen (z.B. Urlaub) ignorieren wir für die Uhrzeitanzeige
                    if (!(r.is_blocked || (r.description && r.description.includes('[BLOCK]')))) {
                        const tStr = dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        if (!times[d]) times[d] = [];
                        if (!times[d].includes(tStr)) times[d].push(tStr);
                    }
                }
            });

            for (const key in times) {
                times[key].sort();
            }

            const busy: string[] = [];
            for (const [d, count] of Object.entries(counts)) {
                // Ein Tag gilt als komplett "Belegt", wenn 4 oder mehr Termine anliegen
                if (count >= 4) busy.push(d);
            }
            occupiedDates = busy;
            occupiedTimesByDate = times;
        } catch (err) {
            console.warn("Konnte belegte Tage nicht laden. Bitte API-Regeln in PocketBase prüfen!", err);
        }
    }

    export function open() {
        successMsg = "";
        errorMsg = "";
        
        // Auto-Fill für eingeloggte Portal-Nutzer (Klienten, Kontakte, Mitarbeiter)
        const model = pb.authStore.model;
        if (model && !sender_name) {
            sender_name = `${model.name_first || ''} ${model.name_last || ''}`.trim();
            email = model.email || "";
            phone = model.phone || model.handy || model.tel || "";
            street = `${model.street || ''} ${model.housenr || ''}`.trim();
            const zip = model.zip || '';
            const city = model.city || '';
            zip_city = `${zip} ${city}`.trim();

            if (email) preferredContact = 'email';
            else if (phone) preferredContact = 'phone';
            else if (street && zip_city) preferredContact = 'mail';
            
            if (model.company) {
                const cId = Array.isArray(model.company) ? model.company[0] : model.company;
                if (cId && companies.some(c => c.id === cId)) company_id = cId;
            }
        }

        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function nextMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        selectedDate = null;
    }
    
    function prevMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        selectedDate = null;
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";
        successMsg = "";

        if (!selectedDate) {
            errorMsg = "Bitte wählen Sie ein Wunschdatum im Kalender aus.";
            isLoading = false;
            return;
        }

        // Sicherstellen, dass das Datum in der lokalen Zeitzone bleibt und nicht durch UTC-Verschiebung auf den Vortag springt
        const formattedDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        
        if (preferredContact === 'email' && !email.trim()) {
            errorMsg = "Bitte geben Sie Ihre E-Mail-Adresse an.";
            isLoading = false;
            return;
        }
        if (preferredContact === 'phone' && !phone.trim()) {
            errorMsg = "Bitte geben Sie Ihre Telefonnummer an.";
            isLoading = false;
            return;
        }
        if (preferredContact === 'mail' && (!street.trim() || !zip_city.trim())) {
            errorMsg = "Bitte geben Sie Ihre vollständige Postadresse an.";
            isLoading = false;
            return;
        }

        let contactMethod = preferredContact === 'email' ? 'e-mail-address' : (preferredContact === 'mail' ? 'mail-adress' : 'telephone');

        const final_request_text = `${request_text.trim()}

--- Kontaktdaten ---
E-Mail: ${preferredContact === 'email' ? email : '-'}
Telefon: ${preferredContact === 'phone' ? phone : '-'}
Adresse: ${preferredContact === 'mail' ? `${street}, ${zip_city}` : '-'}`;

        try {
            await submitAppointmentRequest({
                company: company_id,
                sender_name,
                request_text: final_request_text,
                date: formattedDate,
                time,
                contact_method: contactMethod
            });
            
            // --- E-Mail Benachrichtigung an info@ihre-seniorenassistenz.com senden ---
            try {
                const comp = companies.find(c => c.id === company_id);
                const compName = comp ? `${comp.city} ${comp.name ? `(${comp.name})` : ''}` : 'Unbekannt';
                
                // Dynamischer API-Wächter für lokale und Live-Tests
                const apiBaseUrl = import.meta.env.DEV ? 'http://localhost:3000/portal' : '/api/emails/portal';
                
                await fetch(`${apiBaseUrl}/notify-request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: sender_name,
                        email: email,
                        phone: phone,
                        requestText: request_text,
                        date: new Date(formattedDate).toLocaleDateString('de-DE'),
                        time: time,
                        companyName: compName
                    })
                });
            } catch (notifyErr) {
                console.warn("E-Mail Benachrichtigung konnte nicht gesendet werden:", notifyErr);
            }

            successMsg = "Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns in Kürze.";
            
            // Reset (Kontaktdaten nur leeren, wenn man nicht eingeloggt ist)
            request_text = ""; time = ""; selectedDate = null;
            if (!pb.authStore.model) {
                sender_name = ""; email = ""; phone = ""; street = ""; zip_city = ""; preferredContact = "phone";
            }
        } catch (err: any) {
            console.error(err);
            errorMsg = "Es gab einen Fehler beim Senden. Bitte rufen Sie uns direkt an.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-5xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-neutral-50/50 rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl border border-neutral-100">
        
        <div class="bg-white px-4 sm:px-6 md:px-10 py-4 sm:py-5 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0">📅</div>
                <div>
                    <h2 class="text-lg sm:text-2xl font-bold text-brand-950 leading-tight">Termin online anfragen</h2>
                    <p class="text-[10px] sm:text-sm text-neutral-500 font-medium mt-0.5 sm:mt-0">Kostenlos und unverbindlich. Wir melden uns umgehend.</p>
                </div>
            </div>
            <button aria-label="Schließen" onclick={close} class="w-8 h-8 sm:w-10 sm:h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0"><svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div class="p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar">
            {#if successMsg}
                <div class="bg-emerald-50 text-emerald-800 p-8 rounded-2xl border border-emerald-200 text-center animate-enter my-8">
                    <span class="text-4xl block mb-4">✅</span>
                    <h3 class="text-xl font-bold mb-2">Anfrage erfolgreich!</h3>
                    <p class="font-medium">{successMsg}</p>
                    <button type="button" onclick={close} class="mt-6 orga-button-primary w-full sm:w-auto mx-auto">Schließen</button>
                </div>
            {:else}
                {#if errorMsg}
                    <div class="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200 text-center mb-6 font-bold animate-enter shadow-sm">{errorMsg}</div>
                {/if}

                <form onsubmit={handleSubmit} class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pb-4">
                    
                    <!-- Linke Spalte: Kalender & Standort -->
                    <div class="lg:col-span-5 space-y-6">
                        
                        <div class="orga-card-white p-4 sm:p-5 border border-amber-200/60 shadow-sm bg-amber-50/40">
                            <label for="req-company" class="block text-base font-bold text-brand-950 mb-2">1. Ihr Standort *</label>
                            <p class="text-xs text-neutral-600 mb-3">Bitte wählen Sie Ihre Region, um freie Termine zu sehen.</p>
                            <select id="req-company" bind:value={company_id} class="orga-input-clear bg-white cursor-pointer w-full text-sm font-semibold shadow-sm" required disabled={isLoading}>
                                {#each companies as comp}
                                    <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="orga-card-white p-4 sm:p-5 md:p-6 border border-amber-200/60 shadow-sm bg-amber-50/40">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-base font-bold text-brand-950">2. Wunschdatum *</h3>
                                <div class="flex items-center gap-2 bg-white rounded-lg border border-amber-100 p-1 shadow-sm">
                                    <button type="button" onclick={prevMonth} class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-amber-100 rounded text-brand-700 font-bold transition-colors">◀</button>
                                    <span class="text-xs font-bold text-brand-950 w-20 sm:w-24 text-center">{currentDate.toLocaleString('de-DE', {month:'short', year:'numeric'})}</span>
                                    <button type="button" onclick={nextMonth} class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-amber-100 rounded text-brand-700 font-bold transition-colors">▶</button>
                                </div>
                            </div>
                            <div class="grid grid-cols-7 gap-1 text-center mb-2">
                                {#each ['Mo','Di','Mi','Do','Fr','Sa','So'] as day}<div class="text-[10px] font-bold text-brand-600/80 uppercase tracking-wider py-1">{day}</div>{/each}
                            </div>
                            <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
                                {#each calendarDays as day}
                                    {@const isPast = day.date.getTime() < new Date().setHours(0,0,0,0)}
                                    {@const dateStr = new Date(day.date.getTime() - day.date.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                    {@const isOccupied = occupiedDates.includes(dateStr)}
                                    {@const dayTimes = occupiedTimesByDate[dateStr] || []}
                                    <button type="button" disabled={isPast || isOccupied} onclick={() => selectedDate = day.date} class="aspect-square flex flex-col items-center justify-start pt-1 sm:pt-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all border shadow-sm {
                                        isPast ? 'opacity-40 cursor-not-allowed bg-neutral-100 border-neutral-200 text-neutral-400' : 
                                        (isOccupied ? 'bg-rose-50 text-rose-400 border-rose-200/50 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-brand-50 hover:text-brand-800 hover:border-brand-300 text-neutral-700')
                                    } {!day.isCurrentMonth && !isOccupied && !isPast ? 'opacity-60 text-neutral-500' : ''} {selectedDate && day.date.getTime() === selectedDate.getTime() && !isOccupied && !isPast ? 'bg-brand-600! text-white! border-brand-700! shadow-md scale-105' : ''}">
                                        <span class={isOccupied ? 'line-through decoration-rose-400 decoration-2' : ''}>{day.date.getDate()}</span>
                                        {#if isOccupied}
                                            <span class="text-[7px] sm:text-[8px] font-black uppercase tracking-normal sm:tracking-wider mt-0.5 text-rose-500 truncate max-w-full px-0.5 leading-none">Belegt</span>
                                        {:else if dayTimes.length > 0 && !isPast}
                                            <div class="flex flex-col gap-px mt-0.5 items-center w-full px-0">
                                                {#each dayTimes.slice(0, 2) as t}
                                                <span class="text-[7px] sm:text-[8px] leading-tight font-bold line-through {selectedDate && day.date.getTime() === selectedDate.getTime() ? 'text-brand-200 decoration-brand-200' : 'text-rose-500 decoration-rose-500 opacity-70'}">{t}</span>
                                                {/each}
                                                {#if dayTimes.length > 2}
                                                    <span class="text-[7px] sm:text-[8px] leading-tight font-bold {selectedDate && day.date.getTime() === selectedDate.getTime() ? 'text-brand-100' : 'text-rose-500'}">...</span>
                                                {/if}
                                            </div>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                            
                            <!-- Neue Tages-Detailübersicht -->
                            {#if selectedDate}
                                {@const selDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                {@const selTimes = occupiedTimesByDate[selDateStr] || []}
                                <div class="mt-6 border-t border-amber-200/50 pt-5 animate-enter">
                                    <h4 class="font-bold text-brand-900 mb-3 flex items-center gap-2">
                                        <span>📅</span> Tagesübersicht: {selectedDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </h4>
                                    
                                    {#if selTimes.length > 0}
                                        <div class="bg-rose-50/50 border border-rose-100 rounded-xl p-4 shadow-sm">
                                            <p class="text-xs font-bold text-rose-800 mb-3">Bereits vergebene Zeiten:</p>
                                            <div class="flex flex-wrap gap-2">
                                                {#each selTimes as t}
                                                    <span class="text-xs font-bold bg-white text-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-lg shadow-sm line-through opacity-70">{t} Uhr</span>
                                                {/each}
                                            </div>
                                            <p class="text-[10px] text-rose-600 mt-4 font-medium flex items-start gap-1.5 leading-tight"><span class="text-base leading-none">💡</span>Bitte wählen Sie nach Möglichkeit eine Wunsch-Uhrzeit außerhalb dieser Sperrzeiten. Aus Datenschutzgründen zeigen wir nur die gebuchten Zeiten an.</p>
                                        </div>
                                    {:else}
                                        <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
                                            <span class="text-2xl">✨</span>
                                            <div><p class="text-sm font-bold text-emerald-800">Noch keine Termine an diesem Tag!</p><p class="text-xs text-emerald-600 mt-0.5 font-medium">Buchen Sie jetzt völlig frei Ihren Wunschtermin.</p></div>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Rechte Spalte: Formulardaten -->
                    <div class="lg:col-span-7 flex flex-col">
                        <div class="orga-card-white p-4 sm:p-6 md:p-8 border border-neutral-200 shadow-lg h-full flex flex-col bg-white">
                            <h3 class="text-xl font-bold text-brand-950 mb-1.5">3. Ihre Kontaktdaten & Anliegen</h3>
                            <p class="text-sm text-neutral-600 mb-6 pb-4 border-b border-neutral-100">Wie dürfen wir Sie am besten erreichen?</p>
                            
                            <div class="space-y-5 flex-1">
                                <div><label for="req-name" class="block text-sm font-semibold text-neutral-700 mb-1.5">Ihr Vor- und Nachname *</label><input id="req-name" type="text" bind:value={sender_name} class="orga-input-clear bg-neutral-50" placeholder="Max Mustermann" required disabled={isLoading} /></div>
                                
                                <div>
                                    <label for="req-time" class="block text-sm font-semibold text-neutral-700 mb-1.5">Wunsch-Uhrzeit (optional)</label>
                                    <input id="req-time" type="time" bind:value={time} class="orga-input-clear bg-neutral-50" disabled={isLoading} />
                                    {#if selectedDate && time}
                                        {@const selDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                        {@const selTimes = occupiedTimesByDate[selDateStr] || []}
                                        {#if selTimes.includes(time)}
                                            <p class="text-[10px] sm:text-xs text-rose-600 font-bold mt-1.5 leading-tight flex items-start sm:items-center gap-1"><span>⚠️</span> <span>Diese Uhrzeit ist bereits vergeben.</span></p>
                                        {/if}
                                    {/if}
                                </div>

                                <div>
                                    <!-- svelte-ignore a11y_label_has_associated_control -->
                                    <label class="block text-sm font-semibold text-neutral-700 mb-1.5">Gewünschter Kontaktweg *</label>
                                    <div class="flex flex-col sm:flex-row gap-2 p-1 bg-neutral-100 rounded-lg">
                                        <button type="button" onclick={() => preferredContact = 'phone'} class="flex-1 py-2 text-xs sm:text-sm font-bold rounded-md transition-colors {preferredContact === 'phone' ? 'bg-white shadow-sm text-brand-600' : 'text-neutral-500 hover:text-neutral-700'}">📞 Telefon</button>
                                        <button type="button" onclick={() => preferredContact = 'email'} class="flex-1 py-2 text-xs sm:text-sm font-bold rounded-md transition-colors {preferredContact === 'email' ? 'bg-white shadow-sm text-brand-600' : 'text-neutral-500 hover:text-neutral-700'}">✉️ E-Mail</button>
                                        <button type="button" onclick={() => preferredContact = 'mail'} class="flex-1 py-2 text-xs sm:text-sm font-bold rounded-md transition-colors {preferredContact === 'mail' ? 'bg-white shadow-sm text-brand-600' : 'text-neutral-500 hover:text-neutral-700'}">📮 Brief</button>
                                    </div>
                                </div>
                                
                                <div class="p-4 bg-brand-50/50 border border-brand-100 rounded-xl animate-enter">
                                    {#if preferredContact === 'email'}
                                        <div><label for="req-email" class="block text-sm font-semibold text-brand-900 mb-1.5">Ihre E-Mail-Adresse *</label><input id="req-email" type="email" bind:value={email} class="orga-input-clear bg-white border-brand-200" placeholder="mail@beispiel.de" required disabled={isLoading} /></div>
                                    {:else if preferredContact === 'phone'}
                                        <div><label for="req-phone" class="block text-sm font-semibold text-brand-900 mb-1.5">Ihre Telefon- oder Mobilnummer *</label><input id="req-phone" type="text" bind:value={phone} class="orga-input-clear bg-white border-brand-200" placeholder="0151..." required disabled={isLoading} /></div>
                                    {:else if preferredContact === 'mail'}
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div><label for="req-street" class="block text-sm font-semibold text-brand-900 mb-1.5">Straße & Hausnr. *</label><input id="req-street" type="text" bind:value={street} class="orga-input-clear bg-white border-brand-200" placeholder="Musterstraße 1" required disabled={isLoading} /></div>
                                            <div><label for="req-zip" class="block text-sm font-semibold text-brand-900 mb-1.5">PLZ & Stadt *</label><input id="req-zip" type="text" bind:value={zip_city} class="orga-input-clear bg-white border-brand-200" placeholder="06108 Halle" required disabled={isLoading} /></div>
                                        </div>
                                    {/if}
                                </div>
                                
                                <div class="flex-1 flex flex-col">
                                    <label for="req-text" class="block text-sm font-semibold text-neutral-700 mb-1.5">Wie können wir Ihnen helfen? *</label>
                                    <textarea id="req-text" bind:value={request_text} class="orga-input-clear bg-neutral-50 resize-none custom-scrollbar flex-1 min-h-30" placeholder="Beschreiben Sie kurz Ihr Anliegen..." required disabled={isLoading}></textarea>
                                </div>
                            </div>

                            <div class="pt-6 mt-6 border-t border-neutral-100 shrink-0">
                                <button type="submit" class="orga-button-primary w-full text-base py-3.5 shadow-brand-600/30 hover:shadow-brand-600/50" disabled={isLoading || !selectedDate || !sender_name.trim() || !isValidContact}>{isLoading ? "Anfrage wird sicher übertragen..." : "Termin unverbindlich anfragen"}</button>
                                <p class="text-center text-[10px] sm:text-xs text-neutral-400 mt-3 flex items-start sm:items-center justify-center gap-1.5"><span class="mt-0.5 sm:mt-0">🔒</span> <span class="text-left sm:text-center">Ihre Daten werden verschlüsselt übertragen und streng vertraulich behandelt.</span></p>
                            </div>
                        </div>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</dialog>