<script lang="ts">
    import { triggerHaptic } from "$lib/services/hapticFeedback";

    let { app, onOpenGoogleDetail }: { app: any; onOpenGoogleDetail: (app: any) => void } = $props();
</script>

<div 
    role="button"
    tabindex="0"
    onclick={() => { triggerHaptic('tap'); onOpenGoogleDetail(app); }}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenGoogleDetail(app); } }}
    class="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-2.5 text-left w-full cursor-pointer hover:border-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation active:scale-[0.99]"
>
    <div class="flex items-start justify-between gap-2">
        <div>
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                    📅 {app.appointment ? new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--'} Uhr
                </span>
            </div>
            <p class="text-sm font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                {app.title || app.description || 'Google-Termin'}
            </p>
        </div>
    </div>
    <div class="flex items-center gap-2 pt-2 border-t border-blue-100/60 dark:border-blue-900/40">
        <button 
            type="button" 
            onclick={(e) => { e.stopPropagation(); triggerHaptic('tap'); onOpenGoogleDetail(app); }}
            class="flex-1 py-2 px-3 bg-blue-100/70 hover:bg-blue-200 text-blue-800 dark:text-blue-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer touch-manipulation"
        >
            <span>🔍</span> <span>Details ansehen</span>
        </button>
    </div>
</div>
