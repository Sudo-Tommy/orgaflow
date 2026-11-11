<script lang="ts">
    import { CheckCircle2, XCircle, HelpCircle, ShieldCheck, ShieldAlert } from "lucide-svelte";
    import type { SimulationResult } from "./iamSimulationEngine";

    interface Props {
        result: SimulationResult | null;
    }

    let { result }: Props = $props();
</script>

<div class="lg:col-span-6 flex flex-col">
    {#if result}
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex-1 flex flex-col justify-between space-y-6 animate-enter">
            <div>
                <!-- Decision Banner -->
                <div class="p-5 rounded-2xl flex items-center justify-between {result.decision === 'ALLOW' ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'}">
                    <div class="flex items-center gap-3">
                        {#if result.decision === 'ALLOW'}
                            <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-md">
                                <CheckCircle2 class="w-6 h-6" />
                            </div>
                            <div>
                                <div class="text-[10px] font-mono uppercase tracking-widest font-bold">Entscheidung</div>
                                <div class="text-xl font-black">ALLOW (Zugriff Erlaubt)</div>
                            </div>
                        {:else}
                            <div class="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shadow-md">
                                <XCircle class="w-6 h-6" />
                            </div>
                            <div>
                                <div class="text-[10px] font-mono uppercase tracking-widest font-bold">Entscheidung</div>
                                <div class="text-xl font-black">DENY (Zugriff Verweigert)</div>
                            </div>
                        {/if}
                    </div>
                    <span class="text-xs font-mono opacity-70">{result.timestamp}</span>
                </div>

                <!-- Details Grid -->
                <div class="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Prüfungsregel / Policy</span>
                        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">{result.matchedPolicy}</span>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Mandanten-Zuordnung</span>
                        <span class="font-semibold text-slate-700 dark:text-slate-300">{result.userContext.companyName}</span>
                    </div>
                </div>

                <!-- Schrittweise Begründung -->
                <div class="mt-5">
                    <h5 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                        <HelpCircle class="w-4 h-4 text-indigo-500" />
                        <span>Evaluierungs-Begründung & Audit Trail</span>
                    </h5>
                    <ul class="space-y-2">
                        {#each result.reasons as reason}
                            <li class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2.5">
                                <span class="text-indigo-500 font-bold mt-0.5">•</span>
                                <span>{reason}</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>

            <div class="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 shrink-0" />
                <span>Simulation entspricht den Echtzeit-Regeln des OrgaFlow HRBAC Kerns.</span>
            </div>
        </div>
    {:else}
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm flex-1 flex flex-col items-center justify-center text-center">
            <div class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-900">
                <ShieldAlert class="w-8 h-8" />
            </div>
            <h5 class="text-base font-bold text-slate-900 dark:text-white">Bereit für Policy-Simulation</h5>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Wählen Sie links einen Benutzer und die gewünschte Aktion aus und klicken Sie auf "Zugriff simulieren", um die Sicherheitsentscheidung zu testen.
            </p>
        </div>
    {/if}
</div>
