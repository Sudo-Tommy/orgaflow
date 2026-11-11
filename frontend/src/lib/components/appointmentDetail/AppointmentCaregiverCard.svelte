<script lang="ts">
    import { UserCheck, Users, Check, X, UserX } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    interface Props {
        assignedUser: any;
        onSaveUser: (userId: string) => Promise<boolean>;
    }

    let { assignedUser, onSaveUser }: Props = $props();

    let isChanging = $state(false);
    let isSaving = $state(false);
    let selectedUserId = $state("");

    let activeEmployees = $derived.by(() => {
        const list = (orgaStore.users?.data || []) as any[];
        return list.filter(u => u.role !== 'client');
    });

    function startChange() {
        selectedUserId = assignedUser?.id || "";
        isChanging = true;
    }

    async function handleSelect(userId: string) {
        selectedUserId = userId;
        isSaving = true;
        const ok = await onSaveUser(userId);
        isSaving = false;
        if (ok) isChanging = false;
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                <UserCheck class="w-4 h-4" />
            </span>
            <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Betreuer / Mitarbeiter
            </h3>
        </div>
        {#if !isChanging}
            <button
                type="button"
                onclick={startChange}
                class="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
                <Users class="w-3.5 h-3.5" />
                <span>{assignedUser ? 'Wechseln' : 'Zuweisen'}</span>
            </button>
        {:else}
            <button
                type="button"
                onclick={() => isChanging = false}
                class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Abbrechen"
            >
                <X class="w-4 h-4" />
            </button>
        {/if}
    </div>

    {#if !isChanging}
        {#if assignedUser}
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-black flex items-center justify-center text-sm shrink-0 shadow-2xs">
                    {(assignedUser.name_first?.charAt(0) || '')}{(assignedUser.name_last?.charAt(0) || '')}
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {assignedUser.name_first} {assignedUser.name_last}
                    </p>
                    {#if assignedUser.email}
                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {assignedUser.email}
                        </p>
                    {/if}
                </div>
            </div>
        {:else}
            <div class="flex items-center justify-between py-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl px-3">
                <span class="flex items-center gap-1.5">
                    <UserX class="w-4 h-4 text-amber-500" />
                    <span>Kein Betreuer zugewiesen.</span>
                </span>
                <button
                    type="button"
                    onclick={startChange}
                    class="font-bold underline hover:no-underline cursor-pointer"
                >
                    Jetzt zuweisen
                </button>
            </div>
        {/if}
    {:else}
        <div class="space-y-1.5 pt-1">
            <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Mitarbeiter direkt auswählen:</p>
            <div class="space-y-1">
                {#each activeEmployees as emp (emp.id)}
                    {@const isCurrent = assignedUser?.id === emp.id}
                    <button
                        type="button"
                        onclick={() => handleSelect(emp.id)}
                        disabled={isSaving}
                        class="w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer {
                            isCurrent
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }"
                    >
                        <div class="flex items-center gap-2.5 min-w-0">
                            <span class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {(emp.name_first?.charAt(0) || '')}{(emp.name_last?.charAt(0) || '')}
                            </span>
                            <span class="text-xs truncate">
                                {emp.name_first} {emp.name_last}
                            </span>
                        </div>
                        {#if isCurrent}
                            <Check class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        {/if}
                    </button>
                {/each}
            </div>
            <div class="pt-2 text-right">
                <button
                    type="button"
                    onclick={() => isChanging = false}
                    class="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold cursor-pointer"
                >
                    Schließen
                </button>
            </div>
        </div>
    {/if}
</div>
