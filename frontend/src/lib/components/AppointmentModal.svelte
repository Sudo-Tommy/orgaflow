<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let appDate = $state("");
    let appStartTime = $state("");
    let appEndTime = $state("");
    let description = $state("");
    let location_address = $state("");
    let internalNotes = $state("");
    let selectedTasks = $state<string[]>([]);
    let is_private = $state(false);
    let is_blocked = $state(false);
    let settled = $state(false);
    let is_series = $state(false);
    let is_visible = $state(false);
    let seriesEndDate = $state("");
    let series_id = $state("");
    let selectedClientId = $state("");
    let selectedContactId = $state("");
    // Holt sich live die Daten (inkl. Notizen) des aktuell gewählten Klienten
    let selectedClientRecord = $derived(orgaStore.clients?.data?.find((c: any) => c.id === selectedClientId));
    
    let isSuperAdmin = $state(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');
    let users = $state<any[]>([]);
    let selectedUserId = $state("");
    let initialDataHash = $state("");

    function getLocalDateString(date: Date) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function getLocalTimeString(date: Date) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    export async function open(data?: any) {
        if (isSuperAdmin && users.length === 0) {
            pb.collection('users').getFullList({ sort: 'name_first', requestKey: null }).then(res => users = res).catch(() => {});
        }

        if (data && !(data instanceof Date) && data.id) {
            editId = data.id;
            const d = data.appointment ? new Date(data.appointment) : new Date();
            appDate = getLocalDateString(d);
            appStartTime = data.appointment ? getLocalTimeString(d) : "";
            
            if (data.expand?.time_record && data.expand.time_record.length > 0) {
                const tr = data.expand.time_record[0];
                appEndTime = tr.end ? getLocalTimeString(new Date(tr.end)) : "";
            } else {
                appEndTime = "";
            }

            description = data.description || "";
            location_address = data.location_address || "";
            if (description.includes('[BLOCK]')) {
                is_blocked = true;
                description = description.replace('[BLOCK]', '').trim();
            } else {
                is_blocked = false;
            }
            is_private = data.is_private || false;
            settled = data.settled || false;
            is_series = data.is_series || false;
            is_visible = data.is_visible || false;
            series_id = data.series_id || "";
            
            let cId = "";
            if (data.client) {
                if (Array.isArray(data.client) && data.client.length > 0) cId = data.client[0];
                else if (typeof data.client === "string") cId = data.client;
            }
            selectedClientId = cId;
            selectedUserId = data.user || pb.authStore.model?.id || "";
            internalNotes = data.notes || data.internal_notes || "";
            selectedTasks = Array.isArray(data.tasks) ? [...data.tasks] : (data.tasks ? [data.tasks] : []);
        } else {
            editId = null;
            const d = (data && data.date) ? new Date(data.date) : (data instanceof Date ? new Date(data) : new Date());
            if (data instanceof Date || !data || data.preselectedClient) {
                const now = new Date();
                d.setHours(now.getHours() + 1, 0, 0, 0);
            }
            appDate = getLocalDateString(d);
            appStartTime = getLocalTimeString(d);
            appEndTime = "";
            description = "";
            location_address = "";
            is_private = false;
            settled = false;
            is_series = false;
            is_visible = false;
            seriesEndDate = "";
            series_id = "";
            is_blocked = data?.is_blocked || false;
            selectedClientId = data?.preselectedClient || "";
            selectedUserId = pb.authStore.model?.id || "";
            internalNotes = "";
            selectedTasks = [];
        }
        errorMsg = "";
        initialDataHash = JSON.stringify({
            appDate, appStartTime, appEndTime, description, location_address,
            is_private, settled, is_series, is_visible, seriesEndDate,
            is_blocked, selectedClientId, selectedUserId, internalNotes, selectedTasks, selectedContactId
        });
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        const currentHash = JSON.stringify({
            appDate, appStartTime, appEndTime, description, location_address,
            is_private, settled, is_series, is_visible, seriesEndDate,
            is_blocked, selectedClientId, selectedUserId, internalNotes, selectedTasks, selectedContactId
        });
        if (currentHash !== initialDataHash) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
    }

    function onContactSelect() {
        if (!selectedContactId) {
            // Wenn der Nutzer die Auswahl aufhebt, wird auch das Adressfeld geleert.
            location_address = "";
            return;
        }
        const contact = orgaStore.contacts?.data?.find((c: any) => c.id === selectedContactId);
        if (contact) {
            const namePart = [contact.company_name, `${contact.name_first} ${contact.name_last}`.trim()].filter(Boolean).join(' - ');
            const addressPart = `${contact.street || ''} ${contact.housenr || ''}`.trim();
            const cityPart = `${contact.zip || ''} ${contact.city || ''}`.trim();
            
            location_address = [namePart, addressPart, cityPart].filter(Boolean).join(', ');
        }
    }

    function toggleTask(id: string) {
        if (selectedTasks.includes(id)) {
            selectedTasks = selectedTasks.filter(t => t !== id);
        } else {
            selectedTasks = [...selectedTasks, id];
        }
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        if (!appDate) {
            errorMsg = "Bitte ein Datum wählen.";
            isLoading = false;
            return;
        }
        
        if (!editId && is_series) {
            if (!seriesEndDate) {
                errorMsg = "Bitte wählen Sie ein Enddatum für die Serie.";
                isLoading = false;
                return;
            } else if (new Date(seriesEndDate) < new Date(appDate)) {
                errorMsg = "Das Enddatum der Serie darf nicht vor dem Startdatum liegen.";
                isLoading = false;
                return;
            }
        }

        let finalDesc = description.trim();
        if (is_blocked) {
            let cleanDesc = finalDesc.replace('[BLOCK]', '').trim();
            if (!cleanDesc || cleanDesc === "Neuer Termin") cleanDesc = "Urlaub / Abwesend";
            finalDesc = `[BLOCK] ${cleanDesc}`;
        } else {
            if (finalDesc === "Urlaub / Abwesend" || !finalDesc) finalDesc = "Neuer Termin";
        }

        try {
            const localDateStr = `${appDate}T${is_blocked ? '12:00' : (appStartTime || '12:00')}:00`;
            const utcAppointment = new Date(localDateStr).toISOString();
            
            const safeSeriesId = series_id || (is_series ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)) : "");

            const payload: any = {
                appointment: utcAppointment,
                description: finalDesc,
                location_address: location_address,
                is_private,
                settled,
                is_series,
                is_visible,
                series_id: safeSeriesId,
                user: selectedUserId || pb.authStore.model?.id,
                client: selectedClientId ? [selectedClientId] : [],
                notes: internalNotes,
                internal_notes: internalNotes,
                tasks: selectedTasks
            };

            let savedId = editId;
            if (editId) {
                await pb.collection('appointments').update(editId, payload, { requestKey: null });
            } else {
                if (is_series && seriesEndDate) {
                    let curr = new Date(appDate);
                    const end = new Date(seriesEndDate);
                    const promises = [];
                    
                    while(curr <= end) {
                        const iterDateStr = getLocalDateString(curr);
                        const iterLocalStr = `${iterDateStr}T${is_blocked ? '12:00' : (appStartTime || '12:00')}:00`;
                        const iterUtc = new Date(iterLocalStr).toISOString();

                        promises.push((async () => {
                            const record = await pb.collection('appointments').create({ ...payload, appointment: iterUtc }, { requestKey: null });
                            
                            if (appStartTime && appEndTime && !is_blocked) {
                                const startLocal = new Date(`${iterDateStr}T${appStartTime}:00`).toISOString();
                                const endDateObj = new Date(`${iterDateStr}T${appEndTime}:00`);
                                if (appEndTime < appStartTime) endDateObj.setDate(endDateObj.getDate() + 1);
                                const endLocal = endDateObj.toISOString();
                                
                                const newTr = await pb.collection('time_records').create({ start: startLocal, end: endLocal });
                                await pb.collection('appointments').update(record.id, { time_record: [newTr.id] });
                            }
                        })());
                        curr.setDate(curr.getDate() + 7);
                    }

                    const chunkSize = 20;
                    for (let i = 0; i < promises.length; i += chunkSize) {
                        await Promise.all(promises.slice(i, i + chunkSize));
                    }
                    
                    if (orgaStore.appointments) await orgaStore.appointments.init();
                    toastStore.success(`Serientermin erfolgreich angelegt (${promises.length} Termine)!`);
                    close();
                    isLoading = false;
                    return;
                } else {
                    const record = await pb.collection('appointments').create(payload, { requestKey: null });
                    savedId = record.id;
                }
            }

            // Zeit-Eintrag anlegen, wenn Start & Endzeit ausgefüllt sind
            if (savedId && appStartTime && appEndTime && !is_blocked) {
                const startLocal = new Date(`${appDate}T${appStartTime}:00`).toISOString();
                const endDate = new Date(`${appDate}T${appEndTime}:00`);
                if (appEndTime < appStartTime) endDate.setDate(endDate.getDate() + 1); // Falls es über Mitternacht geht
                const endLocal = endDate.toISOString();
                
                const trPayload = { start: startLocal, end: endLocal };
                const existingApp = await pb.collection('appointments').getOne(savedId, { expand: 'time_record' });
                let trId = existingApp.expand?.time_record?.[0]?.id;
                
                if (trId) {
                    await pb.collection('time_records').update(trId, trPayload);
                } else {
                    const newTr = await pb.collection('time_records').create(trPayload);
                    const currentTrs = existingApp.time_record || [];
                    await pb.collection('appointments').update(savedId, { time_record: [...currentTrs, newTr.id] });
                }
            } else if (savedId && (!appEndTime || is_blocked)) {
                // Zeiten entfernen, wenn die Endzeit rausgelöscht wurde oder der Tag blockiert wird
                const existingApp = await pb.collection('appointments').getOne(savedId, { expand: 'time_record' });
                if (existingApp.expand?.time_record && existingApp.expand.time_record.length > 0) {
                    for (const tr of existingApp.expand.time_record) {
                        await pb.collection('time_records').delete(tr.id);
                    }
                    await pb.collection('appointments').update(savedId, { time_record: [] });
                }
            }

            // Kalender Live Update
            if (savedId && orgaStore.appointments) {
                const updatedApp = await pb.collection('appointments').getOne(savedId, { expand: 'user,client,drive_record,time_record,tasks,expenditures', requestKey: null }) as any;
                const idx = orgaStore.appointments.data.findIndex((a:any) => a.id === savedId);
                const newData = [...orgaStore.appointments.data];
                if (idx !== -1) newData[idx] = updatedApp;
                else newData.push(updatedApp);
                orgaStore.appointments.data = newData;
            }

            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern.";
        } finally {
            isLoading = false;
        }
    }
    
    async function deleteSeries() {
        if (!editId || !is_series || !series_id) return;
        
        if (!(await confirmStore.ask("Möchten Sie diesen und ALLE zukünftigen Termine dieser Serie wirklich löschen?", "Komplette Serie löschen?", "Ja, Serie löschen", "Abbrechen", true))) return;
        isLoading = true;
        try {
            if (series_id && appDate) {
                const localDateStr = `${appDate}T00:00:00`;
                const futureApps = await pb.collection('appointments').getFullList({
                    filter: `series_id = '${series_id}' && appointment >= '${new Date(localDateStr).toISOString()}'`,
                    requestKey: null
                });
                
                const promises = [];
                for (const a of futureApps) {
                    if (a.time_record) {
                        for (const trId of a.time_record) promises.push(pb.collection('time_records').delete(trId).catch(()=>{}));
                    }
                    promises.push(pb.collection('appointments').delete(a.id));
                }

                const chunkSize = 20;
                for (let i = 0; i < promises.length; i += chunkSize) {
                    await Promise.all(promises.slice(i, i + chunkSize));
                }
                
                if (orgaStore.appointments) {
                    const deletedIds = futureApps.map((a:any) => a.id);
                    orgaStore.appointments.data = orgaStore.appointments.data.filter((a:any) => !deletedIds.includes(a.id));
                }
                toastStore.info(`Komplette Terminserie gelöscht (${futureApps.length} Termine).`);
            }
            close();
        } catch (err) {
            errorMsg = "Fehler beim Löschen der Serie.";
        } finally {
            isLoading = false;
        }
    }

    async function deleteAppointment() {
        if (!editId) return;
        
        if (!(await confirmStore.ask(is_series ? "Möchten Sie nur diesen einzelnen Termin löschen?" : "Möchten Sie diesen Termin wirklich löschen?", "Termin löschen?", "Löschen", "Abbrechen", true))) return;

        isLoading = true;
        try {
            await pb.collection('appointments').delete(editId);
            if (orgaStore.appointments) orgaStore.appointments.data = orgaStore.appointments.data.filter((a:any) => a.id !== editId);
            toastStore.info("Termin gelöscht.");
            close();
        } catch (err) {
            errorMsg = "Fehler beim Löschen.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">{editId ? 'Termin bearbeiten' : 'Neuen Termin anlegen'}</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        
        <form onsubmit={onSubmit} class="space-y-5">
            <!-- Datum & Uhrzeit -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class={is_blocked ? 'sm:col-span-3' : 'sm:col-span-1'}>
                    <label for="app-date" class="block text-sm font-semibold text-neutral-700 mb-1.5">Datum *</label>
                    <input id="app-date" type="date" bind:value={appDate} class="orga-input-clear py-2.5 text-sm" required disabled={isLoading} />
                </div>
                {#if !is_blocked}
                <div class="sm:col-span-1">
                    <label for="app-start" class="block text-sm font-semibold text-neutral-700 mb-1.5">Startzeit *</label>
                    <input id="app-start" type="time" bind:value={appStartTime} class="orga-input-clear py-2.5 text-sm" required disabled={isLoading} />
                </div>
                <div class="sm:col-span-1">
                    <label for="app-end" class="block text-sm font-semibold text-neutral-700 mb-1.5">Endzeit <span class="text-xs text-neutral-400 font-normal">(optional)</span></label>
                    <input id="app-end" type="time" bind:value={appEndTime} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} />
                </div>
                {/if}
            </div>

            {#if !editId}
            <div class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-2 space-y-3">
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" bind:checked={is_series} class="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500" disabled={isLoading} />
                    <span class="text-sm font-semibold text-indigo-900">Wöchentlicher Serientermin</span>
                </label>
                {#if is_series}
                    <div class="pt-3 border-t border-indigo-100 animate-enter">
                        <label for="app-series-end" class="block text-xs font-semibold text-indigo-800 mb-1.5">Wiederholen bis (Enddatum) *</label>
                        <input id="app-series-end" type="date" bind:value={seriesEndDate} class="orga-input-clear py-2.5 text-sm bg-white border-indigo-200" disabled={isLoading} required />
                        <p class="text-[10px] text-indigo-600 mt-2 leading-relaxed">Es wird ab dem Startdatum jede Woche ein eigener Termin angelegt. So können Termine später einzeln abgerechnet, bearbeitet oder verschoben werden.</p>
                    </div>
                {/if}
            </div>
            {/if}

            <!-- Klient & Mitarbeiter -->
            {#if !is_blocked}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="app-client" class="block text-sm font-semibold text-neutral-700 mb-1.5">Klient (optional)</label>
                    <select id="app-client" bind:value={selectedClientId} class="orga-input-clear py-2.5 text-sm cursor-pointer" disabled={isLoading}>
                        <option value="">Kein Klient (z.B. Bürotätigkeit)</option>
                        {#each orgaStore.clients?.data || [] as client (client.id)}
                            <option value={client.id}>{client.name_first} {client.name_last}</option>
                        {/each}
                    </select>
                </div>
                {#if isSuperAdmin}
                <div>
                    <label for="app-user" class="block text-sm font-semibold text-neutral-700 mb-1.5">Zuständiger Mitarbeiter</label>
                    <select id="app-user" bind:value={selectedUserId} class="orga-input-clear py-2.5 text-sm cursor-pointer" required disabled={isLoading}>
                        {#each users as u (u.id)}
                            <option value={u.id}>{u.name_first} {u.name_last}</option>
                        {/each}
                    </select>
                </div>
                {/if}
            </div>

            <!-- Client Notes Warning -->
            {#if selectedClientRecord?.notes}
                <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 shadow-sm animate-enter">
                    <span class="text-amber-500 text-lg leading-none mt-0.5">💡</span>
                    <div>
                        <p class="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Klienten-Notizen</p>
                        <p class="text-xs text-amber-900 font-medium whitespace-pre-wrap leading-relaxed">{selectedClientRecord.notes}</p>
                    </div>
                </div>
            {/if}
            {/if}

            <!-- Beschreibung -->
            <div>
                <label for="app-desc" class="block text-sm font-semibold text-neutral-700 mb-1.5">Titel / Kurzbeschreibung</label>
                <input id="app-desc" type="text" bind:value={description} class="orga-input-clear py-2.5 text-sm" placeholder={is_blocked ? "z.B. Urlaub / Abwesend" : "z.B. Arztbesuch Begleitung"} disabled={isLoading} />
            </div>
            
            {#if !is_blocked}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="app-location" class="block text-sm font-semibold text-neutral-700 mb-1.5">Ort / Zieladresse (optional)</label>
                    <input id="app-location" type="text" bind:value={location_address} class="orga-input-clear py-2.5 text-sm" placeholder="z.B. Dr. Mustermann, Musterstr. 1, Halle" disabled={isLoading} />
                </div>
                <div>
                    <label for="app-contact-fill" class="block text-sm font-semibold text-neutral-700 mb-1.5">Aus Kontakten übernehmen</label>
                    <select id="app-contact-fill" bind:value={selectedContactId} onchange={onContactSelect} class="orga-input-clear py-2.5 text-sm cursor-pointer bg-blue-50/40 border-blue-200 text-blue-900" disabled={isLoading}>
                        <option value="">+ Arzt / Kontakt wählen...</option>
                        {#each orgaStore.contacts?.data || [] as contact}
                            <option value={contact.id}>{#if contact.company_name}{contact.company_name} - {/if}{contact.name_first} {contact.name_last}</option>
                        {/each}
                    </select>
                </div>
            </div>
            {/if}
            
            <!-- Leistungen (Tasks) -->
            {#if !is_blocked}
            <div>
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label class="block text-sm font-semibold text-neutral-700 mb-2">Geplante Leistungen (Für die Abrechnung)</label>
                <div class="flex flex-wrap gap-2">
                    {#each orgaStore.tasks?.data || [] as t}
                        <button type="button" onclick={() => toggleTask(t.id)} class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all {selectedTasks.includes(t.id) ? 'bg-indigo-100 border-indigo-300 text-indigo-800 shadow-sm' : 'bg-white border-neutral-200 text-neutral-600 hover:border-indigo-200 hover:bg-indigo-50'}" disabled={isLoading}>{t.title}</button>
                    {/each}
                </div>
            </div>

            <!-- Interne Notizen -->
            <div>
                <label for="app-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Interne Notizen (fürs Team)</label>
                <textarea id="app-notes" bind:value={internalNotes} rows="3" class="orga-input-clear py-2.5 text-sm resize-y custom-scrollbar" placeholder="Zusätzliche Infos, To-Dos oder Hinweise für den Mitarbeiter..." disabled={isLoading}></textarea>
            </div>
            {/if}

            <!-- Toggles (Privat / Blocked / Settled / Visible) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <button type="button" onclick={() => is_private = !is_private} class="flex items-center justify-between w-full p-4 border-2 rounded-xl cursor-pointer transition-all {is_private ? 'border-indigo-500 bg-indigo-50/50' : 'border-neutral-200 bg-white hover:border-indigo-200'} {isLoading ? 'opacity-50 pointer-events-none' : ''}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center transition-colors {is_private ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-500'}">
                            <span class="text-base">🔒</span>
                        </div>
                        <div class="text-left">
                            <p class="text-sm font-bold {is_private ? 'text-indigo-900' : 'text-neutral-900'}">Privat</p>
                        </div>                        
                    </div>
                </button>

                <button type="button" onclick={() => settled = !settled} class="flex items-center justify-between w-full p-4 border-2 rounded-xl cursor-pointer transition-all {settled ? 'border-emerald-500 bg-emerald-50/50' : 'border-neutral-200 bg-white hover:border-emerald-200'} {isLoading ? 'opacity-50 pointer-events-none' : ''}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center transition-colors {settled ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-500'}">
                            <span class="text-base">✓</span>
                        </div>
                        <div class="text-left">
                            <p class="text-sm font-bold {settled ? 'text-emerald-900' : 'text-neutral-900'}">Abgerechnet</p>                            
                        </div>
                    </div>
                </button>

                <button type="button" onclick={() => is_blocked = !is_blocked} class="flex items-center justify-between w-full p-4 border-2 rounded-xl cursor-pointer transition-all {is_blocked ? 'border-rose-500 bg-rose-50/50' : 'border-neutral-200 bg-white hover:border-rose-200'} {isLoading ? 'opacity-50 pointer-events-none' : ''}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center transition-colors {is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-neutral-100 text-neutral-500'}">
                            <span class="text-base">🚫</span>
                        </div>
                        <div class="text-left">
                            <p class="text-sm font-bold {is_blocked ? 'text-rose-900' : 'text-neutral-900'}">Tag sperren</p>
                        </div>                        
                    </div>
                </button>

                {#if isSuperAdmin}
                <button type="button" onclick={() => is_visible = !is_visible} class="flex items-center justify-between w-full p-4 border-2 rounded-xl cursor-pointer transition-all {is_visible ? 'border-sky-500 bg-sky-50/50' : 'border-neutral-200 bg-white hover:border-sky-200'} {isLoading ? 'opacity-50 pointer-events-none' : ''}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center transition-colors {is_visible ? 'bg-sky-100 text-sky-600' : 'bg-neutral-100 text-neutral-500'}">
                            <span class="text-base">{is_visible ? '👁️' : '🙈'}</span>
                        </div>
                        <div class="text-left">
                            <p class="text-sm font-bold {is_visible ? 'text-sky-900' : 'text-neutral-900'}">Öffentlich sichtbar</p>
                        </div>                        
                    </div>
                </button>
                {/if}
            </div>
            
            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-between gap-3 border-t border-neutral-100 mt-6">
                {#if editId}
                    <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button type="button" onclick={deleteAppointment} class="orga-button-ghost text-rose-600 hover:text-rose-700 hover:bg-rose-50 w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Termin löschen</button>
                        {#if is_series && series_id}
                            <button type="button" onclick={deleteSeries} class="orga-button-ghost text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Serie löschen</button>
                        {/if}
                    </div>
                {:else}
                    <div class="hidden sm:block"></div>
                {/if}
                <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                    <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Speichern"}</button>
                </div>
            </div>
        </form>
    </div>
</dialog>