<script lang="ts">
    import QRCode from 'qrcode';
    import { employeeService } from '$lib/services/employeeService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { QrCode, Copy, Check, Printer, ShieldAlert, X, Clock } from 'lucide-svelte';
    import type { UserRecord } from '$lib/types/orgaTypes';
    import { printElement } from '$lib/utils/print';

    const VALIDITY_OPTIONS = [
        { label: '24 Std.', hours: 24 },
        { label: '7 Tage', hours: 168 },
        { label: '30 Tage', hours: 720 },
        { label: '90 Tage', hours: 2160 },
        { label: '1 Jahr', hours: 8760 }
    ];

    let isOpen = $state(false);
    let currentEmployee: UserRecord | null = $state(null);
    let qrDataUrl = $state('');
    let directUrl = $state('');
    let expiresAt = $state('');
    let validityHours = $state(168);
    let isGenerating = $state(false);
    let copied = $state(false);
    let dialog = $state<HTMLDialogElement | null>(null);

    $effect(() => {
        if (isOpen && currentEmployee) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    export function open(employee: UserRecord) {
        currentEmployee = employee;
        isOpen = true;
        copied = false;
        
        if (employee.quick_access_token) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            directUrl = `${origin}/mitarbeiter?token=${encodeURIComponent(employee.quick_access_token)}`;
            expiresAt = employee.token_expires_at || '';
            renderQr(directUrl);
        } else {
            directUrl = '';
            qrDataUrl = '';
            expiresAt = '';
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
                color: { dark: '#0f172a', light: '#ffffff' },
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
        if (!confirm(`Möchten Sie den QR-Code-Zugang für ${currentEmployee.name_first} ${currentEmployee.name_last} wirklich sofort widerrufen?`)) return;
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
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    function handlePrint() {
        printElement('employee-qr-print-area', {
            title: `Mitarbeiter QR-Code - ${currentEmployee?.name_first || ''} ${currentEmployee?.name_last || ''}`,
            pageOrientation: 'portrait',
            pageMargin: '12mm'
        });
    }
</script>

{#if isOpen && currentEmployee}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-lg bg-transparent p-4 border-none outline-none backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs animate-enter z-50 overflow-visible"
        onclick={(e) => { if (e.target === dialog) close(); }}
        oncancel={(e) => { e.preventDefault(); close(); }}
    >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full my-6 sm:my-10 flex flex-col">
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
                <button onclick={close} aria-label="Schließen" class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-manipulation cursor-pointer">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <div class="p-5 sm:p-6 space-y-5">
                <div class="space-y-1.5">
                    <label for="validity-hours" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Gültigkeitsdauer des Tokens:</label>
                    <div class="grid grid-cols-5 gap-1.5">
                        {#each VALIDITY_OPTIONS as opt}
                            <button type="button" onclick={() => { validityHours = opt.hours; handleGenerate(); }} class="py-1.5 px-2 rounded-xl text-xs font-bold transition-all border {validityHours === opt.hours ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'}">
                                {opt.label}
                            </button>
                        {/each}
                    </div>
                </div>

                <div id="employee-qr-print-area" class="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <div class="mb-3">
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mitarbeiter-Zugangskarte</span>
                        <h4 class="text-lg font-black text-slate-900 dark:text-white">{currentEmployee.name_first} {currentEmployee.name_last}</h4>
                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{currentEmployee.role === 'admin' ? 'Verwaltung' : 'Mitarbeiter'}</span>
                    </div>

                    <div class="p-3 bg-white rounded-2xl shadow-md border border-slate-200/80 mb-3">
                        {#if isGenerating}
                            <div class="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">QR-Code wird erstellt...</div>
                        {:else if qrDataUrl}
                            <img src={qrDataUrl} alt="Mitarbeiter QR-Code" class="w-48 h-48 block" />
                        {:else}
                            <div class="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">Kein QR-Code vorhanden</div>
                        {/if}
                    </div>

                    <p class="text-xs text-slate-500 max-w-xs">
                        Mit dem Smartphone scannen, um ohne Passwort-Eingabe direkt in die Einsatzansicht einzuloggen.
                    </p>

                    {#if expiresAt}
                        <div class="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <Clock class="w-3.5 h-3.5" />
                            <span>Gültig bis: {new Date(expiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr</span>
                        </div>
                    {/if}
                </div>

                {#if directUrl}
                    <div class="space-y-1.5">
                        <label for="direct-url-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Direkter Zugangslink:</label>
                        <div class="flex items-center gap-2">
                            <input id="direct-url-input" type="text" readonly value={directUrl} class="w-full min-h-11 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 select-all" />
                            <button type="button" onclick={copyToClipboard} class="min-h-11 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer touch-manipulation">
                                {#if copied}<Check class="w-4 h-4 text-emerald-600" /><span>Kopiert</span>{:else}<Copy class="w-4 h-4" /><span>Kopieren</span>{/if}
                            </button>
                        </div>
                    </div>
                {/if}
            </div>

            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    {#if qrDataUrl}
                        <button type="button" onclick={handleRevoke} class="min-h-11 px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200 dark:border-rose-900 cursor-pointer touch-manipulation">
                            <ShieldAlert class="w-4 h-4" /><span>Zugang widerrufen</span>
                        </button>
                    {/if}
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick={handlePrint} class="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer touch-manipulation">
                        <Printer class="w-4 h-4" /><span>Drucken</span>
                    </button>
                    <button type="button" onclick={handleGenerate} disabled={isGenerating} class="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer touch-manipulation">
                        {isGenerating ? 'Wird generiert...' : 'Neu generieren'}
                    </button>
                </div>
            </div>
        </div>
    </dialog>
{/if}
