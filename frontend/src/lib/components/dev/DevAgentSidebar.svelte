<script lang="ts">
    import { page } from '$app/stores';
    import { devAgentState } from '$lib/services/devAgentState.svelte';
    import DevAgentConsoleErrorBanner from './DevAgentConsoleErrorBanner.svelte';
    import DevAgentMessages from './DevAgentMessages.svelte';
    import DevAgentInput from './DevAgentInput.svelte';
    import { Sparkles, ChevronRight } from 'lucide-svelte';

    let isLandingPage = $derived($page.url.pathname === '/');
</script>

{#if !isLandingPage}
    <!-- Schwebende Lasche am rechten Bildschirmrand -->
    {#if !devAgentState.isOpen}
        <div class="fixed right-0 top-1/2 -translate-y-1/2 z-50">
            <button
                id="antigravity-dev-toggle-btn"
                type="button"
                onclick={() => devAgentState.isOpen = true}
                class="group flex items-center gap-1.5 py-2 px-2.5 rounded-l-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl hover:pl-3.5 transition-all duration-200 border-y border-l border-violet-400/30"
                title="Antigravity Entwickler-Assistent öffnen"
            >
                <Sparkles class="w-4 h-4 text-violet-200 group-hover:rotate-12 transition-transform" />
                <span class="text-xs font-semibold tracking-wide hidden sm:inline">Antigravity</span>
                {#if devAgentState.recentError}
                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                {/if}
            </button>
        </div>
    {/if}

    <!-- Einklappbare Seitenleiste -->
    {#if devAgentState.isOpen}
        <!-- Backdrop auf kleinen Mobilgeräten -->
        <div 
            role="presentation"
            onclick={() => devAgentState.isOpen = false}
            onkeydown={(e) => { if (e.key === 'Escape') devAgentState.isOpen = false; }}
            class="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 sm:hidden"
        ></div>

        <aside 
            id="antigravity-dev-sidebar"
            aria-label="Antigravity Entwickler-Assistent"
            class="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        >
            <!-- Kopfzeile -->
            <div class="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                        <Sparkles class="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <span>Antigravity Dev</span>
                            <span class="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase {devAgentState.isLoading ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}">
                                {devAgentState.isLoading ? 'Aktiv...' : 'Bereit'}
                            </span>
                        </h3>
                        <p class="text-[10px] text-slate-400">Live-Coding & HMR Assistant</p>
                    </div>
                </div>

                <div class="flex items-center gap-1">
                    <button
                        type="button"
                        onclick={() => devAgentState.isOpen = false}
                        class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Minimieren"
                    >
                        <ChevronRight class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <!-- Inhaltsbereich -->
            <div class="flex-1 overflow-y-auto p-3 custom-scrollbar flex flex-col justify-between">
                <div>
                    <DevAgentConsoleErrorBanner />
                    <DevAgentMessages />
                </div>
            </div>

            <!-- Eingabebereich -->
            <div class="p-3 bg-slate-50/30 dark:bg-slate-950/30">
                <DevAgentInput />
            </div>
        </aside>
    {/if}
{/if}

<style>
    :global(body:has(#antigravity-dev-sidebar) #feedback-widget-button) {
        opacity: 0 !important;
        pointer-events: none !important;
        transform: scale(0.8) !important;
        transition: opacity 0.2s ease, transform 0.2s ease !important;
    }
</style>
