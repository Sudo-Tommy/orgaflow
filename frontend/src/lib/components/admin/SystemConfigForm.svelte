<script lang="ts">
    import { toastStore } from '$lib/services/toastService.svelte';
    import { Shield, Settings, Check, ArrowLeft, Save } from 'lucide-svelte';
    import StickyActionBar from '$lib/components/ui/StickyActionBar.svelte';
    import { createKeyboardViewport } from '$lib/utils/viewportKeyboard.svelte';

    export interface SystemConfigData {
        instanceName: string;
        systemInstruction: string;
        contactEmail?: string;
        enableAutoAudit?: boolean;
        maintenanceMode?: boolean;
        autoSyncIntervalMinutes?: number;
    }

    interface Props {
        data: SystemConfigData;
        onSave: (payload: SystemConfigData) => Promise<void>;
        onCancel: () => void;
    }

    let { data, onSave, onCancel }: Props = $props();

    // Double-Submission-Schutz
    let isSubmitting = $state(false);
    let isSavingDraft = $state(false);

    // Viewport-Zustände für mobile Tastatur
    const keyboardViewport = createKeyboardViewport();
    let dynamicPaddingBottom = $derived(
        `calc(5rem + ${keyboardViewport.keyboardHeight}px + env(safe-area-inset-bottom, 0px))`
    );

    async function handleFormSubmit(e?: Event) {
        if (e) e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        try {
            await onSave(data);
        } catch (err: any) {
            console.error("Fehler beim Speichern:", err);
            toastStore.error(err?.message || "Fehler beim Speichern der Systemkonfiguration.");
        } finally {
            isSubmitting = false;
        }
    }

    async function handleSaveDraft() {
        if (isSavingDraft || isSubmitting) return;
        isSavingDraft = true;
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('orgaflow_system_config_draft', JSON.stringify(data));
            }
            toastStore.success("Entwurf erfolgreich lokal zwischengespeichert! 📋");
        } catch (e: any) {
            console.error("Entwurf-Speicherfehler:", e);
        } finally {
            isSavingDraft = false;
        }
    }
</script>

<div class="flex flex-col min-h-screen bg-slate-50 relative">
    <main 
        class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 transition-all duration-200"
        style="padding-bottom: {dynamicPaddingBottom};"
    >
        <div class="max-w-4xl mx-auto space-y-6">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Settings class="w-6 h-6 text-slate-700 shrink-0" />
                        <span>System-Administration</span>
                    </h1>
                    <p class="text-xs sm:text-sm text-slate-500 mt-1">
                        Konfigurieren Sie hier die zentralen Parameter, Instanz-Metadaten und Spezifikationen für die automatische Text-Optimierung.
                    </p>
                </div>
            </div>

            <form onsubmit={handleFormSubmit} class="space-y-6">
                <!-- Basis-Instanz Daten -->
                <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                    <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Shield class="w-4 h-4 text-blue-600" />
                        <h2 class="text-sm font-bold text-slate-800">Instanz-Identifikation</h2>
                    </div>

                    <div>
                        <label for="sys_name" class="block text-xs font-semibold text-slate-700 mb-1.5">
                            System-Instanz Name
                        </label>
                        <input 
                            id="sys_name" 
                            type="text" 
                            class="w-full h-11 px-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 focus:bg-white text-sm text-slate-800 transition-colors" 
                            placeholder="z. B. OrgaFlow Hauptinstanz Nord"
                            bind:value={data.instanceName}
                            required
                        />
                    </div>

                    <div>
                        <label for="sys_contact" class="block text-xs font-semibold text-slate-700 mb-1.5">
                            Zentrale Kontakt- und Benachrichtigungs-E-Mail
                        </label>
                        <input 
                            id="sys_contact" 
                            type="email" 
                            class="w-full h-11 px-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 focus:bg-white text-sm text-slate-800 transition-colors" 
                            placeholder="admin@ihre-seniorenassistenz.com"
                            bind:value={data.contactEmail}
                        />
                    </div>
                </div>

                <!-- Regelwerk & Text-Optimierung -->
                <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-base leading-none">📝</span>
                            <h2 class="text-sm font-bold text-slate-800">Regelwerk & Text-Optimierung</h2>
                        </div>
                        <span class="text-[11px] font-semibold text-slate-400">Automatische Entwürfe</span>
                    </div>

                    <div>
                        <label for="sys_instruction" class="block text-xs font-semibold text-slate-700 mb-1.5">
                            Spezifikation für automatischen Aktions-Entwurf
                        </label>
                        <textarea 
                            id="sys_instruction" 
                            rows="5"
                            class="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 focus:bg-white text-xs sm:text-sm text-slate-800 leading-relaxed font-mono custom-scrollbar transition-colors" 
                            placeholder="Definieren Sie hier Richtlinien für automatisierte Text-Optimierung, Standardfloskeln oder Vorgaben zur Berichterstellung..."
                            bind:value={data.systemInstruction}
                        ></textarea>
                        <p class="text-[11px] text-slate-400 mt-1">
                            Diese Vorgaben steuern die Vorstrukturierung von automatischen Entwürfen und Dokumentenvorlagen.
                        </p>
                    </div>
                </div>

                <!-- Betriebs- und Protokollparameter -->
                <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span class="text-base leading-none">⚙️</span>
                        <h2 class="text-sm font-bold text-slate-800">Betriebs- und Protokollparameter</h2>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
                            <input 
                                type="checkbox" 
                                bind:checked={data.enableAutoAudit}
                                class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div class="text-xs">
                                <span class="font-bold text-slate-800 block">Automatischer Audit-Trail</span>
                                <span class="text-slate-400 block">Jede Konfigurationsänderung protokollieren</span>
                            </div>
                        </label>

                        <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
                            <input 
                                type="checkbox" 
                                bind:checked={data.maintenanceMode}
                                class="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <div class="text-xs">
                                <span class="font-bold text-slate-800 block">Wartungs-Hinweis</span>
                                <span class="text-slate-400 block">Systemhinweis für Benutzer einblenden</span>
                            </div>
                        </label>
                    </div>
                </div>
            </form>
        </div>
    </main>

    <!-- Sticky Action Bar mit Touch-Fläche min 44px -->
    <StickyActionBar class="shadow-lg">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <button 
                type="button" 
                onclick={onCancel}
                disabled={isSubmitting}
                class="h-11 px-5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium active:scale-[0.98] disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs sm:text-sm"
            >
                <ArrowLeft class="w-4 h-4" />
                <span>Abbrechen</span>
            </button>

            <div class="flex flex-col sm:flex-row gap-2">
                <button 
                    type="button" 
                    onclick={handleSaveDraft}
                    disabled={isSubmitting || isSavingDraft}
                    class="h-11 px-5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-medium active:scale-[0.98] disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                >
                    <Save class="w-4 h-4" />
                    <span>Entwurf speichern</span>
                </button>

                <button 
                    type="button" 
                    onclick={handleFormSubmit}
                    disabled={isSubmitting}
                    class="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                >
                    {#if isSubmitting}
                        <svg class="animate-spin h-5 w-5 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Speichert...</span>
                    {:else}
                        <Check class="w-4 h-4" />
                        <span>Speichern & Ausführen</span>
                    {/if}
                </button>
            </div>
        </div>
    </StickyActionBar>
</div>
