<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";

    let step = $state<"email" | "otp">("email");
    let email = $state("");
    let otp = $state("");
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");
    let stayLoggedIn = $state(true); // Standardmäßig "Angemeldet bleiben"

    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');

    // Dynamischer API-Wächter: Lokal rufen wir direkt die originale /portal Route am Microservice ab. 
    // Auf dem Live-Server nutzen wir den /api/emails/ Prefix, damit Nginx die Anfrage sicher durchlässt.
    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

    onMount(() => {
        // Wenn der Nutzer schon einen Token hat, schicken wir ihn direkt zu den Rechnungen
        if (localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token')) {
            goto('/portal/overview');
        }
    });

    async function requestOtp(e: Event) {
        e.preventDefault();
        
        // Letzter Schutz-Wächter: Falls der Browser das "www." verschluckt hat, zwingen wir ihn hier zur sicheren Seite!
        if (typeof window !== 'undefined' && window.location.hostname === 'ihre-seniorenassistenz.com') {
            window.location.replace(window.location.href.replace('//ihre-', '//www.ihre-'));
            return;
        }
        
        isLoading = true; errorMsg = "";
        try {
            const res = await fetch(`${apiBaseUrl}/request-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || "Serverfehler aufgetreten.");
            if (data.error) throw new Error(data.error);
            
            step = "otp";
            successMsg = "Ein 6-stelliger Code wurde an Ihre E-Mail-Adresse gesendet.";
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Konnte keinen Code anfordern.";
        } finally {
            isLoading = false;
        }
    }

    async function verifyOtp(e: Event) {
        e.preventDefault();
        
        if (typeof window !== 'undefined' && window.location.hostname === 'ihre-seniorenassistenz.com') {
            window.location.replace(window.location.href.replace('//ihre-', '//www.ihre-'));
            return;
        }

        isLoading = true; errorMsg = "";
        try {
            const cleanOtp = otp.replace(/[^0-9]/g, ''); // Letzte Sicherheits-Reinigung
            const res = await fetch(`${apiBaseUrl}/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp: cleanOtp, rememberMe: stayLoggedIn }) });
            if (!res.ok && res.status === 404) throw new Error("API-Route nicht gefunden.");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || "Falscher Code.");
            if (data.error) throw new Error(data.error);
            
            if (stayLoggedIn) {
                localStorage.setItem('portal_token', data.token);
            } else {
                sessionStorage.setItem('portal_token', data.token);
            }
            
            // Erfolgreicher Login -> Ab zu den Rechnungen!
            goto('/portal/overview');
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Falscher Code oder abgelaufen.";
        } finally {
            isLoading = false;
        }
    }

    function enterAsAdmin() {
        localStorage.setItem('portal_token', pb.authStore.token);
        localStorage.setItem('portal_admin_mode', 'true');
        goto('/portal/overview');
    }
</script>

<svelte:head><title>Login - Klienten-Portal</title></svelte:head>

<div class="w-full max-w-md mx-auto animate-enter">
    <div class="text-center mb-8">
        <h1 class="text-3xl font-black text-brand-950 tracking-tight mb-2">Willkommen</h1>
        <p class="text-neutral-500 font-medium">Loggen Sie sich ein, um Ihre Dokumente und Rechnungen einzusehen.</p>
    </div>

    <div class="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xl shadow-neutral-900/5">
        {#if errorMsg}
            <div class="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-sm font-bold border border-rose-100 flex items-center gap-2">
                <span class="text-lg">⚠️</span> {errorMsg}
            </div>
        {/if}
        {#if successMsg && step === "otp"}
            <div class="bg-emerald-50 text-emerald-800 p-4 rounded-xl mb-6 text-sm font-bold border border-emerald-100 flex items-center gap-2 animate-enter">
                <span class="text-lg">✉️</span> {successMsg}
            </div>
        {/if}

        {#if step === "email"}
            <form onsubmit={requestOtp} class="space-y-5">
                <div>
                    <label for="email" class="block text-sm font-semibold text-neutral-700 mb-1.5">Ihre E-Mail-Adresse</label>
                    <input id="email" type="email" bind:value={email} required class="orga-input-clear py-3" placeholder="Ihre hinterlegte E-Mail..." disabled={isLoading} style="-webkit-user-select: text !important; user-select: text !important;" />
                    <p class="text-xs text-amber-700 font-bold mt-2 flex items-start gap-1.5 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                        <span class="text-sm leading-none mt-0.5">⚠️</span>
                        Wichtig: Bitte achten Sie bei der Eingabe exakt auf die Groß- und Kleinschreibung (z.B. beim ersten Buchstaben).
                    </p>
                </div>

                <label class="flex items-center gap-3 p-4 border border-neutral-200 rounded-xl cursor-pointer hover:border-brand-300 transition-colors bg-neutral-50/50 focus-within:ring-2 focus-within:ring-brand-500">
                    <input type="checkbox" bind:checked={stayLoggedIn} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500" disabled={isLoading} />
                    <div>
                        <span class="font-bold text-neutral-900 text-sm block">Angemeldet bleiben</span>
                        <span class="text-xs text-neutral-500 mt-0.5 block">Sie bleiben auf diesem Gerät eingeloggt.</span>
                    </div>
                </label>

                <button type="submit" disabled={isLoading || !email} class="orga-button-primary w-full py-3 shadow-brand-600/20 text-base">{isLoading ? 'Code wird gesendet...' : 'Zugangs-Code anfordern'}</button>
            </form>
        {:else}
            <form onsubmit={verifyOtp} class="space-y-5 animate-enter">
                <div>
                    <label for="otp" class="block text-sm font-semibold text-neutral-700 mb-1.5">6-stelliger Code aus der E-Mail</label>
                    <input 
                        id="otp" 
                        type="text" 
                        bind:value={otp} 
                        oninput={(e) => otp = e.currentTarget.value.replace(/[^0-9]/g, '').slice(0, 6)}
                        maxlength="6"
                        class="orga-input-clear py-3 text-center text-2xl font-mono tracking-widest" placeholder="123456" disabled={isLoading} style="-webkit-user-select: text !important; user-select: text !important;" />
                </div>
                <button type="submit" disabled={isLoading || otp.length !== 6} class="orga-button-primary w-full py-3 shadow-brand-600/20 text-base">{isLoading ? 'Wird geprüft...' : 'Anmelden'}</button>
                <button type="button" onclick={() => { step = "email"; successMsg = ""; errorMsg = ""; otp = ""; }} class="w-full text-center text-sm font-semibold text-neutral-500 hover:text-brand-600 mt-4 transition-colors" disabled={isLoading}>
                    &larr; Zurück zur E-Mail-Eingabe
                </button>
            </form>
        {/if}
    </div>
    
    <div class="mt-8 text-center flex flex-col gap-4">
        <p class="text-xs text-neutral-400 font-medium">Aus Datenschutzgründen nutzen wir ein sicheres, passwortloses Login-Verfahren. Sie erhalten bei jeder Anmeldung einen einmaligen Code per E-Mail.</p>
        
        {#if isSuperAdmin}
            <button type="button" onclick={enterAsAdmin} class="mx-auto w-fit px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors border border-indigo-200 shadow-sm flex items-center gap-2">
                <span>🛡️</span> Als Admin testweise betreten
            </button>
        {/if}
    </div>
</div>
