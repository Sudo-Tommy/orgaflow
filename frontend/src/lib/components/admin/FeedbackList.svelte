<script lang="ts">
    interface Props {
        feedbacks: any[];
        selectedId: string | null;
        onSelect: (id: string) => void;
    }

    let { feedbacks, selectedId, onSelect }: Props = $props();

    function getPriorityColor(priority: string) {
        switch ((priority || '').toLowerCase()) {
            case 'high':
            case 'critical':
                return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
            case 'medium':
                return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            default:
                return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    }

    function getStatusBadge(status: string) {
        switch ((status || '').toLowerCase()) {
            case 'resolved':
                return { label: 'Gelöst', class: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
            case 'in_progress':
                return { label: 'In Bearbeitung', class: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
            default:
                return { label: 'Neu', class: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
        }
    }
</script>

<div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 custom-scrollbar">
    {#if feedbacks.length === 0}
        <div class="p-8 text-center text-slate-400 dark:text-slate-500">
            <p class="text-sm">Keine Feedback-Meldungen vorhanden.</p>
        </div>
    {:else}
        {#each feedbacks as item (item.id)}
            {@const statusInfo = getStatusBadge(item.status)}
            <button
                type="button"
                onclick={() => onSelect(item.id)}
                class="w-full text-left p-4 transition-all duration-150 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none focus:bg-slate-50/80 dark:focus:bg-slate-800/80 min-h-[80px] cursor-pointer
                    {selectedId === item.id ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-l-4 border-indigo-600 dark:border-indigo-500 pl-3.5 shadow-xs' : 'border-l-4 border-transparent'}"
                aria-pressed={selectedId === item.id}
            >
                <div class="flex justify-between items-start w-full gap-2">
                    <span class="font-semibold text-slate-900 dark:text-white truncate text-sm sm:text-base tracking-tight">{item.sender || 'Anonym'}</span>
                    <span class="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                        {item.created ? new Date(item.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                    </span>
                </div>
                
                <p class="text-xs text-slate-600 dark:text-slate-300 truncate w-full mt-1 mb-2.5 font-medium">{item.subject || 'Kein Betreff'}</p>
                
                <div class="flex gap-2 items-center flex-wrap">
                    <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold {getPriorityColor(item.priority)}">
                        {(item.priority || 'NORMAL').toUpperCase()}
                    </span>
                    {#if item.category}
                        <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-full font-medium">
                            {item.category}
                        </span>
                    {/if}
                    <span class="text-[10px] px-2 py-0.5 rounded-full border font-medium ml-auto {statusInfo.class}">
                        {statusInfo.label}
                    </span>
                </div>
            </button>
        {/each}
    {/if}
</div>
