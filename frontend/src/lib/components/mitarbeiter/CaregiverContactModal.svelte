<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { X, BookOpen, Lock, Check, ShieldAlert } from 'lucide-svelte';
    import type { ContactRecord, Salutation } from '$lib/types/orgaTypes';

    let isOpen = $state(false);
    let isEditing = $state(false);
    let isReadOnly = $state(false);
    let contactId = $state('');
    let dialog = $state<HTMLDialogElement | null>(null);

    let salutation = $state<Salutation>('Keine Angabe');
    let company_name = $state('');
    let name_first = $state('');
    let name_last = $state('');
    let email = $state('');
    let phone = $state('');
    let street = $state('');
    let housenr = $state('');
    let zip = $state('');
    let city = $state('');

    $effect(() => {
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    export function openCreate() {
        isEditing = false;
        isReadOnly = false;
        contactId = '';
        salutation = 'Keine Angabe';
        company_name = '';
        name_first = '';
        name_last = '';
        email = '';
        phone = '';
        street = '';
        housenr = '';
        zip = '';
        city = '';
        isOpen = true;
    }

    export function openEdit(contact: ContactRecord) {
        contactId = contact.id;
        salutation = (contact.salutation as Salutation) || 'Keine Angabe';
        company_name = contact.company_name || '';
        name_first = contact.name_first || '';
        name_last = contact.name_last || '';
        email = contact.email || '';
        phone = contact.phone || '';
        street = contact.street || '';
        housenr = contact.housenr || '';
        zip = contact.zip || '';
        city = contact.city || '';

        const canEdit = rbacService.canEditContact(contact);
        isEditing = true;
        isReadOnly = !canEdit;
        isOpen = true;
    }

    export function close() {
        isOpen = false;
        contactId = '';
    }

    async function handleSave(e: Event) {
        e.preventDefault();
        if (isReadOnly) return;

        if (!name_first.trim() && !name_last.trim() && !company_name.trim()) {
            toastStore.warning('Bitte mindestens einen Namen oder Firmennamen angeben.');
            return;
        }

        const currentUserId = pb.authStore.model?.id;
        const data: any = {
            salutation,
            company_name: company_name.trim(),
            name_first: name_first.trim(),
            name_last: name_last.trim(),
            email: email.trim(),
            phone: phone.trim(),
            street: street.trim(),
            housenr: housenr.trim(),
            zip: zip.trim(),
            city: city.trim()
        };

        try {
            if (isEditing && contactId) {
                await pb.collection('contacts').update(contactId, data);
                toastStore.success('Kontakt erfolgreich aktualisiert.');
            } else {
                data.created_by = currentUserId;
                await pb.collection('contacts').create(data);
                toastStore.success('Neuer Kontakt erfolgreich angelegt.');
            }
            await orgaStore.contacts.init();
            close();
        } catch (err: any) {
            console.error('Fehler beim Speichern:', err);
            toastStore.error(err?.message || 'Kontakt konnte nicht gespeichert werden.');
        }
    }
</script>

{#if isOpen}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs w-full max-w-lg mx-auto my-auto rounded-3xl border-none outline-none animate-enter z-50"
        onclick={(e) => { if (e.target === dialog) close(); }}
        oncancel={(e) => { e.preventDefault(); close(); }}
    >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full flex flex-col h-auto">
            
            <!-- Header -->
            <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0 rounded-t-3xl">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl {isReadOnly ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center font-bold">
                        {#if isReadOnly}<Lock class="w-5 h-5" />{:else}<BookOpen class="w-5 h-5" />{/if}
                    </div>
                    <div>
                        <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {isReadOnly ? 'Zugewiesener Kontakt (Schreibgeschützt)' : isEditing ? 'Kontakt bearbeiten' : 'Neuen Kontakt anlegen'}
                        </h3>
                        <p class="text-xs text-slate-500">Mitarbeiter-Adressbuch</p>
                    </div>
                </div>
                <button type="button" onclick={close} aria-label="Schließen" class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Form -->
            <form onsubmit={handleSave} class="p-4 sm:p-6 space-y-3.5">
                {#if isReadOnly}
                    <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <ShieldAlert class="w-4 h-4 shrink-0" />
                        <span>Dieser Kontakt wurde von der Verwaltung angelegt und kann nur eingesehen werden.</span>
                    </div>
                {/if}

                <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                        <label for="c-sal" class="text-xs font-bold text-slate-700 dark:text-slate-300">Anrede</label>
                        <select id="c-sal" bind:value={salutation} disabled={isReadOnly} class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                            <option value="Keine Angabe">Keine Angabe</option>
                            <option value="Frau">Frau</option>
                            <option value="Herr">Herr</option>
                            <option value="Divers">Divers</option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label for="c-org" class="text-xs font-bold text-slate-700 dark:text-slate-300">Firma / Praxis</label>
                        <input id="c-org" type="text" bind:value={company_name} disabled={isReadOnly} placeholder="z. B. Hausarztpraxis Dr. Meyer" class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                        <label for="c-first" class="text-xs font-bold text-slate-700 dark:text-slate-300">Vorname</label>
                        <input id="c-first" type="text" bind:value={name_first} disabled={isReadOnly} placeholder="Vorname" class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                    </div>
                    <div class="space-y-1">
                        <label for="c-last" class="text-xs font-bold text-slate-700 dark:text-slate-300">Nachname</label>
                        <input id="c-last" type="text" bind:value={name_last} disabled={isReadOnly} placeholder="Nachname" class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                    </div>
                </div>

                <div class="space-y-1">
                    <label for="c-mail" class="text-xs font-bold text-slate-700 dark:text-slate-300">E-Mail</label>
                    <input id="c-mail" type="email" bind:value={email} disabled={isReadOnly} placeholder="kontakt@praxis.de" class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>

                <div class="space-y-1">
                    <label for="c-phone" class="text-xs font-bold text-slate-700 dark:text-slate-300">Telefonnummer</label>
                    <input id="c-phone" type="tel" bind:value={phone} disabled={isReadOnly} placeholder="0123 / 456789" class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <div class="col-span-2 space-y-1">
                        <label for="c-str" class="text-xs font-bold text-slate-700 dark:text-slate-300">Straße</label>
                        <input id="c-str" type="text" bind:value={street} disabled={isReadOnly} placeholder="Musterstraße" class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                    </div>
                    <div class="space-y-1">
                        <label for="c-nr" class="text-xs font-bold text-slate-700 dark:text-slate-300">Hausnr.</label>
                        <input id="c-nr" type="text" bind:value={housenr} disabled={isReadOnly} placeholder="Nr." class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <div class="space-y-1">
                        <label for="c-zip" class="text-xs font-bold text-slate-700 dark:text-slate-300">PLZ</label>
                        <input id="c-zip" type="text" bind:value={zip} disabled={isReadOnly} placeholder="PLZ" class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                    </div>
                    <div class="col-span-2 space-y-1">
                        <label for="c-city" class="text-xs font-bold text-slate-700 dark:text-slate-300">Ort</label>
                        <input id="c-city" type="text" bind:value={city} disabled={isReadOnly} placeholder="Ort" class="w-full min-h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button type="button" onclick={close} class="min-h-11 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer">
                        {isReadOnly ? 'Schließen' : 'Abbrechen'}
                    </button>
                    {#if !isReadOnly}
                        <button type="submit" class="min-h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer">
                            <Check class="w-4 h-4" /><span>{isEditing ? 'Speichern' : 'Anlegen'}</span>
                        </button>
                    {/if}
                </div>
            </form>

        </div>
    </dialog>
{/if}
