<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import PortalEmployeeLoginCard from "$lib/components/portal/PortalEmployeeLoginCard.svelte";
    import PortalClientLoginCard from "$lib/components/portal/PortalClientLoginCard.svelte";

    let loginTab = $state<'client' | 'employee'>('client');
    let isAutoLoggingIn = $state(false);

    let isSuperAdmin = $derived(
        pb.authStore.isSuperuser || 
        pb.authStore.model?.role === 'superadmin' || 
        pb.authStore.model?.role === 'developer' || 
        pb.authStore.model?.role === 'admin' || 
        rbacService.isOwner
    );

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
        ? `http://${window.location.hostname}:3000/portal` 
        : '/api/emails/portal';

    onMount(() => {
        const modeParam = $page.url.searchParams.get('mode');
        if (modeParam === 'employee' || modeParam === 'mitarbeiter') {
            loginTab = 'employee';
        }

        if (pb.authStore.isValid) {
            if (rbacService.isClient) {
                goto('/portal/overview');
            } else {
                goto('/dashboard');
            }
            return;
        }

        const existingToken = localStorage.getItem('portal_token');
        if (existingToken) {
            goto('/portal/overview');
            return;
        }

        const authCode = $page.url.searchParams.get('auth');
        if (authCode) {
            handleCodeLogin(authCode);
        }
    });

    async function handleCodeLogin(code: string) {
        isAutoLoggingIn = true;
        try {
            const response = await fetch(`${apiBaseUrl}/auth-with-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Zugangskarte konnte nicht verifiziert werden.");
            }

            if (result.token) {
                localStorage.setItem('portal_token', result.token);
                localStorage.setItem('portal_stay_logged_in', 'true');
                goto('/portal/overview');
            }
        } catch (err: any) {
            console.error("QR Auth Error:", err);
            isAutoLoggingIn = false;
        }
    }
</script>

<svelte:head>
    <title>{loginTab === 'employee' ? 'Mitarbeiter-Login - OrgaFlow' : 'Login - Klienten-Portal'}</title>
</svelte:head>

<div class="w-full max-w-lg mx-auto animate-enter px-2 sm:px-4 py-4 sm:py-8">
    <!-- Zurück Link -->
    <div class="mb-4">
        <a 
            href="/" 
            class="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer min-h-[44px] py-2 px-1 touch-manipulation"
        >
            <span>&larr;</span> Zurück zur Startseite
        </a>
    </div>

    <!-- Tab-Wechsler: Klient vs. Mitarbeiter -->
    <div class="flex items-center justify-center p-1.5 bg-neutral-100 dark:bg-slate-800/90 rounded-2xl mb-6 max-w-sm mx-auto border border-neutral-200/80 dark:border-slate-700/80 shadow-xs">
        <button 
            type="button" 
            onclick={() => loginTab = 'client'}
            class="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] touch-manipulation {loginTab === 'client' ? 'bg-white dark:bg-slate-700 text-brand-950 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
        >
            <span>🪪</span> Klienten-Portal
        </button>
        <button 
            type="button" 
            onclick={() => loginTab = 'employee'}
            class="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] touch-manipulation {loginTab === 'employee' ? 'bg-white dark:bg-slate-700 text-brand-950 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
        >
            <span>👥</span> Mitarbeiter-Login
        </button>
    </div>

    {#if loginTab === 'employee'}
        <PortalEmployeeLoginCard />
    {:else}
        <PortalClientLoginCard 
            {apiBaseUrl} 
            {isSuperAdmin} 
            bind:isAutoLoggingIn 
        />
    {/if}
</div>
