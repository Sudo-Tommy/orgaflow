<script lang="ts">
    import "../../app.css";
    import LandingAppointmentModal from "$lib/components/LandingAppointmentModal.svelte";
    import PortalAccessBlockedModal from "$lib/components/portal/PortalAccessBlockedModal.svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import type LandingAppointmentModalType from "$lib/components/LandingAppointmentModal.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { isSubmitting } from '$lib/states/ui.svelte';
    import { validatePortalSession, getPortalAuthToken } from "$lib/components/portal/portalDataService";

    let { children } = $props();
    
    // svelte-ignore non_reactive_update
    let appointmentModal: LandingAppointmentModalType;
    
    let currentPath = $derived($page.url.pathname as string);
    let isPortalLogin = $derived(currentPath === '/portal' || currentPath === '/portal/');

    // Abgeleitete reaktive Werte über Svelte 5 Runen
    const currentUser = $derived($page.data.user || pb.authStore.model);
    const isOwner = $derived(currentUser?.role === 'owner' || currentUser?.role === 'superadmin' || currentUser?.role === 'developer' || rbacService.isOwner);
    const isAdmin = $derived(currentUser?.role === 'admin');
    const isClient = $derived(currentUser?.role === 'client' || currentUser?.role === 'guest');

    let isAdminMode = $state(false);
    let hasPortalSession = $state(false);
    let loadingState = $state({ submitting: false });

    function handleSecureNavigation(url: string) {
        if (loadingState.submitting || isSubmitting.submitting) return;
        goto(url);
    }
    
    const API_BASE_URL = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
        ? `http://${window.location.hostname}:3000/portal` 
        : '/api/emails/portal';

    $effect(() => {
        if (typeof localStorage !== 'undefined') {
            isAdminMode = localStorage.getItem('portal_admin_mode') === 'true';
            hasPortalSession = !!localStorage.getItem('portal_token') || pb.authStore.isValid;
            if (!isPortalLogin && currentPath.startsWith('/portal')) {
                const token = getPortalAuthToken();
                if (token) validatePortalSession(API_BASE_URL, token);
            }
        }
    });

    function leaveAdminMode() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('portal_admin_mode');
            localStorage.removeItem('portal_token');
        }
        goto('/dashboard');
    }

    function handleOpenAppointmentModal() {
        appointmentModal?.open({
            role: isClient ? 'client' : (isAdmin || isOwner ? 'admin' : undefined),
            senderName: currentUser ? `${currentUser.name_first || ''} ${currentUser.name_last || currentUser.lastName || ''}`.trim() : undefined,
            email: currentUser?.email,
            phone: currentUser?.phone || currentUser?.handy
        });
    }

    function handleLogout() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('portal_token');
            localStorage.removeItem('portal_admin_mode');
            localStorage.removeItem('portal_stay_logged_in');
            sessionStorage.removeItem('portal_token');
        }
        pb.authStore.clear();
        goto('/portal');
    }
</script>

<div class="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
    <!-- HRBAC Header Bar (Immer sichtbar, wenn User authentifiziert) -->
    {#if currentUser}
        <header class="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800">
            <div class="container mx-auto flex flex-wrap justify-between items-center gap-3">
                <span class="font-black text-sm sm:text-base tracking-tight text-indigo-400">OrgaFlow Portal</span>
                <nav class="flex flex-wrap items-center gap-2 sm:gap-3">
                    {#if isOwner}
                        <a href="/owner/dashboard" class="px-3 py-1.5 hover:bg-slate-800 rounded-lg min-h-[40px] flex items-center transition-colors text-xs font-bold text-slate-200 hover:text-white">Globale Kontrolle</a>
                    {/if}
                    {#if isOwner || isAdmin}
                        <a href="/admin/dashboard" class="px-3 py-1.5 hover:bg-slate-800 rounded-lg min-h-[40px] flex items-center transition-colors text-xs font-bold text-slate-200 hover:text-white">Betriebsverwaltung</a>
                    {/if}
                    {#if isClient}
                        <span class="text-xs font-medium text-slate-300">
                            Willkommen, {currentUser.name_first || ''} {currentUser.name_last || currentUser.lastName || ''}
                        </span>
                    {/if}
                </nav>
            </div>
        </header>
    {/if}

    <!-- Portal Sub-Header (voll responsiv mit Aktionen) -->
    <div class="w-full px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex justify-between items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        <div class="flex items-center gap-2 sm:gap-3">
            <a href="/portal" class="flex items-center gap-2 sm:gap-2.5 font-black tracking-tight text-slate-900 dark:text-slate-100 group">
                <img src="/favicon.png" alt="Logo" class="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-xs group-hover:scale-105 transition-transform" />
                <span class="text-sm sm:text-base font-black text-slate-900 dark:text-white">Klienten-Portal</span>
            </a>
            {#if isAdminMode}
                <span class="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-200 dark:border-indigo-800">ADMIN</span>
            {/if}
        </div>

        <div class="flex items-center gap-1.5 sm:gap-3">
            {#if isAdminMode}
                <button onclick={leaveAdminMode} class="flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-colors min-h-[44px] cursor-pointer">
                    <span>🛡️</span> <span class="hidden sm:inline">Zum Dashboard</span>
                </button>
            {/if}

            <button 
                onclick={handleOpenAppointmentModal} 
                class="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/80 transition-all text-xs sm:text-sm active:scale-95 shadow-xs min-h-[44px] cursor-pointer">
                <span>📅</span> <span>Termin anfragen</span>
            </button>

            {#if !isPortalLogin && hasPortalSession}
                <button 
                    onclick={handleLogout} 
                    class="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 transition-colors min-h-[44px] cursor-pointer"
                    title="Abmelden">
                    <span>🚪</span> <span class="hidden sm:inline">Abmelden</span>
                </button>
            {/if}
        </div>
    </div>

    <!-- Portal Content -->
    <main class="flex-1 flex flex-col p-3 sm:p-6 md:p-8 {isPortalLogin ? 'items-center justify-center' : ''}">
        {@render children()}
    </main>
</div>

<LandingAppointmentModal bind:this={appointmentModal} />
<PortalAccessBlockedModal />