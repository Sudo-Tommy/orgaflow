<script lang="ts">
    import { employeeService, type CreateEmployeePayload } from '$lib/services/employeeService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import { User, X, Check, Trash2 } from 'lucide-svelte';
    import type { UserRecord, EmploymentType, EmployeeStatus } from '$lib/types/orgaTypes';
    import { getDefaultEmployeeFormData, type EmployeeFormData } from './employeeFormTypes';
    import EmployeeBasicFields from './EmployeeBasicFields.svelte';
    import EmployeeRoleFields from './EmployeeRoleFields.svelte';
    import EmployeeQualificationsFields from './EmployeeQualificationsFields.svelte';
    import EmployeeContactFields from './EmployeeContactFields.svelte';

    let isOpen = $state(false);
    let isEditing = $state(false);
    let editingId = $state('');
    let dialog = $state<HTMLDialogElement | null>(null);

    let form = $state<EmployeeFormData>(getDefaultEmployeeFormData());

    $effect(() => {
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    export function open(employee?: UserRecord) {
        if (employee) {
            isEditing = true;
            editingId = employee.id;
            form = {
                name_first: employee.name_first || '',
                name_last: employee.name_last || '',
                email: employee.email || '',
                username: employee.username || '',
                password: '',
                role: employee.role || 'employee',
                employment_type: (employee.employment_type as EmploymentType) || 'Vollzeit',
                status: (employee.status as EmployeeStatus) || 'Aktiv',
                qualifications: employee.qualifications || '',
                emergency_contacts: employee.emergency_contacts || '',
                tel: employee.tel || '',
                handy: employee.handy || '',
                street: employee.street || '',
                housenr: employee.housenr || '',
                zip: employee.zip || '',
                city: employee.city || ''
            };
        } else {
            isEditing = false;
            editingId = '';
            form = getDefaultEmployeeFormData();
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

        if (!form.name_first.trim() || !form.name_last.trim() || !form.email.trim()) {
            toastStore.warning('Bitte Vorname, Nachname und E-Mail ausfüllen.');
            return;
        }

        if (isEditing && editingId) {
            const updatePayload: any = {
                name_first: form.name_first.trim(),
                name_last: form.name_last.trim(),
                email: form.email.trim(),
                role: form.role,
                employment_type: form.employment_type,
                status: form.status,
                qualifications: form.qualifications.trim(),
                emergency_contacts: form.emergency_contacts.trim(),
                tel: form.tel.trim(),
                handy: form.handy.trim(),
                street: form.street.trim(),
                housenr: form.housenr.trim(),
                zip: form.zip.trim(),
                city: form.city.trim()
            };
            if (form.password.trim()) {
                updatePayload.password = form.password.trim();
                updatePayload.passwordConfirm = form.password.trim();
            }

            const success = await employeeService.updateEmployee(editingId, updatePayload);
            if (success) close();
        } else {
            const payload: CreateEmployeePayload = {
                name_first: form.name_first.trim(),
                name_last: form.name_last.trim(),
                email: form.email.trim(),
                username: form.username.trim() || undefined,
                password: form.password.trim() || undefined,
                role: form.role,
                employment_type: form.employment_type,
                status: form.status,
                qualifications: form.qualifications.trim(),
                emergency_contacts: form.emergency_contacts.trim(),
                tel: form.tel.trim(),
                handy: form.handy.trim(),
                street: form.street.trim(),
                housenr: form.housenr.trim(),
                zip: form.zip.trim(),
                city: form.city.trim()
            };

            const created = await employeeService.createEmployee(payload);
            if (created) close();
        }
    }

    async function handleDelete() {
        if (!editingId) return;
        const confirmed = await confirmStore.ask(
            `Möchten Sie den Mitarbeiter "${form.name_first} ${form.name_last}" wirklich unwiderruflich löschen? Alle Zugänge und QR-Token werden sofort deaktiviert.`,
            'Mitarbeiter löschen',
            'Unwiderruflich löschen',
            'Abbrechen',
            true
        );

        if (confirmed) {
            const deleted = await employeeService.deleteEmployee(editingId);
            if (deleted) close();
        }
    }
</script>

{#if isOpen}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-2xl bg-transparent p-3 sm:p-6 border-none outline-none backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs animate-enter z-50 overflow-visible"
        onclick={(e) => { if (e.target === dialog) close(); }}
        oncancel={(e) => { e.preventDefault(); close(); }}
    >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full my-6 sm:my-10 flex flex-col">
            <!-- Header -->
            <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0 rounded-t-3xl">
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
                    type="button" 
                    onclick={close} 
                    aria-label="Schließen"
                    class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-manipulation cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Form Body -->
            <form onsubmit={handleSubmit} class="p-5 sm:p-6 space-y-6 flex-1">
                <EmployeeBasicFields 
                    bind:name_first={form.name_first}
                    bind:name_last={form.name_last}
                    bind:email={form.email}
                    bind:password={form.password}
                    {isEditing}
                />

                <EmployeeRoleFields 
                    bind:role={form.role}
                    bind:employment_type={form.employment_type}
                    bind:status={form.status}
                />

                <EmployeeQualificationsFields 
                    bind:qualifications={form.qualifications}
                    bind:emergency_contacts={form.emergency_contacts}
                />

                <EmployeeContactFields 
                    bind:handy={form.handy}
                    bind:tel={form.tel}
                    bind:street={form.street}
                    bind:housenr={form.housenr}
                    bind:zip={form.zip}
                    bind:city={form.city}
                />

                <!-- Footer Actions -->
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                    {#if isEditing}
                        <button 
                            type="button" 
                            onclick={handleDelete}
                            disabled={employeeService.isSubmitting}
                            class="min-h-11 px-3.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 touch-manipulation cursor-pointer"
                        >
                            <Trash2 class="w-4 h-4" />
                            <span>Mitarbeiter löschen</span>
                        </button>
                    {:else}
                        <div></div>
                    {/if}

                    <div class="flex items-center gap-3">
                        <button 
                            type="button" 
                            onclick={close}
                            class="min-h-11 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors touch-manipulation cursor-pointer"
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="submit" 
                            disabled={employeeService.isSubmitting}
                            class="min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 touch-manipulation cursor-pointer"
                        >
                            {#if employeeService.isSubmitting}
                                <span>Speichern...</span>
                            {:else}
                                <Check class="w-4 h-4" />
                                <span>{isEditing ? 'Änderungen speichern' : 'Mitarbeiter anlegen'}</span>
                            {/if}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </dialog>
{/if}
