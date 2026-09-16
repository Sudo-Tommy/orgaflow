<script lang="ts">
    import QRCode from 'qrcode';
    import { employeeService } from '$lib/services/employeeService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { QrCode, Copy, Check, Printer, ShieldAlert, X, Clock, ExternalLink } from 'lucide-svelte';
    import type { UserRecord } from '$lib/types/orgaTypes';

    let isOpen = $state(false);
    let currentEmployee: UserRecord | null = $state(null);
    let qrDataUrl = $state('');
    let directUrl = $state('');
    let expiresAt = $state('');
    let validityHours = $state(168); // 7 Tage default
    let isGenerating = $state(false);
    let copied = $state(false);

    export function open(employee: UserRecord) {
        currentEmployee = employee;
        isOpen = true;
        copied = false;
        
        // Falls bereits ein Token existiert, diesen vorerst anzeigen
        if (employee.quick_access_token) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            directUrl = `${origin}/mitarbeiter?token=${encodeURIComponent(employee.quick_access_token)}`;
            expiresAt = employee.token_expires_at || '';
            renderQr(directUrl);
        } else {
            directUrl = '';
            qrDataUrl = '';
            expiresAt = '';
            // Automatisch einen neuen generieren
            handleGenerate();
        }
    }

    export function close() {
        isOpen = false;
        currentEmployee = null;
        qrDataUrl = '';
        directUrl = '';
    }

    async function renderQr(url: string) {
        try {
            qrDataUrl = await QRCode.toDataURL(url, {
                width: 320,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'H'
            });
        } catch (err) {
            console.error('QR Render Error:', err);
        }
    }

    async function handleGenerate() {
        if (!currentEmployee) return;
        isGenerating = true;
        try {
            const result = await employeeService.generateQuickAccessToken(currentEmployee.id, validityHours);
            if (result) {
                directUrl = result.directUrl;
                expiresAt = result.expiresAt;
                await renderQr(directUrl);
            }
        } finally {
            isGenerating = false;
        }
    }

    async function handleRevoke() {
        if (!currentEmployee) return;
        if (!confirm(`Möchten Sie den QR-Code-Zugang für ${currentEmployee.name_first} ${currentEmployee.name_last} wirklich sofort widerrufen?`)) {
            return;
        }
        const success = await employeeService.revokeQuickAccessToken(currentEmployee.id);
        if (success) {
            directUrl = '';
            qrDataUrl = '';
            expiresAt = '';
        }
    }

    async function copyToClipboard() {
        if (!directUrl) return;
        try {
            await navigator.clipboard.writeText(directUrl);
            copied = true;
            toastStore.success('Zugangslink in die Zwischenablage kopiert!');
            setTimeout(() => copied = false, 2500);
        } catch (err) {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    function handlePrint() {
        window.print();
    }
</script>

{#if isOpen && currentEmployee}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
            
            <!-- Header -->
            <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <QrCode class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">QR-Code Schnellzugang</h3>
                        <p class="text-xs text-slate-500">{currentEmployee.name_first} {currentEmployee.name_last} ({currentEmployee.email})</p>
                    </div>
                </div>
                <button 
                    onclick={close} 
                    aria-label="Schließen"
                    class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Content Area -->
            <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
                
                <!-- Gültigkeit Wähler -->
                <div class="space-y-2">
                    <label for="qr-validity" class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Gültigkeitsdauer des Zugangs
                    </label>
                    <div class="flex flex-wrap gap-2">
                        {#each [
                            { label: '24 Std.', hours: 24 },
                            { label: '7 Tage', hours: 168 },
                            { label: '30 Tage', hours: 720 },
                            { label: '90 Tage', hours: 2160 },
                            { label: '1 Jahr', hours: 8760 }
                        ] as opt}
                            <button
                                type="button"
                                onclick={() => { validityHours = opt.hours; handleGenerate(); }}
                                class="min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold transition-all {validityHours === opt.hours ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}"
                            >
                                {opt.label}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- QR Code Display Card -->
                <div class="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center relative print:border-none print:shadow-none">
                    {#if qrDataUrl}
                        <div class="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block mb-3">
                            <img src={qrDataUrl} alt="Mitarbeiter QR-Code" class="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto" />
                        </div>
                        <div class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 justify-center">
                            <span>Mitarbeiter-Portal Schnellzugriff</span>
                        </div>
                        {#if expiresAt}
                            <div class="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                <Clock class="w-3.5 h-3.5" />
                                <span>Gültig bis: {new Date(expiresAt).toLocaleString('de-DE')}</span>
                            </div>
                        {/if}
                    {:else}
                        <div class="py-12 text-slate-400 text-sm">
                            Kein aktiver QR-Code generiert.
                        </div>
                    {/if}
                </div>

                <!-- Direktlink & Copy -->
                {#if directUrl}
                    <div class="space-y-1.5">
                        <label for="direct-url-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Direkter Zugangs-Link (Für Messenger / SMS)</label>
                        <div class="flex items-center gap-2">
                            <input 
                                id="direct-url-input"
                                type="text" 
                                readonly 
                                value={directUrl}
                                class="flex-1 min-h-11 px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 select-all"
                            />
                            <button 
                                type="button" 
                                onclick={copyToClipboard}
                                class="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                            >
                                {#if copied}
                                    <Check class="w-4 h-4 text-emerald-300" />
                                    <span>Kopiert!</span>
                                {:else}
                                    <Copy class="w-4 h-4" />
                                    <span>Kopieren</span>
                                {/if}
                            </button>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Footer Actions -->
            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    {#if qrDataUrl}
                        <button 
                            type="button" 
                            onclick={handleRevoke}
                            class="min-h-11 px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200 dark:border-rose-900"
                        >
                            <ShieldAlert class="w-4 h-4" />
                            <span>Zugang widerrufen</span>
                        </button>
                    {/if}
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        type="button" 
                        onclick={handlePrint}
                        class="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                        <Printer class="w-4 h-4" />
                        <span>Drucken</span>
                    </button>
                    <button 
                        type="button" 
                        onclick={handleGenerate}
                        disabled={isGenerating}
                        class="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isGenerating ? 'Wird generiert...' : 'Neu generieren'}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
