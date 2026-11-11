<script lang="ts">
    import { Monitor, Layers, Clock, User, ChevronRight } from "lucide-svelte";
    import {
        parseAnnotations,
        getScreenshotUrl,
        getStatusBadgeClasses,
        getStatusLabel,
        getCategoryBadgeClasses,
        formatDate
    } from "./supportTicketUtils";

    interface Props {
        ticket: any;
        onSelect: (ticket: any) => void;
    }

    let { ticket, onSelect }: Props = $props();

    let arrows = $derived(parseAnnotations(ticket.annotations_data));
    let screenshotUrl = $derived(getScreenshotUrl(ticket));
</script>

<div
    class="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all flex flex-col overflow-hidden group cursor-pointer"
    onclick={() => onSelect(ticket)}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && onSelect(ticket)}
>
    <!-- Screenshot Preview -->
    <div class="relative aspect-video w-full bg-slate-950 overflow-hidden border-b border-slate-100 dark:border-slate-800 flex items-center justify-center">
        {#if screenshotUrl}
            <img
                src={screenshotUrl}
                alt="Screenshot {ticket.id}"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
            />
        {:else}
            <div class="text-slate-500 text-xs flex flex-col items-center gap-1.5">
                <Monitor class="w-6 h-6 opacity-40" />
                <span>Kein Screenshot vorhanden</span>
            </div>
        {/if}

        <!-- Overlay Badges -->
        <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs {getStatusBadgeClasses(ticket.status)}">
                {getStatusLabel(ticket.status)}
            </span>
            {#if arrows.length > 0}
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/85 backdrop-blur-xs text-white border border-slate-700/80 shadow-xs flex items-center gap-1">
                    <Layers class="w-2.5 h-2.5 text-rose-400" />
                    <span>{arrows.length} Pfeil{arrows.length === 1 ? "" : "e"}</span>
                </span>
            {/if}
        </div>

        <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/60 backdrop-blur-xs text-white">
            {ticket.resolution || "–"}
        </div>
    </div>

    <!-- Card Body -->
    <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div class="space-y-2">
            <!-- Kategorie -->
            <div class="flex items-center justify-between gap-2">
                <span class="px-2.5 py-0.5 rounded-md text-xs font-bold border truncate {getCategoryBadgeClasses(ticket.category)}">
                    {ticket.category || "Ohne Kategorie"}
                </span>
                <span class="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {formatDate(ticket.created)}
                </span>
            </div>

            <!-- Kommentar Preview -->
            <p class="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-3 leading-relaxed">
                {ticket.comment || "Keine Textbeschreibung vorhanden."}
            </p>
        </div>

        <!-- Card Footer Info -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <!-- User / Gast -->
            <div class="flex items-center gap-1.5 truncate mr-2">
                <User class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span class="truncate">
                    {#if ticket.expand?.user}
                        {ticket.expand.user.name_first || ""} {ticket.expand.user.name_last || ticket.expand.user.username || "Benutzer"}
                    {:else}
                        Gast / Nicht eingeloggt
                    {/if}
                </span>
            </div>

            <!-- Link zur Route -->
            <div class="flex items-center gap-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform">
                <span class="truncate max-w-[110px]">{ticket.url ? new URL(ticket.url, 'http://localhost').pathname : '/'}</span>
                <ChevronRight class="w-3.5 h-3.5" />
            </div>
        </div>
    </div>
</div>
