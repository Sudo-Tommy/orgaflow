<script lang="ts">
    import QRCode from 'qrcode';
    import { onboardingService } from '$lib/services/onboardingService';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { Link, Copy, Check, QrCode, X, Sparkles, ShieldCheck, UserCheck } from 'lucide-svelte';

    let isOpen = $state(false);
    let selectedRole = $state<'employee' | 'developer' | 'superadmin'>('employee');
    let validityDays = $state(7);
    let note = $state('');
    let isGenerating = $state(false);
    let generatedUrl = $state('');
    let expiresAt = $state('');
    let qrDataUrl = $state('');
    let showQr = $state(false);
    let copied = $state(false);

    // Alphabetisch sortierte Rollen gem. alphabetical-select.md
    const ROLE_OPTIONS = [
        { value: 'developer' as const, label: 'Entwickler' },
        { value: 'employee' as const, label: 'Mitarbeiter / Betreuungskraft' },
        { value: 'superadmin' as const, label: 'Super-Administrator' }
    ];

    // Alphabetisch sortierte Laufzeiten gem. alphabetical-select.md
    const VALIDITY_OPTIONS = [
        { days: 2, label: '2 Tage (48 Stunden)' },
        { days: 7, label: '7 Tage (Standard)' },
        { days: 14, label: '14 Tage (Erweitert)' }
    ];

    export function open() {
        isOpen = true;
        resetForm();
    }

    export function close() {
        isOpen = false;
    }

    function resetForm() {
        selectedRole = 'employee';
        validityDays = 7;
        note = '';
        generatedUrl = '';
        expiresAt = '';
        qrDataUrl = '';
        showQr = false;
        copied = false;
    }

    async function handleGenerate() {
        isGenerating = true;
        try {
            const res = await onboardingService.createToken({
                role: selectedRole,
                validityDays,
                note: note.trim()
            });
            generatedUrl = res.url;
            expiresAt = res.expires_at || '';
            try {
                qrDataUrl = await QRCode.toDataURL(generatedUrl, {
                    width: 280,
                    margin: 2,
                    color: { dark: '#1e1b4b', light: '#ffffff' }
                });
            } catch (qrErr) {
                console.warn('QR Code generation error:', qrErr);
            }
            toastStore.success('Einladungslink erfolgreich erstellt!');
        } catch (err: any) {
            toastStore.error(err.message || 'Fehler beim Erstellen des Links.');
        } finally {
            isGenerating = false;
        }
    }

    async function handleCopy() {
        if (!generatedUrl) return;
        try {
            await navigator.clipboard.writeText(generatedUrl);
            copied = true;
            toastStore.success('Link in die Zwischenablage kopiert!');
            setTimeout(() => { copied = false; }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen. Bitte manuell kopieren.');
        }
    }
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-enter"
        role="dialog"
        aria-modal="true"
    >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 space-y-5">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Sparkles class="w-5 h-5" />
                    </div>
                    <div>
                        <h2 class="text-base font-bold text-slate-900 dark:text-white">Mitarbeiter-Einladungslink</h2>
                        <p class="text-xs text-slate-500">Einmaliger gesicherter Registrierungs-Link</p>
                    </div>
                </div>
                <button 
                    type="button" 
                    onclick={close}
                    class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            {#if !generatedUrl}
                <!-- Konfiguration vor Erstellung -->
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5" for="role-select">
                            Zukünftige Rolle
                        </label>
                        <select 
                            id="role-select"
                            bind:value={selectedRole}
                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                            {#each ROLE_OPTIONS as opt}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5" for="validity-select">
                            Gültigkeit des Links
                        </label>
                        <select 
                            id="validity-select"
                            bind:value={validityDays}
                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                            {#each VALIDITY_OPTIONS as opt}
                                <option value={opt.days}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5" for="note-input">
                            Interne Notiz (z. B. Name des Bewerbers)
                        </label>
                        <input 
                            id="note-input"
                            type="text"
                            bind:value={note}
                            placeholder="Optional: Max Mustermann"
                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div class="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                        <ShieldCheck class="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Dieser Link verfällt sofort nach der einmaligen Übermittlung der Mitarbeiterdaten automatisch.</span>
                    </div>

                    <button 
                        type="button" 
                        onclick={handleGenerate}
                        disabled={isGenerating}
                        class="w-full min-h-11 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                        {#if isGenerating}
                            <span>Generiere Link...</span>
                        {:else}
                            <Link class="w-4 h-4" />
                            <span>Einladungslink generieren</span>
                        {/if}
                    </button>
                </div>
            {:else}
                <!-- Link wurde generiert -->
                <div class="space-y-4">
                    <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                        ✓ Der gesicherte Einladungslink ist einsatzbereit und für 7 Tage gültig.
                    </div>

                    <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 break-all text-xs font-mono text-slate-800 dark:text-slate-200 select-all">
                        {generatedUrl}
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <button 
                            type="button" 
                            onclick={handleCopy}
                            class="min-h-11 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                            {#if copied}
                                <Check class="w-4 h-4 text-emerald-300" />
                                <span>Kopiert!</span>
                            {:else}
                                <Copy class="w-4 h-4" />
                                <span>Link kopieren</span>
                            {/if}
                        </button>

                        <button 
                            type="button" 
                            onclick={() => showQr = !showQr}
                            class="min-h-11 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            <QrCode class="w-4 h-4" />
                            <span>{showQr ? 'QR ausblenden' : 'QR-Code anzeigen'}</span>
                        </button>
                    </div>

                    {#if showQr && qrDataUrl}
                        <div class="p-4 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 animate-enter">
                            <img src={qrDataUrl} alt="Onboarding QR-Code" class="w-48 h-48 rounded-lg shadow-xs" />
                            <span class="text-[11px] text-slate-500 font-medium">Mitarbeiter kann den Code mit dem Smartphone scannen</span>
                        </div>
                    {/if}

                    <div class="pt-2 flex justify-between items-center text-xs text-slate-500">
                        <button 
                            type="button" 
                            onclick={resetForm}
                            class="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer underline underline-offset-2"
                        >
                            Neuen Link erstellen
                        </button>
                        <button 
                            type="button" 
                            onclick={close}
                            class="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                        >
                            Fertig
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

