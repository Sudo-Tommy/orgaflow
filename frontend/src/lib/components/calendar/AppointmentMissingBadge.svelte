<script lang="ts">
    import { AlertTriangle, X } from "lucide-svelte";
    import { getAppointmentMissingItems, type MissingAppointmentItem } from "$lib/services/appointmentStatusHelper";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { portal } from "$lib/actions/portal";

    interface Props {
        app: any;
        onOpenDetail?: (appId: string) => void;
    }

    let { app, onOpenDetail }: Props = $props();

    let missingItems = $derived<MissingAppointmentItem[]>(getAppointmentMissingItems(app));
    let isOpen = $state(false);
    let triggerEl = $state<HTMLElement | null>(null);
    let popoverPos = $state<{ top?: number; bottom?: number; left: number }>({ left: 16, top: 100 });

    function updatePosition() {
        if (!triggerEl || typeof window === "undefined") return;
        const rect = triggerEl.getBoundingClientRect();
        const menuWidth = 264;
        const estimatedHeight = 280;
        const margin = 12;

        const left = Math.max(margin, Math.min(rect.left, window.innerWidth - menuWidth - margin));
        const spaceBelow = window.innerHeight - rect.bottom - margin;
        const spaceAbove = rect.top - margin;

        if (spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove) {
            popoverPos = {
                top: Math.round(rect.bottom + 6),
                bottom: undefined,
                left: Math.round(left)
            };
        } else {
            popoverPos = {
                top: undefined,
                bottom: Math.round(window.innerHeight - rect.top + 6),
                left: Math.round(left)
            };
        }
    }

    function toggle(e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();
        if (!isOpen) {
            updatePosition();
            isOpen = true;
        } else {
            isOpen = false;
        }
    }

    function handleAction(e: MouseEvent) {
        e.stopPropagation();
        isOpen = false;
        if (onOpenDetail && app?.id) {
            onOpenDetail(app.id);
        }
    }

    function handleWindowScroll() {
        if (isOpen) isOpen = false;
    }

    function handleWindowResize() {
        if (isOpen) updatePosition();
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" && isOpen) isOpen = false;
    }
</script>

<svelte:window onscroll={handleWindowScroll} onresize={handleWindowResize} onkeydown={handleKeyDown} />

{#if missingItems.length > 0}
    <div class="relative inline-block" bind:this={triggerEl}>
        <!-- Badge Trigger als harmonisierte Kapsel -->
        <button
            type="button"
            onclick={toggle}
            class="orga-pill-action bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 cursor-pointer"
            title="Klicken, um fehlende Angaben anzuzeigen"
        >
            <AlertTriangle class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{missingItems.length} {missingItems.length === 1 ? 'Angabe fehlt' : 'Angaben fehlen'}</span>
        </button>
    </div>

    {#if isOpen}
        <!-- Transparenter Top-Layer Backdrop zum Schließen bei Klick außerhalb -->
        <div
            use:portal
            class="fixed inset-0 bg-transparent"
            onclick={(e) => { e.stopPropagation(); e.preventDefault(); isOpen = false; }}
            aria-hidden="true"
        ></div>

        <!-- Portaled Fixed Popover: immun gegen Container-Kanten (overflow-hidden) und immer im kompletten Vordergrund -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            use:portal
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            style="{popoverPos.top !== undefined ? `top: ${popoverPos.top}px;` : `bottom: ${popoverPos.bottom}px;`} left: {popoverPos.left}px;"
            class="fixed w-66 max-w-[calc(100vw-1.5rem)] p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-2xl text-left text-xs space-y-2 animate-enter ring-1 ring-black/5 dark:ring-white/10"
            role="dialog"
            aria-label="Fehlende Termindaten"
        >
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span class="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
                    <span>Fehlende Termindaten</span>
                </span>
                <button 
                    type="button" 
                    onclick={(e) => { e.stopPropagation(); isOpen = false; }} 
                    class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
                    title="Schließen"
                >
                    <X class="w-3.5 h-3.5" />
                </button>
            </div>

            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {rbacService.canAccessFinances
                    ? 'Damit dieser Termin abgeschlossen und abgerechnet werden kann, fehlen noch folgende Angaben:'
                    : 'Damit dieser Termin vollständig dokumentiert ist, fehlen noch folgende Angaben:'}
            </p>

            <ul class="space-y-1.5 pt-1">
                {#each missingItems as item (item.key)}
                    <li class="flex items-start gap-2 bg-amber-50/60 dark:bg-amber-950/30 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/50">
                        <span class="text-sm shrink-0 leading-none">{item.icon}</span>
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-[11px] text-slate-800 dark:text-slate-200">{item.label}</p>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{item.hint}</p>
                        </div>
                    </li>
                {/each}
            </ul>

            {#if onOpenDetail}
                <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onclick={handleAction}
                        class="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 min-h-[44px] cursor-pointer"
                    >
                        <span>Termindaten jetzt vervollständigen</span>
                    </button>
                </div>
            {/if}
        </div>
    {/if}
{/if}
