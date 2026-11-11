<script lang="ts">
    import { goto } from "$app/navigation";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import IamConsole from "$lib/components/admin/iam/IamConsole.svelte";
    import { ArrowLeft, Shield } from "lucide-svelte";

    $effect(() => {
        if (!rbacService.canAccessAdmin) {
            toastStore.warning("Keine Berechtigung für das Access Management Portal.");
            goto("/dashboard");
        }
    });
</script>

<svelte:head>
    <title>IAM & Access Management Konsole | OrgaFlow</title>
</svelte:head>

<div class="space-y-6 animate-enter max-w-7xl mx-auto pb-12">
    <!-- Breadcrumb & Top Bar -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
            <a 
                href="/admin" 
                class="min-h-11 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
            >
                <ArrowLeft class="w-4 h-4" />
                <span>Zurück zur Administration</span>
            </a>
            <div class="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
            <div class="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>Administration</span>
                <span>/</span>
                <span class="text-slate-900 dark:text-white font-bold">Identity & Access Management (IAM)</span>
            </div>
        </div>
    </div>

    <!-- Central IAM Console -->
    <IamConsole />
</div>
