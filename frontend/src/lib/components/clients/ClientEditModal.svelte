<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { employeeService } from "$lib/services/employeeService.svelte";
    import { Check, X, RotateCcw, Maximize2 } from "lucide-svelte";

    let { client } = $props<{ client: any }>();

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    // Aktiver Tab für das 4-Tab-Interface
    let activeTab = $state<'master' | 'care' | 'inheritor' | 'documents'>('master');

    // Modus für Erben: 'contact' (Verknüpfung) oder 'direct' (Direkteingabe)
    let inheritorMode = $state<'contact' | 'direct'>('direct');
    let initialAssignedEmployee = $state<string>('');

    // Formular-Daten für alle Klienten-Felder
    let formData = $state({
        salutation: "Keine Angabe",
        name_first: "",
        name_last: "",
        nationality: "Deutsch",
        marital_status: "Keine Angabe",
        email: "",
        phone: "",
        handy: "",
        status: "Aktiv",
        level_of_care: "",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        birthdate: "",
        insurance: "",
        insurance_nr: "",
        hourly_wage: 40,
        km_rate: 0.3,
        tax_rate: "0",
        default_template: "",
        caregiver: "",
        assigned_employee: "",
        company: "",
        notes: "",
        inheritor: "", // Relation zu contacts

        // Strukturierte Erben- / Bevollmächtigten-Felder
        inheritor_name: "",
        inheritor_relation: "Ehepartner/in",
        inheritor_phone: "",
        inheritor_email: "",
        inheritor_has_power_of_attorney: false,
        inheritor_notes: "",

        // Verhinderungspflege (§ 39 SGB XI) / Pflegeperson Daten (in inheritor_info)
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

    function copyClientAddressToCareperson() {
        formData.careperson_street = formData.street;
        formData.careperson_housenr = formData.housenr;
        formData.careperson_zip = formData.zip;
        formData.careperson_city = formData.city;
        toastStore.info("Wohnanschrift des Klienten für Pflegeperson übernommen.");
    }

    // Signatur-Status
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let fsCanvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let isFsDrawing = false;
    let uploadedFile = $state<File | null>(null);
    let hasDrawnSignature = $state(false);
    let hasDrawnFsSignature = $state(false);
    let existingSignatureUrl = $state("");
    let deleteExistingSignature = $state(false);
    let initialDataHash = $state("");
    let isSignatureFullscreen = $state(false);

    // Dynamic Viewport Tracking für Mobile Virtual Keyboard
    let viewportHeight = $state('92vh');

    $effect(() => {
        if (typeof window === 'undefined') return;
        const handleViewportChange = () => {
            if (window.visualViewport) {
                if (window.innerWidth < 640) {
                    viewportHeight = `${window.visualViewport.height - 16}px`;
                } else {
                    viewportHeight = '92vh';
                }
            }
        };

        window.visualViewport?.addEventListener('resize', handleViewportChange);
        window.visualViewport?.addEventListener('scroll', handleViewportChange);
        handleViewportChange();

        return () => {
            window.visualViewport?.removeEventListener('resize', handleViewportChange);
            window.visualViewport?.removeEventListener('scroll', handleViewportChange);
        };
    });

    let age = $derived.by(() => {
        if (!formData.birthdate) return null;
        try {
            const birthDate = new Date(formData.birthdate);
            if (isNaN(birthDate.getTime())) return null;
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
            return calculatedAge;
        } catch { return null; }
    });

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

    export function open(overrideClient?: any) {
        activeTab = 'master';
        const target = overrideClient || client;
        if (target) {
            const info = target.inheritor_info || {};
            const linkedContactId = Array.isArray(target.inheritor) ? (target.inheritor[0] || "") : (target.inheritor || "");
            inheritorMode = linkedContactId ? 'contact' : 'direct';

            formData = {
                salutation: target.salutation || "Keine Angabe",
                name_first: target.name_first || "",
                name_last: target.name_last || "",
                nationality: target.nationality || "Deutsch",
                marital_status: target.marital_status || "Keine Angabe",
                email: target.email || "",
                phone: target.phone || "",
                handy: target.handy || "",
                status: target.status || "Aktiv",
                level_of_care: target.level_of_care || "",
                street: target.street || "",
                housenr: target.housenr || "",
                zip: target.zip || "",
                city: target.city || "",
                birthdate: toYMD(target.birthdate),
                insurance: target.insurance || "",
                insurance_nr: target.insurance_nr || "",
                hourly_wage: target.hourly_wage ?? (target.hourly_rate ?? 40),
                km_rate: target.km_rate ?? 0.3,
                tax_rate: target.tax_rate != null ? target.tax_rate.toString() : "0",
                default_template: target.default_template || "",
                caregiver: target.caregiver || "",
                assigned_employee: (employeeService.getAssignedEmployeeForClient(target.id)?.id || ""),
                company: Array.isArray(target.company) ? (target.company[0] || "") : (target.company || ""),
                notes: target.notes || "",
                inheritor: linkedContactId,

                // Direkte Erben- / Bevollmächtigten-Felder
                inheritor_name: target.inheritor_name || info.inheritor_name || info.name || "",
                inheritor_relation: target.inheritor_relation || info.inheritor_relation || info.relation || "Ehepartner/in",
                inheritor_phone: target.inheritor_phone || info.inheritor_phone || info.phone || "",
                inheritor_email: target.inheritor_email || info.inheritor_email || info.email || "",
                inheritor_has_power_of_attorney: target.inheritor_has_power_of_attorney ?? info.has_power_of_attorney ?? false,
                inheritor_notes: target.inheritor_notes || info.inheritor_notes || info.notes || "",

                // Verhinderungspflege-Felder
                careperson_name: info.name || info.careperson_name || (target.expand?.inheritor ? (Array.isArray(target.expand.inheritor) ? `${target.expand.inheritor[0]?.name_first || ''} ${target.expand.inheritor[0]?.name_last || ''}`.trim() : `${target.expand.inheritor.name_first || ''} ${target.expand.inheritor.name_last || ''}`.trim()) : ""),
                careperson_relation: info.relation || "Ehepartner/in",
                careperson_birthdate: toYMD(info.birthdate || ""),
                careperson_street: info.street || "",
                careperson_housenr: info.housenr || "",
                careperson_zip: info.zip || "",
                careperson_city: info.city || "",
                careperson_phone: info.phone || (target.expand?.inheritor ? (Array.isArray(target.expand.inheritor) ? target.expand.inheritor[0]?.phone : target.expand.inheritor.phone) : ""),
                careperson_email: info.email || (target.expand?.inheritor ? (Array.isArray(target.expand.inheritor) ? target.expand.inheritor[0]?.email : target.expand.inheritor.email) : ""),
                careperson_reason: info.reason || "Erholungsurlaub",
                careperson_care_type: info.care_type || "stundenweise",
                careperson_pre_care: info.pre_care_fulfilled ?? true,
                careperson_care_allowance: info.care_allowance ?? true,
                careperson_notes: info.notes || ""
            };
            initialAssignedEmployee = formData.assigned_employee;
            
            if (target.sign) {
                existingSignatureUrl = pb.files.getURL(target, target.sign);
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
    function getPointerPos(e: MouseEvent | TouchEvent, targetCanvas: HTMLCanvasElement | null) {
        if (!targetCanvas) return { x: 0, y: 0 };
        const rect = targetCanvas.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;
        if (window.TouchEvent && e instanceof TouchEvent) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        const scaleX = targetCanvas.width / rect.width;
        const scaleY = targetCanvas.height / rect.height;
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
        const pos = getPointerPos(e, canvas);
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
        const pos = getPointerPos(e, canvas);
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

    // Fullscreen Signature handlers
    function startFsDrawing(e: MouseEvent | TouchEvent) {
        if (!fsCanvas) return;
        e.preventDefault();
        isFsDrawing = true;
        hasDrawnFsSignature = true;
        const pos = getPointerPos(e, fsCanvas);
        const ctx = fsCanvas.getContext("2d");
        if (ctx) {
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#4f46e5";
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    }

    function drawFs(e: MouseEvent | TouchEvent) {
        if (!isFsDrawing || !fsCanvas) return;
        e.preventDefault();
        const pos = getPointerPos(e, fsCanvas);
        const ctx = fsCanvas.getContext("2d");
        if (ctx) {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }

    function stopFsDrawing() {
        isFsDrawing = false;
    }

    function clearFsSignature() {
        if (!fsCanvas) return;
        const ctx = fsCanvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, fsCanvas.width, fsCanvas.height);
        }
        hasDrawnFsSignature = false;
    }

    async function openSignatureFullscreen() {
        isSignatureFullscreen = true;
        setTimeout(() => {
            if (fsCanvas && canvas && hasDrawnSignature) {
                const ctx = fsCanvas.getContext("2d");
                if (ctx) {
                    ctx.clearRect(0, 0, fsCanvas.width, fsCanvas.height);
                    ctx.drawImage(canvas, 0, 0, fsCanvas.width, fsCanvas.height);
                    hasDrawnFsSignature = true;
                }
            }
        }, 60);

        try {
            if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                await document.documentElement.requestFullscreen().catch(() => {});
            }
            if (screen.orientation && 'lock' in screen.orientation) {
                await (screen.orientation as any).lock('landscape').catch(() => {});
            }
        } catch (e) {}
    }

    function applyFsSignature() {
        if (fsCanvas && canvas && hasDrawnFsSignature) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(fsCanvas, 0, 0, canvas.width, canvas.height);
                hasDrawnSignature = true;
            }
        }
        closeSignatureFullscreen();
    }

    function closeSignatureFullscreen() {
        isSignatureFullscreen = false;
        try {
            if (screen.orientation && 'unlock' in screen.orientation) {
                (screen.orientation as any).unlock();
            }
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        } catch (e) {}
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            uploadedFile = target.files[0];
        } else {
            uploadedFile = null;
        }
    }

    // Wenn ein Kontakt ausgewählt wird, Stammdaten automatisch in Erben-Felder spiegeln
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

    // --- Speichern ---
    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const pbFormData = new FormData();
            
            // Standard-Felder sanitizen
            for (const [key, value] of Object.entries(formData)) {
                if (
                    key.startsWith('careperson_') ||
                    key === 'default_template' ||
                    key === 'hourly_wage'
                ) continue; // Werden gesondert behandelt
                
                if (key === 'tax_rate') {
                    pbFormData.append(key, (value != null && value !== "") ? value.toString() : "0");
                } else if (key === 'km_rate') {
                    pbFormData.append(key, (value != null && value !== "") ? value.toString() : "0.3");
                } else if (key === 'marital_status') {
                    pbFormData.append(key, (value === 'Keine Angabe' || !value) ? '' : value.toString());
                } else if (key === 'birthdate') {
                    const cleanVal = (value as string || '').trim();
                    pbFormData.append(key, cleanVal ? `${cleanVal} 12:00:00.000Z` : "");
                } else if (key === 'email') {
                    const em = (value as string || '').trim();
                    pbFormData.append(key, (em.includes('@') && em.includes('.')) ? em : '');
                } else if (key === 'inheritor_has_power_of_attorney') {
                    pbFormData.append(key, value ? 'true' : 'false');
                } else if (key === 'inheritor') {
                    // Falls Modus direct gewählt ist oder kein gültiger Kontakt ausgewählt wurde
                    const inhVal = (inheritorMode === 'contact' && typeof value === 'string') ? value.trim() : "";
                    if (inhVal && inhVal.length > 5) {
                        const isContact = orgaStore.contacts?.data?.some((c: any) => c.id === inhVal);
                        if (isContact) pbFormData.append(key, inhVal);
                    }
                } else if (['insurance', 'retirement_homes', 'caregiver', 'company', 'templates', 'facility'].includes(key)) {
                    if (typeof value === 'string' && value.trim().length > 0 && value !== 'none' && value !== 'other') {
                        const trimmedVal = value.trim();
                        if (key === 'caregiver') {
                            const isContact = orgaStore.contacts?.data?.some((c: any) => c.id === trimmedVal);
                            if (isContact) pbFormData.append(key, trimmedVal);
                        } else {
                            pbFormData.append(key, trimmedVal);
                        }
                    }
                } else {
                    pbFormData.append(key, (value ?? '').toString());
                }
            }

            // DB-Feld hourly_rate setzen
            const hourlyRate = Number(formData.hourly_wage ?? (formData as any).hourly_rate ?? 40);
            pbFormData.append('hourly_rate', isNaN(hourlyRate) ? '40' : hourlyRate.toString());

            // Falls default_template vergeben war, als templates relation anhängen
            if (formData.default_template && typeof formData.default_template === 'string' && formData.default_template.length > 5) {
                pbFormData.append('templates', formData.default_template);
            }

            // Strukturierte Daten für inheritor_info (JSON)
            const carepersonAddress = `${formData.careperson_street} ${formData.careperson_housenr}, ${formData.careperson_zip} ${formData.careperson_city}`.trim().replace(/^,/, '').trim();
            const fullInheritorInfo = {
                // Erbe / Vollmacht
                inheritor_name: formData.inheritor_name.trim(),
                inheritor_relation: formData.inheritor_relation.trim(),
                inheritor_phone: formData.inheritor_phone.trim(),
                inheritor_email: formData.inheritor_email.trim(),
                has_power_of_attorney: formData.inheritor_has_power_of_attorney,
                inheritor_notes: formData.inheritor_notes.trim(),

                // Pflegeperson für Verhinderungspflege (§ 39 SGB XI)
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
            
            // Falls der zugewiesene Mitarbeiter geändert wurde, synchronisieren
            if (formData.assigned_employee !== initialAssignedEmployee) {
                await employeeService.assignEmployeeToClient(client.id, formData.assigned_employee || null, true);
            }

            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 300);
            
            toastStore.success(`Klientendaten für ${formData.name_first} ${formData.name_last} wurden erfolgreich aktualisiert.`);
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
            toastStore.error(`Fehler beim Speichern: ${errorMsg}`);
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-4xl mx-auto my-auto max-h-[92dvh] rounded-3xl border-none shadow-2xl z-9999 touch-pan-y" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="form-mobile-container sm:h-auto sm:min-h-0 bg-white rounded-3xl w-full flex flex-col relative overflow-hidden shadow-2xl border border-neutral-100 transition-all duration-75" style="max-height: {viewportHeight}; height: {viewportHeight};">
        <!-- Header -->
        <div class="px-5 sm:px-8 py-4 sm:py-5 border-b border-neutral-200 shrink-0 sticky top-0 bg-white/95 backdrop-blur-md z-20 flex justify-between items-center">
            <div>
                <h2 class="text-lg sm:text-2xl font-bold text-neutral-900 leading-tight">Klient bearbeiten</h2>
                <p class="text-xs text-neutral-500 font-medium">{formData.name_first || ''} {formData.name_last || ''} · Alle Felder vollständig verwalten</p>
            </div>
            <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <!-- 4-Tab Navigation (Mobile-First Scrollbar / Pills) -->
        <div class="bg-neutral-50/80 px-4 sm:px-8 py-2.5 border-b border-neutral-200 shrink-0 overflow-x-auto custom-scrollbar">
            <div class="flex items-center gap-2 min-w-max">
                <button
                    type="button"
                    onclick={() => activeTab = 'master'}
                    class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 {activeTab === 'master' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
                >
                    <span>👤</span> Stammdaten
                </button>
                <button
                    type="button"
                    onclick={() => activeTab = 'care'}
                    class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 {activeTab === 'care' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
                >
                    <span>🏥</span> Pflege & Kasse
                </button>
                <button
                    type="button"
                    onclick={() => activeTab = 'inheritor'}
                    class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 {activeTab === 'inheritor' ? 'bg-teal-700 text-white shadow-sm shadow-teal-700/20' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
                >
                    <span>⚖️</span> Erbe & Vollmacht
                </button>
                <button
                    type="button"
                    onclick={() => activeTab = 'documents'}
                    class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 {activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
                >
                    <span>📁</span> Dokumente & Vorlagen
                </button>
            </div>
        </div>

        <!-- Formular Body -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
            {#if errorMsg}
                <div class="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-sm font-bold border border-rose-200 shadow-sm">{errorMsg}</div>
            {/if}

            <form id="clientEditForm" onsubmit={onSubmit} class="space-y-6">

                <!-- TAB 1: STAMMDATEN -->
                {#if activeTab === 'master'}
                    <div class="space-y-6 animate-enter">
                        <!-- Identität -->
                        <div>
                            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">1. Persönliche Daten</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <label for="edit-salutation" class="block text-sm font-semibold text-neutral-700 mb-1.5">Anrede</label>
                                    <select id="edit-salutation" bind:value={formData.salutation} class="orga-input-clear text-base" disabled={isLoading}>
                                        <option value="Keine Angabe">Keine Angabe</option>
                                        <option value="Herr">Herr</option>
                                        <option value="Frau">Frau</option>
                                        <option value="Divers">Divers</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="edit-firstname" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname</label>
                                    <input id="edit-firstname" type="text" bind:value={formData.name_first} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-lastname" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname</label>
                                    <input id="edit-lastname" type="text" bind:value={formData.name_last} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <div class="flex items-center justify-between mb-1.5">
                                        <label for="edit-birthdate" class="block text-sm font-semibold text-neutral-700">Geburtsdatum</label>
                                        {#if age !== null && age >= 0}
                                            <span class="text-xs font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">{age} Jahre</span>
                                        {/if}
                                    </div>
                                    <input id="edit-birthdate" type="date" bind:value={formData.birthdate} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-nationality" class="block text-sm font-semibold text-neutral-700 mb-1.5">Staatsangehörigkeit</label>
                                    <input id="edit-nationality" type="text" bind:value={formData.nationality} placeholder="Deutsch" class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-marital-status" class="block text-sm font-semibold text-neutral-700 mb-1.5">Familienstand</label>
                                    <select id="edit-marital-status" bind:value={formData.marital_status} class="orga-input-clear text-base" disabled={isLoading}>
                                        <option value="Keine Angabe">Keine Angabe</option>
                                        <option value="Ledig">Ledig</option>
                                        <option value="Verheiratet">Verheiratet</option>
                                        <option value="Geschieden">Geschieden</option>
                                        <option value="Verwitwet">Verwitwet</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Erreichbarkeit -->
                        <div class="pt-5 border-t border-neutral-200">
                            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">2. Kontaktdaten & Status</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label for="edit-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon (Festnetz)</label>
                                    <input id="edit-phone" type="tel" inputmode="tel" bind:value={formData.phone} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-handy" class="block text-sm font-semibold text-neutral-700 mb-1.5">Mobiltelefon / Handy</label>
                                    <input id="edit-handy" type="tel" inputmode="tel" bind:value={formData.handy} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail-Adresse</label>
                                    <input id="edit-email" type="email" inputmode="email" bind:value={formData.email} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-status" class="block text-sm font-semibold text-neutral-700 mb-1.5">Klienten-Status</label>
                                    <select id="edit-status" bind:value={formData.status} class="orga-input-clear text-base font-bold" disabled={isLoading}>
                                        <option value="Aktiv">🟢 Aktiv</option>
                                        <option value="Inaktiv">🟡 Inaktiv</option>
                                        <option value="Verstorben">⚫ Verstorben</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Wohnanschrift -->
                        <div class="pt-5 border-t border-neutral-200">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider">3. Wohnanschrift</h3>
                                {#if formData.street || formData.city}
                                    <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${formData.street || ''} ${formData.housenr || ''}, ${formData.zip || ''} ${formData.city || ''}`)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs">
                                        <span>🗺️</span> Karte öffnen
                                    </a>
                                {/if}
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div class="sm:col-span-3">
                                    <label for="edit-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße</label>
                                    <input id="edit-street" type="text" bind:value={formData.street} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr.</label>
                                    <input id="edit-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label>
                                    <input id="edit-zip" type="text" inputmode="numeric" bind:value={formData.zip} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div class="sm:col-span-3">
                                    <label for="edit-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt / Ort</label>
                                    <input id="edit-city" type="text" bind:value={formData.city} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                            </div>
                        </div>

                        <!-- Interne Notizen -->
                        <div class="pt-5 border-t border-neutral-200">
                            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">4. Interne Betreuungsnotizen</h3>
                            <textarea id="edit-notes" rows="3" bind:value={formData.notes} placeholder="Schlüsselhinterlegung, Besonderheiten, Verhaltenshinweise..." class="orga-input-clear text-base resize-y" disabled={isLoading}></textarea>
                        </div>

                        <!-- Signatur -->
                        <div class="pt-5 border-t border-neutral-200">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider">5. Klienten-Unterschrift</h3>
                                {#if !existingSignatureUrl || deleteExistingSignature}
                                    <div class="flex bg-neutral-100 p-1 rounded-lg">
                                        <button type="button" onclick={() => signatureMode = 'draw'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'draw' ? 'bg-white shadow-xs text-indigo-600' : 'text-neutral-500'}">Zeichnen</button>
                                        <button type="button" onclick={() => signatureMode = 'upload'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'upload' ? 'bg-white shadow-xs text-indigo-600' : 'text-neutral-500'}">Hochladen</button>
                                    </div>
                                {/if}
                            </div>

                            {#if existingSignatureUrl && !deleteExistingSignature}
                                <div class="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-center">
                                    <img src={existingSignatureUrl} alt="Hinterlegte Unterschrift" class="max-h-20 object-contain mx-auto bg-white rounded-lg p-2 mb-3 safe-signature shadow-xs" />
                                    <button type="button" onclick={() => deleteExistingSignature = true} class="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors">
                                        Unterschrift löschen & neu erfassen
                                    </button>
                                </div>
                            {:else if signatureMode === 'draw'}
                                <div class="border-2 border-dashed border-neutral-300 rounded-2xl p-2 bg-neutral-50 relative">
                                    <div class="relative w-full aspect-3/1 bg-white rounded-xl overflow-hidden shadow-inner">
                                        <canvas
                                            bind:this={canvas}
                                            width="1200" height="400"
                                            class="w-full h-full cursor-crosshair touch-none"
                                            onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                                            ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                                        ></canvas>
                                        {#if !hasDrawnSignature}
                                            <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-400 text-sm font-medium">Hier mit Finger oder Stift unterschreiben</div>
                                        {/if}
                                    </div>
                                    <div class="flex justify-end gap-2 mt-2">
                                        <button type="button" onclick={openSignatureFullscreen} class="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors">🔍 Vollbild</button>
                                        <button type="button" onclick={clearSignature} class="px-3 py-1.5 bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg hover:bg-neutral-300 transition-colors">Leeren</button>
                                    </div>
                                </div>
                            {:else}
                                <div class="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl p-6 text-center">
                                    <input type="file" accept="image/*,.pdf" class="w-full text-sm text-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" onchange={handleFileChange} />
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}

                <!-- TAB 2: PFLEGE & KASSE -->
                {#if activeTab === 'care'}
                    <div class="space-y-6 animate-enter">
                        <div>
                            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">1. Einstufung & Krankenkasse</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <label for="edit-carelevel" class="block text-sm font-semibold text-neutral-700 mb-1.5">Pflegegrad</label>
                                    <select id="edit-carelevel" bind:value={formData.level_of_care} class="orga-input-clear text-base font-bold" disabled={isLoading}>
                                        <option value="">Keiner / Nicht beantragt</option>
                                        <option value="0">Pflegegrad 0</option>
                                        <option value="1">Pflegegrad 1</option>
                                        <option value="2">Pflegegrad 2</option>
                                        <option value="3">Pflegegrad 3</option>
                                        <option value="4">Pflegegrad 4</option>
                                        <option value="5">Pflegegrad 5</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="edit-insurance" class="block text-sm font-semibold text-neutral-700 mb-1.5">Kranken- / Pflegekasse</label>
                                    <select id="edit-insurance" bind:value={formData.insurance} class="orga-input-clear text-base cursor-pointer" disabled={isLoading}>
                                        <option value="">Keine / Selbstzahler</option>
                                        {#each orgaStore.insurancies?.data || [] as ins (ins.id)}
                                            <option value={ins.id}>{ins.name}</option>
                                        {/each}
                                    </select>
                                </div>
                                <div>
                                    <label for="edit-ins-nr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Versichertennummer</label>
                                    <input id="edit-ins-nr" type="text" bind:value={formData.insurance_nr} placeholder="z. B. A123456789" class="orga-input-clear text-base uppercase" disabled={isLoading} />
                                </div>
                            </div>
                        </div>

                        <!-- Zuständige Personen & Firmen -->
                        <div class="pt-5 border-t border-neutral-200">
                            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">2. Zuordnung & Betreuung</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label for="edit-caregiver" class="block text-sm font-semibold text-neutral-700 mb-1.5">Gesetzliche Betreuung (Kontakt)</label>
                                    <select id="edit-caregiver" bind:value={formData.caregiver} class="orga-input-clear text-base cursor-pointer" disabled={isLoading}>
                                        <option value="">Keine / Selbstbestimmt</option>
                                        {#each orgaStore.contacts?.data || [] as contact}
                                            <option value={contact.id}>{#if contact.company_name}{contact.company_name} - {/if}{contact.name_first} {contact.name_last}</option>
                                        {/each}
                                    </select>
                                </div>
                                <div>
                                    <label for="edit-assigned-employee" class="block text-sm font-semibold text-neutral-700 mb-1.5">Zuständige Pflegekraft (Intern)</label>
                                    <select id="edit-assigned-employee" bind:value={formData.assigned_employee} class="orga-input-clear text-base cursor-pointer" disabled={isLoading}>
                                        <option value="">Kein Mitarbeiter zugewiesen</option>
                                        {#each (orgaStore.users?.data || []).filter(u => u.role !== 'client') as emp}
                                            <option value={emp.id}>{emp.name_last}, {emp.name_first} ({emp.role === 'employee' ? 'Pflege' : emp.role})</option>
                                        {/each}
                                    </select>
                                </div>
                                <div>
                                    <label for="edit-company" class="block text-sm font-semibold text-neutral-700 mb-1.5">Zuständiger Standort / Firma</label>
                                    <select id="edit-company" bind:value={formData.company} class="orga-input-clear text-base cursor-pointer" disabled={isLoading}>
                                        <option value="">Keine Firma zugewiesen</option>
                                        {#each orgaStore.company?.data || [] as comp}
                                            <option value={comp.id}>{comp.name || comp.city}</option>
                                        {/each}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Abrechnungskonditionen -->
                        <div class="pt-5 border-t border-neutral-200">
                            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">3. Abrechnungssätze & Konditionen</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label for="edit-wage" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stundensatz (€)</label>
                                    <input id="edit-wage" type="number" step="0.5" bind:value={formData.hourly_wage} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-km" class="block text-sm font-semibold text-neutral-700 mb-1.5">Fahrtkosten (€/km)</label>
                                    <input id="edit-km" type="number" step="0.05" bind:value={formData.km_rate} class="orga-input-clear text-base" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="edit-tax" class="block text-sm font-semibold text-neutral-700 mb-1.5">Umsatzsteuer-Satz (%)</label>
                                    <select id="edit-tax" bind:value={formData.tax_rate} class="orga-input-clear text-base font-semibold" disabled={isLoading}>
                                        <option value="0">0% (Umsatzsteuerbefreit)</option>
                                        <option value="7">7% (Ermäßigter Steuersatz)</option>
                                        <option value="19">19% (Regulärer Steuersatz)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- TAB 3: ERBE & VOLLMACHT (INHERITOR) -->
                {#if activeTab === 'inheritor'}
                    <div class="space-y-6 animate-enter">
                        <!-- Erben-Zuordnung -->
                        <div class="bg-teal-50/50 p-5 rounded-2xl border border-teal-200/80">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3 class="text-sm font-bold text-teal-950 flex items-center gap-2">
                                        <span>⚖️</span> Gesetzlicher Erbe / Bevollmächtigter
                                    </h3>
                                    <p class="text-xs text-teal-700 mt-0.5">Zuständige Person für Nachlass, rechtliche Vertretung und Postempfang</p>
                                </div>
                                <div class="flex bg-white/80 p-1 rounded-xl border border-teal-200">
                                    <button
                                        type="button"
                                        onclick={() => inheritorMode = 'direct'}
                                        class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {inheritorMode === 'direct' ? 'bg-teal-600 text-white shadow-xs' : 'text-neutral-600'}"
                                    >
                                        Direkteingabe
                                    </button>
                                    <button
                                        type="button"
                                        onclick={() => inheritorMode = 'contact'}
                                        class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {inheritorMode === 'contact' ? 'bg-teal-600 text-white shadow-xs' : 'text-neutral-600'}"
                                    >
                                        Aus Kontakten
                                    </button>
                                </div>
                            </div>

                            {#if inheritorMode === 'contact'}
                                <div class="mb-4">
                                    <label for="inheritor-contact" class="block text-sm font-semibold text-neutral-800 mb-1.5">Kontakt aus Adressbuch wählen</label>
                                    <select
                                        id="inheritor-contact"
                                        value={formData.inheritor}
                                        onchange={(e) => handleContactSelected((e.target as HTMLSelectElement).value)}
                                        class="orga-input-clear text-base bg-white"
                                        disabled={isLoading}
                                    >
                                        <option value="">Keinen Kontakt verknüpfen</option>
                                        {#each orgaStore.contacts?.data || [] as c}
                                            <option value={c.id}>{c.name_first} {c.name_last} {c.company_name ? `(${c.company_name})` : ''}</option>
                                        {/each}
                                    </select>
                                </div>
                            {/if}

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label for="inh-name" class="block text-sm font-semibold text-neutral-800 mb-1.5">Name des Erben / Bevollmächtigten *</label>
                                    <input id="inh-name" type="text" bind:value={formData.inheritor_name} placeholder="z. B. Sandra Meier" class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="inh-relation" class="block text-sm font-semibold text-neutral-800 mb-1.5">Verwandtschaftsverhältnis</label>
                                    <select id="inh-relation" bind:value={formData.inheritor_relation} class="orga-input-clear text-base bg-white" disabled={isLoading}>
                                        <option value="Ehepartner/in">Ehepartner/in</option>
                                        <option value="Tochter">Tochter</option>
                                        <option value="Sohn">Sohn</option>
                                        <option value="Enkel/in">Enkel/in</option>
                                        <option value="Gesetzl. Betreuer/in">Gesetzl. Betreuer/in</option>
                                        <option value="Rechtsanwalt / Nachlasspfleger">Rechtsanwalt / Nachlasspfleger</option>
                                        <option value="Sonstige/r">Sonstige/r</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="inh-phone" class="block text-sm font-semibold text-neutral-800 mb-1.5">Telefonnummer</label>
                                    <input id="inh-phone" type="tel" inputmode="tel" bind:value={formData.inheritor_phone} placeholder="0171..." class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="inh-email" class="block text-sm font-semibold text-neutral-800 mb-1.5">E-Mail-Adresse</label>
                                    <input id="inh-email" type="email" inputmode="email" bind:value={formData.inheritor_email} placeholder="erbe@beispiel.de" class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                            </div>

                            <!-- Vollmachts-Checkbox -->
                            <div class="mt-4 pt-3 border-t border-teal-200/60">
                                <label class="flex items-center gap-3 cursor-pointer select-none">
                                    <input type="checkbox" bind:checked={formData.inheritor_has_power_of_attorney} class="w-5 h-5 rounded-md text-teal-600 focus:ring-teal-500 border-neutral-300" />
                                    <span class="text-sm font-bold text-neutral-900">Vorsorgevollmacht / Erbschein liegt schriftlich vor</span>
                                </label>
                            </div>

                            <div class="mt-3">
                                <label for="inh-notes" class="block text-xs font-semibold text-neutral-700 mb-1">Hinweise zum Erben / zur Vollmacht</label>
                                <textarea id="inh-notes" rows="2" bind:value={formData.inheritor_notes} placeholder="z. B. Aktenzeichen Nachlassgericht, Urkundennummer..." class="orga-input-clear text-sm bg-white resize-y" disabled={isLoading}></textarea>
                            </div>
                        </div>

                        <!-- Angaben für Verhinderungspflege (§ 39 SGB XI) -->
                        <div class="bg-neutral-50 p-5 rounded-2xl border border-neutral-200">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div>
                                    <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2">
                                        <span>🤝</span> Private Pflegeperson für Verhinderungspflege (§ 39 SGB XI)
                                    </h3>
                                    <p class="text-xs text-neutral-500">Für Kostenerstattungsanträge bei der Pflegekasse</p>
                                </div>
                                <button
                                    type="button"
                                    onclick={copyClientAddressToCareperson}
                                    class="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200 shrink-0 self-start sm:self-auto"
                                >
                                    Wohnanschrift d. Klienten übernehmen
                                </button>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div class="md:col-span-2">
                                    <label for="cp-name" class="block text-sm font-semibold text-neutral-700 mb-1.5">Name d. Pflegeperson</label>
                                    <input id="cp-name" type="text" bind:value={formData.careperson_name} placeholder={formData.inheritor_name || "Name der Pflegeperson"} class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="cp-rel" class="block text-sm font-semibold text-neutral-700 mb-1.5">Verhältnis</label>
                                    <input id="cp-rel" type="text" bind:value={formData.careperson_relation} class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="cp-birth" class="block text-sm font-semibold text-neutral-700 mb-1.5">Geburtsdatum</label>
                                    <input id="cp-birth" type="date" bind:value={formData.careperson_birthdate} class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                                <div class="md:col-span-3">
                                    <label for="cp-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße</label>
                                    <input id="cp-street" type="text" bind:value={formData.careperson_street} class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="cp-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr.</label>
                                    <input id="cp-housenr" type="text" bind:value={formData.careperson_housenr} class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                                <div>
                                    <label for="cp-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label>
                                    <input id="cp-zip" type="text" inputmode="numeric" bind:value={formData.careperson_zip} class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                                <div class="md:col-span-3">
                                    <label for="cp-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Ort</label>
                                    <input id="cp-city" type="text" bind:value={formData.careperson_city} class="orga-input-clear text-base bg-white" disabled={isLoading} />
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- TAB 4: DOKUMENTE & VORLAGEN -->
                {#if activeTab === 'documents'}
                    <div class="space-y-6 animate-enter">
                        <div>
                            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">1. Standard-Vorlagen</h3>
                            <div>
                                <label for="edit-template" class="block text-sm font-semibold text-neutral-700 mb-1.5">Standard-Dokumentenvorlage für Rechnungen & Berichte</label>
                                <select id="edit-template" bind:value={formData.default_template} class="orga-input-clear text-base cursor-pointer" disabled={isLoading}>
                                    <option value="">Keine Standard-Vorlage hinterlegt</option>
                                    {#each orgaStore.document_templates?.data || [] as t}
                                        <option value={t.id}>{t.title}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <div class="pt-5 border-t border-neutral-200">
                            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">2. Zugeordnete Klienten-Dokumente</h3>
                            <div class="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 text-center">
                                <span class="text-3xl block mb-2">📄</span>
                                <p class="text-sm font-bold text-neutral-800">Dokumentenarchiv im Klienten-Profil</p>
                                <p class="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                                    Verträge, Leistungsnachweise, Bescheide und Anträge auf Verhinderungspflege können direkt in der Klienten-Detailansicht eingesehen und per PDF generiert werden.
                                </p>
                            </div>
                        </div>
                    </div>
                {/if}

            </form>
        </div>

        <!-- Footer -->
        <div class="p-4 sm:p-6 border-t border-neutral-200 bg-white/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
                <div class="text-xs text-neutral-500 hidden sm:block">
                    Tab: <span class="font-bold text-neutral-700">{activeTab === 'master' ? 'Stammdaten' : activeTab === 'care' ? 'Pflege & Kasse' : activeTab === 'inheritor' ? 'Erbe & Vollmacht' : 'Dokumente'}</span>
                </div>
                <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                    <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 min-h-[44px]" disabled={isLoading}>Abbrechen</button>
                    <button type="submit" form="clientEditForm" class="orga-button-primary shadow-indigo-600/20 w-full sm:w-auto py-3 sm:py-2.5 min-h-[44px] text-base" disabled={isLoading}>
                        {isLoading ? "Speichert..." : "Änderungen speichern"}
                    </button>
                </div>
            </div>
        </div>
    </div>
</dialog>

<!-- FULLSCREEN SIGNATUR MODAL (Mobile Landscape Optimized) -->
{#if isSignatureFullscreen}
    <div 
        class="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col p-3 sm:p-5 select-none animate-enter"
        role="dialog"
        aria-modal="true"
        aria-label="Vollbild Unterschrift erfassen"
    >
        <!-- Modal Header -->
        <div class="flex items-center justify-between gap-3 pb-2.5 sm:pb-3 border-b border-slate-800 shrink-0 text-white">
            <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-sm sm:text-base">✍️</span>
                <div>
                    <h3 class="text-sm sm:text-base font-bold text-slate-100">Unterschrift erfassen</h3>
                    <p class="text-[11px] text-slate-400 hidden sm:block">Bitte mit dem Finger oder Eingabestift unterschreiben</p>
                </div>
            </div>

            <!-- Header Action Controls (Touch targets >= 44x44px) -->
            <div class="flex items-center gap-2">
                <button 
                    type="button" 
                    onclick={clearFsSignature}
                    class="min-h-[44px] px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs sm:text-sm font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Zeichenfläche leeren"
                >
                    <RotateCcw class="w-4 h-4" />
                    <span>Leeren</span>
                </button>
                <button 
                    type="button" 
                    onclick={closeSignatureFullscreen}
                    class="min-h-[44px] px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Vollbild abbrechen"
                >
                    <X class="w-4 h-4" />
                    <span>Abbrechen</span>
                </button>
                <button 
                    type="button" 
                    onclick={applyFsSignature}
                    class="min-h-[44px] px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Unterschrift übernehmen"
                >
                    <Check class="w-4 h-4" />
                    <span>Übernehmen</span>
                </button>
            </div>
        </div>

        <!-- Canvas Container -->
        <div class="flex-1 min-h-0 py-2 sm:py-3 flex flex-col items-center justify-center relative">
            <div class="w-full h-full bg-white rounded-2xl border-2 border-slate-700 shadow-2xl relative overflow-hidden touch-none flex items-center justify-center">
                <canvas 
                    bind:this={fsCanvas}
                    width="1600" 
                    height="900"
                    class="w-full h-full cursor-crosshair touch-none"
                    onmousedown={startFsDrawing}
                    onmousemove={drawFs}
                    onmouseup={stopFsDrawing}
                    onmouseleave={stopFsDrawing}
                    ontouchstart={startFsDrawing}
                    ontouchmove={drawFs}
                    ontouchend={stopFsDrawing}
                ></canvas>

                <!-- Unterzeichnungs-Linie (Baseline) -->
                <div class="absolute bottom-10 sm:bottom-14 left-8 sm:left-12 right-8 sm:right-12 border-b-2 border-dashed border-neutral-300 pointer-events-none flex justify-between text-[11px] text-neutral-400 font-medium px-2">
                    <span>Unterschrift des Klienten / Bevollmächtigten</span>
                    <span>X ________________________</span>
                </div>

                {#if !hasDrawnFsSignature}
                    <div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-neutral-300 gap-2">
                        <span class="text-3xl sm:text-5xl opacity-40">✍️</span>
                        <span class="font-bold text-xs sm:text-base opacity-60">Hier mit Stift oder Finger unterschreiben</span>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Landscape hint (visible on small portrait screens) -->
        <div class="sm:hidden text-center pb-0.5 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <span>🔄</span>
            <span>Tipp: Für maximale Zeichenfläche Smartphone ins Querformat drehen</span>
        </div>
    </div>
{/if}

<style>
    :global(.theme-negative) .safe-signature {
        filter: invert(1) hue-rotate(180deg);
    }
</style>