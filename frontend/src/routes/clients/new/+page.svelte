<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { 
        User, Heart, Users, FileText, Check, ArrowLeft, ArrowRight, 
        Save, Trash2, Plus, Sparkles, Maximize2, RotateCcw, Upload, 
        CheckCircle2, AlertCircle, Home, Phone, Mail, MapPin, X,
        Stethoscope, Banknote, FileSignature, ShieldCheck
    } from "lucide-svelte";

    let isLoading = $state(false);
    let errorMsg = $state("");
    let activeTab = $state<"master" | "care" | "inheritor" | "billing">("master");
    let inheritorMode = $state<"contact" | "direct">("direct");

    // Formular-Daten
    let formData = $state({
        // Persönliche Daten
        salutation: "Keine Angabe",
        name_first: "",
        name_last: "",
        marital_status: "Keine Angabe",
        birthdate: "",
        nationality: "Deutsch",
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
        insurance: "",
        other_insurance_name: "",
        retirement_homes: "",
        contacts: [] as string[],
        caregiver: "",
        // Notizen
        notes: "",
        // Abrechnungskonditionen (WICHTIG: hourly_wage entspricht dem PB-Schema!)
        hourly_wage: 40,
        km_rate: 0.3,
        tax_rate: "0",
        templates: "",
        // Firmenzuordnung
        company: "",

        // Erben- / Bevollmächtigten-Felder
        inheritor: "",
        inheritor_name: "",
        inheritor_relation: "Ehepartner/in",
        inheritor_phone: "",
        inheritor_email: "",
        inheritor_has_power_of_attorney: false,
        inheritor_notes: "",

        // Verhinderungspflege (§ 39 SGB XI) / Pflegeperson Daten
        careperson_name: "",
        careperson_relation: "Ehepartner/in",
        careperson_birthdate: "",
        careperson_street: "",
        careperson_housenr: "",
        careperson_zip: "",
        careperson_city: "",
        careperson_phone: "",
        careperson_email: "",
        careperson_reason: "Erholungsurlaub",
        careperson_care_type: "stundenweise",
        careperson_pre_care: true,
        careperson_care_allowance: true,
        careperson_notes: ""
    });

    let isOwner = $derived(rbacService.isOwner);

    // Initialisierung & URL Parameter Auswertung
    onMount(async () => {
        await Promise.all([
            orgaStore.company?.init().catch(() => {}),
            orgaStore.insurancies?.init().catch(() => {}),
            orgaStore.users?.init().catch(() => {}),
            orgaStore.retirement_homes?.init().catch(() => {}),
            orgaStore.contacts?.init().catch(() => {}),
            orgaStore.document_templates?.init().catch(() => {})
        ]);

        // Vorbefüllung aus URL Parametern (z.B. von Anfragen oder Kontakten)
        const params = $page.url.searchParams;
        if (params.get("name_first")) formData.name_first = params.get("name_first") || "";
        if (params.get("name_last")) formData.name_last = params.get("name_last") || "";
        if (params.get("email")) formData.email = params.get("email") || "";
        if (params.get("phone")) formData.phone = params.get("phone") || "";
        if (params.get("handy")) formData.handy = params.get("handy") || "";
        if (params.get("street")) formData.street = params.get("street") || "";
        if (params.get("housenr")) formData.housenr = params.get("housenr") || "";
        if (params.get("zip")) formData.zip = params.get("zip") || "";
        if (params.get("city")) formData.city = params.get("city") || "";
        if (params.get("salutation")) formData.salutation = params.get("salutation") || "Keine Angabe";
        if (params.get("company")) formData.company = params.get("company") || "";

        // Standard-Firma setzen für Nicht-Owner
        if (!formData.company && rbacService.userCompanyId) {
            formData.company = rbacService.userCompanyId;
        }
    });

    // Reaktiv Firma zuweisen falls noch leer
    $effect(() => {
        if (!formData.company && rbacService.userCompanyId) {
            formData.company = rbacService.userCompanyId;
        }
    });

    // Verfügbare Betreuer für die ausgewählte Firma
    let availableCaregivers = $derived.by(() => {
        const allUsers = orgaStore.users?.data || [];
        if (!formData.company) return allUsers;
        return allUsers.filter((u: any) => {
            const uCompany = Array.isArray(u.company) ? u.company[0] : u.company;
            return uCompany === formData.company;
        });
    });

    // 1-Klick Kopiervorgänge
    function copyClientAddressToCareperson() {
        formData.careperson_street = formData.street;
        formData.careperson_housenr = formData.housenr;
        formData.careperson_zip = formData.zip;
        formData.careperson_city = formData.city;
        toastStore.info("Wohnanschrift des Klienten übernommen.");
    }

    function copyInheritorToCareperson() {
        formData.careperson_name = formData.inheritor_name;
        formData.careperson_relation = formData.inheritor_relation;
        formData.careperson_phone = formData.inheritor_phone;
        formData.careperson_email = formData.inheritor_email;
        toastStore.info("Kontaktdaten von Bevollmächtigtem übernommen.");
    }

    function handleContactSelected(contactId: string) {
        formData.inheritor = contactId;
        const contact = orgaStore.contacts?.data?.find((c: any) => c.id === contactId);
        if (contact) {
            formData.inheritor_name = `${contact.name_first || ''} ${contact.name_last || ''}`.trim();
            formData.inheritor_phone = contact.phone || contact.handy || '';
            formData.inheritor_email = contact.email || '';
            if (contact.notes) formData.inheritor_notes = contact.notes;
        }
    }

    // --- Signatur Logik ---
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let uploadedFile = $state<File | null>(null);
    let hasDrawnSignature = $state(false);
    let isSignatureFullscreen = $state(false);
    let sigDialog = $state<HTMLDialogElement | null>(null);

    function getPointerPos(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;
        if (window.TouchEvent && e instanceof TouchEvent) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
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
            ctx.strokeStyle = "#4f46e5";
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

    // Validierung pro Schritt
    function validateStep(tab: "master" | "care" | "inheritor" | "billing"): boolean {
        errorMsg = "";
        if (tab === "master") {
            if (!formData.name_first.trim()) {
                errorMsg = "Bitte geben Sie den Vornamen des Klienten ein.";
                return false;
            }
            if (!formData.name_last.trim()) {
                errorMsg = "Bitte geben Sie den Nachnamen des Klienten ein.";
                return false;
            }
        }
        if (tab === "billing") {
            if (!formData.company) {
                errorMsg = "Bitte wählen Sie eine zugehörige Firma aus.";
                return false;
            }
        }
        return true;
    }

    function nextTab() {
        if (!validateStep(activeTab)) return;
        if (activeTab === "master") activeTab = "care";
        else if (activeTab === "care") activeTab = "inheritor";
        else if (activeTab === "inheritor") activeTab = "billing";
    }

    function prevTab() {
        errorMsg = "";
        if (activeTab === "billing") activeTab = "inheritor";
        else if (activeTab === "inheritor") activeTab = "care";
        else if (activeTab === "care") activeTab = "master";
    }

    // Speichern des neuen Klienten
    async function onSubmit(e: Event) {
        e.preventDefault();
        errorMsg = "";

        if (!validateStep("master") || !validateStep("billing")) {
            return;
        }

        isLoading = true;

        try {
            // Neue Krankenkasse anlegen falls gewünscht
            if (formData.insurance === 'other') {
                if (!formData.other_insurance_name.trim()) {
                    errorMsg = "Bitte geben Sie den Namen der neuen Krankenkasse an.";
                    isLoading = false;
                    return;
                }
                const newName = formData.other_insurance_name.trim();
                const existingList = await pb.collection('insurancies').getFullList({ filter: `name ~ "${newName}"`, requestKey: null }).catch(() => []);
                const match = existingList.find((i: any) => i.name.toLowerCase().trim() === newName.toLowerCase().trim());
                if (match) {
                    formData.insurance = match.id;
                } else {
                    const created = await pb.collection('insurancies').create({ name: newName, type: 'GKV (Gesetzlich)' });
                    formData.insurance = created.id;
                    if (orgaStore.insurancies) {
                        orgaStore.insurancies.data = [created as any, ...orgaStore.insurancies.data];
                    }
                }
            }

            const pbFormData = new FormData();

            // 1. Standard-Felder
            for (const [key, value] of Object.entries(formData)) {
                if (key.startsWith('careperson_') || key === 'other_insurance_name') continue;

                if (key === 'tax_rate') {
                    pbFormData.append(key, value === "0" ? "" : value.toString());
                } else if (key === 'birthdate' && value) {
                    const cleanVal = (value as string).trim();
                    if (cleanVal) pbFormData.append(key, `${cleanVal} 12:00:00.000Z`);
                } else if (key === 'inheritor_has_power_of_attorney') {
                    pbFormData.append(key, value ? 'true' : 'false');
                } else if (key === 'inheritor') {
                    pbFormData.append(key, inheritorMode === 'contact' ? (value as string) : "");
                } else if (['company', 'templates', 'insurance', 'retirement_homes', 'caregiver'].includes(key)) {
                    if (value) pbFormData.append(key, value.toString());
                } else if (key === 'contacts') {
                    if (Array.isArray(value) && value.length > 0) {
                        (value as any[]).forEach((item: any) => pbFormData.append(key, item.toString()));
                    }
                } else if (typeof value === 'boolean') {
                    pbFormData.append(key, value.toString());
                } else {
                    if (value !== null && value !== undefined && value !== '') {
                        pbFormData.append(key, value.toString());
                    }
                }
            }

            // 2. Strukturierte Daten für inheritor_info (JSON)
            const carepersonAddress = `${formData.careperson_street} ${formData.careperson_housenr}, ${formData.careperson_zip} ${formData.careperson_city}`.trim().replace(/^,/, '').trim();
            const fullInheritorInfo = {
                inheritor_name: formData.inheritor_name.trim(),
                inheritor_relation: formData.inheritor_relation.trim(),
                inheritor_phone: formData.inheritor_phone.trim(),
                inheritor_email: formData.inheritor_email.trim(),
                has_power_of_attorney: formData.inheritor_has_power_of_attorney,
                inheritor_notes: formData.inheritor_notes.trim(),

                name: (formData.careperson_name || formData.inheritor_name).trim(),
                relation: (formData.careperson_relation || formData.inheritor_relation).trim(),
                birthdate: formData.careperson_birthdate,
                street: formData.careperson_street.trim(),
                housenr: formData.careperson_housenr.trim(),
                zip: formData.careperson_zip.trim(),
                city: formData.careperson_city.trim(),
                address: carepersonAddress,
                phone: (formData.careperson_phone || formData.inheritor_phone).trim(),
                email: (formData.careperson_email || formData.inheritor_email).trim(),
                reason: formData.careperson_reason,
                care_type: formData.careperson_care_type,
                pre_care_fulfilled: formData.careperson_pre_care,
                care_allowance: formData.careperson_care_allowance,
                notes: formData.careperson_notes.trim(),
                updated_at: new Date().toISOString()
            };
            pbFormData.append('inheritor_info', JSON.stringify(fullInheritorInfo));

            // 3. Signatur
            if (signatureMode === "upload" && uploadedFile) {
                pbFormData.append("sign", uploadedFile);
            } else if (signatureMode === "draw" && hasDrawnSignature && canvas) {
                const blob = await new Promise<Blob | null>(resolve => canvas!.toBlob(resolve, "image/png"));
                if (blob) {
                    pbFormData.append("sign", blob, "signature.png");
                }
            }

            const newClient = await pb.collection('clients').create(pbFormData);

            if (orgaStore.clients) {
                await orgaStore.clients.init().catch(() => {});
            }

            toastStore.success(`Klient "${formData.name_first} ${formData.name_last}" erfolgreich angelegt!`);
            goto(`/clients`);
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Anlegen des Klienten.";
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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <a href="/clients" class="text-indigo-600 hover:text-indigo-800 font-bold text-xs sm:text-sm flex items-center gap-1.5 mb-2 transition-colors">
                <ArrowLeft class="w-4 h-4" />
                Zurück zur Klientenübersicht
            </a>
            <h1 class="orga-page-title flex items-center gap-3">
                <span>Neuer Klient</span>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hidden sm:inline-block">
                    Aufnahme & Stammdaten
                </span>
            </h1>
            <p class="orga-page-subtitle">
                Erfassen Sie alle Stammdaten, Pflegeeinstufungen, Angehörigen-Vollmachten und Abrechnungskonditionen.
            </p>
        </div>
    </div>
</div>

<div class="max-w-4xl mx-auto mb-12 animate-enter delay-50">
    
    <!-- STEPPER TABS -->
    <div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-200 shadow-sm p-1.5 sm:p-2 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button 
            type="button"
            onclick={() => activeTab = 'master'}
            class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center sm:justify-start gap-2.5 text-xs font-bold {activeTab === 'master' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}"
        >
            <div class="w-6 h-6 rounded-lg {activeTab === 'master' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'} flex items-center justify-center text-xs shrink-0">
                1
            </div>
            <span class="truncate">👤 Stammdaten</span>
        </button>

        <button 
            type="button"
            onclick={() => activeTab = 'care'}
            class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center sm:justify-start gap-2.5 text-xs font-bold {activeTab === 'care' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}"
        >
            <div class="w-6 h-6 rounded-lg {activeTab === 'care' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'} flex items-center justify-center text-xs shrink-0">
                2
            </div>
            <span class="truncate">🩺 Pflege</span>
        </button>

        <button 
            type="button"
            onclick={() => activeTab = 'inheritor'}
            class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center sm:justify-start gap-2.5 text-xs font-bold {activeTab === 'inheritor' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}"
        >
            <div class="w-6 h-6 rounded-lg {activeTab === 'inheritor' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'} flex items-center justify-center text-xs shrink-0">
                3
            </div>
            <span class="truncate">🤝 Vollmacht</span>
        </button>

        <button 
            type="button"
            onclick={() => activeTab = 'billing'}
            class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center sm:justify-start gap-2.5 text-xs font-bold {activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}"
        >
            <div class="w-6 h-6 rounded-lg {activeTab === 'billing' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'} flex items-center justify-center text-xs shrink-0">
                4
            </div>
            <span class="truncate">💶 Konditionen</span>
        </button>
    </div>

    <!-- FEHLERANZEIGE -->
    {#if errorMsg}
        <div class="bg-rose-50 text-rose-700 p-4 rounded-2xl mb-6 text-xs sm:text-sm font-semibold border border-rose-200 shadow-xs flex items-center gap-3 animate-enter">
            <AlertCircle class="w-5 h-5 shrink-0 text-rose-600" />
            <span class="flex-1">{errorMsg}</span>
        </div>
    {/if}

    <!-- FORMULAR CONTAINER -->
    <div class="orga-card-white p-5 sm:p-8 relative">
        
        <form onsubmit={onSubmit} class="space-y-6">

            <!-- ================= TAB 1: STAMMDATEN ================= -->
            {#if activeTab === 'master'}
                <div class="space-y-6 animate-enter">
                    
                    <div>
                        <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>👤</span> Persönliche Daten
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label for="new-salutation" class="block text-xs font-bold text-neutral-700 mb-1.5">Anrede</label>
                                <select id="new-salutation" bind:value={formData.salutation} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                                    <option value="Herr">Herr</option>
                                    <option value="Frau">Frau</option>
                                    <option value="Divers">Divers</option>
                                    <option value="Keine Angabe">Keine Angabe</option>
                                </select>
                            </div>
                            <div class="sm:col-span-1 md:col-span-1">
                                <label for="new-firstname" class="block text-xs font-bold text-neutral-700 mb-1.5">Vorname *</label>
                                <input id="new-firstname" type="text" bind:value={formData.name_first} placeholder="z. B. Marianne" class="orga-input-clear min-h-[44px] py-2 text-sm" required disabled={isLoading} />
                            </div>
                            <div class="sm:col-span-2 md:col-span-2">
                                <label for="new-lastname" class="block text-xs font-bold text-neutral-700 mb-1.5">Nachname *</label>
                                <input id="new-lastname" type="text" bind:value={formData.name_last} placeholder="z. B. Schmidt" class="orga-input-clear min-h-[44px] py-2 text-sm" required disabled={isLoading} />
                            </div>

                            <div class="sm:col-span-2">
                                <label for="new-birthdate" class="block text-xs font-bold text-neutral-700 mb-1.5">Geburtsdatum</label>
                                <input id="new-birthdate" type="date" bind:value={formData.birthdate} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-marital-status" class="block text-xs font-bold text-neutral-700 mb-1.5">Familienstand</label>
                                <select id="new-marital-status" bind:value={formData.marital_status} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                                    <option value="Keine Angabe">Keine Angabe</option>
                                    <option value="Ledig">Ledig</option>
                                    <option value="Verheiratet">Verheiratet</option>
                                    <option value="Geschieden">Geschieden</option>
                                    <option value="Verwitwet">Verwitwet</option>
                                </select>
                            </div>
                            <div>
                                <label for="new-nationality" class="block text-xs font-bold text-neutral-700 mb-1.5">Nationalität</label>
                                <input id="new-nationality" type="text" bind:value={formData.nationality} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                        </div>
                    </div>

                    <!-- Kontaktdaten -->
                    <div class="pt-5 border-t border-neutral-100">
                        <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>📞</span> Kontaktdaten
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label for="new-phone" class="block text-xs font-bold text-neutral-700 mb-1.5">Festnetz</label>
                                <input id="new-phone" type="tel" bind:value={formData.phone} placeholder="0351 ..." class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-handy" class="block text-xs font-bold text-neutral-700 mb-1.5">Mobiltelefon</label>
                                <input id="new-handy" type="tel" bind:value={formData.handy} placeholder="0172 ..." class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-email" class="block text-xs font-bold text-neutral-700 mb-1.5">E-Mail</label>
                                <input id="new-email" type="email" bind:value={formData.email} placeholder="klient@beispiel.de" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                        </div>
                    </div>

                    <!-- Anschrift -->
                    <div class="pt-5 border-t border-neutral-100">
                        <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>🏠</span> Wohnanschrift
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div class="sm:col-span-3">
                                <label for="new-street" class="block text-xs font-bold text-neutral-700 mb-1.5">Straße</label>
                                <input id="new-street" type="text" bind:value={formData.street} placeholder="Musterstraße" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-housenr" class="block text-xs font-bold text-neutral-700 mb-1.5">Hausnummer</label>
                                <input id="new-housenr" type="text" bind:value={formData.housenr} placeholder="12a" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-zip" class="block text-xs font-bold text-neutral-700 mb-1.5">Postleitzahl</label>
                                <input id="new-zip" type="text" bind:value={formData.zip} placeholder="01067" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div class="sm:col-span-3">
                                <label for="new-city" class="block text-xs font-bold text-neutral-700 mb-1.5">Stadt / Gemeinde</label>
                                <input id="new-city" type="text" bind:value={formData.city} placeholder="Dresden" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                        </div>
                    </div>

                </div>
            {/if}

            <!-- ================= TAB 2: PFLEGE & BETREUUNG ================= -->
            {#if activeTab === 'care'}
                <div class="space-y-6 animate-enter">
                    
                    <div>
                        <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>🩺</span> Einstufung & Krankenkasse
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label for="new-status" class="block text-xs font-bold text-neutral-700 mb-1.5">Betreuungs-Status</label>
                                <select id="new-status" bind:value={formData.status} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                                    <option value="Aktiv">Aktiv</option>
                                    <option value="Inaktiv">Inaktiv</option>
                                    <option value="Verstorben">Verstorben</option>
                                </select>
                            </div>
                            <div>
                                <label for="new-carelevel" class="block text-xs font-bold text-neutral-700 mb-1.5">Pflegegrad</label>
                                <select id="new-carelevel" bind:value={formData.level_of_care} class="orga-input-clear min-h-[44px] py-2 text-sm font-semibold" disabled={isLoading}>
                                    <option value="">Keiner / Noch nicht eingestuft</option>
                                    <option value="0">Pflegegrad 0</option>
                                    <option value="1">Pflegegrad 1 (125 € Entlastungsbetrag)</option>
                                    <option value="2">Pflegegrad 2</option>
                                    <option value="3">Pflegegrad 3</option>
                                    <option value="4">Pflegegrad 4</option>
                                    <option value="5">Pflegegrad 5</option>
                                </select>
                            </div>

                            <div>
                                <label for="new-insurance" class="block text-xs font-bold text-neutral-700 mb-1.5">Kranken- / Pflegekasse</label>
                                <select id="new-insurance" bind:value={formData.insurance} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                                    <option value="">Keine / Unbekannt</option>
                                    <option value="other" class="font-bold text-indigo-700">➕ andere / neue Krankenkasse erfassen...</option>
                                    {#each orgaStore.insurancies?.data || [] as ins (ins.id)}
                                        <option value={ins.id}>{ins.name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label for="new-ins-nr" class="block text-xs font-bold text-neutral-700 mb-1.5">Versicherungsnummer (KV-Nr.)</label>
                                <input id="new-ins-nr" type="text" bind:value={formData.insurance_nr} placeholder="z. B. Z123456789" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>

                            {#if formData.insurance === 'other'}
                                <div class="sm:col-span-2 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 animate-enter">
                                    <label for="new-other-ins-name" class="block text-xs font-bold text-indigo-950 mb-1">Name der neuen Krankenkasse *</label>
                                    <input id="new-other-ins-name" type="text" bind:value={formData.other_insurance_name} placeholder="z. B. Barmer, DAK, AOK PLUS..." class="orga-input-clear bg-white min-h-[44px] py-2 text-sm" required disabled={isLoading} />
                                    <p class="text-[11px] text-indigo-700 mt-1.5">Diese Krankenkasse wird automatisch in die Datenbank aufgenommen und steht fortan zur Verfügung.</p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Betreuung & Einrichtung -->
                    <div class="pt-5 border-t border-neutral-100">
                        <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>👥</span> Betreuung & Organisation
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="new-caregiver" class="block text-xs font-bold text-neutral-700 mb-1.5">Feste Bezugspflegekraft / Betreuer</label>
                                <select id="new-caregiver" bind:value={formData.caregiver} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                                    <option value="">Keine feste Zuweisung</option>
                                    {#each availableCaregivers as user (user.id)}
                                        <option value={user.id}>{user.name_first} {user.name_last}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label for="new-home" class="block text-xs font-bold text-neutral-700 mb-1.5">Seniorenheim / Einrichtung (falls wohnhaft)</label>
                                <select id="new-home" bind:value={formData.retirement_homes} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                                    <option value="">Eigener Haushalt (kein Heim)</option>
                                    {#each orgaStore.retirement_homes?.data || [] as home (home.id)}
                                        <option value={home.id}>{home.name} ({home.city})</option>
                                    {/each}
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Verknüpfte Kontakte -->
                    <div class="pt-5 border-t border-neutral-100">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                                <span>📇</span> Wichtige Kontakte (Ärzte, Notfall)
                            </h3>
                            <span class="text-[11px] font-bold text-neutral-400">
                                {formData.contacts.length} gewählt
                            </span>
                        </div>
                        <p class="text-xs text-neutral-500 mb-3">Wählen Sie Hausärzte, Pflegedienste oder Vertrauenspersonen aus dem Kontaktbuch aus:</p>
                        
                        <div class="max-h-48 overflow-y-auto custom-scrollbar p-2 bg-neutral-50 rounded-2xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {#each orgaStore.contacts?.data || [] as contact (contact.id)}
                                <label class="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-neutral-200/80 hover:border-indigo-300 transition-colors cursor-pointer text-xs">
                                    <input 
                                        type="checkbox" 
                                        value={contact.id}
                                        checked={formData.contacts.includes(contact.id)}
                                        onchange={(e) => {
                                            const checked = (e.target as HTMLInputElement).checked;
                                            if (checked) formData.contacts = [...formData.contacts, contact.id];
                                            else formData.contacts = formData.contacts.filter(id => id !== contact.id);
                                        }}
                                        class="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" 
                                    />
                                    <div class="min-w-0 flex-1">
                                        <p class="font-bold text-neutral-900 truncate">{contact.name_first} {contact.name_last} {contact.company_name ? `(${contact.company_name})` : ''}</p>
                                        <p class="text-[10px] text-neutral-500 truncate">{contact.city || contact.phone || ''}</p>
                                    </div>
                                </label>
                            {/each}
                            {#if (orgaStore.contacts?.data || []).length === 0}
                                <div class="col-span-2 py-4 text-center text-neutral-400 text-xs">Keine Kontakte im Adressbuch vorhanden.</div>
                            {/if}
                        </div>
                    </div>

                </div>
            {/if}

            <!-- ================= TAB 3: ANGEHÖRIGE & VERHINDERUNGSPFLEGE ================= -->
            {#if activeTab === 'inheritor'}
                <div class="space-y-6 animate-enter">
                    
                    <!-- Bevollmächtigter / Erbe -->
                    <div>
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                                <span>🤝</span> Bevollmächtigte Person / Angehörige(r)
                            </h3>
                            <div class="flex bg-neutral-100 p-1 rounded-xl shrink-0">
                                <button 
                                    type="button" 
                                    onclick={() => inheritorMode = 'direct'}
                                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all {inheritorMode === 'direct' ? 'bg-white text-indigo-700 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}"
                                >
                                    Direkteingabe
                                </button>
                                <button 
                                    type="button" 
                                    onclick={() => inheritorMode = 'contact'}
                                    class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all {inheritorMode === 'contact' ? 'bg-white text-indigo-700 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}"
                                >
                                    Aus Kontakten
                                </button>
                            </div>
                        </div>

                        {#if inheritorMode === 'contact'}
                            <div class="mb-4">
                                <label for="new-inheritor-contact" class="block text-xs font-bold text-neutral-700 mb-1.5">Kontakt verknüpfen</label>
                                <select 
                                    id="new-inheritor-contact"
                                    bind:value={formData.inheritor}
                                    onchange={(e) => handleContactSelected((e.target as HTMLSelectElement).value)}
                                    class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer"
                                >
                                    <option value="">Bitte wählen...</option>
                                    {#each orgaStore.contacts?.data || [] as c (c.id)}
                                        <option value={c.id}>{c.name_first} {c.name_last} ({c.phone || c.email || 'Keine Kontaktdaten'})</option>
                                    {/each}
                                </select>
                            </div>
                        {/if}

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="new-inh-name" class="block text-xs font-bold text-neutral-700 mb-1.5">Name der Person</label>
                                <input id="new-inh-name" type="text" bind:value={formData.inheritor_name} placeholder="Vor- und Nachname" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-inh-relation" class="block text-xs font-bold text-neutral-700 mb-1.5">Verhältnis / Beziehung</label>
                                <select id="new-inh-relation" bind:value={formData.inheritor_relation} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                                    <option value="Ehepartner/in">Ehepartner/in</option>
                                    <option value="Tochter / Sohn">Tochter / Sohn</option>
                                    <option value="Gesetzl. Betreuer/in">Gesetzl. Betreuer/in</option>
                                    <option value="Mutter / Vater">Mutter / Vater</option>
                                    <option value="Geschwister">Geschwister</option>
                                    <option value="Sonstige(r)">Sonstige(r)</option>
                                </select>
                            </div>
                            <div>
                                <label for="new-inh-phone" class="block text-xs font-bold text-neutral-700 mb-1.5">Telefonnummer</label>
                                <input id="new-inh-phone" type="tel" bind:value={formData.inheritor_phone} placeholder="0172 ..." class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-inh-email" class="block text-xs font-bold text-neutral-700 mb-1.5">E-Mail</label>
                                <input id="new-inh-email" type="email" bind:value={formData.inheritor_email} placeholder="angehoeriger@beispiel.de" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div class="sm:col-span-2">
                                <label class="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer hover:bg-indigo-50/50 transition-colors">
                                    <input type="checkbox" bind:checked={formData.inheritor_has_power_of_attorney} class="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500 cursor-pointer" />
                                    <span class="text-xs font-bold text-neutral-800">
                                        Vorsorgevollmacht / Betreuerausweis liegt vor und ist eingesehen
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Verhinderungspflege § 39 SGB XI -->
                    <div class="pt-5 border-t border-neutral-100">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                                    <span>🛡️</span> Pflegeperson für Verhinderungspflege (§ 39 SGB XI)
                                </h3>
                                <p class="text-[11px] text-neutral-500 mt-0.5">Erforderlich für Leistungsanträge und stundenweise Vertretung</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <button 
                                    type="button" 
                                    onclick={copyInheritorToCareperson}
                                    class="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
                                >
                                    📋 Wie Bevollmächtigter
                                </button>
                                <button 
                                    type="button" 
                                    onclick={copyClientAddressToCareperson}
                                    class="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
                                >
                                    🏠 Wohnanschrift wie Klient
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="sm:col-span-2">
                                <label for="new-cp-name" class="block text-xs font-bold text-neutral-700 mb-1.5">Name der Pflegeperson</label>
                                <input id="new-cp-name" type="text" bind:value={formData.careperson_name} placeholder="Vor- und Nachname" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-cp-rel" class="block text-xs font-bold text-neutral-700 mb-1.5">Verwandtschaftsgrad</label>
                                <select id="new-cp-rel" bind:value={formData.careperson_relation} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                                    <option value="Ehepartner/in">Ehepartner/in</option>
                                    <option value="Tochter / Sohn">Tochter / Sohn</option>
                                    <option value="Schwiegertochter / Sohn">Schwiegertochter / Sohn</option>
                                    <option value="Mutter / Vater">Mutter / Vater</option>
                                    <option value="Nachbar/in / Bekannte(r)">Nachbar/in / Bekannte(r)</option>
                                </select>
                            </div>
                            <div>
                                <label for="new-cp-birth" class="block text-xs font-bold text-neutral-700 mb-1.5">Geburtsdatum</label>
                                <input id="new-cp-birth" type="date" bind:value={formData.careperson_birthdate} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>

                            <div class="sm:col-span-3">
                                <label for="new-cp-street" class="block text-xs font-bold text-neutral-700 mb-1.5">Straße der Pflegeperson</label>
                                <input id="new-cp-street" type="text" bind:value={formData.careperson_street} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-cp-nr" class="block text-xs font-bold text-neutral-700 mb-1.5">Hausnummer</label>
                                <input id="new-cp-nr" type="text" bind:value={formData.careperson_housenr} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>

                            <div>
                                <label for="new-cp-zip" class="block text-xs font-bold text-neutral-700 mb-1.5">PLZ</label>
                                <input id="new-cp-zip" type="text" bind:value={formData.careperson_zip} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div class="sm:col-span-3">
                                <label for="new-cp-city" class="block text-xs font-bold text-neutral-700 mb-1.5">Stadt</label>
                                <input id="new-cp-city" type="text" bind:value={formData.careperson_city} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>

                            <div>
                                <label for="new-cp-phone" class="block text-xs font-bold text-neutral-700 mb-1.5">Telefon</label>
                                <input id="new-cp-phone" type="tel" bind:value={formData.careperson_phone} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-cp-email" class="block text-xs font-bold text-neutral-700 mb-1.5">E-Mail</label>
                                <input id="new-cp-email" type="email" bind:value={formData.careperson_email} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-cp-reason" class="block text-xs font-bold text-neutral-700 mb-1.5">Verhinderungsgrund</label>
                                <select id="new-cp-reason" bind:value={formData.careperson_reason} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                                    <option value="Erholungsurlaub">Erholungsurlaub</option>
                                    <option value="Krankheit">Krankheit</option>
                                    <option value="Sonstiges">Sonstiges</option>
                                </select>
                            </div>
                            <div>
                                <label for="new-cp-type" class="block text-xs font-bold text-neutral-700 mb-1.5">Art der Verhinderung</label>
                                <select id="new-cp-type" bind:value={formData.careperson_care_type} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                                    <option value="stundenweise">Stundenweise (&lt; 8 Std.)</option>
                                    <option value="tageweise">Tageweise (&gt;= 8 Std.)</option>
                                </select>
                            </div>

                            <div class="sm:col-span-4 flex flex-col sm:flex-row gap-3 pt-2">
                                <label class="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                                    <input type="checkbox" bind:checked={formData.careperson_pre_care} class="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" />
                                    <span>Vorpflegezeit erfüllt (mindestens 6 Monate)</span>
                                </label>
                                <label class="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                                    <input type="checkbox" bind:checked={formData.careperson_care_allowance} class="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" />
                                    <span>Pflegegeldbezug liegt vor</span>
                                </label>
                            </div>
                        </div>
                    </div>

                </div>
            {/if}

            <!-- ================= TAB 4: ABRECHNUNG & SIGNATUR ================= -->
            {#if activeTab === 'billing'}
                <div class="space-y-6 animate-enter">
                    
                    <div>
                        <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>💶</span> Abrechnungskonditionen & Vorlage
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label for="new-wage" class="block text-xs font-bold text-neutral-700 mb-1.5">Stundensatz (€)</label>
                                <input id="new-wage" type="number" step="0.01" bind:value={formData.hourly_wage} class="orga-input-clear min-h-[44px] py-2 text-sm font-bold text-neutral-900" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-km" class="block text-xs font-bold text-neutral-700 mb-1.5">Fahrtkosten (€/km)</label>
                                <input id="new-km" type="number" step="0.01" bind:value={formData.km_rate} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
                            </div>
                            <div>
                                <label for="new-tax" class="block text-xs font-bold text-neutral-700 mb-1.5">Umsatzsteuer (%)</label>
                                <select id="new-tax" bind:value={formData.tax_rate} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                                    <option value="0">0% (Umsatzsteuerbefreit nach § 4 Nr. 16 UStG)</option>
                                    <option value="7">7% ermäßigt</option>
                                    <option value="19">19% Regelsteuersatz</option>
                                </select>
                            </div>

                            <div class="sm:col-span-2">
                                <label for="new-company" class="block text-xs font-bold text-neutral-700 mb-1.5">Zugehörige Firma *</label>
                                <select id="new-company" bind:value={formData.company} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" required disabled={isLoading || !isOwner}>
                                    {#if isOwner}<option value="">Bitte Firma auswählen...</option>{/if}
                                    {#each orgaStore.company?.data || [] as comp (comp.id)}
                                        <option value={comp.id}>{comp.name} ({comp.city || 'Hauptsitz'})</option>
                                    {/each}
                                </select>
                            </div>

                            <div>
                                <label for="new-template" class="block text-xs font-bold text-neutral-700 mb-1.5">Standard-Dokumentvorlage</label>
                                <select id="new-template" bind:value={formData.templates} class="orga-input-clear min-h-[44px] py-2 text-sm cursor-pointer" disabled={isLoading}>
                                    <option value="">Keine Vorlage zugewiesen</option>
                                    {#each orgaStore.document_templates?.data || [] as t (t.id)}
                                        <option value={t.id}>{t.title}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Notizen -->
                    <div class="pt-5 border-t border-neutral-100">
                        <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>📝</span> Interne Notizen & Besonderheiten
                        </h3>
                        <div>
                            <textarea 
                                id="new-notes" 
                                bind:value={formData.notes} 
                                rows="3" 
                                class="orga-input-clear py-2.5 text-sm resize-y custom-scrollbar" 
                                placeholder="Wichtige Hinweise, Krankheitsbilder, Vorlieben oder Aufgaben..." 
                                disabled={isLoading}
                            ></textarea>
                        </div>
                    </div>

                    <!-- Digitale Unterschrift -->
                    <div class="pt-5 border-t border-neutral-100">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h3 class="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                                    <span>✍️</span> Digitale Unterschrift (Optional)
                                </h3>
                                <p class="text-[11px] text-neutral-500 mt-0.5">Vor Ort auf dem Smartphone/Tablet oder als Bilddatei hinterlegen</p>
                            </div>
                            <div class="flex bg-neutral-100 p-1 rounded-xl shrink-0">
                                <button type="button" onclick={() => signatureMode = 'draw'} class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {signatureMode === 'draw' ? 'bg-white shadow-xs text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Zeichnen</button>
                                <button type="button" onclick={() => signatureMode = 'upload'} class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {signatureMode === 'upload' ? 'bg-white shadow-xs text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Upload</button>
                            </div>
                        </div>

                        {#if signatureMode === 'draw'}
                            <div class="relative bg-white border-2 border-dashed border-neutral-200 rounded-2xl overflow-hidden touch-none p-1">
                                <canvas 
                                    bind:this={canvas} 
                                    width="700" height="220" 
                                    class="w-full h-44 cursor-crosshair bg-neutral-50/50 rounded-xl"
                                    onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                                    ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                                ></canvas>
                                
                                <div class="absolute top-3 right-3 flex items-center gap-2">
                                    <button 
                                        type="button" 
                                        onclick={openSignatureFullscreen}
                                        class="px-2.5 py-1.5 bg-white/90 hover:bg-white text-neutral-700 text-xs font-bold rounded-xl border border-neutral-200 shadow-sm transition-colors flex items-center gap-1"
                                        title="Vollbild-Zeichenfläche öffnen"
                                    >
                                        <Maximize2 class="w-3.5 h-3.5" />
                                        <span>Vollbild</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        onclick={clearSignature} 
                                        class="px-2.5 py-1.5 bg-white/90 hover:bg-white text-neutral-700 text-xs font-bold rounded-xl border border-neutral-200 shadow-sm transition-colors flex items-center gap-1"
                                    >
                                        <RotateCcw class="w-3.5 h-3.5" />
                                        <span>Leeren</span>
                                    </button>
                                </div>

                                {#if !hasDrawnSignature}
                                    <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-300 font-medium text-xs sm:text-sm">
                                        Hier mit Stift oder Finger unterschreiben
                                    </div>
                                {/if}
                            </div>
                        {:else}
                            <div class="bg-white border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center">
                                <input type="file" accept="image/png, image/jpeg" class="w-full text-xs sm:text-sm text-neutral-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer" onchange={handleFileChange} />
                            </div>
                        {/if}
                    </div>

                </div>
            {/if}

            <!-- FORMULAR FOOTER MIT NAVIGATION -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-neutral-100">
                <div>
                    {#if activeTab !== 'master'}
                        <button 
                            type="button" 
                            onclick={prevTab}
                            class="orga-button-ghost py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 w-full sm:w-auto"
                            disabled={isLoading}
                        >
                            <ArrowLeft class="w-4 h-4" />
                            <span>Zurück</span>
                        </button>
                    {:else}
                        <a 
                            href="/clients" 
                            class="orga-button-ghost py-2.5 px-4 text-xs font-bold text-neutral-600 block text-center w-full sm:w-auto"
                        >
                            Abbrechen
                        </a>
                    {/if}
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                    {#if activeTab !== 'billing'}
                        <button 
                            type="button" 
                            onclick={nextTab}
                            class="orga-button-primary py-2.5 px-6 text-xs font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px]"
                        >
                            <span>Weiter</span>
                            <ArrowRight class="w-4 h-4" />
                        </button>
                    {:else}
                        <button 
                            type="submit" 
                            class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 py-2.5 px-8 text-xs font-bold flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]" 
                            disabled={isLoading}
                        >
                            {#if isLoading}
                                <span class="animate-spin text-sm">⏳</span>
                                <span>Wird gespeichert...</span>
                            {:else}
                                <Check class="w-4 h-4" />
                                <span>Klient jetzt anlegen</span>
                            {/if}
                        </button>
                    {/if}
                </div>
            </div>

        </form>

    </div>
</div>

<!-- FULLSCREEN SIGNATUR MODAL -->
<dialog 
    bind:this={sigDialog} 
    class="p-0 bg-transparent backdrop:bg-black/70 backdrop:backdrop-blur-sm w-full max-w-2xl m-auto rounded-3xl outline-none"
>
    <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 border border-neutral-200">
        <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <span>✍️</span> Unterschrift in voller Größe
            </h3>
            <button type="button" onclick={closeSignatureFullscreen} class="p-1 text-neutral-400 hover:text-neutral-700">
                <X class="w-5 h-5" />
            </button>
        </div>

        <p class="text-xs text-neutral-500">
            Nutzen Sie die vergrößerte Zeichenfläche für eine bequeme Unterschrift mit dem Finger oder Eingabestift.
        </p>

        <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick={clearSignature} class="orga-button-ghost py-2 px-4 text-xs font-bold">
                Neu zeichnen
            </button>
            <button type="button" onclick={closeSignatureFullscreen} class="orga-button-primary py-2 px-6 text-xs font-bold">
                Übernehmen & Schließen
            </button>
        </div>
    </div>
</dialog>