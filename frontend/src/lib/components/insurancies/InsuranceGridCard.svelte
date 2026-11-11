<script lang="ts">
    import { MapPin, Phone, Mail, Users, Copy, Check, ExternalLink, Trash2, Edit3 } from "lucide-svelte";
    import { getTypeBadgeClass, getTypeIconStyle, copyToClipboard } from "./insuranceHelper";

    let {
        ins,
        clientCount,
        copiedId,
        onOpenDetail,
        onOpenClients,
        onDelete,
        onCopy
    } = $props<{
        ins: any;
        clientCount: number;
        copiedId: string | null;
        onOpenDetail: () => void;
        onOpenClients: (e: Event) => void;
        onDelete: (e: Event) => void;
        onCopy: (text: string, label: string, e: Event) => void;
    }>();

    let iconStyle = $derived(getTypeIconStyle(ins.type));
    let badgeClass = $derived(getTypeBadgeClass(ins.type));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    onclick={onOpenDetail}
    class="orga-card-white p-5 flex flex-col group cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700/70 hover:shadow-md transition-all relative"
    role="button"
    tabindex="0"
>
    <!-- Header mit Icon & Typ Badge -->
    <div class="flex items-start justify-between gap-3 mb-3">
        <div class="w-11 h-11 rounded-2xl {iconStyle.bg} {iconStyle.text} border flex items-center justify-center text-xl shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
            🛡️
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border {badgeClass} shrink-0">
            {ins.type || 'GKV'}
        </span>
    </div>

    <!-- Titel & Abteilung -->
    <div class="mb-3 min-w-0">
        <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={ins.name}>
            {ins.name || 'Unbenannte Kasse'}
        </h2>
        {#if ins.addition}
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={ins.addition}>
                {ins.addition}
            </p>
        {:else}
            <p class="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">Zentrale</p>
        {/if}
    </div>

    <!-- Anschrift mit Maps Link -->
    {#if ins.street || ins.city}
        <div class="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <MapPin class="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div class="min-w-0 flex-1">
                {#if ins.street}<p class="truncate">{ins.street}</p>{/if}
                <p class="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                    {ins.zip || ''} {ins.city || ''}
                </p>
            </div>
            <a
                href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${ins.name || ''}, ${ins.street || ''}, ${ins.zip || ''} ${ins.city || ''}`)}"
                target="_blank"
                rel="noopener noreferrer"
                onclick={(e) => e.stopPropagation()}
                class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Auf Google Maps öffnen"
            >
                <ExternalLink class="w-3.5 h-3.5" />
            </a>
        </div>
    {/if}

    <!-- Kontaktdaten -->
    <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4 mt-auto">
        {#if ins.phone}
            <div class="flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40 min-h-[40px]">
                <a
                    href="tel:{ins.phone}"
                    onclick={(e) => e.stopPropagation()}
                    class="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline truncate font-medium"
                >
                    <Phone class="w-3.5 h-3.5 shrink-0" />
                    <span class="truncate">{ins.phone}</span>
                </a>
                <button
                    type="button"
                    onclick={(e) => onCopy(ins.phone, "Telefonnummer", e)}
                    class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 shrink-0 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Telefon kopieren"
                >
                    {#if copiedId === ins.phone}
                        <Check class="w-3 h-3 text-emerald-500" />
                    {:else}
                        <Copy class="w-3 h-3" />
                    {/if}
                </button>
            </div>
        {/if}

        {#if ins.email}
            <div class="flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40 min-h-[40px]">
                <a
                    href="mailto:{ins.email}"
                    onclick={(e) => e.stopPropagation()}
                    class="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 hover:underline truncate font-medium"
                >
                    <Mail class="w-3.5 h-3.5 shrink-0" />
                    <span class="truncate">{ins.email}</span>
                </a>
                <button
                    type="button"
                    onclick={(e) => onCopy(ins.email, "E-Mail-Adresse", e)}
                    class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 shrink-0 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="E-Mail kopieren"
                >
                    {#if copiedId === ins.email}
                        <Check class="w-3 h-3 text-emerald-500" />
                    {:else}
                        <Copy class="w-3 h-3" />
                    {/if}
                </button>
            </div>
        {/if}

        {#if !ins.phone && !ins.email}
            <p class="text-[11px] text-slate-400 dark:text-slate-500 italic py-1">Keine Kontaktdaten hinterlegt</p>
        {/if}
    </div>

    <!-- Footer: Klienten-Badge & Schnellaktionen -->
    <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        {#if clientCount > 0}
            <button
                type="button"
                onclick={onOpenClients}
                class="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 px-2.5 py-1 rounded-lg border border-teal-200/60 dark:border-teal-800/60 transition-colors cursor-pointer min-h-[36px]"
                title="Versicherte Klienten anzeigen"
            >
                <Users class="w-3.5 h-3.5" />
                <span>{clientCount} {clientCount === 1 ? 'Klient' : 'Klienten'}</span>
            </button>
        {:else}
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                0 Klienten
            </span>
        {/if}

        <div class="flex items-center gap-1">
            <button
                type="button"
                onclick={onDelete}
                class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Krankenkasse löschen"
            >
                <Trash2 class="w-4 h-4" />
            </button>
            <button
                type="button"
                onclick={onOpenDetail}
                class="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Bearbeiten"
            >
                <Edit3 class="w-4 h-4" />
            </button>
        </div>
    </div>
</div>
