<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, HeartHandshake, Phone, Mail, Building, MapPin } from "lucide-svelte";

    let { onSave } = $props<{ onSave?: () => void }>();

    let dialog: HTMLDialogElement | undefined = $state();
    let isLoading = $state(false);
    let errorMsg = $state("");

    let clientId = $state("");
    let contactId = $state("");
    let isEditMode = $derived(!!contactId);

    let formData = $state({
        relationship: "Angehörige(r) / Familie",
        name_first: "",
        name_last: "",
        company_name: "",
        phone: "",
        email: "",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        notes: ""
    });

    const relationshipOptions = [
        "Angehörige(r) / Familie",
        "Notfallkontakt",
        "Gesetzliche(r) Betreuer(in)",
        "Bevollmächtigte(r)",
        "Hausarzt / Praxis",
        "Facharzt / Klinik",
        "Pflegedienst / Pflegeteam",
        "Therapeut(in)",
        "Nachbar(in) / Bekannte(r)",
        "Sonstige"
    ];

    export function open(targetClientId: string, existingContact?: any) {
        errorMsg = "";
        clientId = targetClientId;
        
        if (existingContact) {
            contactId = existingContact.id || "";
            let rel = "Angehörige(r) / Familie";
            let notesText = "";

            if (typeof existingContact.notes === 'object' && existingContact.notes !== null) {
                rel = existingContact.notes.role || existingContact.notes.relationship || rel;
                notesText = existingContact.notes.details || existingContact.notes.note || "";
            } else if (typeof existingContact.notes === 'string') {
                notesText = existingContact.notes;
            }

            formData = {
                relationship: rel,
                name_first: existingContact.name_first || "",
                name_last: existingContact.name_last || "",
                company_name: existingContact.company_name || "",
                phone: existingContact.phone || existingContact.handy || "",
                email: existingContact.email || "",
                street: existingContact.street || "",
                housenr: existingContact.housenr || "",
                zip: existingContact.zip || "",
                city: existingContact.city || "",
                notes: notesText
            };
        } else {
            contactId = "";
            formData = {
                relationship: "Angehörige(r) / Familie",
                name_first: "",
                name_last: "",
                company_name: "",
                phone: "",
                email: "",
                street: "",
                housenr: "",
                zip: "",
                city: "",
                notes: ""
            };
        }

        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function handleSave(e?: Event) {
        if (e) e.preventDefault();
        if (!formData.name_first.trim() && !formData.name_last.trim() && !formData.company_name.trim()) {
            errorMsg = "Bitte geben Sie mindestens einen Namen oder Firmennamen an.";
            return;
        }

        isLoading = true;
        errorMsg = "";

        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
                ? `http://${window.location.hostname}:3000/portal` 
                : '/api/emails/portal';

            const url = isEditMode 
                ? `${apiBaseUrl}/clients/${clientId}/contacts/${contactId}`
                : `${apiBaseUrl}/clients/${clientId}/contacts`;

            const method = isEditMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name_first: formData.name_first.trim(),
                    name_last: formData.name_last.trim(),
                    company_name: formData.company_name.trim(),
                    phone: formData.phone.trim(),
                    email: formData.email.trim(),
                    street: formData.street.trim(),
                    housenr: formData.housenr.trim(),
                    zip: formData.zip.trim(),
                    city: formData.city.trim(),
                    relationship: formData.relationship,
                    notes: formData.notes.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Fehler beim Speichern des Kontakts.");
            }

            toastStore.success(isEditMode ? "Kontakt erfolgreich aktualisiert!" : "Neuer Kontakt hinzugefügt!");
            if (onSave) onSave();
            close();
        } catch (err: any) {
            console.error("[PORTAL CONTACT MODAL]", err);
            errorMsg = err.message || "Es ist ein Fehler aufgetreten.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-xl mx-auto my-auto rounded-3xl border-none shadow-2xl outline-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl animate-enter">
        <!-- Header -->
        <div class="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <HeartHandshake class="w-5 h-5" />
                </div>
                <div>
                    <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {isEditMode ? 'Kontakt bearbeiten' : 'Neuen Kontakt hinterlegen'}
                    </h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                        Angehörige, Ärzte, Betreuer oder Notfallkontakte
                    </p>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={close}
                class="min-w-[44px] min-h-[44px] w-11 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Scrollable Form Body -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
            {#if errorMsg}
                <div class="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-sm font-medium border border-rose-200 dark:border-rose-900/60">
                    ⚠️ {errorMsg}
                </div>
            {/if}

            <form id="portalContactForm" onsubmit={handleSave} class="space-y-4">
                <!-- Beziehung / Rolle -->
                <div>
                    <label for="pcf-role" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Beziehung / Funktion *
                    </label>
                    <select
                        id="pcf-role"
                        bind:value={formData.relationship}
                        class="orga-input-clear py-2.5 text-sm"
                        disabled={isLoading}
                    >
                        {#each relationshipOptions as opt}
                            <option value={opt}>{opt}</option>
                        {/each}
                    </select>
                </div>

                <!-- Name / Firma -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label for="pcf-first" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Vorname
                        </label>
                        <input
                            id="pcf-first"
                            type="text"
                            bind:value={formData.name_first}
                            placeholder="z. B. Sabine"
                            class="orga-input-clear py-2.5 text-sm"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label for="pcf-last" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Nachname
                        </label>
                        <input
                            id="pcf-last"
                            type="text"
                            bind:value={formData.name_last}
                            placeholder="z. B. Müller"
                            class="orga-input-clear py-2.5 text-sm"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div>
                    <label for="pcf-company" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Building class="w-3.5 h-3.5 text-slate-400" />
                        Firma / Praxis / Institution (optional)
                    </label>
                    <input
                        id="pcf-company"
                        type="text"
                        bind:value={formData.company_name}
                        placeholder="z. B. Hausarztpraxis Dr. Schmidt oder Betreuungsbüro"
                        class="orga-input-clear py-2.5 text-sm"
                        disabled={isLoading}
                    />
                </div>

                <!-- Erreichbarkeit -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label for="pcf-phone" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Phone class="w-3.5 h-3.5 text-slate-400" />
                            Telefon / Mobilnummer
                        </label>
                        <input
                            id="pcf-phone"
                            type="tel"
                            bind:value={formData.phone}
                            placeholder="z. B. 0170 1234567"
                            class="orga-input-clear py-2.5 text-sm"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label for="pcf-email" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Mail class="w-3.5 h-3.5 text-slate-400" />
                            E-Mail-Adresse
                        </label>
                        <input
                            id="pcf-email"
                            type="email"
                            bind:value={formData.email}
                            placeholder="z. B. kontakt@example.de"
                            class="orga-input-clear py-2.5 text-sm"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <!-- Anschrift -->
                <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                        <MapPin class="w-3.5 h-3.5 text-slate-400" /> Anschrift (optional)
                    </p>
                    <div class="grid grid-cols-3 gap-3 mb-3">
                        <div class="col-span-2">
                            <input
                                type="text"
                                bind:value={formData.street}
                                placeholder="Straße"
                                class="orga-input-clear py-2.5 text-sm"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                bind:value={formData.housenr}
                                placeholder="Nr."
                                class="orga-input-clear py-2.5 text-sm"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <input
                                type="text"
                                bind:value={formData.zip}
                                placeholder="PLZ"
                                class="orga-input-clear py-2.5 text-sm"
                                disabled={isLoading}
                            />
                        </div>
                        <div class="col-span-2">
                            <input
                                type="text"
                                bind:value={formData.city}
                                placeholder="Ort"
                                class="orga-input-clear py-2.5 text-sm"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>

                <!-- Notizen / Erreichbarkeit -->
                <div>
                    <label for="pcf-notes" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Hinweise zur Erreichbarkeit / Notizen
                    </label>
                    <textarea
                        id="pcf-notes"
                        bind:value={formData.notes}
                        rows="2"
                        placeholder="z. B. Schlüssel vor Ort vorhanden, erreichbar Mo-Fr ab 14 Uhr..."
                        class="orga-input-clear py-2.5 text-sm resize-none"
                        disabled={isLoading}
                    ></textarea>
                </div>
            </form>
        </div>

        <!-- Sticky Footer -->
        <div class="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-end gap-3 shrink-0">
            <button
                type="button"
                onclick={close}
                disabled={isLoading}
                class="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
                Abbrechen
            </button>
            <button
                type="submit"
                form="portalContactForm"
                disabled={isLoading}
                class="min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
                {#if isLoading}
                    <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Speichere...</span>
                {:else}
                    <span>{isEditMode ? 'Änderungen speichern' : 'Kontakt anlegen'}</span>
                {/if}
            </button>
        </div>
    </div>
</dialog>
