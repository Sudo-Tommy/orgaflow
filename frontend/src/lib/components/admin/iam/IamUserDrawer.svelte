<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { X, Shield, Mail, Key, CheckCircle2, XCircle, Trash2, Save } from "lucide-svelte";
    import IamRolePermissionsPreview from "./IamRolePermissionsPreview.svelte";
    import IamUserMetaInfo from "./IamUserMetaInfo.svelte";

    let { 
        user = null, 
        isOpen = false, 
        onClose = () => {}, 
        onUserUpdated = () => {} 
    } = $props<{
        user: any;
        isOpen: boolean;
        onClose: () => void;
        onUserUpdated: () => void;
    }>();

    let dialog = $state<HTMLDialogElement | null>(null);
    let isSaving = $state(false);
    let selectedRole = $state<string>("user");
    let selectedCompany = $state<string>("");
    let isVerified = $state<boolean>(false);
    let emailVisibility = $state<boolean>(false);

    let companies = $derived(orgaStore.company?.data || []);
    let sortedCompanies = $derived(
        [...companies].sort((a, b) => {
            const labelA = `${a.city || ''} ${a.name || ''}`.trim();
            const labelB = `${b.city || ''} ${b.name || ''}`.trim();
            return labelA.localeCompare(labelB, 'de', { sensitivity: 'base' });
        })
    );

    $effect(() => {
        if (isOpen && user) {
            dialog?.showModal();
            selectedRole = user.role || 'user';
            const c = Array.isArray(user.company) ? user.company[0] : user.company;
            selectedCompany = c || '';
            isVerified = !!user.verified;
            emailVisibility = !!user.emailVisibility;
        } else {
            dialog?.close();
        }
    });

    async function handleSave() {
        if (!user) return;
        isSaving = true;
        try {
            const dataToUpdate: Record<string, any> = {
                role: selectedRole,
                verified: isVerified,
                company: selectedCompany ? [selectedCompany] : []
            };
            await pb.collection('users').update(user.id, dataToUpdate);
            toastStore.success(`Benutzer '${user.email}' erfolgreich aktualisiert!`);
            onUserUpdated();
            onClose();
        } catch (err: any) {
            toastStore.error(`Fehler beim Speichern: ${err.message}`);
        } finally {
            isSaving = false;
        }
    }

    async function handlePasswordReset() {
        if (!user?.email) return;
        if (await confirmStore.ask(`Möchten Sie eine E-Mail zum Zurücksetzen des Passworts an '${user.email}' senden?`, "Passwort-Reset anfordern", "E-Mail senden", "Abbrechen")) {
            try {
                await pb.collection('users').requestPasswordReset(user.email);
                toastStore.success(`Passwort-Reset-E-Mail an ${user.email} gesendet!`);
            } catch (err: any) {
                toastStore.error(`Fehler beim Anfordern: ${err.message}`);
            }
        }
    }

    async function handleDeleteUser() {
        if (!user) return;
        if (await confirmStore.ask(`Sind Sie sicher, dass Sie den Benutzer '${user.email}' unwiderruflich aus dem System entfernen möchten?`, "Benutzer löschen?", "Unwiderruflich Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('users').delete(user.id);
                toastStore.success(`Benutzer '${user.email}' gelöscht.`);
                onUserUpdated();
                onClose();
            } catch (err: any) {
                toastStore.error(`Fehler beim Löschen: ${err.message}`);
            }
        }
    }
</script>

{#if isOpen && user}
    <dialog 
        bind:this={dialog}
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm w-full max-w-xl mx-auto my-auto rounded-3xl border-none outline-none z-50 animate-enter shadow-2xl"
        onclick={(e) => { if (e.target === dialog) onClose(); }}
        oncancel={(e) => { e.preventDefault(); onClose(); }}
    >
        <div class="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
            <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-between shrink-0 rounded-t-3xl">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {(user.name_first?.[0] || user.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                        <h3 class="text-base font-black text-slate-900 dark:text-white leading-tight">
                            {user.name_first || ''} {user.name_last || ''}
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{user.email}</p>
                    </div>
                </div>
                <button type="button" onclick={onClose} class="min-h-10 min-w-10 inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation" aria-label="Schließen">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <div class="p-4 sm:p-5 space-y-5">
                <IamUserMetaInfo {user} />

                <div class="space-y-4">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Shield class="w-4 h-4 text-indigo-500" />
                        Rollen- und Rechte-Konfiguration
                    </h4>

                    <div class="space-y-3">
                        <div>
                            <label for="drawer-role" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Zugewiesene System-Rolle
                            </label>
                            <select id="drawer-role" bind:value={selectedRole} class="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer touch-manipulation">
                                <option value="admin">🏢 Admin / Betriebsleiter (Verwaltung eigener Standort)</option>
                                <option value="developer">💻 Developer / Entwickler (Vollzugriff & System-Override)</option>
                                <option value="guest">👤 Guest / Klient (Portal-Zugang)</option>
                                <option value="superadmin">👑 Superadmin / Global Owner (Voller Systemzugriff)</option>
                                <option value="user">🧑‍⚕️ User / Betreuer (Eigene Termine & Klienten)</option>
                            </select>
                        </div>

                        <div>
                            <label for="drawer-company" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Mandanten- / Betriebs-Bindung (Tenant Scope)
                            </label>
                            <select id="drawer-company" bind:value={selectedCompany} class="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer touch-manipulation">
                                <option value="">-- Kein konkreter Betrieb (Global / Frei) --</option>
                                {#each sortedCompanies as c}
                                    <option value={c.id}>🏢 {c.city} {c.name ? `(${c.name})` : ''}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Key class="w-4 h-4 text-indigo-500" />
                        Sicherheit & Zugangs-Status
                    </h4>

                    <div class="space-y-3">
                        <label class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer touch-manipulation">
                            <div class="flex items-center gap-2.5">
                                {#if isVerified}
                                    <CheckCircle2 class="w-5 h-5 text-emerald-500" />
                                {:else}
                                    <XCircle class="w-5 h-5 text-amber-500" />
                                {/if}
                                <div>
                                    <div class="text-xs font-bold text-slate-900 dark:text-white">E-Mail verifiziert (Status: {isVerified ? 'Aktiv' : 'Unverifiziert'})</div>
                                    <div class="text-[11px] text-slate-500">Erlaubt regulären Login ohne Verifizierungsblockade.</div>
                                </div>
                            </div>
                            <input type="checkbox" bind:checked={isVerified} class="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer touch-manipulation" />
                        </label>

                        <button type="button" onclick={handlePasswordReset} class="w-full min-h-11 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer touch-manipulation">
                            <Mail class="w-4 h-4 text-indigo-500" />
                            <span>Passwort-Zurücksetzen-E-Mail senden</span>
                        </button>
                    </div>
                </div>

                <IamRolePermissionsPreview {selectedRole} />

                <div class="pt-4 border-t border-rose-100 dark:border-rose-950/50">
                    <button type="button" onclick={handleDeleteUser} class="w-full min-h-11 py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer touch-manipulation">
                        <Trash2 class="w-4 h-4" />
                        <span>Identität unwiderruflich löschen</span>
                    </button>
                </div>
            </div>

            <div class="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                <button type="button" onclick={onClose} class="min-h-11 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white rounded-xl transition-colors cursor-pointer touch-manipulation">
                    Abbrechen
                </button>
                <button type="button" onclick={handleSave} disabled={isSaving} class="min-h-11 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 touch-manipulation">
                    <Save class="w-4 h-4" />
                    <span>{isSaving ? 'Speichert...' : 'Änderungen anwenden'}</span>
                </button>
            </div>
        </div>
    </dialog>
{/if}
