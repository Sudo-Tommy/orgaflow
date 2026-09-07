<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { slide, fade } from "svelte/transition";
    import { 
        X, Calendar, Clock, User, MapPin, AlignLeft, CheckSquare, 
        Lock, CheckCircle, Ban, Eye, EyeOff, Save, Trash2, ChevronUp,
        ChevronDown, Check, Repeat, Building2, UserCircle, BriefcaseMedical, Edit3, ListTodo,
        Search, ExternalLink, Sparkles, ShieldCheck, HeartHandshake, PhoneCall, AlertCircle
    } from "lucide-svelte";

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
    let seriesInterval = $state<'weekly' | 'biweekly' | 'monthly'>('weekly');
    let useClientAddress = $state(false);
    let is_visible = $state(false);
    let seriesEndDate = $state("");
    let series_id = $state("");
    let selectedClientId = $state("");
    let selectedContactId = $state("");

    // Search dropdown states
    let clientSearchQuery = $state("");
    let isClientSearchOpen = $state(false);
    let contactSearchQuery = $state("");
    let isContactSearchOpen = $state(false);

    // Holt sich live die Daten (inkl. Notizen) des aktuell gewählten Klienten
    let selectedClientRecord = $derived(orgaStore.clients?.data?.find((c: any) => c.id === selectedClientId));
    let selectedContactRecord = $derived(orgaStore.contacts?.data?.find((c: any) => c.id === selectedContactId));

    let isLeistungenExpanded = $state(false);

    // Client Filter
    let filteredClients = $derived.by(() => {
        const list = orgaStore.clients?.data || [];
        if (!clientSearchQuery.trim()) return list;
        const q = clientSearchQuery.toLowerCase().trim();
        return list.filter((c: any) => {
            const fullName = `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase();
            const city = (c.city || '').toLowerCase();
            const street = (c.street || '').toLowerCase();
            const pg = (c.level_of_care || '').toLowerCase();
            return fullName.includes(q) || city.includes(q) || street.includes(q) || pg.includes(q);
        });
    });

    // Contact Filter
    let filteredContacts = $derived.by(() => {
        const list = orgaStore.contacts?.data || [];
        if (!contactSearchQuery.trim()) return list;
        const q = contactSearchQuery.toLowerCase().trim();
        return list.filter((c: any) => {
            const fullName = `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase();
            const comp = (c.company_name || '').toLowerCase();
            const cat = (c.category || '').toLowerCase();
            const city = (c.city || '').toLowerCase();
            return fullName.includes(q) || comp.includes(q) || cat.includes(q) || city.includes(q);
        });
    });

    // Duration badge helper
    let durationBadge = $derived.by(() => {
        if (!appStartTime || !appEndTime || is_blocked) return null;
        const [sh, sm] = appStartTime.split(':').map(Number);
        const [eh, em] = appEndTime.split(':').map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin < startMin) endMin += 24 * 60; // falls nach Mitternacht
        const diff = endMin - startMin;
        if (diff <= 0) return null;
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        if (hours > 0 && mins > 0) return `${hours} Std. ${mins} Min.`;
        if (hours > 0) return `${hours} Std.`;
        return `${mins} Min.`;
    });

    // Series count helper
    let calculatedSeriesCount = $derived.by(() => {
        if (!is_series || !appDate || !seriesEndDate) return 0;
        const start = new Date(appDate);
        const end = new Date(seriesEndDate);
        if (end < start) return 0;
        let count = 0;
        let curr = new Date(start);
        while (curr <= end) {
            count++;
            if (seriesInterval === 'weekly') curr.setDate(curr.getDate() + 7);
            else if (seriesInterval === 'biweekly') curr.setDate(curr.getDate() + 14);
            else if (seriesInterval === 'monthly') curr.setMonth(curr.getMonth() + 1);
        }
        return count;
    });

    // Quick Activity Templates
    const quickTemplates = [
        { label: 'Alltagsbegleitung', icon: '🤝', keywords: ['begleitung', 'alltag', 'betreuung'] },
        { label: 'Einkauf & Besorgung', icon: '🛒', keywords: ['einkauf', 'besorgung'] },
        { label: 'Arztbesuch Begleitung', icon: '🩺', keywords: ['arzt', 'begleitung', 'fahrt'] },
        { label: 'Hauswirtschaft', icon: '🧹', keywords: ['hauswirtschaft', 'reinigung'] },
        { label: 'Beratungseinsatz § 37.3', icon: '💬', keywords: ['beratung', '37'] },
        { label: 'Büro / Doku', icon: '📋', keywords: ['büro', 'doku', 'verwaltung'] },
        { label: 'Fahrdienst', icon: '🚗', keywords: ['fahrt', 'fahrdienst'] }
    ];

    function applyTemplate(tpl: typeof quickTemplates[0]) {
        description = tpl.label;
        if (orgaStore.tasks?.data) {
            const matches = orgaStore.tasks.data.filter((t: any) => {
                const titleLower = (t.title || '').toLowerCase();
                return tpl.keywords.some(kw => titleLower.includes(kw));
            });
            if (matches.length > 0) {
                const set = new Set([...selectedTasks, ...matches.map((m: any) => m.id)]);
                selectedTasks = Array.from(set);
            }
        }
    }

    function applyDuration(minutes: number) {
        if (!appStartTime) {
            const now = new Date();
            const min = Math.ceil(now.getMinutes() / 15) * 15;
            now.setMinutes(min, 0, 0);
            appStartTime = getLocalTimeString(now);
        }
        const [h, m] = appStartTime.split(':').map(Number);
        const totalMin = h * 60 + m + minutes;
        const endH = Math.floor(totalMin / 60) % 24;
        const endM = totalMin % 60;
        appEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    function autoResize(node: HTMLTextAreaElement) {
        function resize() {
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
        }
        node.addEventListener('input', resize);
        setTimeout(resize, 0);
        return { destroy: () => node.removeEventListener('input', resize) };
    }
    
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

    // Beobachtet den Switch für die Klienten-Adresse
    $effect(() => {
        if (useClientAddress && selectedClientRecord) {
            const street = selectedClientRecord.street || '';
            const nr = selectedClientRecord.housenr || '';
            const zip = selectedClientRecord.zip || '';
            const city = selectedClientRecord.city || '';
            
            const line1 = (street + ' ' + nr).trim();
            const line2 = (zip + ' ' + city).trim();
            const fullAddr = [line1, line2].filter(Boolean).join(', ');
            if (fullAddr) location_address = fullAddr;
        }
    });

    export async function open(data?: any) {
        if (isSuperAdmin && users.length === 0) {
            pb.collection('users').getFullList({ sort: 'name_first', requestKey: null }).then(res => users = res).catch(() => {});
        }

        isClientSearchOpen = false;
        isContactSearchOpen = false;
        clientSearchQuery = "";
        contactSearchQuery = "";
        seriesInterval = 'weekly';

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
            useClientAddress = data.use_client_address || false;

            let cId = "";
            if (data.client) {
                if (Array.isArray(data.client) && data.client.length > 0) cId = data.client[0];
                else if (typeof data.client === "string") cId = data.client;
            }
            selectedClientId = cId;

            let contId = "";
            if (data.appointment_at) {
                if (Array.isArray(data.appointment_at) && data.appointment_at.length > 0) {
                    contId = typeof data.appointment_at[0] === 'object' ? data.appointment_at[0].id : data.appointment_at[0];
                } else if (typeof data.appointment_at === "string") {
                    contId = data.appointment_at;
                }
            } else if (data.expand?.appointment_at && data.expand.appointment_at.length > 0) {
                contId = data.expand.appointment_at[0].id;
            }
            selectedContactId = contId;

            if (!useClientAddress && !contId && cId && location_address) {
                const cl = orgaStore.clients?.data?.find((c: any) => c.id === cId);
                if (cl) {
                    const cStreet = (cl.street || '').trim();
                    if (cStreet && cStreet.length >= 4 && location_address.toLowerCase().includes(cStreet.toLowerCase())) {
                        useClientAddress = true;
                    }
                }
            }

            selectedUserId = data.user || (pb.authStore.model?.collectionName === '_superusers' ? "" : pb.authStore.model?.id) || "";
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
            // Default 1 hour appointment duration
            const [sh, sm] = appStartTime.split(':').map(Number);
            appEndTime = `${((sh + 1) % 24).toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`;
            description = "";
            location_address = "";
            is_private = false;
            settled = false;
            is_series = false;
            is_visible = true;
            seriesEndDate = "";
            series_id = "";
            is_blocked = data?.is_blocked || false;
            selectedClientId = data?.preselectedClient || "";
            useClientAddress = !!data?.preselectedClient;
            selectedUserId = pb.authStore.model?.collectionName === '_superusers' ? "" : (pb.authStore.model?.id || "");
            internalNotes = "";
            selectedTasks = [];
        }
        errorMsg = "";
        initialDataHash = JSON.stringify({
            appDate, appStartTime, appEndTime, description, location_address,
            is_private, settled, is_series, is_visible, seriesEndDate, seriesInterval,
            is_blocked, selectedClientId, selectedUserId, internalNotes, selectedTasks, selectedContactId, useClientAddress
        });
        dialog?.showModal();
        const textareas = dialog.querySelectorAll('textarea');
        setTimeout(() => {
            textareas.forEach(ta => ta.dispatchEvent(new Event('input')));
        }, 50);
    }

    let selectedTaskRecords = $derived(orgaStore.tasks?.data?.filter((t: any) => selectedTasks.includes(t.id)) || []);

    export function close() {
        isClientSearchOpen = false;
        isContactSearchOpen = false;
        dialog?.close();
    }

    export async function attemptClose() {
        const currentHash = JSON.stringify({
            appDate, appStartTime, appEndTime, description, location_address,
            is_private, settled, is_series, is_visible, seriesEndDate, seriesInterval,
            is_blocked, selectedClientId, selectedUserId, internalNotes, selectedTasks, selectedContactId, useClientAddress
        });
        if (currentHash !== initialDataHash) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
    }

    function selectClient(c: any) {
        selectedClientId = c.id;
        isClientSearchOpen = false;
        clientSearchQuery = "";
        if (useClientAddress) {
            const street = c.street || '';
            const nr = c.housenr || '';
            const zip = c.zip || '';
            const city = c.city || '';
            const line1 = (street + ' ' + nr).trim();
            const line2 = (zip + ' ' + city).trim();
            const fullAddr = [line1, line2].filter(Boolean).join(', ');
            if (fullAddr) location_address = fullAddr;
        }
    }

    function selectContact(contact: any) {
        selectedContactId = contact.id;
        useClientAddress = false;
        isContactSearchOpen = false;
        contactSearchQuery = "";
        const namePart = [contact.company_name, `${contact.name_first || ''} ${contact.name_last || ''}`.trim()].filter(Boolean).join(' - ');
        const addressPart = `${contact.street || ''} ${contact.housenr || ''}`.trim();
        const cityPart = `${contact.zip || ''} ${contact.city || ''}`.trim();
        location_address = [namePart, addressPart, cityPart].filter(Boolean).join(', ');
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
        if (isLoading) return;
        isLoading = true;
        errorMsg = "";

        if (!appDate) {
            errorMsg = "Bitte ein Datum wählen.";
            isLoading = false;
            return;
        }
        
        if (!is_blocked && !appStartTime) {
            errorMsg = "Bitte eine Startzeit wählen.";
            isLoading = false;
            return;
        }

        if (isSuperAdmin && !selectedUserId) {
            errorMsg = "Bitte einen zuständigen Mitarbeiter wählen.";
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
                appointment_at: selectedContactId ? [selectedContactId] : [],
                is_private,
                settled,
                is_series,
                is_visible,
                series_id: safeSeriesId,
                user: selectedUserId,
                client: selectedClientId ? [selectedClientId] : [],
                use_client_address: useClientAddress,
                notes: internalNotes,
                tasks: selectedTasks
            };

            let savedId: string | null = editId;
            if (editId) {
                const currentEditId: string = editId;
                await pb.collection('appointments').update(currentEditId, payload, { requestKey: null });

                if (appStartTime && appEndTime && !is_blocked) {
                    const startLocal = new Date(`${appDate}T${appStartTime}:00`).toISOString();
                    const endDate = new Date(`${appDate}T${appEndTime}:00`);
                    if (appEndTime < appStartTime) endDate.setDate(endDate.getDate() + 1);
                    const endLocal = endDate.toISOString();
                    
                    const trPayload = { start: startLocal, end: endLocal };
                    const existingApp: any = await pb.collection('appointments').getOne(currentEditId, { expand: 'time_record' });
                    let trId = existingApp.expand?.time_record?.[0]?.id;
                    
                    if (trId) {
                        await pb.collection('time_records').update(trId, trPayload);
                    } else {
                        const newTr = await pb.collection('time_records').create(trPayload);
                        const currentTrs = existingApp.time_record || [];
                        await pb.collection('appointments').update(currentEditId, { time_record: [...currentTrs, newTr.id] });
                    }
                } else if (!appEndTime || is_blocked) {
                    const existingApp: any = await pb.collection('appointments').getOne(currentEditId, { expand: 'time_record' });
                    if (existingApp.expand?.time_record && existingApp.expand.time_record.length > 0) {
                        for (const tr of existingApp.expand.time_record) {
                            await pb.collection('time_records').delete(tr.id);
                        }
                        await pb.collection('appointments').update(currentEditId, { time_record: [] });
                    }
                }
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
                            let trIds: string[] = [];
                            if (appStartTime && appEndTime && !is_blocked) {
                                const startLocal = new Date(`${iterDateStr}T${appStartTime}:00`).toISOString();
                                const endDateObj = new Date(`${iterDateStr}T${appEndTime}:00`);
                                if (appEndTime < appStartTime) endDateObj.setDate(endDateObj.getDate() + 1);
                                const endLocal = endDateObj.toISOString();
                                const newTr = await pb.collection('time_records').create({ start: startLocal, end: endLocal });
                                trIds = [newTr.id];
                            }
                            await pb.collection('appointments').create({
                                ...payload,
                                appointment: iterUtc,
                                time_record: trIds
                            }, { requestKey: null });
                        })());

                        if (seriesInterval === 'weekly') {
                            curr.setDate(curr.getDate() + 7);
                        } else if (seriesInterval === 'biweekly') {
                            curr.setDate(curr.getDate() + 14);
                        } else if (seriesInterval === 'monthly') {
                            curr.setMonth(curr.getMonth() + 1);
                        }
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
                    let trIds: string[] = [];
                    if (appStartTime && appEndTime && !is_blocked) {
                        const startLocal = new Date(`${appDate}T${appStartTime}:00`).toISOString();
                        const endDate = new Date(`${appDate}T${appEndTime}:00`);
                        if (appEndTime < appStartTime) endDate.setDate(endDate.getDate() + 1);
                        const endLocal = endDate.toISOString();
                        const newTr = await pb.collection('time_records').create({ start: startLocal, end: endLocal });
                        trIds = [newTr.id];
                    }

                    const record = await pb.collection('appointments').create({
                        ...payload,
                        time_record: trIds
                    }, { requestKey: null });
                    savedId = record.id;
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-2xl m-0 sm:m-auto rounded-none sm:rounded-3xl h-dvh sm:h-auto overflow-hidden" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 sm:rounded-3xl w-full h-full sm:max-h-[92dvh] flex flex-col relative overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <!-- Header -->
        <div class="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Calendar class="w-5 h-5" />
                </div>
                <div>
                    <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{editId ? 'Termin bearbeiten' : 'Neuen Termin anlegen'}</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">{editId ? 'Passe Zeiten, Klient und Leistungen an' : 'Planen, Zeiten erfassen & Abrechnung vorbereiten'}</p>
                </div>
            </div>
            <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer">
                <X class="w-5 h-5" />
            </button>
        </div>
        
        <form id="appForm" onsubmit={onSubmit} novalidate class="flex flex-col flex-1 overflow-y-auto custom-scrollbar relative">
            <div class="flex-1 p-5 sm:p-7 space-y-6">
                {#if errorMsg}
                    <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-sm font-medium border border-rose-100 dark:border-rose-900/60 flex items-center gap-2.5 shadow-sm">
                        <AlertCircle class="w-5 h-5 text-rose-500 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                {/if}

                <!-- Status & Toggles Bar -->
                <div class="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                    <div class="flex flex-wrap items-center justify-start sm:justify-between gap-2">
                        <button type="button" onclick={() => is_private = !is_private} class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer {is_private ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}" disabled={isLoading}>
                            <Lock class="w-3.5 h-3.5 {is_private ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}" />
                            <span>Privat</span>
                        </button>

                        <button type="button" onclick={() => settled = !settled} class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer {settled ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}" disabled={isLoading}>
                            <CheckCircle class="w-3.5 h-3.5 {settled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}" />
                            <span>Abgerechnet</span>
                        </button>

                        <button type="button" onclick={() => is_blocked = !is_blocked} class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer {is_blocked ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}" disabled={isLoading}>
                            <Ban class="w-3.5 h-3.5 {is_blocked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}" />
                            <span>Tag sperren</span>
                        </button>

                        {#if isSuperAdmin}
                            <button type="button" onclick={() => is_visible = !is_visible} class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer {is_visible ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-sm' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}" disabled={isLoading}>
                                {#if is_visible}
                                    <Eye class="w-3.5 h-3.5 text-sky-600" />
                                    <span>Öffentlich</span>
                                {:else}
                                    <EyeOff class="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Versteckt</span>
                                {/if}
                            </button>
                        {/if}
                    </div>
                </div>

                <!-- Section 1: Datum, Uhrzeit & Dauer -->
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                            <Clock class="w-3.5 h-3.5 text-indigo-600" />
                            <span>Terminzeit & Dauer</span>
                        </label>
                        {#if durationBadge}
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-enter">
                                <span>⏱️ Dauer:</span>
                                <strong>{durationBadge}</strong>
                            </span>
                        {/if}
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class={is_blocked ? 'sm:col-span-3' : 'sm:col-span-1'}>
                            <label for="app-date" class="block text-xs font-medium text-neutral-600 mb-1">Datum *</label>
                            <input id="app-date" name="appDate" type="date" bind:value={appDate} class="orga-input-clear min-h-12 py-2 text-sm font-medium" required disabled={isLoading} />
                        </div>
                        {#if !is_blocked}
                            <div class="sm:col-span-1">
                                <label for="app-start" class="block text-xs font-medium text-neutral-600 mb-1">Startzeit *</label>
                                <input id="app-start" name="appStartTime" type="time" bind:value={appStartTime} class="orga-input-clear min-h-12 py-2 text-sm font-medium" required disabled={isLoading} />
                            </div>
                            <div class="sm:col-span-1">
                                <label for="app-end" class="block text-xs font-medium text-neutral-600 mb-1">Endzeit</label>
                                <input id="app-end" name="appEndTime" type="time" bind:value={appEndTime} class="orga-input-clear min-h-12 py-2 text-sm font-medium" disabled={isLoading} />
                            </div>
                        {/if}
                    </div>

                    <!-- Quick Duration Buttons -->
                    {#if !is_blocked}
                        <div class="flex flex-wrap items-center gap-1.5 pt-1">
                            <span class="text-[11px] font-semibold text-neutral-400 mr-1">Dauer:</span>
                            <button type="button" onclick={() => applyDuration(30)} class="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-700 text-neutral-700 border border-neutral-200 transition-colors cursor-pointer" title="Endzeit auf +30 Minuten setzen">+30m</button>
                            <button type="button" onclick={() => applyDuration(45)} class="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-700 text-neutral-700 border border-neutral-200 transition-colors cursor-pointer" title="Endzeit auf +45 Minuten setzen">+45m</button>
                            <button type="button" onclick={() => applyDuration(60)} class="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-700 text-neutral-700 border border-neutral-200 transition-colors cursor-pointer" title="Endzeit auf +60 Minuten setzen">+60m (1h)</button>
                            <button type="button" onclick={() => applyDuration(90)} class="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-700 text-neutral-700 border border-neutral-200 transition-colors cursor-pointer" title="Endzeit auf +90 Minuten setzen">+90m (1.5h)</button>
                            <button type="button" onclick={() => applyDuration(120)} class="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-700 text-neutral-700 border border-neutral-200 transition-colors cursor-pointer" title="Endzeit auf +120 Minuten setzen">+120m (2h)</button>
                        </div>
                    {/if}

                    <!-- Serientermin Panel -->
                    {#if !editId}
                        <div class="bg-indigo-50/40 p-3.5 sm:p-4 rounded-2xl border border-indigo-100/80 space-y-3">
                            <label class="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" bind:checked={is_series} class="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500" disabled={isLoading} />
                                <span class="text-sm font-semibold text-indigo-950 flex items-center gap-1.5">
                                    <Repeat class="w-4 h-4 text-indigo-600" />
                                    <span>Serientermin anlegen</span>
                                </span>
                            </label>
                            
                            {#if is_series}
                                <div transition:slide={{ duration: 180 }} class="pt-3 border-t border-indigo-100 space-y-3">
                                    <div>
                                        <span class="block text-xs font-semibold text-indigo-900 mb-1.5">Wiederholungsintervall</span>
                                        <div class="grid grid-cols-3 gap-2">
                                            <button 
                                                type="button" 
                                                onclick={() => seriesInterval = 'weekly'} 
                                                class="py-2 px-2 text-xs font-semibold rounded-xl border transition-all text-center {seriesInterval === 'weekly' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-50'}"
                                            >
                                                Wöchentlich
                                            </button>
                                            <button 
                                                type="button" 
                                                onclick={() => seriesInterval = 'biweekly'} 
                                                class="py-2 px-2 text-xs font-semibold rounded-xl border transition-all text-center {seriesInterval === 'biweekly' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-50'}"
                                            >
                                                14-tägig
                                            </button>
                                            <button 
                                                type="button" 
                                                onclick={() => seriesInterval = 'monthly'} 
                                                class="py-2 px-2 text-xs font-semibold rounded-xl border transition-all text-center {seriesInterval === 'monthly' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-50'}"
                                            >
                                                Monatlich
                                            </button>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                        <div>
                                            <label for="app-series-end" class="block text-xs font-semibold text-indigo-900 mb-1">Wiederholen bis (Enddatum) *</label>
                                            <input id="app-series-end" name="appSeriesEndDate" type="date" bind:value={seriesEndDate} class="orga-input-clear min-h-11 py-2 text-sm bg-white border-indigo-200" disabled={isLoading} required />
                                        </div>
                                        <div>
                                            {#if calculatedSeriesCount > 0}
                                                <div class="p-2.5 rounded-xl bg-white border border-indigo-200 flex items-center gap-2 text-indigo-900 shadow-sm">
                                                    <Sparkles class="w-4 h-4 text-indigo-600 shrink-0" />
                                                    <span class="text-xs font-semibold">Generiert <strong>{calculatedSeriesCount}</strong> Termine</span>
                                                </div>
                                            {:else if seriesEndDate}
                                                <p class="text-xs text-amber-700">Enddatum muss nach dem Startdatum liegen.</p>
                                            {/if}
                                        </div>
                                    </div>
                                    <p class="text-[11px] text-indigo-700 leading-relaxed">Jeder Termin wird einzeln in der Datenbank angelegt. Sie können jeden Termin später bei Bedarf separat bearbeiten, verschieben oder abrechnen.</p>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Section 2: Klient & Mitarbeiter -->
                {#if !is_blocked}
                    <div class="space-y-3">
                        <label class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                            <User class="w-3.5 h-3.5 text-indigo-600" />
                            <span>Klient & Mitarbeiter</span>
                        </label>

                        <div class="grid grid-cols-1 {isSuperAdmin ? 'sm:grid-cols-2' : ''} gap-3">
                            <!-- Klient Combobox -->
                            <div class="relative">
                                <label for="client-search-input" class="block text-xs font-medium text-neutral-600 mb-1">Klient</label>
                                
                                {#if selectedClientRecord}
                                    <!-- Selected Client Card -->
                                    <div class="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-3">
                                        <div class="flex items-center gap-2.5 min-w-0">
                                            <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                {selectedClientRecord.name_first?.[0] || ''}{selectedClientRecord.name_last?.[0] || ''}
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-1.5 flex-wrap">
                                                    <p class="text-sm font-bold text-neutral-900 truncate">{selectedClientRecord.name_first} {selectedClientRecord.name_last}</p>
                                                    {#if selectedClientRecord.level_of_care}
                                                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">PG {selectedClientRecord.level_of_care}</span>
                                                    {/if}
                                                </div>
                                                <p class="text-xs text-neutral-500 truncate">{[selectedClientRecord.street, selectedClientRecord.city].filter(Boolean).join(', ') || 'Keine Adresse hinterlegt'}</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-1 shrink-0">
                                            <button 
                                                type="button" 
                                                onclick={() => { isClientSearchOpen = !isClientSearchOpen; }} 
                                                class="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            >
                                                Ändern
                                            </button>
                                            <button 
                                                type="button" 
                                                onclick={() => { selectedClientId = ""; useClientAddress = false; }} 
                                                class="p-1 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors" 
                                                title="Klient entfernen"
                                            >
                                                <X class="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                {:else}
                                    <!-- Search Input -->
                                    <div class="relative">
                                        <input 
                                            id="client-search-input"
                                            type="text"
                                            bind:value={clientSearchQuery}
                                            onfocus={() => isClientSearchOpen = true}
                                            placeholder="Klient suchen (Name, Ort, PG)..."
                                            class="orga-input-clear min-h-12 pl-10 pr-4 text-sm"
                                            disabled={isLoading}
                                        />
                                        <Search class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                {/if}

                                <!-- Dropdown List -->
                                {#if isClientSearchOpen}
                                    <div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-neutral-200 shadow-xl max-h-60 overflow-y-auto custom-scrollbar z-30 p-1.5">
                                        <button 
                                            type="button" 
                                            onclick={() => { selectedClientId = ""; isClientSearchOpen = false; useClientAddress = false; }} 
                                            class="w-full text-left px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 rounded-xl transition-colors mb-1"
                                        >
                                            🚫 Kein Klient (z.B. Bürotätigkeit, Teambesprechung)
                                        </button>
                                        
                                        {#if filteredClients.length === 0}
                                            <p class="text-xs text-neutral-400 p-3 text-center italic">Keine Klienten gefunden</p>
                                        {:else}
                                            {#each filteredClients as client (client.id)}
                                                <button 
                                                    type="button" 
                                                    onclick={() => selectClient(client)} 
                                                    class="w-full text-left p-2 hover:bg-indigo-50/70 rounded-xl transition-colors flex items-center justify-between gap-2 {selectedClientId === client.id ? 'bg-indigo-50' : ''}"
                                                >
                                                    <div class="min-w-0">
                                                        <div class="flex items-center gap-1.5">
                                                            <span class="text-xs font-bold text-neutral-900">{client.name_first} {client.name_last}</span>
                                                            {#if client.level_of_care}
                                                                <span class="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">PG {client.level_of_care}</span>
                                                            {/if}
                                                        </div>
                                                        <p class="text-[11px] text-neutral-500 truncate">{[client.zip, client.city, client.street].filter(Boolean).join(' ')}</p>
                                                    </div>
                                                    {#if client.notes}
                                                        <span class="text-amber-500 text-xs shrink-0" title="Notizen vorhanden">📝</span>
                                                    {/if}
                                                </button>
                                            {/each}
                                        {/if}
                                    </div>
                                {/if}
                            </div>

                            <!-- Mitarbeiter (SuperAdmin / Admin) -->
                            {#if isSuperAdmin}
                                <div>
                                    <label for="app-user" class="block text-xs font-medium text-neutral-600 mb-1">Zuständiger Mitarbeiter *</label>
                                    <select id="app-user" name="appUser" bind:value={selectedUserId} class="orga-input-clear min-h-12 py-2 text-sm cursor-pointer" required disabled={isLoading}>
                                        <option value="">Bitte Mitarbeiter wählen...</option>
                                        {#each users as u (u.id)}
                                            <option value={u.id}>{u.name_first} {u.name_last}</option>
                                        {/each}
                                    </select>
                                </div>
                            {/if}
                        </div>

                        <!-- Client Notes Alert -->
                        {#if selectedClientRecord?.notes}
                            <div class="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 shadow-sm animate-enter">
                                <span class="text-amber-500 text-base leading-none mt-0.5">💡</span>
                                <div>
                                    <p class="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">Wichtige Notizen zu diesem Klienten</p>
                                    <p class="text-xs text-amber-950 font-medium whitespace-pre-wrap leading-relaxed">{selectedClientRecord.notes}</p>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Section 3: Titel & Vorlagen -->
                <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                        <label for="app-desc" class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                            <Edit3 class="w-3.5 h-3.5 text-indigo-600" />
                            <span>Titel & Tätigkeit</span>
                        </label>
                    </div>

                    <!-- Quick Activity Chips -->
                    {#if !is_blocked}
                        <div class="flex flex-wrap items-center gap-1.5">
                            {#each quickTemplates as tpl}
                                <button 
                                    type="button" 
                                    onclick={() => applyTemplate(tpl)} 
                                    class="px-2.5 py-1 rounded-xl text-xs font-medium bg-neutral-50 hover:bg-indigo-50 text-neutral-700 hover:text-indigo-800 border border-neutral-200/80 transition-all flex items-center gap-1 cursor-pointer {description === tpl.label ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-semibold' : ''}"
                                >
                                    <span>{tpl.icon}</span>
                                    <span>{tpl.label}</span>
                                </button>
                            {/each}
                        </div>
                    {/if}

                    <textarea 
                        id="app-desc" 
                        name="appDesc" 
                        use:autoResize 
                        bind:value={description} 
                        rows="1" 
                        class="orga-input-clear min-h-12 py-2.5 text-sm font-medium" 
                        placeholder={is_blocked ? "z.B. Urlaub / Abwesend" : "z.B. Arztbesuch Begleitung, Hauswirtschaft..."} 
                        disabled={isLoading}
                    ></textarea>
                </div>

                <!-- Section 4: Ort & Route -->
                {#if !is_blocked}
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <label for="app-location" class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                <MapPin class="w-3.5 h-3.5 text-indigo-600" />
                                <span>Ort & Zieladresse</span>
                            </label>

                            <div class="flex items-center gap-2">
                                {#if location_address.trim()}
                                    <a 
                                        href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(location_address.trim())}" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                                        title="In Google Maps öffnen"
                                    >
                                        <ExternalLink class="w-3 h-3" />
                                        <span>In Google Maps</span>
                                    </a>
                                {/if}

                                {#if selectedClientId}
                                    <div class="flex items-center gap-1.5 cursor-pointer group">
                                        <span class="text-[11px] font-bold text-neutral-500 group-hover:text-indigo-600 transition-colors">Beim Klienten?</span>
                                        <button 
                                            type="button"
                                            aria-label="Adresse beim Klienten verwenden"
                                            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {useClientAddress ? 'bg-indigo-600' : 'bg-neutral-200'}" 
                                            role="switch" 
                                            aria-checked={useClientAddress} 
                                            onclick={() => useClientAddress = !useClientAddress}
                                        >
                                            <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {useClientAddress ? 'translate-x-4' : 'translate-x-0'}"></span>
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <div class="relative">
                            <input 
                                id="app-location" 
                                name="appLocation" 
                                type="text" 
                                bind:value={location_address} 
                                oninput={() => { selectedContactId = ""; }} 
                                class="orga-input-clear min-h-12 py-2.5 pr-8 text-sm" 
                                placeholder="z.B. Dr. Mustermann, Hauptstraße 10, 10115 Berlin" 
                                disabled={isLoading} 
                            />
                            {#if location_address}
                                <button 
                                    type="button" 
                                    onclick={() => { location_address = ""; useClientAddress = false; selectedContactId = ""; }}
                                    class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
                                    title="Adresse leeren"
                                >
                                    <X class="w-4 h-4" />
                                </button>
                            {/if}
                        </div>

                        <!-- Searchable Contact Picker for Destinations (Doctors, Pharmacies, Therapists) -->
                        <div class="relative">
                            <label for="contact-search-input" class="block text-xs font-medium text-neutral-600 mb-1">Zieladresse aus Kontakten (Ärzte, Apotheken, etc.)</label>
                            
                            <div class="relative">
                                <input 
                                    id="contact-search-input"
                                    type="text"
                                    bind:value={contactSearchQuery}
                                    onfocus={() => isContactSearchOpen = true}
                                    placeholder="+ Arzt / Praxis / Kontakt durchsuchen..."
                                    class="orga-input-clear min-h-11 pl-9 text-xs bg-blue-50/30 border-blue-100 text-blue-950 placeholder-blue-400/80"
                                    disabled={isLoading}
                                />
                                <Building2 class="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            {#if isContactSearchOpen}
                                <div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-neutral-200 shadow-xl max-h-56 overflow-y-auto custom-scrollbar z-30 p-1.5">
                                    <button 
                                        type="button" 
                                        onclick={() => { selectedContactId = ""; isContactSearchOpen = false; }} 
                                        class="w-full text-left px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-50 rounded-xl mb-1"
                                    >
                                        ✕ Keine Kontakt-Adresse übernehmen
                                    </button>
                                    {#if filteredContacts.length === 0}
                                        <p class="text-xs text-neutral-400 p-3 text-center italic">Keine Kontakte gefunden</p>
                                    {:else}
                                        {#each filteredContacts as contact (contact.id)}
                                            <button 
                                                type="button" 
                                                onclick={() => selectContact(contact)} 
                                                class="w-full text-left p-2 hover:bg-blue-50/70 rounded-xl transition-colors flex items-center justify-between gap-2"
                                            >
                                                <div class="min-w-0">
                                                    <p class="text-xs font-bold text-neutral-900">
                                                        {#if contact.company_name}{contact.company_name} - {/if}
                                                        {contact.name_first} {contact.name_last}
                                                    </p>
                                                    <p class="text-[11px] text-neutral-500 truncate">{[contact.street, contact.zip, contact.city].filter(Boolean).join(' ')}</p>
                                                </div>
                                                {#if contact.category}
                                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-600 shrink-0">{contact.category}</span>
                                                {/if}
                                            </button>
                                        {/each}
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                <!-- Section 5: Leistungen (Tasks) -->
                {#if !is_blocked}
                    <div class="space-y-2">
                        <button
                            type="button"
                            class="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200/80 transition-colors cursor-pointer"
                            onclick={() => (isLeistungenExpanded = !isLeistungenExpanded)}
                            aria-expanded={isLeistungenExpanded}
                        >
                            <div class="flex items-center gap-2">
                                <ListTodo class="w-4 h-4 text-indigo-600" />
                                <span class="text-xs font-bold uppercase tracking-wider text-neutral-700">Geplante Leistungen (Abrechnung)</span>
                                {#if selectedTasks.length > 0}
                                    <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">{selectedTasks.length}</span>
                                {/if}
                            </div>
                            <div class="flex items-center gap-1 text-xs font-semibold text-neutral-500">
                                <span>{isLeistungenExpanded ? 'Einklappen' : 'Auswählen'}</span>
                                {#if isLeistungenExpanded}
                                    <ChevronUp class="w-4 h-4" />
                                {:else}
                                    <ChevronDown class="w-4 h-4" />
                                {/if}
                            </div>
                        </button>

                        {#if !isLeistungenExpanded}
                            {#if selectedTaskRecords.length > 0}
                                <div class="flex flex-wrap gap-2 pt-1">
                                    {#each selectedTaskRecords as t}
                                        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold">
                                            <span>✓</span>
                                            <span>{t.title}</span>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        {:else}
                            <div transition:slide={{ duration: 180 }} class="p-3 bg-white rounded-2xl border border-neutral-200 space-y-2">
                                <div class="flex flex-wrap gap-2">
                                    {#each (orgaStore.tasks?.data || []).slice().sort((a: any, b: any) => a.title.localeCompare(b.title)) as t}
                                        <button 
                                            type="button" 
                                            onclick={() => toggleTask(t.id)} 
                                            class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer {selectedTasks.includes(t.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-neutral-200 text-neutral-700 hover:border-indigo-300 hover:bg-indigo-50/50'}" 
                                            disabled={isLoading}
                                        >
                                            {selectedTasks.includes(t.id) ? '✓ ' : '+ '}{t.title}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>

                    <!-- Section 6: Interne Notizen -->
                    <div class="space-y-1.5">
                        <label for="app-notes" class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                            <AlignLeft class="w-3.5 h-3.5 text-indigo-600" />
                            <span>Interne Notizen (fürs Team)</span>
                        </label>
                        <textarea 
                            id="app-notes" 
                            name="appNotes" 
                            use:autoResize 
                            bind:value={internalNotes} 
                            rows="2" 
                            class="orga-input-clear min-h-12 py-2.5 text-sm custom-scrollbar" 
                            placeholder="Zusätzliche Infos, To-Dos oder Hinweise für den Mitarbeiter..." 
                            disabled={isLoading}
                        ></textarea>
                    </div>
                {/if}
            </div>

            <!-- Footer Action Buttons -->
            <div class="p-4 sm:p-6 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sm:sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]">
                <div class="flex flex-col-reverse sm:flex-row justify-between gap-3">
                    {#if editId}
                        <div class="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                            <button type="button" onclick={deleteAppointment} class="orga-button-danger min-h-12 w-full sm:w-auto py-2.5" disabled={isLoading}>Termin löschen</button>
                            {#if is_series && series_id}
                                <button type="button" onclick={deleteSeries} class="orga-button-danger min-h-12 w-full sm:w-auto py-2.5" disabled={isLoading}>Serie löschen</button>
                            {/if}
                        </div>
                    {:else}
                        <div class="hidden sm:block"></div>
                    {/if}
                    <div class="flex flex-col-reverse sm:flex-row gap-2.5 w-full sm:w-auto">
                        <button type="button" onclick={attemptClose} class="orga-button-ghost min-h-12 w-full sm:w-auto py-2.5" disabled={isLoading}>Abbrechen</button>
                        <button type="submit" class="orga-button-primary min-h-12 shadow-indigo-600/20 w-full sm:w-auto py-2.5 font-semibold" disabled={isLoading}>
                            {#if isLoading}
                                <span>Speichert...</span>
                            {:else if editId}
                                <span>Änderungen speichern</span>
                            {:else if is_series}
                                <span>Serie anlegen ({calculatedSeriesCount || 1})</span>
                            {:else}
                                <span>Termin anlegen</span>
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </div>
</dialog>