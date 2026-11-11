<script lang="ts">
    import { UserCheck } from "lucide-svelte";
    import { sortPersons } from "$lib/utils/sortHelper";
    import { triggerHaptic } from "$lib/services/hapticFeedback";
    import { rbacService } from "$lib/services/rbacService.svelte";

    interface Props {
        assignedEmployee: any;
        availableEmployees: any[];
        isChangingEmployee: boolean;
        onAssignEmployee: (empId: string) => void;
        onUnlinkEmployee: () => void;
        onToggleChangingEmployee: () => void;
    }

    let {
        assignedEmployee,
        availableEmployees,
        isChangingEmployee,
        onAssignEmployee,
        onUnlinkEmployee,
        onToggleChangingEmployee
    }: Props = $props();

    let sortedEmployees = $derived(sortPersons(availableEmployees));
</script>

<div class="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-100 dark:border-slate-700/80 space-y-2">
    <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
            <UserCheck class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Zugewiesener Assistent
        </span>
        {#if rbacService.isAdmin}
            {#if assignedEmployee && !isChangingEmployee}
                <div class="flex items-center gap-2">
                    <button type="button" onclick={() => { triggerHaptic('tap'); onToggleChangingEmployee(); }} class="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer min-h-[44px] flex items-center touch-manipulation">Ändern</button>
                    <span class="text-neutral-300 dark:text-slate-600">•</span>
                    <button type="button" onclick={() => { triggerHaptic('warning'); onUnlinkEmployee(); }} class="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer min-h-[44px] flex items-center touch-manipulation">Aufheben</button>
                </div>
            {:else if isChangingEmployee}
                <button type="button" onclick={() => { triggerHaptic('tap'); onToggleChangingEmployee(); }} class="text-[11px] font-bold text-neutral-500 hover:text-neutral-700 cursor-pointer min-h-[44px] flex items-center touch-manipulation">Abbrechen</button>
            {/if}
        {/if}
    </div>

    {#if assignedEmployee && (!isChangingEmployee || !rbacService.isAdmin)}
        <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center shrink-0">
                {(assignedEmployee.name_first?.[0] || '')}{(assignedEmployee.name_last?.[0] || '')}
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {assignedEmployee.name_first} {assignedEmployee.name_last}
                </p>
                <p class="text-[10px] text-neutral-500 dark:text-slate-400">
                    {assignedEmployee.role === 'employee' ? 'Assistent' : assignedEmployee.role}
                </p>
            </div>
        </div>
    {:else if rbacService.isAdmin}
        <select
            aria-label="Assistenten zuweisen"
            value={assignedEmployee?.id || ''}
            onchange={(e) => onAssignEmployee(e.currentTarget.value)}
            class="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-900 dark:text-slate-100 w-full"
        >
            <option value="">-- {assignedEmployee ? 'Anderen Assistenten wählen...' : 'Assistenten auswählen...'} --</option>
            {#each sortedEmployees as emp}
                <option value={emp.id}>
                    {emp.name_last}, {emp.name_first} ({emp.role === 'employee' ? 'Assistent' : emp.role})
                </option>
            {/each}
        </select>
    {:else}
        <p class="text-xs text-neutral-400 dark:text-slate-500 italic">Kein Assistent zugewiesen</p>
    {/if}
</div>
