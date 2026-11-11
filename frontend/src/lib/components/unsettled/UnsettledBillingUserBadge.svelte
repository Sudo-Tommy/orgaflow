<script lang="ts">
    import { User, ChevronDown, UserCheck, AlertCircle } from "lucide-svelte";
    import { 
        getUserDisplayName, 
        getUserInitials, 
        findUserById, 
        getAppointmentBillingUserId,
        type BillingUserOption 
    } from "./unsettledBillingUserHelper";

    interface Props {
        app: any;
        client?: any;
        allUsers: any[];
        userOptions: BillingUserOption[];
        canReassign: boolean;
        isProcessing?: boolean;
        onUpdateUser: (app: any, newUserId: string | null) => void;
    }

    let {
        app,
        client,
        allUsers = [],
        userOptions = [],
        canReassign = true,
        isProcessing = false,
        onUpdateUser
    }: Props = $props();

    let assignedId = $derived(getAppointmentBillingUserId(app, client, allUsers));
    let assignedUser = $derived(findUserById(assignedId, allUsers) || app.expand?.billing_user);
    let displayName = $derived(assignedUser ? getUserDisplayName(assignedUser) : "Nicht zugewiesen");
    let initials = $derived(assignedUser ? getUserInitials(assignedUser) : "--");
    let isAssigned = $derived(Boolean(assignedId));
</script>

<div class="relative inline-flex items-center min-w-0">
    {#if canReassign}
        <select
            value={assignedId || ""}
            disabled={isProcessing}
            onclick={(e) => e.stopPropagation()}
            onchange={(e) => onUpdateUser(app, e.currentTarget.value || null)}
            class="appearance-none cursor-pointer pl-6 pr-5 py-0.5 rounded-lg text-[10px] font-black shadow-2xs border transition-all text-left focus:outline-none focus:ring-2 max-w-[150px] sm:max-w-[180px] truncate {
                isAssigned
                    ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-blue-300 dark:border-blue-700 hover:border-blue-400'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:border-amber-400'
            }"
            title={isAssigned ? `Zuständiger Abrechner: ${displayName} (Klicken zum Ändern)` : "Noch kein Abrechner zugewiesen (Klicken zum Zuweisen)"}
        >
            <option value="">⚠️ Nicht zugewiesen</option>
            {#each userOptions as opt (opt.id)}
                <option value={opt.id}>
                    {opt.name}
                </option>
            {/each}
        </select>
        <div class="pointer-events-none absolute left-2 flex items-center">
            {#if isAssigned}
                <UserCheck class="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            {:else}
                <AlertCircle class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            {/if}
        </div>
        <div class="pointer-events-none absolute right-1.5 flex items-center opacity-60">
            <ChevronDown class="w-2.5 h-2.5" />
        </div>
    {:else}
        <div
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border {
                isAssigned
                    ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
            }"
            title={`Abrechner: ${displayName}`}
        >
            <span class="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 text-[9px] font-black flex items-center justify-center shrink-0">
                {initials}
            </span>
            <span class="truncate max-w-[110px]">{displayName}</span>
        </div>
    {/if}
</div>
