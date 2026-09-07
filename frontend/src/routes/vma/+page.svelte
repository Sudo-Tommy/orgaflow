<script lang="ts">
    import VmaManager from "$lib/components/vma/VmaManager.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { goto } from "$app/navigation";
    import { Car, ChevronRight, Home } from "lucide-svelte";

    $effect(() => {
        if (rbacService.isCaregiver) {
            toastStore.warning("Keine Zugriffsberechtigung für den Bereich Reisekosten.");
            goto('/dashboard');
        }
    });
</script>

<svelte:head>
    <title>Reisekosten & VMA | OrgaFlow</title>
    <meta name="description" content="Verpflegungsmehraufwand (VMA), Fahrtzeiten & Reisekostenabrechnung mit Google Routes API in OrgaFlow." />
</svelte:head>

<div class="min-h-screen bg-neutral-50/50 pb-16">
    <!-- Breadcrumb Bar -->
    <div class="border-b border-neutral-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-10 no-print">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
            <nav class="flex items-center gap-1.5 text-xs text-neutral-500 font-medium" aria-label="Breadcrumb">
                <a href="/dashboard" class="flex items-center gap-1 text-neutral-500 hover:text-indigo-600 transition-colors">
                    <Home class="w-3.5 h-3.5" />
                    <span class="hidden sm:inline">Dashboard</span>
                </a>
                <ChevronRight class="w-3 h-3 text-neutral-300" />
                <a href="/finances" class="text-neutral-500 hover:text-indigo-600 transition-colors">Finanzen</a>
                <ChevronRight class="w-3 h-3 text-neutral-300" />
                <span class="text-indigo-600 font-bold flex items-center gap-1">
                    <Car class="w-3.5 h-3.5" />
                    <span>Reisekosten (VMA)</span>
                </span>
            </nav>

            <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Google Routes API</span>
                </span>
            </div>
        </div>
    </div>

    <!-- Main VMA Content Component -->
    <main class="animate-enter">
        <VmaManager />
    </main>
</div>
