<script lang="ts">
    import { goto } from "$app/navigation";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    let isLoading = $state(false);
    let errorMsg = $state("");

    // Formular-Daten
    let formData = $state({
        // Persönliche Daten
        salutation: "Keine Angabe",
        name_first: "",
        name_last: "",
        marital_status: "",
        birthdate: "",
        nationality: "",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        // Kontaktdaten
        email: "",
        phone: "",
        handy: "",
        // Pflege & Status
        status: "Aktiv",
        level_of_care: "",
        insurance_nr: "",
        // Relation fields that might be required by PocketBase
        insurance: "", // Single-select relation (e.g., ID of an insurance record)
        retirement_homes: "", // Single-select relation
        contacts: [], // Multi-select relation (array of contact IDs)
        caregiver: "", // Single-select relation
        // Notizen
        notes: "",
        // Abrechnungskonditionen
        hourly_rate: 40,
        km_rate: 0.3,
        tax_rate: "0",
        templates: "",
        // Firmenzuordnung
        company: "" // Added for company relation
    });

    // Determine if the current user is a superadmin
    let isSuperAdmin = $state(false); // Initialize with default

    // Reactive block to set isSuperAdmin and pre-fill company for non-superadmins
    $effect(() => { // Use $effect for reactive updates
        isSuperAdmin = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin';
        if (!isSuperAdmin && pb.authStore.model?.company) {
            const companyId = Array.isArray(pb.authStore.model.company) ? pb.authStore.model.company[0] : pb.authStore.model.company;
            if (!formData.company) { // Only pre-fill if not already set
                formData.company = companyId;
            }
        } else if (!isSuperAdmin && !pb.authStore.model?.company) {
            // If a regular user has no company assigned, they cannot create clients
            if (!errorMsg) { // Avoid overwriting other errors
                errorMsg = "Ihr Benutzerkonto ist keiner Firma zugeordnet. Sie können keine Klienten anlegen. Bitte kontaktieren Sie Ihren Administrator.";
                isLoading = true; // Disable form submission
            }
        }
    });

    onMount(async () => {
        // Ensure company data is loaded for the dropdown, especially for superadmins
        if (!orgaStore.company?.data || orgaStore.company.data.length === 0) {
            await orgaStore.company?.init();
            // Re-evaluate the company pre-fill after orgaStore.company is loaded
            // The $effect above should handle this automatically when orgaStore.company.data changes.
        }
    });

    // Signatur-Status
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let uploadedFile = $state<File | null>(null);
    let hasDrawnSignature = $state(false);

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
            ctx.lineWidth = 4;
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
            // Client-seitige Validierung für Pflichtfelder
            if (!formData.name_first.trim()) {
                errorMsg = "Bitte geben Sie einen Vornamen ein.";
                isLoading = false;
                return;
            }
            if (!formData.name_last.trim()) {
                errorMsg = "Bitte geben Sie einen Nachnamen ein.";
                isLoading = false;
                return;
            }
            if (!formData.company) {
                errorMsg = "Bitte wählen Sie eine zugehörige Firma aus.";
                isLoading = false;
                return;
            }

            const pbFormData = new FormData();
            for (const [key, value] of Object.entries(formData)) {
                if (key === 'birthdate' && value) {
                    const cleanVal = (value as string).trim();
                    // Nur anhängen, wenn tatsächlich ein Datum gewählt wurde
                    if (cleanVal) pbFormData.append(key, `${cleanVal} 12:00:00.000Z`);
                } else if (['company', 'templates', 'insurance', 'retirement_homes', 'caregiver', 'inheritor'].includes(key)) {
                    // Single-select relations: append only if a value is selected
                    if (value) pbFormData.append(key, value.toString());
                } else if (key === 'contacts') {
                    // Multi-select relations: append each item if array is not empty
                    if (Array.isArray(value) && value.length > 0) {
                        (value as any[]).forEach((item: any) => pbFormData.append(key, item.toString()));
                    }
                } else if (typeof value === 'boolean') {
                    pbFormData.append(key, value.toString());
                } else if (typeof value === 'object' && value !== null) {
                    // JSON fields, convert to string
                    pbFormData.append(key, JSON.stringify(value));
                } else {
                    // General case for other fields, append if not null/undefined/empty string
                    if (value !== null && value !== undefined && value !== '') {
                        pbFormData.append(key, value.toString());
                    }
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
            }

            const newClient = await pb.collection('clients').create(pbFormData);
            
            // Nach erfolgreicher Anlage direkt zur Übersicht wechseln
            toastStore.success("Klient erfolgreich angelegt!");
            goto(`/clients`);
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Anlegen.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <a href="/clients" class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm flex items-center gap-2 mb-4 transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Zurück zur Übersicht
        </a>
        <h1 class="orga-page-title">Neuer Klient</h1>
        <p class="orga-page-subtitle">Legen Sie hier einen neuen Klienten an.</p>
    </div>
</div>

<div class="orga-card-white p-6 md:p-8 max-w-4xl mx-auto animate-enter delay-100">
    {#if errorMsg}
        <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>
    {/if}

    <form onsubmit={onSubmit} class="space-y-8">
        
        <!-- Stammdaten -->
        <div>
            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Persönliche Daten</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label for="new-salutation" class="block text-sm font-semibold text-neutral-700 mb-1.5">Anrede</label>
                    <select id="new-salutation" bind:value={formData.salutation} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading}>
                        <option value="Herr">Herr</option>
                        <option value="Frau">Frau</option>
                        <option value="Divers">Divers</option>
                        <option value="Keine Angabe">Keine Angabe</option>
                    </select>
                </div>
                <div><label for="new-firstname" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname *</label><input id="new-firstname" type="text" bind:value={formData.name_first} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" required disabled={isLoading} /></div>
                <div><label for="new-lastname" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname *</label><input id="new-lastname" type="text" bind:value={formData.name_last} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" required disabled={isLoading} /></div>
                <div><label for="new-birthdate" class="block text-sm font-semibold text-neutral-700 mb-1.5">Geburtsdatum</label><input id="new-birthdate" type="date" bind:value={formData.birthdate} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div>
                    <label for="new-marital-status" class="block text-sm font-semibold text-neutral-700 mb-1.5">Familienstand</label>
                    <select id="new-marital-status" bind:value={formData.marital_status} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading}>
                        <option value="">Bitte wählen...</option>
                        <option value="Ledig">Ledig</option>
                        <option value="Verheiratet">Verheiratet</option>
                        <option value="Geschieden">Geschieden</option>
                        <option value="Verwitwet">Verwitwet</option>
                    </select>
                </div>
                <div><label for="new-nationality" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nationalität</label><input id="new-nationality" type="text" bind:value={formData.nationality} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div><label for="new-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="new-email" type="email" bind:value={formData.email} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div><label for="new-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon</label><input id="new-phone" type="text" bind:value={formData.phone} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div><label for="new-handy" class="block text-sm font-semibold text-neutral-700 mb-1.5">Mobil</label><input id="new-handy" type="text" bind:value={formData.handy} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
            </div>
        </div>

        <!-- Adresse -->
        <div class="pt-6 border-t border-neutral-100">
            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Adresse</h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="md:col-span-2"><label for="new-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße</label><input id="new-street" type="text" bind:value={formData.street} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div><label for="new-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr.</label><input id="new-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div><label for="new-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label><input id="new-zip" type="text" bind:value={formData.zip} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div class="md:col-span-4"><label for="new-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt</label><input id="new-city" type="text" bind:value={formData.city} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
            </div>
        </div>

        <!-- Pflege & Versicherung -->
        <div class="pt-6 border-t border-neutral-100">
            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Pflege & Status</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label for="new-status" class="block text-sm font-semibold text-neutral-700 mb-1.5">Status</label><select id="new-status" bind:value={formData.status} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading}><option value="Aktiv">Aktiv</option><option value="Inaktiv">Inaktiv</option><option value="Verstorben">Verstorben</option></select></div>
                <div><label for="new-carelevel" class="block text-sm font-semibold text-neutral-700 mb-1.5">Pflegegrad</label><select id="new-carelevel" bind:value={formData.level_of_care} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading}><option value="">Keiner</option><option value="0">Grad 0</option><option value="1">Grad 1</option><option value="2">Grad 2</option><option value="3">Grad 3</option><option value="4">Grad 4</option><option value="5">Grad 5</option></select></div>
                <div><label for="new-ins-nr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Versicherungsnummer</label><input id="new-ins-nr" type="text" bind:value={formData.insurance_nr} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
            </div>
        </div>

        <!-- Abrechnungskonditionen -->
        <div class="pt-6 border-t border-neutral-100">
            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Abrechnungskonditionen & Vorlage</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label for="new-wage" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stundensatz (€)</label><input id="new-wage" type="number" step="0.01" bind:value={formData.hourly_rate} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div><label for="new-km" class="block text-sm font-semibold text-neutral-700 mb-1.5">Fahrtkosten (€/km)</label><input id="new-km" type="number" step="0.01" bind:value={formData.km_rate} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading} /></div>
                <div><label for="new-tax" class="block text-sm font-semibold text-neutral-700 mb-1.5">Steuersatz (%)</label><select id="new-tax" bind:value={formData.tax_rate} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading}><option value="0">0%</option><option value="7">7%</option><option value="19">19%</option></select></div>
                <div>
                    <label for="new-company" class="block text-sm font-semibold text-neutral-700 mb-1.5">Zugehörige Firma *</label>
                    <select id="new-company" bind:value={formData.company} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" required disabled={isLoading || !isSuperAdmin}>
                        {#if isSuperAdmin}<option value="">Bitte wählen...</option>{/if}
                        {#each orgaStore.company?.data || [] as comp}<option value={comp.id}>{comp.name} ({comp.city})</option>{/each}
                    </select>
                </div>
                <div><label for="new-template" class="block text-sm font-semibold text-neutral-700 mb-1.5">Standard-Vorlage</label><select id="new-template" bind:value={formData.templates} class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm" disabled={isLoading}><option value="">Keine Standard-Vorlage</option>{#each orgaStore.document_templates?.data || [] as t}<option value={t.id}>{t.title}</option>{/each}</select></div>
            </div>
        </div>

        <!-- Notizen -->
        <div class="pt-6 border-t border-neutral-100">
            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Notizen</h3>
            <div>
                <label for="new-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Interne Notizen</label>
                <textarea id="new-notes" bind:value={formData.notes} rows="4" class="orga-input-clear min-h-14 sm:min-h-12 py-2.5 text-base sm:text-sm resize-y custom-scrollbar" placeholder="Wichtige Hinweise, Besonderheiten oder Aufgaben..." disabled={isLoading}></textarea>
            </div>
        </div>

        <!-- Signatur Bereich -->
        <div class="pt-6 border-t border-neutral-100">
            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Unterschrift</h3>
            <div class="border border-neutral-200 rounded-2xl p-4 sm:p-6 bg-neutral-50/50">
            <div class="flex items-center justify-between mb-4">
                <span class="block text-sm font-semibold text-neutral-900">Unterschrift (Optional)</span>
                <div class="flex bg-neutral-200/60 p-1 rounded-lg">
                    <button type="button" onclick={() => signatureMode = 'draw'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Zeichnen</button>
                    <button type="button" onclick={() => signatureMode = 'upload'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Hochladen</button>
                </div>
            </div>

            {#if signatureMode === 'draw'}
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

        <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
            <a href="/clients" class="orga-button-ghost w-full sm:w-auto text-center py-3 sm:py-2.5 {isLoading ? 'pointer-events-none opacity-50' : ''}">Abbrechen</a>
            <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Klient anlegen"}</button>
        </div>
    </form>
</div>