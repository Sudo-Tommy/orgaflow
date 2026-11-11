<script lang="ts">
    import { ChevronDown, Upload, Trash2 } from 'lucide-svelte';
    import type { QuickLetterCompany } from './quickLetterTypes';

    interface Props {
        currentCompany: QuickLetterCompany | null;
        availableCompanies: QuickLetterCompany[];
        selectedCompanyId: string;
        effectiveLogoUrl: string | null;
        customImageUrl: string | null;
        logoScalePercent: number;
        logoBoxW: number;
        logoBoxH: number;
        letterDate: string;
        reference: string;
        onUploadCustomImage: (e: Event) => void;
        onRemoveCustomImage: () => void;
        onScaleChange: () => void;
    }

    let {
        currentCompany,
        availableCompanies,
        selectedCompanyId = $bindable(),
        effectiveLogoUrl,
        customImageUrl,
        logoScalePercent = $bindable(),
        logoBoxW,
        logoBoxH,
        letterDate = $bindable(),
        reference = $bindable(),
        onUploadCustomImage,
        onRemoveCustomImage,
        onScaleChange
    }: Props = $props();

    let fileInputEl: HTMLInputElement | undefined = $state();

    // Alphabetisch sortierte Firmenliste nach deutschem Locale
    let sortedCompanies = $derived(
        [...availableCompanies].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' }))
    );
</script>

<div class="bg-neutral-800/80 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-sm">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold">2</div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-200">Absender, Logo & Datum</h3>
        </div>
        {#if effectiveLogoUrl}
            <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span>✓</span>
                <span>Feld angepasst ({logoBoxW} × {logoBoxH} px)</span>
            </span>
        {:else}
            <span class="text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                Text-Modus ({logoBoxW} × {logoBoxH} px)
            </span>
        {/if}
    </div>

    <!-- Logo & Firma Info -->
    <div class="space-y-2.5 p-3 bg-neutral-900/90 rounded-xl border border-white/10">
        <div class="flex items-center gap-3">
            {#if effectiveLogoUrl}
                <img
                    src={effectiveLogoUrl}
                    alt="Firmenlogo"
                    class="w-12 h-10 object-contain rounded-lg bg-white p-1 shrink-0 shadow-xs"
                />
            {:else}
                <div class="w-12 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 text-center font-bold shrink-0">
                    Logo
                </div>
            {/if}

            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                    <p class="text-xs font-bold text-white truncate">{currentCompany?.name || 'Seniorenassistenz'}</p>
                    {#if customImageUrl}
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30">Eigenes Bild</span>
                    {/if}
                </div>
                <p class="text-[11px] text-neutral-400 truncate mt-0.5">
                    {currentCompany?.street || ''} {currentCompany?.housenr || ''} • {currentCompany?.zip || ''} {currentCompany?.city || ''}
                </p>
            </div>

            {#if sortedCompanies.length > 1 && !customImageUrl}
                <div class="relative shrink-0">
                    <select
                        bind:value={selectedCompanyId}
                        class="bg-neutral-800 border border-neutral-700/80 text-neutral-200 text-xs font-semibold rounded-xl pl-3 pr-8 py-1.5 outline-none appearance-none cursor-pointer"
                    >
                        {#each sortedCompanies as comp}
                            <option value={comp.id}>{comp.name}</option>
                        {/each}
                    </select>
                    <ChevronDown class="w-3.5 h-3.5 text-neutral-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
            {/if}
        </div>

        <!-- Steuerung: Skalierung & Bild laden -->
        <div class="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 flex-1 min-w-[200px]">
                <span class="text-[11px] text-neutral-400 font-medium whitespace-nowrap">Größe:</span>
                <button
                    type="button"
                    onclick={() => { logoScalePercent = Math.max(40, logoScalePercent - 10); onScaleChange(); }}
                    class="w-6 h-6 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold cursor-pointer transition-all"
                    title="Kleiner"
                >-</button>
                <input
                    type="range"
                    min="40"
                    max="180"
                    step="5"
                    bind:value={logoScalePercent}
                    oninput={onScaleChange}
                    class="flex-1 accent-sky-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <button
                    type="button"
                    onclick={() => { logoScalePercent = Math.min(180, logoScalePercent + 10); onScaleChange(); }}
                    class="w-6 h-6 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold cursor-pointer transition-all"
                    title="Größer"
                >+</button>
                <button
                    type="button"
                    onclick={() => { logoScalePercent = 100; onScaleChange(); }}
                    class="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-mono text-[10px] text-neutral-300 hover:text-white cursor-pointer"
                    title="100%"
                >{logoScalePercent}%</button>
            </div>

            <div class="flex items-center gap-1.5">
                <input
                    type="file"
                    accept="image/*"
                    bind:this={fileInputEl}
                    onchange={onUploadCustomImage}
                    class="hidden"
                    id="custom-logo-upload-input"
                />
                <label
                    for="custom-logo-upload-input"
                    class="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                    <Upload class="w-3 h-3 text-sky-400" />
                    <span>Bild laden</span>
                </label>

                {#if customImageUrl}
                    <button
                        type="button"
                        onclick={onRemoveCustomImage}
                        class="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] cursor-pointer"
                        title="Eigenes Bild entfernen"
                    >
                        <Trash2 class="w-3 h-3" />
                    </button>
                {/if}
            </div>
        </div>
    </div>

    <!-- Datum & Aktenzeichen -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
            <label for="date-input" class="block text-xs font-semibold text-neutral-300 mb-1">Briefdatum (DIN 5008):</label>
            <input
                id="date-input"
                type="date"
                bind:value={letterDate}
                class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none"
            />
        </div>
        <div>
            <label for="ref-input" class="block text-xs font-semibold text-neutral-300 mb-1">Ihr Zeichen / Aktenzeichen:</label>
            <input
                id="ref-input"
                type="text"
                bind:value={reference}
                placeholder="z. B. 123/2026 SGB XI"
                class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
            />
        </div>
    </div>
</div>
