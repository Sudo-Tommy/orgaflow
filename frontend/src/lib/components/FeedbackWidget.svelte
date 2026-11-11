<!-- src/lib/components/FeedbackWidget.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import omniAvatar from '$lib/assets/omni_avatar.jfif';
    import FeedbackModal from '$lib/components/admin/FeedbackModal.svelte';
    import { createFeedbackButtonMover } from '$lib/services/feedbackButtonMover';
    import { setupFeedbackTopLayer } from '$lib/services/feedbackTopLayerCoordinator';
    import {
        recordButtonRect, activateShield, shouldShieldEvent,
        isPointInButtonArea, swallowEvent
    } from '$lib/services/feedbackEventShield';

    interface Props {
        isSuperuser?: boolean;
        apiEndpoint?: string;
    }

    let { isSuperuser = false, apiEndpoint = '/api/feedback' }: Props = $props();

    let floatBtn = $state<HTMLButtonElement | null>(null);
    let modalComp = $state<ReturnType<typeof FeedbackModal> | null>(null);
    let isDragging = $state(false);
    let isModalOpen = $state(false);
    let isDesktop = $state(false);

    const { drag, restore: restoreSavedPosition } = createFeedbackButtonMover(
        () => floatBtn,
        () => handleOpenOmni(),
        (v) => (isDragging = v)
    );

    function promoteToTop() {
        if (!isDesktop || !floatBtn || typeof floatBtn.showPopover !== 'function' || drag.isActive) return;
        try {
            floatBtn.hidePopover();
            floatBtn.showPopover();
        } catch {}
    }

    function isButtonCovered(): boolean {
        if (!isDesktop || !floatBtn || floatBtn.style.visibility === 'hidden') return false;
        const rect = floatBtn.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const leftHit = document.elementFromPoint(rect.left + 15, rect.top + rect.height / 2);
        return leftHit !== null && leftHit !== floatBtn && !floatBtn.contains(leftHit);
    }

    function syncTopLayer() {
        if (!isDesktop || !floatBtn || typeof floatBtn.showPopover !== 'function') return;
        if (hasActiveModal()) {
            floatBtn.style.setProperty('display', 'none', 'important');
            try { floatBtn.hidePopover(); } catch {}
            return;
        }
        floatBtn.style.removeProperty('display');
        try {
            if (!floatBtn.matches(':popover-open')) {
                floatBtn.showPopover();
            } else if (isButtonCovered()) {
                promoteToTop();
            }
        } catch {
            try { floatBtn.showPopover(); } catch {}
        }
    }

    function isEventOnButton(e: MouseEvent | PointerEvent): boolean {
        if (!isDesktop || !floatBtn || floatBtn.style.visibility === 'hidden') return false;
        const r = floatBtn.getBoundingClientRect();
        return r.width > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }

    function handleGlobalCapturePointer(e: PointerEvent) {
        if (!isDesktop) return;
        if (isEventOnButton(e) || isPointInButtonArea(e.clientX, e.clientY)) {
            promoteToTop();
            recordButtonRect(floatBtn?.getBoundingClientRect() ?? null);
            activateShield(800);
            swallowEvent(e);
            drag.start(e);
        }
    }

    function handleGlobalPointerMove(e: PointerEvent) {
        if (!isDesktop) return;
        if (drag.move(e)) {
            swallowEvent(e);
            return;
        }
        if (isPointInButtonArea(e.clientX, e.clientY, 80) && isButtonCovered()) {
            promoteToTop();
        }
    }

    function handleGlobalPointerUp(e: PointerEvent) {
        if (!isDesktop) return;
        if (drag.end(e) || shouldShieldEvent(e) || isPointInButtonArea(e.clientX, e.clientY)) {
            swallowEvent(e);
        }
    }

    function handleGlobalCaptureClick(e: MouseEvent) {
        if (!isDesktop) return;
        if (shouldShieldEvent(e) || isEventOnButton(e) || isPointInButtonArea(e.clientX, e.clientY)) {
            swallowEvent(e);
        }
    }

    function handleOpenOmni() {
        isModalOpen = true;
        modalComp?.open();
    }

    function handleModalClose() {
        isModalOpen = false;
        promoteToTop();
    }

    function hasActiveModal(): boolean {
        if (typeof document === 'undefined') return false;
        const openDialogs = document.querySelectorAll('dialog[open]');
        for (const d of openDialogs) {
            if (d.id === 'feedback-dialog' || d.id === 'omni-dialog') continue;
            return true;
        }
        return Boolean(document.querySelector('[data-hide-feedback="true"]'));
    }

    function updateWidgetVisibility() {
        if (!isDesktop || !floatBtn || drag.isActive) return;
        if (hasActiveModal()) {
            floatBtn.style.setProperty('display', 'none', 'important');
            try { floatBtn.hidePopover(); } catch {}
        } else {
            floatBtn.style.removeProperty('display');
            syncTopLayer();
        }
    }

    onMount(() => {
        const updateDesktopState = () => {
            isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
            if (isDesktop) syncTopLayer();
        };
        updateDesktopState();
        window.addEventListener('resize', updateDesktopState);

        const cleanupTopLayer = setupFeedbackTopLayer({
            getButton: () => floatBtn,
            isDragging: () => drag.isActive,
            isCovered: isButtonCovered,
            promoteToTop,
            syncTopLayer,
            updateVisibility: updateWidgetVisibility,
            restorePosition: restoreSavedPosition,
            recordRect: () => recordButtonRect(floatBtn?.getBoundingClientRect() ?? null),
            onPaste: () => {},
            onPointerDown: handleGlobalCapturePointer,
            onPointerMove: handleGlobalPointerMove,
            onPointerUp: handleGlobalPointerUp,
            onPointerCancel: drag.cancel,
            onClick: handleGlobalCaptureClick
        });

        return () => {
            window.removeEventListener('resize', updateDesktopState);
            cleanupTopLayer?.();
        };
    });
</script>

{#if isDesktop}
    <button
        bind:this={floatBtn}
        popover="manual"
        id="feedback-widget-button"
        type="button"
        data-dragging={isDragging ? 'true' : undefined}
        data-minimized={isModalOpen ? 'true' : undefined}
        class="fixed hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-full shadow-2xl min-w-[48px] min-h-[48px] select-none touch-none transition-all active:scale-95 cursor-pointer pointer-events-auto touch-manipulation"
        onclick={handleOpenOmni}
        oncontextmenu={(e) => e.preventDefault()}
        title="Hilfe & Support mit Omni (gedrückt halten zum Verschieben)"
    >
        {#if isModalOpen}
            <div class="w-3 h-3 rounded-full bg-indigo-500/80 animate-pulse"></div>
        {:else}
            <div class="relative flex items-center justify-center shrink-0">
                <img src={omniAvatar} alt="Omni" class="w-5 h-5 rounded-full object-cover border border-indigo-400" />
                <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                </span>
            </div>
            <span class="text-sm font-semibold tracking-wide whitespace-nowrap">Hilfe</span>
        {/if}
    </button>
{/if}

<FeedbackModal bind:this={modalComp} onClose={handleModalClose} />

<style>
    :global(#feedback-widget-button),
    :global(#feedback-widget-button[popover]) {
        display: none !important;
    }
    @media (min-width: 768px) {
        :global(#feedback-widget-button),
        :global(#feedback-widget-button[popover]) {
            display: flex !important;
            position: fixed !important;
            inset: unset !important;
            margin: 0 !important;
            left: auto !important;
            top: auto !important;
            right: 1.5rem !important;
            bottom: 1.5rem !important;
            border: 1px solid rgba(51, 65, 85, 0.8) !important;
            background: rgba(15, 23, 42, 0.95) !important;
            color: white !important;
            overflow: visible !important;
            z-index: 9998 !important;
            pointer-events: auto !important;
            -webkit-touch-callout: none;
        }
    }
    :global(#feedback-widget-button[data-minimized="true"]) {
        min-width: 24px !important; min-height: 24px !important; padding: 6px !important; opacity: 0.35 !important;
        pointer-events: none !important; box-shadow: none !important; border-color: rgba(148, 163, 184, 0.3) !important;
    }
    :global(#feedback-widget-button[data-custom-pos]) {
        left: var(--fb-x) !important; top: var(--fb-y) !important; right: auto !important; bottom: auto !important;
    }
    :global(#feedback-widget-button[data-dragging]) {
        transition: transform 150ms ease, box-shadow 150ms ease !important;
        transform: scale(1.1) !important; cursor: grabbing !important;
        border-color: rgba(139, 92, 246, 0.9) !important;
        box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.35), 0 20px 40px rgba(0, 0, 0, 0.45) !important;
    }
    :global(#feedback-widget-button::backdrop) { display: none !important; background: transparent !important; pointer-events: none !important; }
</style>
