<!-- src/lib/components/admin/FeedbackModal.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { X, Minus, Maximize2, GripVertical, Trash2 } from 'lucide-svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { bringElementToFront } from '$lib/services/layerStackService';
    import { liveSessionStore } from '$lib/services/aiLiveSupportService';
    import AiLiveSupportChat from '$lib/components/support/AiLiveSupportChat.svelte';
    import omniAvatar from '$lib/assets/omni_avatar.jfif';

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    let isOpen = $state(false);
    let isMinimized = $state(false);
    let isDesktop = $state(false);
    let isDragging = $state(false);
    let windowRef = $state<HTMLDivElement | null>(null);
    let aiChatComp = $state<ReturnType<typeof AiLiveSupportChat> | null>(null);
    let pos = $state<{ x: number; y: number }>({ x: 100, y: 100 });

    const isDev = $derived(rbacService.isDeveloper);

    export function open() {
        isOpen = true;
        isMinimized = false;
        ensurePositionInBounds();
        requestAnimationFrame(() => bringElementToFront(windowRef));
    }

    export function close() {
        isOpen = false;
        isMinimized = false;
        onClose();
    }

    async function handleClearChat() {
        const ok = await confirmStore.ask(
            'Möchtest du deinen bisherigen Chatverlauf mit Omni wirklich vollständig leeren?',
            'Chatverlauf leeren',
            'Ja, leeren',
            'Abbrechen',
            true
        );
        if (ok) {
            await aiChatComp?.clearChat();
        }
    }

    function ensurePositionInBounds() {
        if (typeof window === 'undefined') return;
        const width = windowRef?.offsetWidth || 480;
        const height = windowRef?.offsetHeight || 620;
        const maxX = Math.max(16, window.innerWidth - width - 16);
        const maxY = Math.max(16, window.innerHeight - height - 16);

        try {
            const saved = localStorage.getItem('orgaflow_omni_pos');
            if (saved) {
                const parsed = JSON.parse(saved);
                pos = {
                    x: Math.max(16, Math.min(maxX, parsed.x || maxX)),
                    y: Math.max(16, Math.min(maxY, parsed.y || maxY))
                };
                return;
            }
        } catch {}
        pos = { x: maxX, y: maxY };
    }

    function startDrag(e: PointerEvent) {
        if (!isDesktop) return;
        e.preventDefault();
        isDragging = true;
        const startPointerX = e.clientX;
        const startPointerY = e.clientY;
        const startX = pos.x;
        const startY = pos.y;
        const width = windowRef?.offsetWidth || 480;

        const onPointerMove = (ev: PointerEvent) => {
            const maxX = Math.max(8, window.innerWidth - width - 8);
            const maxY = Math.max(8, window.innerHeight - 60);
            pos = {
                x: Math.max(8, Math.min(maxX, startX + (ev.clientX - startPointerX))),
                y: Math.max(8, Math.min(maxY, startY + (ev.clientY - startPointerY)))
            };
        };

        const onPointerUp = () => {
            isDragging = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            try { localStorage.setItem('orgaflow_omni_pos', JSON.stringify(pos)); } catch {}
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    function handleGlobalPaste(e: ClipboardEvent) {
        if (!isOpen || isMinimized) return;
        aiChatComp?.handleExternalPaste(e);
    }

    onMount(() => {
        const updateDesktop = () => {
            isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
            ensurePositionInBounds();
        };
        updateDesktop();
        window.addEventListener('resize', updateDesktop);
        window.addEventListener('paste', handleGlobalPaste);

        return () => {
            window.removeEventListener('resize', updateDesktop);
            window.removeEventListener('paste', handleGlobalPaste);
        };
    });
</script>

{#if isOpen}
    {#if isDesktop}
        {#if isMinimized}
            <button
                type="button"
                onclick={() => (isMinimized = false)}
                class="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900 dark:bg-indigo-600 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-700 dark:border-indigo-400"
                title="Omni-Support wieder öffnen"
            >
                <img src={omniAvatar} alt="Omni" class="w-6 h-6 rounded-full object-cover border border-white/50" />
                <span class="text-xs font-bold">Omni · Live aktiv</span>
                <Maximize2 class="w-3.5 h-3.5 text-indigo-200" />
            </button>
        {:else}
            <div
                bind:this={windowRef}
                data-layer-window="omni"
                style="left: {pos.x}px; top: {pos.y}px;"
                class="fixed z-[9999] w-[460px] sm:w-[480px] h-[640px] max-w-[95vw] max-h-[95vh] min-w-[380px] min-h-[460px] resize overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 select-none animate-enter"
            >
                <div class="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center gap-2 rounded-t-3xl">
                    <div class="flex items-center gap-2 min-w-0">
                        <button
                            type="button"
                            onpointerdown={startDrag}
                            class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors {isDragging ? 'cursor-grabbing' : 'cursor-grab'} shrink-0"
                            title="Gedrückt halten zum Verschieben"
                        >
                            <GripVertical class="w-4 h-4" />
                        </button>
                        <img src={omniAvatar} alt="Omni" class="w-9 h-9 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shrink-0 shadow-xs" />
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <h2 class="text-sm font-black text-slate-900 dark:text-white tracking-tight">Omni</h2>
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black {$liveSessionStore.connected ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}">
                                    <span class="w-1.5 h-1.5 rounded-full {$liveSessionStore.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}"></span>
                                    <span>{$liveSessionStore.connected ? 'Live' : $liveSessionStore.connecting ? 'Verbinde...' : 'Bereit'}</span>
                                </span>
                                {#if isDev}
                                    <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 truncate max-w-[165px]" title={$liveSessionStore.model}>
                                        {$liveSessionStore.modelLabel}
                                    </span>
                                {/if}
                            </div>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">OrgaFlow Live-Support</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" onclick={handleClearChat} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer" title="Chatverlauf leeren">
                            <Trash2 class="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onclick={() => (isMinimized = true)} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer" title="Minimieren">
                            <Minus class="w-4 h-4" />
                        </button>
                        <button type="button" onclick={close} class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer" title="Schließen">
                            <X class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div class="p-3 sm:p-4 flex-1 flex flex-col min-h-0 overflow-hidden select-text">
                    <AiLiveSupportChat bind:this={aiChatComp} contextData={{ route: $page.url.pathname, url: $page.url.href }} onClose={close} />
                </div>
            </div>
        {/if}
    {:else}
        <div bind:this={windowRef} data-layer-window="omni" class="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end">
            <div class="w-full h-[92vh] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 animate-in slide-in-from-bottom">
                <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 flex justify-between items-center rounded-t-3xl bg-white/95 dark:bg-slate-900/95">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <img src={omniAvatar} alt="Omni" class="w-9 h-9 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shrink-0" />
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <h2 class="text-sm font-black text-slate-900 dark:text-white">Omni</h2>
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black {$liveSessionStore.connected ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'}">
                                    <span class="w-1.5 h-1.5 rounded-full {$liveSessionStore.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}"></span>
                                    <span>Live</span>
                                </span>
                                {#if isDev}
                                    <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 truncate max-w-[130px]">
                                        {$liveSessionStore.modelLabel}
                                    </span>
                                {/if}
                            </div>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Live-Support</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button type="button" onclick={handleClearChat} class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center cursor-pointer" title="Chatverlauf leeren">
                            <Trash2 class="w-4 h-4" />
                        </button>
                        <button type="button" onclick={close} class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer" title="Schließen">
                            <X class="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div class="p-3 sm:p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                    <AiLiveSupportChat bind:this={aiChatComp} contextData={{ route: $page.url.pathname, url: $page.url.href }} onClose={close} />
                </div>
            </div>
        </div>
    {/if}
{/if}
