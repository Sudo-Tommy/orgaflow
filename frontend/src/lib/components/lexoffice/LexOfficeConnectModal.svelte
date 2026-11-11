<script lang="ts">
    import {
        ShieldCheck, ExternalLink, ClipboardPaste, RefreshCw,
        CheckCircle2, AlertTriangle, Unlink, X, Building2, Lock
    } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { lexofficeService } from "$lib/services/lexofficeService.svelte";

    let dialog = $state<HTMLDialogElement>();
    let apiKeyInput = $state("");
    let includeAllYears = $state(false);
    let selectedCompanyId = $state("");

    // Alphabetisch sortierte Standorte gemäß Regel alphabetical-select
    let sortedCompanies = $derived.by(() => {
        const all = [...(orgaStore.company?.data || [])];
        const filtered = rbacService.isOwner || rbacService.isDeveloper
            ? all
            : all.filter((c: any) => !rbacService.userCompanyId || c.id === rbacService.userCompanyId);

        return filtered.sort((a: any, b: any) => {
            const labelA = `${a.city || ''} ${a.name || ''}`.trim();
            const labelB = `${b.city || ''} ${b.name || ''}`.trim();
            return labelA.localeCompare(labelB, 'de', { sensitivity: 'base' });
        });
    });

    // Synchronisiere nativen Top-Layer <dialog> mit dem Service-State
    $effect(() => {
        if (!dialog) return;
        if (lexofficeService.isModalOpen) {
            if (lexofficeService.modalCompanyId && sortedCompanies.some((c: any) => c.id === lexofficeService.modalCompanyId)) {
                selectedCompanyId = lexofficeService.modalCompanyId;
            } else if (!selectedCompanyId && sortedCompanies.length > 0) {
                const connectedComp = sortedCompanies.find((c: any) => lexofficeService.getConfigForCompany(c.id)?.connected);
                selectedCompanyId = connectedComp ? connectedComp.id : sortedCompanies[0].id;
            }
            if (!dialog.open) {
                try { dialog.showModal(); } catch {}
            }
        } else if (dialog.open) {
            try { dialog.close(); } catch {}
        }
    });

    let activeConfig = $derived(lexofficeService.getConfigForCompany(selectedCompanyId));

    function handleClose() {
        lexofficeService.closeConnectModal();
    }

    async function handlePasteKey() {
        try {
            const text = await navigator.clipboard.readText();
            if (text?.trim()) {
                apiKeyInput = text.trim();
                toastStore.info("Schlüssel aus der Zwischenablage eingefügt.");
            } else {
                toastStore.warning("Die Zwischenablage ist leer.");
            }
        } catch {
            toastStore.warning("Bitte fügen Sie den Schlüssel per Strg+V in das Feld ein.");
        }
    }

    async function handleConnect(e: Event) {
        e.preventDefault();
        const ok = await lexofficeService.connectCompany(selectedCompanyId, apiKeyInput, true, includeAllYears);
        if (ok) apiKeyInput = "";
    }

    async function handleDisconnect() {
        const confirmed = await confirmStore.ask(
            "Möchten Sie die LexOffice-Verbindung für diesen Standort wirklich trennen? Alle bisherigen Rechnungen in OrgaFlow bleiben vollständig erhalten.",
            "Verbindung trennen?",
            "Ja, sicher trennen",
            "Abbrechen",
            true
        );
        if (confirmed) await lexofficeService.disconnectCompany(selectedCompanyId);
    }
</script>

<dialog
    bind:this={dialog}
    aria-labelledby="lexoffice-modal-title"
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-xl mx-auto my-auto rounded-3xl border-none outline-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) handleClose(); }}
    onclose={handleClose}
>
    <div class="w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 landscape:p-4 flex flex-col overflow-x-hidden">
        <div class="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 shrink-0">
                    <ShieldCheck class="w-6 h-6" />
                </div>
                <div class="min-w-0">
                    <h2 id="lexoffice-modal-title" class="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">LexOffice Easy-Login &amp; Abgleich</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Sichere Direktverbindung für automatische Rechnungs-Synchronisation</p>
                </div>
            </div>
            <button type="button" onclick={handleClose} aria-label="Fenster schließen" class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0">
                <X class="w-5 h-5" />
            </button>
        </div>

        <div class="mt-4 space-y-4 landscape:space-y-2.5">
            <div>
                <label for="lexoffice-company-select" class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Standort / Firma auswählen</label>
                <div class="relative flex items-center">
                    <Building2 class="w-4 h-4 text-violet-500 absolute left-3.5 pointer-events-none" />
                    <select id="lexoffice-company-select" bind:value={selectedCompanyId} class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-violet-500 cursor-pointer">
                        {#each sortedCompanies as comp}
                            {@const cfg = lexofficeService.getConfigForCompany(comp.id)}
                            <option value={comp.id} class="dark:bg-slate-800">{comp.city || comp.name} {comp.name && comp.city ? `(${comp.name})` : ''} – {cfg?.connected ? `Verbunden (${cfg.lexofficeCompanyName || 'LexOffice'})` : 'Nicht verbunden'}</option>
                        {/each}
                    </select>
                </div>
            </div>

            {#if activeConfig?.connected}
                <div class="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0">
                        <CheckCircle2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div class="min-w-0">
                            <div class="text-sm font-black text-emerald-900 dark:text-emerald-200 break-words">Verbunden mit: {activeConfig.lexofficeCompanyName || 'LexOffice'}</div>
                            <div class="text-xs text-emerald-700 dark:text-emerald-300/90 mt-0.5">
                                Schlüssel: {activeConfig.keyHint}
                                {#if activeConfig.lastSync} · Letzter Abgleich: {new Date(activeConfig.lastSync).toLocaleString('de-DE')}{/if}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button type="button" disabled={lexofficeService.isSyncing} onclick={() => lexofficeService.syncNow(selectedCompanyId, includeAllYears)} class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60">
                            <RefreshCw class="w-3.5 h-3.5 {lexofficeService.isSyncing ? 'animate-spin' : ''}" />
                            <span>Jetzt abgleichen</span>
                        </button>
                        <button type="button" onclick={handleDisconnect} title="LexOffice-Verbindung trennen" class="p-2 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200 text-xs font-bold cursor-pointer">
                            <Unlink class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            {:else if activeConfig?.needsReconnect}
                <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex items-start gap-3">
                    <AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div class="text-xs text-amber-800 dark:text-amber-200">
                        <span class="font-bold block">Verbindung muss erneuert werden:</span>
                        {activeConfig.lastError || 'Der gespeicherte Schlüssel ist abgelaufen. Bitte fügen Sie unten einen neuen Schlüssel ein.'}
                    </div>
                </div>
            {/if}

            <form onsubmit={handleConnect} class="space-y-3.5">
                <div class="p-3.5 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="text-xs text-slate-700 dark:text-slate-300">
                        <span class="font-bold text-violet-700 dark:text-violet-300 block">Schritt 1: Schlüssel in LexOffice kopieren</span>
                        Öffnen Sie mit einem Klick Ihr LexOffice-Portal und kopieren Sie dort Ihren API-Schlüssel.
                    </div>
                    <a href="https://app.lexoffice.de/addons/public-api" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/50 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-xs">
                        <ExternalLink class="w-3.5 h-3.5" />
                        <span>LexOffice öffnen</span>
                    </a>
                </div>

                <div>
                    <label for="lexoffice-api-key" class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Schritt 2: LexOffice-Schlüssel einfügen</label>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input id="lexoffice-api-key" type="password" bind:value={apiKeyInput} placeholder={activeConfig?.connected ? "Neuen Schlüssel zum Aktualisieren einfügen..." : "Hier Ihren LexOffice-Schlüssel einfügen..."} autocomplete="off" class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500" />
                        <button type="button" onclick={handlePasteKey} class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer">
                            <ClipboardPaste class="w-4 h-4 text-violet-500" />
                            <span>Einfügen</span>
                        </button>
                    </div>
                </div>

                <label class="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none pt-1">
                    <input type="checkbox" bind:checked={includeAllYears} class="rounded text-violet-600 focus:ring-violet-500 w-4 h-4" />
                    <span>Auch ältere Geschäftsjahre (vor {new Date().getFullYear() - 1}) vollständig mit abgleichen</span>
                </label>

                <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                    <Lock class="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sicherheits-Schutz aktiv: AES-256-GCM-Verschlüsselung, kein automatisches Löschen von OrgaFlow-Daten.</span>
                </div>

                <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                    <button type="button" onclick={handleClose} class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer">Schließen</button>
                    <button type="submit" disabled={lexofficeService.isConnecting || !apiKeyInput.trim()} class="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 disabled:opacity-50 cursor-pointer">
                        <ShieldCheck class="w-4 h-4" />
                        <span>{lexofficeService.isConnecting ? 'Prüfe & verbinde...' : 'Verbinden & synchronisieren'}</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</dialog>
