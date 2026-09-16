<script lang="ts">
    import { employeeService, type CreateEmployeePayload } from '$lib/services/employeeService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { User, X, Briefcase, Phone, MapPin, Shield, Check, Award, AlertCircle } from 'lucide-svelte';
    import type { UserRecord, EmploymentType, EmployeeStatus } from '$lib/types/orgaTypes';

    let isOpen = $state(false);
    let isEditing = $state(false);
    let editingId = $state('');

    let name_first = $state('');
    let name_last = $state('');
    let email = $state('');
    let username = $state('');
    let password = $state('');
    let role = $state('employee');
    let employment_type = $state<EmploymentType>('Vollzeit');
    let status = $state<EmployeeStatus>('Aktiv');
    let qualifications = $state('');
    let emergency_contacts = $state('');
    let tel = $state('');
    let handy = $state('');
    let street = $state('');
    let housenr = $state('');
    let zip = $state('');
    let city = $state('');

    export function open(employee?: UserRecord) {
        if (employee) {
            isEditing = true;
            editingId = employee.id;
            name_first = employee.name_first || '';
            name_last = employee.name_last || '';
            email = employee.email || '';
            username = employee.username || '';
            password = '';
            role = employee.role || 'employee';
            employment_type = (employee.employment_type as EmploymentType) || 'Vollzeit';
            status = (employee.status as EmployeeStatus) || 'Aktiv';
            qualifications = employee.qualifications || '';
            emergency_contacts = employee.emergency_contacts || '';
            tel = employee.tel || '';
            handy = employee.handy || '';
            street = employee.street || '';
            housenr = employee.housenr || '';
            zip = employee.zip || '';
            city = employee.city || '';
        } else {
            isEditing = false;
            editingId = '';
            name_first = '';
            name_last = '';
            email = '';
            username = '';
            password = '';
            role = 'employee';
            employment_type = 'Vollzeit';
            status = 'Aktiv';
            qualifications = '';
            emergency_contacts = '';
            tel = '';
            handy = '';
            street = '';
            housenr = '';
            zip = '';
            city = '';
        }
        isOpen = true;
    }

    export function close() {
        isOpen = false;
        isEditing = false;
        editingId = '';
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();

        if (!name_first.trim() || !name_last.trim() || !email.trim()) {
            toastStore.warning('Bitte Vorname, Nachname und E-Mail ausfüllen.');
            return;
        }

        if (isEditing && editingId) {
            const updatePayload: any = {
                name_first: name_first.trim(),
                name_last: name_last.trim(),
                email: email.trim(),
                role: role,
                employment_type: employment_type,
                status: status,
                qualifications: qualifications.trim(),
                emergency_contacts: emergency_contacts.trim(),
                tel: tel.trim(),
                handy: handy.trim(),
                street: street.trim(),
                housenr: housenr.trim(),
                zip: zip.trim(),
                city: city.trim()
            };
            if (password.trim()) {
                updatePayload.password = password.trim();
                updatePayload.passwordConfirm = password.trim();
            }

            const success = await employeeService.updateEmployee(editingId, updatePayload);
            if (success) close();
        } else {
            const payload: CreateEmployeePayload = {
                name_first: name_first.trim(),
                name_last: name_last.trim(),
                email: email.trim(),
                username: username.trim() || undefined,
                password: password.trim() || undefined,
                role: role,
                employment_type: employment_type,
                status: status,
                qualifications: qualifications.trim(),
                emergency_contacts: emergency_contacts.trim(),
                tel: tel.trim(),
                handy: handy.trim(),
                street: street.trim(),
                housenr: housenr.trim(),
                zip: zip.trim(),
                city: city.trim()
            };

            const created = await employeeService.createEmployee(payload);
            if (created) close();
        }
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            
            <!-- Header -->
            <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <User class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                            {isEditing ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter anlegen'}
                        </h3>
                        <p class="text-xs text-slate-500">
                            {isEditing ? 'Stammdaten, Qualifikationen und Notfallkontakte anpassen' : 'Account für Pflegekraft oder Verwaltungskraft erstellen'}
                        </p>
                    </div>
                </div>
                <button 
                    onclick={close} 
                    aria-label="Schließen"
                    class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Form Body -->
            <form onsubmit={handleSubmit} class="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                
                <!-- Basisdaten -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User class="w-3.5 h-3.5" />
                        <span>Persönliche Stammdaten</span>
                    </h4>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label for="emp-firstname" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Vorname *</label>
                            <input 
                                id="emp-firstname"
                                type="text" 
                                required
                                bind:value={name_first} 
                                placeholder="z. B. Lisa" 
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div class="space-y-1">
                            <label for="emp-lastname" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Nachname *</label>
                            <input 
                                id="emp-lastname"
                                type="text" 
                                required
                                bind:value={name_last} 
                                placeholder="z. B. Müller" 
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label for="emp-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">E-Mail-Adresse *</label>
                            <input 
                                id="emp-email"
                                type="email" 
                                required
                                bind:value={email} 
                                placeholder="lisa.mueller@ihre-seniorenassistenz.com" 
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div class="space-y-1">
                            <label for="emp-password" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                {isEditing ? 'Passwort ändern (leer lassen = unverändert)' : 'Start-Passwort (leer = auto-generiert)'}
                            </label>
                            <input 
                                id="emp-password"
                                type="password" 
                                bind:value={password} 
                                placeholder={isEditing ? '••••••••' : 'Sicheres Passwort eingeben'} 
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                <!-- Anstellung & Rolle -->
                <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase class="w-3.5 h-3.5" />
                        <span>Anstellung & Berechtigung</span>
                    </h4>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="space-y-1">
                            <label for="emp-role" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Rolle</label>
                            <select 
                                id="emp-role"
                                bind:value={role}
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="employee">Mitarbeiter / Pflegekraft</option>
                                <option value="caregiver">Betreuer (Caregiver)</option>
                                <option value="admin">Betriebsleiter (Admin)</option>
                                <option value="superadmin">Superadmin</option>
                            </select>
                        </div>

                        <div class="space-y-1">
                            <label for="emp-employment" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Anstellungsverhältnis</label>
                            <select 
                                id="emp-employment"
                                bind:value={employment_type}
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Vollzeit">Vollzeit</option>
                                <option value="Teilzeit">Teilzeit</option>
                                <option value="Minijob">Minijob (538 €)</option>
                                <option value="Freiberuflich">Freiberuflich / Honorar</option>
                                <option value="Praktikum">Praktikum</option>
                                <option value="Werkstudent">Werkstudent</option>
                            </select>
                        </div>

                        <div class="space-y-1">
                            <label for="emp-status" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Dienst-Status</label>
                            <select 
                                id="emp-status"
                                bind:value={status}
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Aktiv">🟢 Aktiv im Dienst</option>
                                <option value="Urlaub">🟡 Im Urlaub</option>
                                <option value="Krank">🔴 Krank / Abwesend</option>
                                <option value="Inaktiv">⚪ Inaktiv / Pausiert</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Qualifikationen & Notfallkontakt -->
                <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Award class="w-3.5 h-3.5" />
                        <span>Qualifikationen & Notfallkontakt</span>
                    </h4>

                    <div class="space-y-1">
                        <label for="emp-quals" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Qualifikationen & Zertifikate (Kommagetrennt oder Fließtext)
                        </label>
                        <textarea 
                            id="emp-quals"
                            bind:value={qualifications}
                            rows="2"
                            placeholder="z. B. Examinierte Pflegefachkraft, Führerschein Klasse B, Erste-Hilfe-Kurs 2026, Wundexperte"
                            class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                    </div>

                    <div class="space-y-1">
                        <label for="emp-emergency" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Notfallkontakt für den Außendienst (Name, Telefonnummer, Beziehung)
                        </label>
                        <input 
                            id="emp-emergency"
                            type="text"
                            bind:value={emergency_contacts}
                            placeholder="z. B. Klaus Müller (Ehemann): +49 171 9876543"
                            class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <!-- Erreichbarkeit & Anschrift -->
                <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone class="w-3.5 h-3.5" />
                        <span>Erreichbarkeit & Anschrift</span>
                    </h4>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label for="emp-handy" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Mobilfunk / Diensthandy</label>
                            <input 
                                id="emp-handy"
                                type="text"
                                bind:value={handy}
                                placeholder="+49 170 1234567"
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div class="space-y-1">
                            <label for="emp-tel" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Festnetz</label>
                            <input 
                                id="emp-tel"
                                type="text"
                                bind:value={tel}
                                placeholder="0351 123456"
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div class="col-span-2 space-y-1">
                            <label for="emp-street" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Straße</label>
                            <input 
                                id="emp-street"
                                type="text"
                                bind:value={street}
                                placeholder="Hauptstraße"
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div class="space-y-1">
                            <label for="emp-housenr" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Hausnr.</label>
                            <input 
                                id="emp-housenr"
                                type="text"
                                bind:value={housenr}
                                placeholder="12a"
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div class="space-y-1">
                            <label for="emp-zip" class="block text-xs font-bold text-slate-700 dark:text-slate-300">PLZ</label>
                            <input 
                                id="emp-zip"
                                type="text"
                                bind:value={zip}
                                placeholder="01067"
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div class="col-span-2 space-y-1">
                            <label for="emp-city" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Stadt</label>
                            <input 
                                id="emp-city"
                                type="text"
                                bind:value={city}
                                placeholder="Dresden"
                                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
                    <button 
                        type="button" 
                        onclick={close}
                        class="min-h-11 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors"
                    >
                        Abbrechen
                    </button>
                    <button 
                        type="submit" 
                        disabled={employeeService.isSubmitting}
                        class="min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {#if employeeService.isSubmitting}
                            <span>Speichern...</span>
                        {:else}
                            <Check class="w-4 h-4" />
                            <span>{isEditing ? 'Änderungen speichern' : 'Mitarbeiter anlegen'}</span>
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
