<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ClientPortalAccessModal from "$lib/components/portal/ClientPortalAccessModal.svelte";
    import { resolveMatchingInquiriesForContact } from "$lib/services/contactPickerService";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    // svelte-ignore non_reactive_update
    let portalAccessModal: ReturnType<typeof ClientPortalAccessModal>;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let isEditing = $state(false);
    let editId = $state<string | null>(null);
    let salutation = $state("");
    let company_name = $state("");
    let name_first = $state("");
    let name_last = $state("");
    let email = $state("");
    let phone = $state("");
    let street = $state("");
    let housenr = $state("");
    let zip = $state("");
    let city = $state("");
    let notes = $state("");
    let birthdate = $state("");
    let currentRecord = $state<any>(null);

    // Signatur-Status
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let uploadedFile = $state<File | null>(null);
    let hasDrawnSignature = $state(false);
    let existingSignatureUrl = $state("");
    let deleteExistingSignature = $state(false);
    let initialDataHash = $state("");
    let isSignatureFullscreen = $state(false);
    let sigDialog = $state<HTMLDialogElement | null>(null);

    let linkedClients = $state<string[]>([]);
    let initialLinkedClients = $state<string[]>([]);
    
    let linkedHomes = $state<string[]>([]);
    let initialLinkedHomes = $state<string[]>([]);

    let linkedMailingLists = $state<string[]>([]);
    let initialLinkedMailingLists = $state<string[]>([]);
    let initialEmail = $state("");

    function toYMD(val: string) {
        if (!val) return "";
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;
        if (val.includes('.')) {
            const parts = val.split(/[. ]/);
            if (parts.length >= 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return val.substring(0, 10);
    }

    function safeFormatDate(val: string) {
        if (!val) return '';
        const clean = val.trim().replace(' ', 'T');
        const d = new Date(clean);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[3]}.${match[2]}.${match[1]}`;
        return val.split(' ')[0];
    }

    export function open(record?: any) {
        if (record) {
            currentRecord = record;
            editId = record.id;
            isEditing = false;
            salutation = record.salutation || "Keine Angabe";
            company_name = record.company_name || "";
            name_first = record.name_first || "";
            name_last = record.name_last || "";
            email = record.email || "";
            initialEmail = record.email || "";
            phone = record.phone || "";
            street = record.street || "";
            housenr = record.housenr || "";
            zip = record.zip || "";
            city = record.city || "";
            birthdate = toYMD(record.birthdate) || "";
            let n = record.notes;
            if (typeof n === 'string') {
                try { n = JSON.parse(n); } catch {}
            }
            notes = n || "";
            if (record.sign) {
                existingSignatureUrl = pb.files.getURL(record, record.sign);
            } else {
                existingSignatureUrl = "";
            }
            const linked = (orgaStore.clients?.data || []).filter((c: any) => {
                const cContacts = Array.isArray(c.contacts) ? c.contacts : (c.contacts ? [c.contacts] : []);
                return cContacts.includes(record.id) || c.caregiver === record.id;
            }).map((c: any) => c.id);
            linkedClients = [...linked];
            initialLinkedClients = [...linked];

            const linkedH = (orgaStore.retirement_homes?.data || []).filter((h: any) => {
                const hContacts = Array.isArray(h.contacts) ? h.contacts : (h.contacts ? [h.contacts] : []);
                return hContacts.includes(record.id);
            }).map((h: any) => h.id);
            linkedHomes = [...linkedH];
            initialLinkedHomes = [...linkedH];

            const linkedML = (orgaStore.clients?.data || []).filter((c: any) => {
                const ml = Array.isArray(c.mailing_list) ? c.mailing_list : (c.mailing_list ? [c.mailing_list] : []);
                return initialEmail && ml.includes(initialEmail);
            }).map((c: any) => c.id);
            linkedMailingLists = [...linkedML];
            initialLinkedMailingLists = [...linkedML];
        } else {
            currentRecord = null;
            editId = null;
            isEditing = true;
            salutation = "Keine Angabe";
            company_name = "";
            name_first = "";
            name_last = "";
            email = "";
            initialEmail = "";
            phone = "";
            street = "";
            housenr = "";
            zip = "";
            city = "";
            notes = "";
            birthdate = "";
            existingSignatureUrl = "";
            linkedClients = [];
            initialLinkedClients = [];
            linkedHomes = [];
            initialLinkedHomes = [];
            linkedMailingLists = [];
            initialLinkedMailingLists = [];
        }
        
        hasDrawnSignature = false;
        uploadedFile = null;
        deleteExistingSignature = false;
        errorMsg = "";
        initialDataHash = JSON.stringify({ salutation, company_name, name_first, name_last, email, phone, street, housenr, zip, city, notes, birthdate, hasDrawnSignature, deleteExistingSignature, linkedClients, linkedHomes, linkedMailingLists });
        dialog?.showModal();

        if (isEditing && !editId) {
            setTimeout(clearSignature, 50);
        }
    }

    export function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        if (JSON.stringify({ salutation, company_name, name_first, name_last, email, phone, street, housenr, zip, city, notes, birthdate, hasDrawnSignature, deleteExistingSignature, linkedClients, linkedHomes, linkedMailingLists }) !== initialDataHash) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
    }
    
    function startEdit() {
        isEditing = true;
        setTimeout(clearSignature, 50);
    }

    function toggleClient(id: string) {
        if (linkedClients.includes(id)) {
            linkedClients = linkedClients.filter(cId => cId !== id);
        } else {
            linkedClients = [...linkedClients, id];
        }
    }
    
    function toggleHome(id: string) {
        if (linkedHomes.includes(id)) {
            linkedHomes = linkedHomes.filter(hId => hId !== id);
        } else {
            linkedHomes = [...linkedHomes, id];
        }
    }

    function toggleMailingList(id: string) {
        if (linkedMailingLists.includes(id)) {
            linkedMailingLists = linkedMailingLists.filter(cId => cId !== id);
        } else {
            linkedMailingLists = [...linkedMailingLists, id];
        }
    }

    // --- Canvas (Zeichen) Logik ---
    function getPointerPos(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (window.TouchEvent && e instanceof TouchEvent) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }
    function startDrawing(e: MouseEvent | TouchEvent) {
        if (!canvas) return;
        e.preventDefault();
        isDrawing = true;
        hasDrawnSignature = true;
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#4f46e5"; ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
    }
    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
    }
    function stopDrawing() { isDrawing = false; }
    function clearSignature() { if (!canvas) return; const ctx = canvas.getContext("2d"); if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); } hasDrawnSignature = false; uploadedFile = null; }
    function handleFileChange(e: Event) { const target = e.target as HTMLInputElement; if (target.files && target.files.length > 0) { uploadedFile = target.files[0]; } else { uploadedFile = null; } }

    function openSignatureFullscreen() {
        isSignatureFullscreen = true;
        sigDialog?.showModal();
    }

    function closeSignatureFullscreen() {
        isSignatureFullscreen = false;
        sigDialog?.close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const pbFormData = new FormData();
            pbFormData.append('salutation', salutation);
            pbFormData.append('company_name', company_name);
            pbFormData.append('name_first', name_first);
            pbFormData.append('name_last', name_last);
            pbFormData.append('email', email);
            pbFormData.append('phone', phone);
            pbFormData.append('street', street);
            pbFormData.append('housenr', housenr);
            pbFormData.append('zip', zip);
            pbFormData.append('city', city);
            pbFormData.append('notes', notes ? JSON.stringify(notes) : "");
            if (birthdate) pbFormData.append('birthdate', `${birthdate.trim()} 12:00:00.000Z`);

            if (signatureMode === "upload" && uploadedFile) {
                pbFormData.append("sign", uploadedFile);
            } else if (signatureMode === "draw" && hasDrawnSignature && canvas) {
                const blob = await new Promise<Blob | null>(resolve => canvas!.toBlob(resolve, "image/png"));
                if (blob) pbFormData.append("sign", blob, "signature.png");
            } else if (deleteExistingSignature) {
                pbFormData.append("sign", "");
            }
            
            let savedContactId = editId;
            if (editId) {
                await pb.collection('contacts').update(editId, pbFormData);
            } else {
                const newRecord = await pb.collection('contacts').create(pbFormData);
                savedContactId = newRecord.id;
                resolveMatchingInquiriesForContact(newRecord);
            }

            // Verknüpfte Klienten aktualisieren
            if (savedContactId) {
                const clientsToUpdate = [];
                for (const c of orgaStore.clients?.data || []) {
                    const isCurrentlyLinked = initialLinkedClients.includes(c.id);
                    const shouldBeLinked = linkedClients.includes(c.id);
                    
                    if (isCurrentlyLinked !== shouldBeLinked) {
                        let cContacts = Array.isArray(c.contacts) ? [...c.contacts] : (c.contacts ? [c.contacts] : []);
                        let updates: any = {};
                        
                        if (shouldBeLinked) {
                            if (!cContacts.includes(savedContactId)) { cContacts.push(savedContactId); updates.contacts = cContacts; }
                        } else {
                            if (cContacts.includes(savedContactId)) { updates.contacts = cContacts.filter((id: string) => id !== savedContactId); }
                            if (c.caregiver === savedContactId) { updates.caregiver = ""; }
                        }
                        
                        if (Object.keys(updates).length > 0) { clientsToUpdate.push({ id: c.id, ...updates }); }
                    }
                }

                for (const update of clientsToUpdate) {
                    const idToUpdate = update.id;
                    delete update.id;
                    await pb.collection('clients').update(idToUpdate, update);
                }

                if (clientsToUpdate.length > 0) {
                    setTimeout(async () => { if (orgaStore.clients) await orgaStore.clients.init(); }, 400);
                }

                // Verknüpfte Pflegeheime aktualisieren
                const homesToUpdate = [];
                for (const h of orgaStore.retirement_homes?.data || []) {
                    const isCurrentlyLinked = initialLinkedHomes.includes(h.id);
                    const shouldBeLinked = linkedHomes.includes(h.id);
                    
                    if (isCurrentlyLinked !== shouldBeLinked) {
                        let hContacts = Array.isArray(h.contacts) ? [...h.contacts] : (h.contacts ? [h.contacts] : []);
                        let updates: any = {};
                        
                        if (shouldBeLinked) {
                            if (!hContacts.includes(savedContactId)) { hContacts.push(savedContactId); updates.contacts = hContacts; }
                        } else {
                            if (hContacts.includes(savedContactId)) { updates.contacts = hContacts.filter((id: string) => id !== savedContactId); }
                        }
                        
                        if (Object.keys(updates).length > 0) { homesToUpdate.push({ id: h.id, ...updates }); }
                    }
                }
                for (const update of homesToUpdate) {
                    const idToUpdate = update.id;
                    delete update.id;
                    await pb.collection('retirement_homes').update(idToUpdate, update);
                }
                if (homesToUpdate.length > 0) {
                    setTimeout(async () => { if (orgaStore.retirement_homes) await orgaStore.retirement_homes.init(); }, 400);
                }
            }
            
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
    
    async function onDelete() {
        if (!editId || !(await confirmStore.ask("Möchten Sie diesen Kontakt wirklich löschen?", "Kontakt löschen?", "Löschen", "Abbrechen", true))) return;
        isLoading = true;
        try {
            await pb.collection('contacts').delete(editId);
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Löschen.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <!-- Header -->
        <div class="bg-white/95 dark:bg-slate-900/95 px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-20 gap-3 backdrop-blur-md">
            <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {#if !isEditing}
                    Kontakt-Akte
                {:else if editId}
                    Kontakt bearbeiten
                {:else}
                    Neuer Kontakt
                {/if}
            </h2>
            <div class="flex items-center gap-3 shrink-0">
                {#if !isEditing}
                    {#if editId}
                        <button type="button" onclick={() => portalAccessModal?.open(currentRecord, 'contact')} class="orga-button-ghost py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold shadow-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                            <span class="text-sm">🪪</span> Portal-Zugang
                        </button>
                    {/if}
                    <button type="button" onclick={startEdit} class="orga-button-ghost py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold shadow-sm">
                        <svg class="w-4 h-4 mr-1.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Bearbeiten
                    </button>
                    <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                {/if}
                <button aria-label="Schließen" onclick={attemptClose} class="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900">
            {#if errorMsg}<div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl mb-6 text-sm font-medium border border-red-200 dark:border-red-900/60">{errorMsg}</div>{/if}

            {#if !isEditing}
                <div class="space-y-6">
                    <div class="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden group">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 z-0"></div>
                        
                        <div class="p-6 md:p-8 relative z-10">
                            <div class="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-700/80 pb-6">
                                <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-2xl shrink-0 shadow-inner">
                                    {(name_first?.charAt(0) || company_name?.charAt(0) || '?').toUpperCase()}{(name_last?.charAt(0) || '')}
                                </div>
                                <div>
                                    <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">{salutation !== 'Keine Angabe' ? salutation + ' ' : ''}{name_first} {name_last}</h2>
                                    {#if company_name}
                                        <p class="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1 tracking-wider uppercase">{company_name}</p>
                                    {/if}
                                </div>
                            </div>

                            <div class="space-y-6">
                                {#if birthdate}
                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🎂</span></div>
                                    <div>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Geburtsdatum</p>
                                        <p class="text-slate-900 dark:text-slate-100 font-bold">{safeFormatDate(birthdate)}</p>
                                    </div>
                                </div>
                                {/if}

                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">📞</span></div>
                                    <div>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Telefon</p>
                                        <p class="text-slate-900 dark:text-slate-100 font-bold">{phone || 'Nicht hinterlegt'}</p>
                                    </div>
                                </div>

                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">✉️</span></div>
                                    <div>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">E-Mail</p>
                                        <p class="text-slate-900 dark:text-slate-100 font-bold break-all">{email || 'Nicht hinterlegt'}</p>
                                    </div>
                                </div>

                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🏠</span></div>
                                    <div>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Adresse</p>
                                        <p class="text-slate-900 dark:text-slate-100 font-bold leading-relaxed">{#if street || city}{street || ''} {housenr || ''}<br /> {zip || ''} {city || ''}{:else}Nicht hinterlegt{/if}</p>
                                        {#if street || city}
                                            <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${company_name ? company_name + ' ' : ''}${name_first || ''} ${name_last || ''}, ${street || ''} ${housenr || ''}, ${zip || ''} ${city || ''}`)}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-200 dark:border-blue-800 shadow-sm active:scale-95">
                                                <span>🗺️</span> In Google Maps öffnen
                                            </a>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            
                            {#if notes}
                            <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/80">
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-3">Notizen</p>
                                <p class="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{notes}</p>
                            </div>
                            {/if}

                            {#if existingSignatureUrl}
                                <div class="pt-6 mt-6 border-t border-slate-100 dark:border-slate-700/80">
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-3">Unterschrift</p>
                                    <div class="bg-white rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex justify-center shadow-sm">
                                    <img src={existingSignatureUrl} alt="Unterschrift" class="max-h-24 object-contain bg-white rounded-lg p-1" />
                                    </div>
                                </div>
                            {/if}
                            
                            <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/80">
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-3">Zugeordnete Klienten</p>
                                {#if linkedClients.length > 0}
                                    <div class="flex flex-col gap-2">
                                        {#each linkedClients as cId}
                                            {@const c = orgaStore.clients?.data?.find((cl: any) => cl.id === cId)}
                                            {#if c}
                                                <div class="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">{(c.name_first?.charAt(0)||'')}{(c.name_last?.charAt(0)||'')}</div>
                                                    <div>
                                                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name_first} {c.name_last}</p>
                                                        <p class="text-xs text-slate-500 dark:text-slate-400">{c.street || ''} {c.city || ''}</p>
                                                    </div>
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                {:else}
                                    <p class="text-sm text-slate-500 dark:text-slate-400 italic">Dieser Kontakt ist noch keinem Klienten zugeordnet.</p>
                                {/if}
                            </div>
                            
                            <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/80">
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-3">Zugeordnete Pflegeheime</p>
                                {#if linkedHomes.length > 0}
                                    <div class="flex flex-col gap-2">
                                        {#each linkedHomes as hId}
                                            {@const h = orgaStore.retirement_homes?.data?.find((rh: any) => rh.id === hId)}
                                            {#if h}
                                                <div class="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">🏥</div>
                                                    <div>
                                                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{h.name}</p>
                                                        <p class="text-xs text-slate-500 dark:text-slate-400">{h.address || ''}</p>
                                                    </div>
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                {:else}
                                    <p class="text-sm text-slate-500 dark:text-slate-400 italic">Dieser Kontakt ist keinem Pflegeheim zugeordnet.</p>
                                {/if}
                            </div>
                            
                            <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/80">
                                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-3">Im CC-Verteiler von Klienten</p>
                                {#if linkedMailingLists.length > 0}
                                    <div class="flex flex-col gap-2">
                                        {#each linkedMailingLists as cId}
                                            {@const c = orgaStore.clients?.data?.find((cl: any) => cl.id === cId)}
                                            {#if c}
                                                <div class="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">📧</div>
                                                    <div>
                                                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name_first} {c.name_last}</p>
                                                        <p class="text-xs text-slate-500 dark:text-slate-400">Mails an Verteiler CC gehen an diesen Kontakt</p>
                                                    </div>
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                {:else}
                                    <p class="text-sm text-slate-500 dark:text-slate-400 italic">Dieser Kontakt ist in keinem E-Mail-Verteiler eingetragen.</p>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {:else}
                <form onsubmit={onSubmit} class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label for="contact-salutation" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Anrede</label><select id="contact-salutation" bind:value={salutation} class="orga-input-clear" disabled={isLoading}><option value="Keine Angabe">Keine Angabe</option><option value="Herr">Herr</option><option value="Frau">Frau</option></select></div>
                        <div><label for="contact-company" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Firmenname (optional)</label><input id="contact-company" type="text" bind:value={company_name} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-first" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Vorname</label><input id="contact-first" type="text" bind:value={name_first} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-last" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nachname</label><input id="contact-last" type="text" bind:value={name_last} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-birthdate" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Geburtsdatum</label><input id="contact-birthdate" type="date" bind:value={birthdate} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-email" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">E-Mail</label><input id="contact-email" type="email" bind:value={email} class="orga-input-clear" disabled={isLoading} /></div>
                        <div class="md:col-span-2"><label for="contact-phone" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Telefon</label><input id="contact-phone" type="text" bind:value={phone} class="orga-input-clear" disabled={isLoading} /></div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <div class="md:col-span-2"><label for="contact-street" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Straße</label><input id="contact-street" type="text" bind:value={street} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-housenr" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Hausnr.</label><input id="contact-housenr" type="text" bind:value={housenr} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-zip" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">PLZ</label><input id="contact-zip" type="text" bind:value={zip} class="orga-input-clear" disabled={isLoading} /></div>
                        <div class="md:col-span-4"><label for="contact-city" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Stadt</label><input id="contact-city" type="text" bind:value={city} class="orga-input-clear" disabled={isLoading} /></div>
                    </div>
                    {#if street || city}
                        <div class="flex justify-end mt-1">
                            <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${company_name ? company_name + ' ' : ''}${name_first || ''} ${name_last || ''}, ${street || ''} ${housenr || ''}, ${zip || ''} ${city || ''}`)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors border border-blue-200 dark:border-blue-800">
                                <span>🗺️</span> Auf Karte prüfen
                            </a>
                        </div>
                    {/if}
                    
                    <div class="pt-2">
                        <label for="contact-notes" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notizen</label>
                        <textarea id="contact-notes" bind:value={notes} class="orga-input-clear resize-y" rows="3" disabled={isLoading}></textarea>
                    </div>

                    <div class="pt-4">
                        <span class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Verknüpfte Klienten</span>
                        <div class="border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto custom-scrollbar p-1 bg-white dark:bg-slate-900">
                            {#each orgaStore.clients?.data || [] as c}
                                <label class="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors">
                                    <input type="checkbox" checked={linkedClients.includes(c.id)} onchange={() => toggleClient(c.id)} class="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500" disabled={isLoading} />
                                    <div>
                                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name_first} {c.name_last}</p>
                                        <p class="text-xs text-slate-500 dark:text-slate-400">{c.city || ''}</p>
                                    </div>
                                </label>
                            {/each}
                            {#if (orgaStore.clients?.data || []).length === 0}
                                <p class="text-sm text-slate-500 dark:text-slate-400 p-3 italic">Keine Klienten im System vorhanden.</p>
                            {/if}
                        </div>
                    </div>

                    <div class="pt-4">
                        <span class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Zugeordnete Pflegeheime</span>
                        <div class="border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto custom-scrollbar p-1 bg-white dark:bg-slate-900">
                            {#each orgaStore.retirement_homes?.data || [] as h}
                                <label class="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors">
                                    <input type="checkbox" checked={linkedHomes.includes(h.id)} onchange={() => toggleHome(h.id)} class="w-4 h-4 text-teal-600 border-slate-300 dark:border-slate-600 rounded focus:ring-teal-500" disabled={isLoading} />
                                    <div>
                                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{h.name}</p>
                                        <p class="text-xs text-slate-500 dark:text-slate-400">{h.address || ''}</p>
                                    </div>
                                </label>
                            {/each}
                            {#if (orgaStore.retirement_homes?.data || []).length === 0}
                                <p class="text-sm text-slate-500 dark:text-slate-400 p-3 italic">Keine Pflegeheime im System vorhanden.</p>
                            {/if}
                        </div>
                    </div>

                    <div class="pt-4">
                        <span class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Im CC-Verteiler von Klienten</span>
                        {#if !email}
                            <p class="text-xs text-rose-600 dark:text-rose-400 p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60">Bitte zuerst eine E-Mail Adresse hinterlegen.</p>
                        {:else}
                            <div class="border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto custom-scrollbar p-1 bg-white dark:bg-slate-900">
                                {#each orgaStore.clients?.data || [] as c}
                                    <label class="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors">
                                        <input type="checkbox" checked={linkedMailingLists.includes(c.id)} onchange={() => toggleMailingList(c.id)} class="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500" disabled={isLoading} />
                                        <div>
                                            <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name_first} {c.name_last}</p>
                                            <p class="text-xs text-slate-500 dark:text-slate-400">{c.city || ''}</p>
                                        </div>
                                    </label>
                                {/each}
                                {#if (orgaStore.clients?.data || []).length === 0}
                                    <p class="text-sm text-slate-500 dark:text-slate-400 p-3 italic">Keine Klienten im System vorhanden.</p>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    <div class="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Unterschrift</h3>
                        <div class="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 md:p-6 bg-slate-50/50 dark:bg-slate-800/40">
                            <div class="flex items-center justify-between mb-4">
                                <span class="block text-sm font-semibold text-slate-900 dark:text-slate-100">Unterschrift (Optional)</span>
                                {#if !existingSignatureUrl || deleteExistingSignature}
                                    <div class="flex bg-slate-200/80 dark:bg-slate-700/80 p-1 rounded-xl">
                                        <button type="button" onclick={() => signatureMode = 'draw'} class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {signatureMode === 'draw' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}">Zeichnen</button>
                                        <button type="button" onclick={() => signatureMode = 'upload'} class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {signatureMode === 'upload' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}">Hochladen</button>
                                    </div>
                                {/if}
                            </div>
                            
                        {#if existingSignatureUrl && !deleteExistingSignature}
                            <div class="bg-white rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center shadow-sm">
                                <img src={existingSignatureUrl} alt="Hinterlegte Unterschrift" class="max-h-24 object-contain mx-auto bg-white rounded-lg p-2 mb-4" />
                                <button type="button" onclick={() => deleteExistingSignature = true} class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 hover:bg-red-500 hover:text-white font-bold py-2 px-4 rounded-xl transition-colors text-sm">
                                    Entfernen & Neu anlegen
                                </button>
                            </div>
                        {:else if signatureMode === 'draw'}
                            <dialog 
                                bind:this={sigDialog}
                                onclose={() => isSignatureFullscreen = false}
                                class="{isSignatureFullscreen ? 'm-0 p-2 sm:p-4 md:p-8 w-full h-full max-w-none max-h-none bg-slate-950/95 flex flex-col items-center justify-center touch-none backdrop-blur-md border-none z-9999 backdrop:bg-transparent' : 'block relative w-full p-0 m-0 bg-white border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden touch-none'}"
                            >
                                {#if isSignatureFullscreen}
                                    <div class="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-t-3xl flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                                        <h3 class="font-bold text-lg sm:text-xl md:text-2xl text-slate-900 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
                                            <span class="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-inner text-sm sm:text-base">✍️</span> 
                                            Bitte unterschreiben
                                        </h3>
                                        <div class="flex items-center gap-2 sm:gap-3">
                                            <button type="button" onclick={clearSignature} class="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors active:scale-95">Leeren</button>
                                            <button type="button" onclick={closeSignatureFullscreen} class="px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/30 active:scale-95">Fertig</button>
                                        </div>
                                    </div>
                                {/if}
                                <div class="{isSignatureFullscreen ? 'w-full max-w-4xl bg-slate-50 dark:bg-slate-950 rounded-b-3xl p-3 sm:p-6 md:p-8 flex items-center justify-center relative shadow-2xl' : 'w-full relative'}">
                                    <div class="relative w-full aspect-3/1 bg-white border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl shadow-inner">
                                        <canvas 
                                            bind:this={canvas} 
                                            width="1200" height="400" 
                                            class="w-full h-full cursor-crosshair touch-none rounded-xl"
                                            onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                                            ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                                        ></canvas>
                                        {#if !hasDrawnSignature}
                                            <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 font-bold {isSignatureFullscreen ? 'text-2xl sm:text-3xl opacity-50' : 'text-sm font-medium'}">Hier unterschreiben</div>
                                        {/if}
                                    </div>
                                </div>
                                {#if !isSignatureFullscreen}
                                    <div class="absolute top-2 right-2 flex gap-2">
                                        <button type="button" onclick={openSignatureFullscreen} class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 active:scale-95">
                                            <span class="text-base leading-none">🔍</span> Groß machen
                                        </button>
                                        <button type="button" onclick={clearSignature} class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors active:scale-95">Leeren</button>
                                    </div>
                                {/if}
                            </dialog>
                        {:else}
                            <div class="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
                                <input type="file" accept="image/png, image/jpeg" class="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 transition-colors" onchange={handleFileChange} />
                            </div>
                        {/if}
                        </div>
                    </div>

                    <div class="pt-4 flex flex-col sm:flex-row justify-between items-center border-t border-slate-100 dark:border-slate-800 mt-6 gap-3">
                        {#if editId}
                            <button type="button" onclick={onDelete} class="w-full sm:w-auto py-3 sm:py-2.5 text-sm font-bold text-red-500 bg-red-50 dark:bg-red-950/40 sm:bg-transparent dark:sm:bg-transparent hover:bg-red-100 dark:hover:bg-red-900/60 sm:hover:bg-transparent hover:text-red-700 rounded-xl sm:rounded-none transition-colors" disabled={isLoading}>Löschen</button>
                        {:else}
                            <div class="hidden sm:block"></div>
                        {/if}
                        <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                    <button type="button" onclick={async () => { if (JSON.stringify({ salutation, company_name, name_first, name_last, email, phone, street, housenr, zip, city, notes, birthdate, hasDrawnSignature, deleteExistingSignature, linkedClients, linkedHomes, linkedMailingLists }) !== initialDataHash) { if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return; } if (!editId) { close(); } else { isEditing = false; open(currentRecord); } }} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                            <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Speichern"}</button>
                        </div>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</dialog>

<ClientPortalAccessModal bind:this={portalAccessModal} />