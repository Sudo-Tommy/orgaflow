<script lang="ts">
    import { UserPlus, X } from "lucide-svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";

    let {
        isOpen,
        companies,
        isCreatingUser,
        onClose,
        onCreateUser
    } = $props<{
        isOpen: boolean;
        companies: any[];
        isCreatingUser: boolean;
        onClose: () => void;
        onCreateUser: (userData: {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role: string;
            company: string;
        }) => Promise<void>;
    }>();

    let dialog = $state<HTMLDialogElement | null>(null);
    let newEmail = $state("");
    let newPassword = $state("");
    let newFirstName = $state("");
    let newLastName = $state("");
    let newRole = $state<string>("user");
    let newCompany = $state<string>("");

    $effect(() => {
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    let sortedCompanies = $derived.by(() => {
        return sortAlphabetical(companies || [], (c: any) => c.city || c.name || "");
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        await onCreateUser({
            email: newEmail,
            password: newPassword,
            firstName: newFirstName,
            lastName: newLastName,
            role: newRole,
            company: newCompany
        });
        // Clear
        newEmail = "";
        newPassword = "";
        newFirstName = "";
        newLastName = "";
        newRole = "user";
        newCompany = "";
    }
</script>

{#if isOpen}
    <dialog 
        bind:this={dialog}
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-lg bg-transparent p-4 border-none outline-none backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs animate-enter z-50 overflow-visible"
        onclick={(e) => { if (e.target === dialog) onClose(); }}
        oncancel={(e) => { e.preventDefault(); onClose(); }}
    >
        <div class="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <UserPlus class="w-4 h-4" />
                    </div>
                    <div>
                        <h3 class="font-black text-slate-900 dark:text-white text-base">Neue Identität anlegen</h3>
                        <p class="text-xs text-slate-500">Erstellt einen Benutzer im IAM Universal Directory</p>
                    </div>
                </div>
                <button type="button" onclick={onClose} class="text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Schließen">
                    <X class="w-4 h-4" />
                </button>
            </div>

            <form onsubmit={handleSubmit} class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="iam-new-first" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vorname *</label>
                        <input id="iam-new-first" type="text" bind:value={newFirstName} required placeholder="z. B. Erika" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]" />
                    </div>
                    <div>
                        <label for="iam-new-last" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nachname *</label>
                        <input id="iam-new-last" type="text" bind:value={newLastName} required placeholder="z. B. Mustermann" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]" />
                    </div>
                </div>

                <div>
                    <label for="iam-new-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">E-Mail (Login) *</label>
                    <input id="iam-new-email" type="email" bind:value={newEmail} required placeholder="erika.mustermann@orgaflow.de" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]" />
                </div>

                <div>
                    <label for="iam-new-pwd" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Initiales Passwort *</label>
                    <input id="iam-new-pwd" type="password" bind:value={newPassword} required minlength="8" placeholder="Mindestens 8 Zeichen" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="iam-new-role" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Rolle *</label>
                        <select id="iam-new-role" bind:value={newRole} class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer min-h-[44px]">
                            <option value="user">Benutzer (Standard)</option>
                            <option value="employee">Betreuungskraft / Außendienst</option>
                            <option value="admin">Administrator</option>
                            <option value="superadmin">Superadministrator</option>
                        </select>
                    </div>

                    <div>
                        <label for="iam-new-company" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mandant / Betrieb</label>
                        <select id="iam-new-company" bind:value={newCompany} class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer min-h-[44px]">
                            <option value="">-- Frei / Global --</option>
                            {#each sortedCompanies as c}
                                <option value={c.id}>🏢 {c.city}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button 
                        type="button" 
                        onclick={onClose}
                        class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        Abbrechen
                    </button>
                    <button 
                        type="submit" 
                        disabled={isCreatingUser}
                        class="min-h-[44px] px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                        <span>{isCreatingUser ? 'Erstellt...' : 'Identität anlegen'}</span>
                    </button>
                </div>
            </form>
        </div>
    </dialog>
{/if}
