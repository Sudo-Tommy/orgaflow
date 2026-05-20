<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
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

    // Signatur-Status
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let uploadedFile = $state<File | null>(null);
    let hasDrawnSignature = $state(false);
    let existingSignatureUrl = $state("");
    let deleteExistingSignature = $state(false);

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
            editId = record.id;
            isEditing = false;
            salutation = record.salutation || "Keine Angabe";
            company_name = record.company_name || "";
            name_first = record.name_first || "";
            name_last = record.name_last || "";
            email = record.email || "";
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
        } else {
            editId = null;
            isEditing = true;
            salutation = "Keine Angabe";
            company_name = "";
            name_first = "";
            name_last = "";
            email = "";
            phone = "";
            street = "";
            housenr = "";
            zip = "";
            city = "";
            notes = "";
            birthdate = "";
            existingSignatureUrl = "";
        }
        
        hasDrawnSignature = false;
        uploadedFile = null;
        deleteExistingSignature = false;
        errorMsg = "";
        dialog?.showModal();

        if (isEditing && !editId) {
            setTimeout(clearSignature, 50);
        }
    }

    export function close() {
        dialog?.close();
    }
    
    function startEdit() {
        isEditing = true;
        setTimeout(clearSignature, 50);
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
        if (ctx) { ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#4f46e5"; ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
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
            
            if (editId) {
                await pb.collection('contacts').update(editId, pbFormData);
            } else {
                await pb.collection('contacts').create(pbFormData);
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-neutral-50 rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
        <!-- Header -->
        <div class="bg-white px-6 py-5 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20 gap-3">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 truncate">
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
                    <button type="button" onclick={startEdit} class="orga-button-ghost py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold shadow-sm">
                        <svg class="w-4 h-4 mr-1.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Bearbeiten
                    </button>
                    <div class="w-px h-6 bg-neutral-200 hidden sm:block"></div>
                {/if}
                <button aria-label="Schließen" onclick={close} class="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
            {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}

            {#if !isEditing}
                <div class="space-y-6">
                    <div class="orga-card-white relative overflow-hidden group">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 z-0"></div>
                        
                        <div class="p-6 md:p-8 relative z-10">
                            <div class="flex items-center gap-4 mb-8 border-b border-neutral-100 pb-6">
                                <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 font-bold flex items-center justify-center text-2xl shrink-0 shadow-inner">
                                    {(name_first?.charAt(0) || company_name?.charAt(0) || '?').toUpperCase()}{(name_last?.charAt(0) || '')}
                                </div>
                                <div>
                                    <h2 class="text-xl font-bold text-neutral-900">{salutation !== 'Keine Angabe' ? salutation + ' ' : ''}{name_first} {name_last}</h2>
                                    {#if company_name}
                                        <p class="text-neutral-500 font-bold text-xs mt-1 tracking-wider uppercase">{company_name}</p>
                                    {/if}
                                </div>
                            </div>

                            <div class="space-y-6">
                                {#if birthdate}
                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🎂</span></div>
                                    <div>
                                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Geburtsdatum</p>
                                        <p class="text-neutral-900 font-bold">{safeFormatDate(birthdate)}</p>
                                    </div>
                                </div>
                                {/if}

                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">📞</span></div>
                                    <div>
                                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Telefon</p>
                                        <p class="text-neutral-900 font-bold">{phone || 'Nicht hinterlegt'}</p>
                                    </div>
                                </div>

                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">✉️</span></div>
                                    <div>
                                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">E-Mail</p>
                                        <p class="text-neutral-900 font-bold break-all">{email || 'Nicht hinterlegt'}</p>
                                    </div>
                                </div>

                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🏠</span></div>
                                    <div>
                                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Adresse</p>
                                        <p class="text-neutral-900 font-bold leading-relaxed">{#if street || city}{street || ''} {housenr || ''}<br /> {zip || ''} {city || ''}{:else}Nicht hinterlegt{/if}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {#if notes}
                            <div class="mt-6 pt-6 border-t border-neutral-100">
                                <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Notizen</p>
                                <p class="text-sm text-neutral-700 whitespace-pre-wrap">{notes}</p>
                            </div>
                            {/if}

                            {#if existingSignatureUrl}
                                <div class="pt-6 mt-6 border-t border-neutral-100">
                                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Unterschrift</p>
                                    <div class="bg-white rounded-xl border border-neutral-100 p-4 flex justify-center shadow-sm">
                                        <img src={existingSignatureUrl} alt="Unterschrift" class="max-h-24 object-contain mix-blend-multiply" />
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            {:else}
                <form onsubmit={onSubmit} class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label for="contact-salutation" class="block text-sm font-semibold text-neutral-700 mb-1.5">Anrede</label><select id="contact-salutation" bind:value={salutation} class="orga-input-clear" disabled={isLoading}><option value="Keine Angabe">Keine Angabe</option><option value="Herr">Herr</option><option value="Frau">Frau</option></select></div>
                        <div><label for="contact-company" class="block text-sm font-semibold text-neutral-700 mb-1.5">Firmenname (optional)</label><input id="contact-company" type="text" bind:value={company_name} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-first" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname</label><input id="contact-first" type="text" bind:value={name_first} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-last" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname</label><input id="contact-last" type="text" bind:value={name_last} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-birthdate" class="block text-sm font-semibold text-neutral-700 mb-1.5">Geburtsdatum</label><input id="contact-birthdate" type="date" bind:value={birthdate} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="contact-email" type="email" bind:value={email} class="orga-input-clear" disabled={isLoading} /></div>
                        <div class="md:col-span-2"><label for="contact-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon</label><input id="contact-phone" type="text" bind:value={phone} class="orga-input-clear" disabled={isLoading} /></div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <div class="md:col-span-2"><label for="contact-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße</label><input id="contact-street" type="text" bind:value={street} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr.</label><input id="contact-housenr" type="text" bind:value={housenr} class="orga-input-clear" disabled={isLoading} /></div>
                        <div><label for="contact-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label><input id="contact-zip" type="text" bind:value={zip} class="orga-input-clear" disabled={isLoading} /></div>
                        <div class="md:col-span-4"><label for="contact-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt</label><input id="contact-city" type="text" bind:value={city} class="orga-input-clear" disabled={isLoading} /></div>
                    </div>
                    
                    <div class="pt-2">
                        <label for="contact-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Notizen</label>
                        <textarea id="contact-notes" bind:value={notes} class="orga-input-clear resize-y" rows="3" disabled={isLoading}></textarea>
                    </div>

                    <div class="pt-6 border-t border-neutral-100">
                        <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Unterschrift</h3>
                        <div class="border border-neutral-200 rounded-2xl p-4 md:p-6 bg-neutral-50/50">
                            <div class="flex items-center justify-between mb-4">
                                <span class="block text-sm font-semibold text-neutral-900">Unterschrift (Optional)</span>
                                {#if !existingSignatureUrl || deleteExistingSignature}
                                    <div class="flex bg-neutral-200/60 p-1 rounded-lg">
                                        <button type="button" onclick={() => signatureMode = 'draw'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Zeichnen</button>
                                        <button type="button" onclick={() => signatureMode = 'upload'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Hochladen</button>
                                    </div>
                                {/if}
                            </div>
                            
                        {#if existingSignatureUrl && !deleteExistingSignature}
                            <div class="bg-white border border-neutral-200 rounded-xl p-6 text-center shadow-sm">
                                <img src={existingSignatureUrl} alt="Hinterlegte Unterschrift" class="max-h-24 object-contain mx-auto mix-blend-multiply mb-4" />
                                <button type="button" onclick={() => deleteExistingSignature = true} class="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                                    Entfernen & Neu anlegen
                                </button>
                            </div>
                        {:else if signatureMode === 'draw'}
                            <div class="relative bg-white border-2 border-dashed border-neutral-200 rounded-xl overflow-hidden touch-none">
                                <canvas 
                                    bind:this={canvas} 
                                    width="600" height="200" 
                                    class="w-full h-40 cursor-crosshair"
                                    onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                                    ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                                ></canvas>
                                <button type="button" onclick={clearSignature} class="absolute top-2 right-2 px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-semibold rounded-md transition-colors">Leeren</button>
                                {#if !hasDrawnSignature}
                                    <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-300 font-medium text-sm">Hier unterschreiben</div>
                                {/if}
                            </div>
                        {:else}
                            <div class="bg-white border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center">
                                <input type="file" accept="image/png, image/jpeg" class="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors" onchange={handleFileChange} />
                            </div>
                        {/if}
                        </div>
                    </div>

                    <div class="pt-4 flex flex-col sm:flex-row justify-between items-center border-t border-neutral-100 mt-6 gap-3">
                        {#if editId}
                            <button type="button" onclick={onDelete} class="w-full sm:w-auto py-3 sm:py-2.5 text-sm font-bold text-red-500 bg-red-50 sm:bg-transparent hover:bg-red-100 sm:hover:bg-transparent hover:text-red-700 rounded-lg sm:rounded-none transition-colors" disabled={isLoading}>Löschen</button>
                        {:else}
                            <div class="hidden sm:block"></div>
                        {/if}
                        <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                            <button type="button" onclick={() => { if (!editId) { close(); } else { isEditing = false; } }} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                            <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Speichern"}</button>
                        </div>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</dialog>