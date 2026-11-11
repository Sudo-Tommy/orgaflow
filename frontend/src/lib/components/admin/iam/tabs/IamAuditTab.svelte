<script lang="ts">
    import { Download } from "lucide-svelte";

    export interface AuditEvent {
        id: string;
        timestamp: string;
        action: string;
        actor: string;
        target: string;
        status: "SUCCESS" | "DENIED" | "INFO";
        ip: string;
    }

    let {
        auditLog,
        onExport
    } = $props<{
        auditLog: AuditEvent[];
        onExport: () => void;
    }>();

    let auditFilter = $state("all");

    let filteredAudit = $derived.by(() => {
        if (auditFilter === 'all') return auditLog;
        return auditLog.filter((a: AuditEvent) => a.status === auditFilter);
    });
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden animate-enter space-y-0">
    <div class="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
        <div>
            <h3 class="text-base font-black text-slate-900 dark:text-white">IAM Access &amp; Audit Trail (CloudTrail Style)</h3>
            <p class="text-xs text-slate-500 mt-0.5">Chronologisches Protokoll von sicherheits- und berechtigungsrelevanten Zugriffen.</p>
        </div>
        <div class="flex items-center gap-3">
            <select 
                bind:value={auditFilter}
                class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-h-[44px]"
            >
                <option value="all">Alle Ereignisse ({auditLog.length})</option>
                <option value="SUCCESS">Nur Erfolgreich (SUCCESS)</option>
                <option value="DENIED">Nur Verweigert (DENIED)</option>
            </select>
            <button 
                type="button" 
                onclick={onExport}
                class="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
                <Download class="w-4 h-4" />
                <span>Export</span>
            </button>
        </div>
    </div>

    <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-160">
            <thead class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                    <th class="p-3.5">Zeitstempel</th>
                    <th class="p-3.5">Aktion (Event)</th>
                    <th class="p-3.5">Actor (Ausführender)</th>
                    <th class="p-3.5">Target (Ziel)</th>
                    <th class="p-3.5 text-center">Status</th>
                    <th class="p-3.5 text-right">Quelle IP</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {#each filteredAudit as evt}
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="p-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{evt.timestamp}</td>
                        <td class="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">{evt.action}</td>
                        <td class="p-3.5 font-semibold text-slate-800 dark:text-slate-200">{evt.actor}</td>
                        <td class="p-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{evt.target}</td>
                        <td class="p-3.5 text-center">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono {evt.status === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}">
                                {evt.status}
                            </span>
                        </td>
                        <td class="p-3.5 text-right font-mono text-slate-500 text-[11px]">{evt.ip}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
