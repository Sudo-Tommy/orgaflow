<script lang="ts">
    import type { ClientRecord, ClientBillingType } from '$lib/types/orgaTypes';
    import { 
        BILLING_TYPE_OPTIONS, 
        getBillingTypeDef, 
        saveClientBillingType 
    } from '$lib/services/clientBillingService';
    import { ChevronDown, Check, AlertCircle, Receipt } from 'lucide-svelte';
    import { portal } from '$lib/actions/portal';

    let { 
        client, 
        compact = false,
        readonly = false,
        onchange
    }: { 
        client?: ClientRecord | any; 
        compact?: boolean;
        readonly?: boolean;
        onchange?: (newType: ClientBillingType) => void;
    } = $props();

    let isOpen = $state(false);
    let isSaving = $state(false);
    let triggerEl: HTMLElement | null = $state(null);
    let dropdownPos = $state<{ top?: number; bottom?: number; left: number; maxHeight?: number }>({ left: 16 });

    let currentDef = $derived(getBillingTypeDef(client?.billing_type));

    function updatePosition() {
        if (!triggerEl) return;
        const rect = triggerEl.getBoundingClientRect();
        const menuWidth = 288; // w-72 (18rem)
        const estimatedHeight = 330;
        const margin = 8;

        // Keep horizontally within viewport with safe margins
        const left = Math.max(margin, Math.min(rect.left, window.innerWidth - menuWidth - margin));

        const spaceBelow = window.innerHeight - rect.bottom - margin;
        const spaceAbove = rect.top - margin;

        if (spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove) {
            // Open downward
            const top = Math.round(rect.bottom + 6);
            const maxHeight = Math.round(Math.max(160, window.innerHeight - top - margin));
            dropdownPos = {
                top,
                bottom: undefined,
                left: Math.round(left),
                maxHeight
            };
        } else {
            // Open upward
            const bottom = Math.round(window.innerHeight - rect.top + 6);
            const maxHeight = Math.round(Math.max(160, rect.top - margin));
            dropdownPos = {
                top: undefined,
                bottom,
                left: Math.round(left),
                maxHeight
            };
        }
    }

    function toggleDropdown(e: MouseEvent) {
        if (readonly || isSaving) return;
        e.stopPropagation();
        e.preventDefault();
        if (!isOpen) {
            updatePosition();
            isOpen = true;
        } else {
            isOpen = false;
        }
    }

    async function selectType(typeId: ClientBillingType, e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();
        if (typeId === client?.billing_type) {
            isOpen = false;
            return;
        }

        isSaving = true;
        isOpen = false;

        // Kostenträger-Regel: Bei Privatzahler 19% MwSt., bei Kasse 0%
        const targetDef = getBillingTypeDef(typeId);
        const shouldUpdateTax = targetDef ? client.tax_rate !== targetDef.defaultTaxRate : false;

        const success = await saveClientBillingType(client, typeId, { 
            syncTemplate: true, 
            updateRates: shouldUpdateTax 
        });

        isSaving = false;
        if (success && onchange) {
            onchange(typeId);
        }
    }

    function handleWindowScroll() {
        if (isOpen) {
            isOpen = false;
        }
    }

    function handleWindowResize() {
        if (isOpen) {
            updatePosition();
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isOpen) {
            isOpen = false;
        }
    }
</script>

<svelte:window onscroll={handleWindowScroll} onresize={handleWindowResize} onkeydown={handleKeyDown} />

<div class="relative inline-block text-left" bind:this={triggerEl}>
    {#if currentDef}
        <button
            type="button"
            onclick={toggleDropdown}
            disabled={readonly || isSaving}
            class="inline-flex items-center gap-1.5 font-bold rounded-full border transition-all shadow-2xs select-none {currentDef.badgeClass} {compact ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'} {readonly ? 'cursor-default' : 'cursor-pointer hover:shadow-xs active:scale-95'}"
            title={readonly ? currentDef.description : 'Klicken, um Abrechnungsart direkt zu ändern'}
        >
            <span class="w-1.5 h-1.5 rounded-full shrink-0 {currentDef.payerType === 'privat' ? 'bg-emerald-500' : 'bg-indigo-500'}"></span>
            <span class="truncate">{compact ? currentDef.shortLabel : currentDef.label}</span>
            {#if !readonly}
                <ChevronDown class="w-3 h-3 opacity-60 transition-transform shrink-0 {isOpen ? 'rotate-180' : ''}" />
            {/if}
        </button>
    {:else}
        <!-- Unbelegt: Aufforderungs-Kapsel -->
        <button
            type="button"
            onclick={toggleDropdown}
            disabled={readonly || isSaving}
            class="inline-flex items-center gap-1 font-bold rounded-full border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 transition-all shadow-2xs select-none {compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'} {readonly ? 'cursor-default' : 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95'}"
            title="Abrechnungsart ist noch nicht hinterlegt. Klicken zum Festlegen."
        >
            <AlertCircle class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span class="truncate">{compact ? 'Art festlegen' : 'Abrechnungsart festlegen'}</span>
            {#if !readonly}
                <ChevronDown class="w-3 h-3 opacity-60 transition-transform shrink-0 {isOpen ? 'rotate-180' : ''}" />
            {/if}
        </button>
    {/if}
</div>

{#if isOpen && !readonly}
    <!-- Fixed Backdrop to close on click outside, isolated from table row clicks -->
    <div 
        use:portal
        class="fixed inset-0 z-[99998] bg-transparent"
        onclick={(e) => { e.stopPropagation(); e.preventDefault(); isOpen = false; }}
        aria-hidden="true"
    ></div>

    <!-- Fixed Popover teleports to body, completely immune to parent transforms, overflow-hidden and table stacking contexts -->
    <div 
        use:portal
        style="{dropdownPos.top !== undefined ? `top: ${dropdownPos.top}px;` : `bottom: ${dropdownPos.bottom}px;`} left: {dropdownPos.left}px; {dropdownPos.maxHeight ? `max-height: ${dropdownPos.maxHeight}px;` : ''}"
        class="fixed z-[99999] w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-neutral-200 dark:border-slate-800 p-1.5 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10 dark:ring-white/10 flex flex-col"
        role="menu"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
    >
        <div class="px-2.5 py-1.5 border-b border-neutral-100 dark:border-slate-800 mb-1 shrink-0">
            <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400 flex items-center gap-1">
                <Receipt class="w-3 h-3" /> Standard-Abrechnungsart
            </p>
            <p class="text-[11px] text-neutral-500 dark:text-slate-400">Gilt für neue Termine & Rechnungen</p>
        </div>

        <!-- Alphabetisch sortierte Optionen nach alphabetical-select.md -->
        <div class="space-y-0.5 overflow-y-auto custom-scrollbar flex-1">
            {#each BILLING_TYPE_OPTIONS as opt (opt.id)}
                {@const isSelected = client?.billing_type === opt.id}
                <button
                    type="button"
                    onclick={(e) => selectType(opt.id, e)}
                    class="w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-start justify-between gap-2 cursor-pointer {isSelected ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold' : 'hover:bg-neutral-50 dark:hover:bg-slate-800/80 text-neutral-700 dark:text-slate-300'}"
                    role="menuitem"
                >
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs font-bold leading-tight">{opt.label}</span>
                        </div>
                        <p class="text-[10px] text-neutral-400 dark:text-slate-400 leading-normal mt-0.5">
                            {opt.description}
                        </p>
                    </div>
                    {#if isSelected}
                        <Check class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    {/if}
                </button>
            {/each}
        </div>
    </div>
{/if}
