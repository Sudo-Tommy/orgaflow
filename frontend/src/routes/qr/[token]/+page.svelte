<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { ShieldCheck, ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-svelte";
    import { formatClientSalutation, formatClientFullName, type ClientSalutationInput } from "$lib/utils/formatters";

    let { data } = $props<{ data: { token: string } }>();

    let isLoading = $state(true);
    let isSubmitting = $state(false);
    let errorMsg = $state("");
    let clientData = $state<ClientSalutationInput | null>(null);
    let resolvedAuthToken = $state("");

    const greeting = $derived(formatClientSalutation(clientData, { withEmoji: true }));
    const clientFullName = $derived(formatClientFullName(clientData));

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
        ? `http://${window.location.hostname}:3000/portal` 
        : '/api/emails/portal';

    onMount(async () => {
        if (!data.token) {
            errorMsg = "Ungültiger oder fehlender Zugangs-Code.";
            isLoading = false;
            return;
        }

        try {
            const res = await fetch(`${apiBaseUrl}/auth-with-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: data.token })
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || "Dieser QR-Code ist ungültig oder abgelaufen.");
            }

            resolvedAuthToken = result.token || "";
            if (result.token) {
                try {
                    const payload = JSON.parse(atob(result.token.split('.')[1]));
                    clientData = {
                        salutation: payload.salutation || "",
                        name_first: payload.name_first || "",
                        name_last: payload.name_last || "",
                        academic_title: payload.academic_title || "",
                        company_name: payload.company_name || ""
                    };
                } catch {
                    clientData = null;
                }
            }
        } catch (err: any) {
            errorMsg = err.message || "Verbindungsfehler beim Verifizieren des QR-Codes.";
        } finally {
            isLoading = false;
        }
    });

    async function proceedToPortal() {
        if (isSubmitting || !resolvedAuthToken) return;
        isSubmitting = true;

        try {
            localStorage.setItem('portal_token', resolvedAuthToken);
            localStorage.setItem('portal_stay_logged_in', 'true');
            await goto('/portal/overview');
        } catch (err) {
            console.error("[QR Landing] Navigation error:", err);
            isSubmitting = false;
        }
    }
</script>

<svelte:head>
    <title>Willkommen im Klienten-Portal | OrgaFlow</title>
</svelte:head>

<main class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 font-sans selection:bg-violet-500 selection:text-white">
    <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        
        <!-- Header Badge -->
        <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-lg shadow-violet-600/30 shrink-0">
                <ShieldCheck class="w-6 h-6" />
            </div>
            <div>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    <Sparkles class="w-3 h-3 text-violet-600 dark:text-violet-400" />
                    Sicherer Direkt-Zugang
                </span>
                <h1 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">Klienten-Portal</h1>
            </div>
        </div>

        {#if isLoading}
            <!-- Lade-Zustand -->
            <div class="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
                <Loader2 class="w-10 h-10 text-violet-600 animate-spin" />
                <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">Zugangsdaten werden geprüft...</p>
            </div>
        {:else if errorMsg}
            <!-- Fehler-Zustand -->
            <div class="py-6 space-y-4">
                <div class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
                    <AlertCircle class="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                        <h2 class="text-sm font-bold text-rose-900 dark:text-rose-200">Zugang nicht möglich</h2>
                        <p class="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">{errorMsg}</p>
                    </div>
                </div>

                <a 
                    href="/portal"
                    class="w-full flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                >
                    <span>Zum Standard-Login</span>
                    <ArrowRight class="w-4 h-4" />
                </a>
            </div>
        {:else}
            <!-- Erfolgreicher Onboarding-Zustand mit sauberer Begrüßung -->
            <div class="space-y-6">
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p class="text-xs uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mb-1">Persönliche Begrüßung</p>
                    <h2 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                        {greeting}
                    </h2>
                    {#if clientFullName}
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Ihr Zugang wurde erfolgreich verifiziert.</p>
                    {/if}
                </div>

                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Sie können jetzt Ihre anstehenden Einsätze, Betreuungsberichte und Rechnungen direkt und transparent einsehen.
                </p>

                <button 
                    type="button"
                    onclick={proceedToPortal}
                    disabled={isSubmitting}
                    class="w-full flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-6 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-violet-600/30 hover:shadow-violet-600/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {#if isSubmitting}
                        <Loader2 class="w-5 h-5 animate-spin" />
                        <span>Wird geladen...</span>
                    {:else}
                        <span>Direkt zum Portal</span>
                        <ArrowRight class="w-5 h-5" />
                    {/if}
                </button>
            </div>
        {/if}

        <!-- Footer Note -->
        <p class="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-6 font-medium">
            Seniorenassistenz &bull; Geschützter Klientenbereich
        </p>
    </div>
</main>
