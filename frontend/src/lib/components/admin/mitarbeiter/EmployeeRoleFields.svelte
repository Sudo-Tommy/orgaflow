<script lang="ts">
    import { Briefcase } from 'lucide-svelte';
    import type { EmploymentType, EmployeeStatus } from '$lib/types/orgaTypes';
    import {
        ROLE_OPTIONS,
        EMPLOYMENT_TYPE_OPTIONS,
        STATUS_OPTIONS
    } from './employeeFormTypes';

    interface Props {
        role: string;
        employment_type: EmploymentType;
        status: EmployeeStatus;
    }

    let {
        role = $bindable(),
        employment_type = $bindable(),
        status = $bindable()
    }: Props = $props();
</script>

<div class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
    <h4 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
        <Briefcase class="w-3.5 h-3.5" />
        <span>Anstellung & Berechtigung</span>
    </h4>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Rolle (Alphabetisch sortiert) -->
        <div class="space-y-1">
            <label for="emp-role" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Rolle</label>
            <select 
                id="emp-role"
                bind:value={role}
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer touch-manipulation"
            >
                {#each ROLE_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
        </div>

        <!-- Anstellungsverhältnis (Alphabetisch sortiert) -->
        <div class="space-y-1">
            <label for="emp-employment" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Anstellungsverhältnis</label>
            <select 
                id="emp-employment"
                bind:value={employment_type}
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer touch-manipulation"
            >
                {#each EMPLOYMENT_TYPE_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
        </div>

        <!-- Dienst-Status (Alphabetisch sortiert) -->
        <div class="space-y-1">
            <label for="emp-status" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Dienst-Status</label>
            <select 
                id="emp-status"
                bind:value={status}
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer touch-manipulation"
            >
                {#each STATUS_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
        </div>
    </div>
</div>
