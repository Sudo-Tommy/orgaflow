<script lang="ts">
    import "../../app.css";
    import LandingAppointmentModal from "$lib/components/LandingAppointmentModal.svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    let { children } = $props();
    
    // svelte-ignore non_reactive_update
    let appointmentModal: ReturnType<typeof LandingAppointmentModal>;
    
    let currentPath = $derived($page.url.pathname as string);
    let isPortalLogin = $derived(currentPath === '/portal' || currentPath === '/portal/');

    let isAdminMode = $state(false);
    
    $effect(() => {
        if (typeof localStorage !== 'undefined') {
            isAdminMode = localStorage.getItem('portal_admin_mode') === 'true';
        }
    });

    function leaveAdminMode() {
        localStorage.removeItem('portal_token');
        localStorage.removeItem('portal_admin_mode');
        goto('/dashboard');
    }
</script>

<div class="min-h-screen bg-neutral-50 flex flex-col">
    <!-- Portal Header (Immer sichtbar) -->
    <div class="w-full px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center bg-white/90 backdrop-blur-md border-b border-neutral-200/60 sticky top-0 z-40 shadow-sm">
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-2 font-black tracking-tight text-neutral-900 text-sm sm:text-base">
                <img src="/favicon.png" alt="Logo" class="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-sm" />
                <span class="hidden sm:inline">Klienten-Portal</span>
                {#if isAdminMode}
                    <span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full ml-2 hidden sm:inline-block">ADMIN</span>
                {/if}
            </div>
            
            <!-- Desktop Navigation (wird auf der reinen Login-Seite ausgeblendet) -->
            {#if !isPortalLogin}
                <nav class="hidden md:flex items-center gap-2">
                    <a href="/portal/invoices" class="px-3 py-2 text-sm font-bold rounded-lg transition-colors {currentPath.includes('/invoices') ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}">Rechnungen</a>
                    <a href="/portal/appointments" class="px-3 py-2 text-sm font-bold rounded-lg transition-colors {currentPath.includes('/appointments') ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}">Meine Termine</a>
                </nav>
            {/if}
        </div>
        <div class="flex items-center gap-2 sm:gap-3">
            {#if isAdminMode}
                <button onclick={leaveAdminMode} class="hidden sm:flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg">
                    Dashboard
                </button>
            {/if}
            <button onclick={() => appointmentModal?.open()} class="flex items-center gap-2 bg-white text-brand-800 font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-brand-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all active:scale-95 text-xs sm:text-sm">
                <span class="text-base sm:text-lg leading-none">📅</span> Termin anfragen
            </button>
        </div>
    </div>

    <!-- Mobile Navigation -->
    {#if !isPortalLogin}
        <div class="md:hidden flex bg-white border-b border-neutral-200 sticky top-15.25 sm:top-18.25 z-30 shadow-sm">
            <a href="/portal/invoices" class="flex-1 py-3 text-center text-sm font-bold border-b-2 transition-colors {currentPath.includes('/invoices') ? 'border-brand-600 text-brand-700 bg-brand-50/30' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}">Rechnungen</a>
            <a href="/portal/appointments" class="flex-1 py-3 text-center text-sm font-bold border-b-2 transition-colors {currentPath.includes('/appointments') ? 'border-brand-600 text-brand-700 bg-brand-50/30' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}">Meine Termine</a>
        </div>
    {/if}

    <!-- Portal Content -->
    <div class="flex-1 flex flex-col p-4 md:p-8 {isPortalLogin ? 'items-center justify-center' : ''}">
        {@render children()}
    </div>
</div>

<LandingAppointmentModal bind:this={appointmentModal} />