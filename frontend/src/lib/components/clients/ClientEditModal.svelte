<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    let { client } = $props<{ client: any }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    // Formular-Daten
    let formData = $state({
        salutation: "Keine Angabe",
        name_first: "",
        name_last: "",
        email: "",
        phone: "",
        status: "",
        level_of_care: "",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        birthdate: "",
        insurance_nr: "",
        hourly_wage: 40,
        km_rate: 0.3,
        tax_rate: "0",
        default_template: "",
        caregiver: "",
        company: ""
    });

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

    // Helper um das Datum für das HTML <input type="date"> kompatibel zu machen
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

    export function open() {
        if (client) {
            formData = {
                salutation: client.salutation || "Keine Angabe",
                name_first: client.name_first || "",
                name_last: client.name_last || "",
                email: client.email || "",
                phone: client.phone || "",
                status: client.status || "Aktiv",
                level_of_care: client.level_of_care || "",
                street: client.street || "",
                housenr: client.housenr || "",
                zip: client.zip || "",
                city: client.city || "",
                birthdate: toYMD(client.birthdate),
                insurance_nr: client.insurance_nr || "",
                hourly_wage: client.hourly_wage ?? 40,
                km_rate: client.km_rate ?? 0.3,
                tax_rate: client.tax_rate != null ? client.tax_rate.toString() : "0",
                default_template: client.default_template || "",
                caregiver: client.caregiver || "",
                company: Array.isArray(client.company) ? (client.company[0] || "") : (client.company || "")
            };
            
            if (client.sign) {
                existingSignatureUrl = pb.files.getURL(client, client.sign);
            } else {
                existingSignatureUrl = "";
            }
        }
        hasDrawnSignature = false;
        uploadedFile = null;
        deleteExistingSignature = false;
        errorMsg = "";
        initialDataHash = JSON.stringify({ formData, signatureMode, hasDrawnSignature, deleteExistingSignature });
        dialog?.showModal();
        
        // Kurz warten, bis der Dialog gerendert ist, dann Canvas resetten
        setTimeout(clearSignature, 50);
    }

    export function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        if (JSON.stringify({ formData, signatureMode, hasDrawnSignature, deleteExistingSignature }) !== initialDataHash) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
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
        // Skalierung berücksichtigen (interne Auflösung vs css Auflösung)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        if (!canvas) return;
        e.preventDefault();
        isDrawing = true;
        hasDrawnSignature = true;
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineWidth = 8;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#4f46e5"; // indigo-600
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function clearSignature() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        hasDrawnSignature = false;
        uploadedFile = null;
    }

    function openSignatureFullscreen() {
        isSignatureFullscreen = true;
        sigDialog?.showModal();
    }

    function closeSignatureFullscreen() {
        isSignatureFullscreen = false;
        sigDialog?.close();
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            uploadedFile = target.files[0];
        } else {
            uploadedFile = null;
        }
    }

    // --- Speichern ---
    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const pbFormData = new FormData();
            for (const [key, value] of Object.entries(formData)) {
                if (key === 'tax_rate') {
                    pbFormData.append(key, value === "0" ? "" : value.toString());
                } else if (key === 'birthdate') {
                    const cleanVal = (value as string).trim();
                    pbFormData.append(key, cleanVal ? `${cleanVal} 12:00:00.000Z` : "");
                } else {
                    pbFormData.append(key, (value ?? '').toString());
                }
            }

            // Signatur anhängen, falls neu gezeichnet/hochgeladen
            if (signatureMode === "upload" && uploadedFile) {
                pbFormData.append("sign", uploadedFile);
            } else if (signatureMode === "draw" && hasDrawnSignature && canvas) {
                const blob = await new Promise<Blob | null>(resolve => canvas!.toBlob(resolve, "image/png"));
                if (blob) {
                    pbFormData.append("sign", blob, "signature.png");
                }
            } else if (deleteExistingSignature) {
                pbFormData.append("sign", ""); // Sendet ein leeres Feld, um die Datei in PocketBase zu löschen
            }

            await pb.collection('clients').update(client.id, pbFormData);
            
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            
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
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl m-0 sm:m-auto max-h-none sm:max-h-fit rounded-none sm:rounded-3xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white sm:rounded-3xl w-full h-dvh sm:h-auto sm:max-h-[90dvh] flex flex-col relative overflow-hidden shadow-2xl">
        <div class="px-6 md:px-8 py-5 border-b border-neutral-100 shrink-0 sticky top-0 bg-white/95 backdrop-blur-md z-20 flex justify-between items-center">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900">Klient bearbeiten</h2>
            <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
        {#if errorMsg}
            <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>
        {/if}

        <form id="clientEditForm" onsubmit={onSubmit} class="space-y-8 pb-2">
            
            <!-- Stammdaten -->
            <div>
                <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Persönliche Daten</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2"><label for="edit-salutation" class="block text-sm font-semibold text-neutral-700 mb-1.5">Anrede</label><select id="edit-salutation" bind:value={formData.salutation} class="orga-input-clear" disabled={isLoading}><option value="Keine Angabe">Keine Angabe</option><option value="Herr">Herr</option><option value="Frau">Frau</option><option value="Divers">Divers</option></select></div>
                    <div><label for="edit-firstname" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname</label><input id="edit-firstname" type="text" bind:value={formData.name_first} class="orga-input-clear" required disabled={isLoading} /></div>
                    <div><label for="edit-lastname" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname</label><input id="edit-lastname" type="text" bind:value={formData.name_last} class="orga-input-clear" required disabled={isLoading} /></div>
                    <div><label for="edit-birthdate" class="block text-sm font-semibold text-neutral-700 mb-1.5">Geburtsdatum</label><input id="edit-birthdate" type="date" bind:value={formData.birthdate} class="orga-input-clear" disabled={isLoading} /></div>
                    <div>
                        <label for="edit-company" class="block text-sm font-semibold text-neutral-700 mb-1.5">Zuständige Firma</label>
                        <select id="edit-company" bind:value={formData.company} class="orga-input-clear cursor-pointer" disabled={isLoading}>
                            <option value="">Keine Firma zugewiesen</option>
                            {#each orgaStore.company?.data || [] as comp}
                                <option value={comp.id}>{comp.name || comp.city}</option>
                            {/each}
                        </select>
                    </div>
                    <div><label for="edit-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="edit-email" type="email" bind:value={formData.email} class="orga-input-clear" disabled={isLoading} /></div>
                    <div><label for="edit-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon</label><input id="edit-phone" type="text" bind:value={formData.phone} class="orga-input-clear" disabled={isLoading} /></div>
                </div>
            </div>
            
            <!-- Adresse -->
            <div class="pt-6 border-t border-neutral-100">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider">Adresse</h3>
                    {#if formData.street || formData.city}
                        <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${formData.street || ''} ${formData.housenr || ''}, ${formData.zip || ''} ${formData.city || ''}`)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-200 shadow-sm">
                            <span>🗺️</span> Auf Karte prüfen
                        </a>
                    {/if}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="md:col-span-2"><label for="edit-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße</label><input id="edit-street" type="text" bind:value={formData.street} class="orga-input-clear" disabled={isLoading} /></div>
                    <div><label for="edit-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr.</label><input id="edit-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear" disabled={isLoading} /></div>
                    <div><label for="edit-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label><input id="edit-zip" type="text" bind:value={formData.zip} class="orga-input-clear" disabled={isLoading} /></div>
                    <div class="md:col-span-4"><label for="edit-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt</label><input id="edit-city" type="text" bind:value={formData.city} class="orga-input-clear" disabled={isLoading} /></div>
                </div>
            </div>

            <!-- Pflege & Versicherung -->
            <div class="pt-6 border-t border-neutral-100">
                <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Pflege & Status</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label for="edit-status" class="block text-sm font-semibold text-neutral-700 mb-1.5">Status</label><select id="edit-status" bind:value={formData.status} class="orga-input-clear" disabled={isLoading}><option value="Aktiv">Aktiv</option><option value="Inaktiv">Inaktiv</option><option value="Verstorben">Verstorben</option></select></div>
                    <div><label for="edit-carelevel" class="block text-sm font-semibold text-neutral-700 mb-1.5">Pflegegrad</label><select id="edit-carelevel" bind:value={formData.level_of_care} class="orga-input-clear" disabled={isLoading}><option value="">Keiner</option><option value="0">Grad 0</option><option value="1">Grad 1</option><option value="2">Grad 2</option><option value="3">Grad 3</option><option value="4">Grad 4</option><option value="5">Grad 5</option></select></div>
                    <div><label for="edit-ins-nr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Versicherungsnummer</label><input id="edit-ins-nr" type="text" bind:value={formData.insurance_nr} class="orga-input-clear" disabled={isLoading} /></div>
                    <div>
                        <label for="edit-caregiver" class="block text-sm font-semibold text-neutral-700 mb-1.5">Gesetzliche Betreuung</label>
                        <select id="edit-caregiver" bind:value={formData.caregiver} class="orga-input-clear cursor-pointer" disabled={isLoading}>
                            <option value="">Keine / Selbstbestimmt</option>
                            {#each orgaStore.contacts?.data || [] as contact}
                                <option value={contact.id}>{#if contact.company_name}{contact.company_name} - {/if}{contact.name_first} {contact.name_last}</option>
                            {/each}
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Abrechnungskonditionen -->
            <div class="pt-6 border-t border-neutral-100">
                <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Abrechnungskonditionen & Vorlage</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label for="edit-wage" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stundensatz (€)</label><input id="edit-wage" type="number" step="0.01" bind:value={formData.hourly_wage} class="orga-input-clear" disabled={isLoading} /></div>
                    <div><label for="edit-km" class="block text-sm font-semibold text-neutral-700 mb-1.5">Fahrtkosten (€/km)</label><input id="edit-km" type="number" step="0.01" bind:value={formData.km_rate} class="orga-input-clear" disabled={isLoading} /></div>
                    <div><label for="edit-tax" class="block text-sm font-semibold text-neutral-700 mb-1.5">Steuersatz (%)</label><select id="edit-tax" bind:value={formData.tax_rate} class="orga-input-clear" disabled={isLoading}><option value="0">0%</option><option value="7">7%</option><option value="19">19%</option></select></div>
                    <div><label for="edit-template" class="block text-sm font-semibold text-neutral-700 mb-1.5">Standard-Vorlage</label><select id="edit-template" bind:value={formData.default_template} class="orga-input-clear" disabled={isLoading}><option value="">Keine Standard-Vorlage</option>{#each orgaStore.document_templates?.data || [] as t}<option value={t.id}>{t.title}</option>{/each}</select></div>
                </div>
            </div>

            <!-- Signatur Bereich -->
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
                        <img src={existingSignatureUrl} alt="Hinterlegte Unterschrift" class="max-h-24 object-contain mx-auto bg-white rounded-lg p-2 mb-4 safe-signature" />
                        <button type="button" onclick={() => deleteExistingSignature = true} class="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                            Entfernen & Neu anlegen
                        </button>
                    </div>
                {:else if signatureMode === 'draw'}
                    <dialog 
                        bind:this={sigDialog}
                        onclose={() => isSignatureFullscreen = false}
                        class="{isSignatureFullscreen ? 'm-0 p-2 sm:p-4 md:p-8 w-full h-full max-w-none max-h-none bg-neutral-900/95 flex flex-col items-center justify-center touch-none backdrop-blur-md border-none z-9999 backdrop:bg-transparent' : 'block relative w-full p-0 m-0 bg-white border-2 border-dashed border-neutral-200 rounded-xl overflow-hidden touch-none'}"
                    >
                        
                        {#if isSignatureFullscreen}
                            <div class="w-full max-w-4xl bg-white rounded-t-3xl flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-neutral-200 shrink-0">
                                <h3 class="font-bold text-lg sm:text-xl md:text-2xl text-neutral-900 flex items-center gap-2 sm:gap-3">
                                    <span class="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner text-sm sm:text-base">✍️</span> 
                                    Bitte unterschreiben
                                </h3>
                                <div class="flex items-center gap-2 sm:gap-3">
                                    <button type="button" onclick={clearSignature} class="px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-bold rounded-xl transition-colors active:scale-95">Leeren</button>
                                    <button type="button" onclick={closeSignatureFullscreen} class="px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/30 active:scale-95">Fertig</button>
                                </div>
                            </div>
                        {/if}

                        <div class="{isSignatureFullscreen ? 'w-full max-w-4xl bg-neutral-50 rounded-b-3xl p-3 sm:p-6 md:p-8 flex items-center justify-center relative shadow-2xl' : 'w-full relative'}">
                            <div class="relative w-full aspect-3/1 {isSignatureFullscreen ? 'bg-white border-4 border-dashed border-neutral-300 rounded-2xl shadow-inner' : ''}">
                                <canvas 
                                    bind:this={canvas} 
                                    width="1200" height="400" 
                                    class="w-full h-full cursor-crosshair touch-none {isSignatureFullscreen ? 'rounded-2xl' : ''}"
                                    onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                                    ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                                ></canvas>
                                {#if !hasDrawnSignature}
                                    <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-300 font-bold {isSignatureFullscreen ? 'text-2xl sm:text-3xl opacity-50' : 'text-sm font-medium'}">Hier unterschreiben</div>
                                {/if}
                            </div>
                        </div>

                        {#if !isSignatureFullscreen}
                            <div class="absolute top-2 right-2 flex gap-2">
                                <button type="button" onclick={openSignatureFullscreen} class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 active:scale-95">
                                    <span class="text-base leading-none">🔍</span> Groß machen
                                </button>
                                <button type="button" onclick={clearSignature} class="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold rounded-lg transition-colors active:scale-95">Leeren</button>
                            </div>
                        {/if}
                    </dialog>
                {:else}
                    <div class="bg-white border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center">
                        <input type="file" accept="image/png, image/jpeg" class="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors" onchange={handleFileChange} />
                    </div>
                {/if}
                </div>
            </div>
        </form>
        </div>
        <div class="p-4 sm:p-6 border-t border-neutral-100 bg-white/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" form="clientEditForm" class="orga-button-primary shadow-indigo-600/20 w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Änderungen speichern"}</button>
            </div>
        </div>
    </div>
</dialog>

<style>
    :global(.theme-negative) .safe-signature {
        filter: invert(1) hue-rotate(180deg);
    }
</style>