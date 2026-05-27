<script lang="ts">
    import { useAdminService } from "$lib/services/adminService.svelte";
    import AdminDataTable from "$lib/components/admin/AdminDataTable.svelte";
    import AdminRecordModal from "$lib/components/admin/AdminRecordModal.svelte";
    import AdminControlModal from "$lib/components/admin/AdminControlModal.svelte";
    import AdminLogsModal from "$lib/components/admin/AdminLogsModal.svelte";
    import FlyerGenerator from "$lib/components/admin/FlyerGenerator.svelte";   
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    const adminService = useAdminService();
    let modal: ReturnType<typeof AdminRecordModal>;
    // svelte-ignore non_reactive_update
    let controlModal: ReturnType<typeof AdminControlModal>;
    // svelte-ignore non_reactive_update
    let logsModal: ReturnType<typeof AdminLogsModal>;

    let activeTab = $state<"dashboard" | "database" | "system_mails" | "flyer">("dashboard");

    function handleEdit(record: any) {
        modal?.open(adminService.activeCollection, record);
    }

    function handleCreate() {
        modal?.open(adminService.activeCollection);
    }

    async function handleDelete(id: string) {
        if (await confirmStore.ask(`Möchten Sie diesen Datensatz unwiderruflich aus '${adminService.activeCollection}' löschen?`, "Datensatz löschen?", "Unwiderruflich Löschen", "Abbrechen", true)) {
            await adminService.deleteRecord(adminService.activeCollection, id);
        }
    }

    // Statistiken
    let totalUsers = $derived(orgaStore.users?.data?.length || 0);
    let totalClients = $derived(orgaStore.clients?.data?.length || 0);
    let totalAppointments = $derived(orgaStore.appointments?.data?.length || 0);
    let totalInvoices = $derived(orgaStore.invoices?.data?.length || 0);

    let systemMails = $derived.by(() => {
        return (orgaStore.mailbox_messages?.data || [])
            .filter(mail => mail.folder === 'System');
    });

    // --- Custom Push Notification Logik ---
    let pushUsers = $derived.by(() => {
        let list: any[] = [];
        if (orgaStore.users?.data) list = list.concat(orgaStore.users.data.filter((u: any) => u.push_subscriptions && u.push_subscriptions.length > 0));
        if ((orgaStore as any).superusers?.data) list = list.concat((orgaStore as any).superusers.data.filter((u: any) => u.push_subscriptions && u.push_subscriptions.length > 0));
        return list;
    });

    let pushTargetId = $state("");
    let pushTitle = $state("System-Nachricht");
    let pushBody = $state("Bitte prüfen Sie das System.");
    let pushUrl = $state("/dashboard");
    let isSendingPush = $state(false);

    async function sendCustomPush() {
        if (!pushTargetId) {
            toastStore.warning("Bitte einen Benutzer auswählen.");
            return;
        }
        isSendingPush = true;
        try {
            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${microserviceUrl}/api/emails/portal/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
                body: JSON.stringify({ userId: pushTargetId, title: pushTitle, body: pushBody, url: pushUrl })
            });
            const data = await res.json();
            if (data.pushResults && data.pushResults.some((r:any) => r.status === 'error')) {
                toastStore.warning("Push gesendet, aber einige Geräte meldeten Fehler.");
            } else if (data.success) {
                toastStore.success('Push erfolgreich gesendet!');
            } else {
                toastStore.error(data.error || "Fehler beim Senden.");
            }
        } catch (e) {
            toastStore.error('Netzwerkfehler beim Senden des Pushes.');
        } finally {
            isSendingPush = false;
        }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">System-Administration</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier alle Rohdaten, Tabellen und Systemeinstellungen (God Mode).</p>
    </div>
</div>

<div class="h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] flex flex-col md:flex-row bg-white rounded-3xl border border-neutral-200 shadow-lg overflow-hidden animate-enter max-w-400 mx-auto mb-6">
    
    <!-- === SIDEBAR === -->
    <div class="w-full md:w-64 lg:w-72 bg-neutral-50/80 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col shrink-0 z-10">
        <div class="p-6 border-b border-neutral-200 bg-white hidden md:block">
            <h1 class="text-xl font-black text-neutral-900 flex items-center gap-2"><span>⚙️</span> Administration</h1>
            <p class="text-xs font-medium text-neutral-500 mt-1">System & God Mode</p>
        </div>
        
        <div class="flex-1 overflow-x-auto md:overflow-y-auto custom-scrollbar flex md:flex-col p-2 md:p-4 gap-1 md:gap-2">
            <button onclick={() => activeTab = 'dashboard'} class="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all text-xs md:text-sm font-semibold whitespace-nowrap {activeTab === 'dashboard' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-neutral-600 hover:bg-neutral-100 border border-transparent'}">
                <span class="text-base md:text-lg leading-none">📊</span> System-Status
            </button>
            
            <button onclick={() => activeTab = 'system_mails'} class="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all text-xs md:text-sm font-semibold whitespace-nowrap {activeTab === 'system_mails' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-neutral-600 hover:bg-neutral-100 border border-transparent'}">
                <span class="text-base md:text-lg leading-none">🤖</span> System-Mails
            </button>
            
            <button onclick={() => activeTab = 'flyer'} class="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all text-xs md:text-sm font-semibold whitespace-nowrap {activeTab === 'flyer' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-neutral-600 hover:bg-neutral-100 border border-transparent'}">
                <span class="text-base md:text-lg leading-none">🖨️</span> Flyer
            </button>

            <button onclick={() => activeTab = 'database'} class="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all text-xs md:text-sm font-semibold whitespace-nowrap {activeTab === 'database' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-neutral-600 hover:bg-neutral-100 border border-transparent'}">
                <span class="text-base md:text-lg leading-none">🗄️</span> Datenbank
            </button>

            <!-- Datenbank Tabellen in der Sidebar (nur auf Desktop) -->
            {#if activeTab === 'database'}
                <div class="pl-4 pr-2 space-y-1 mt-1 mb-2 border-l-2 border-indigo-100 ml-4 hidden md:block animate-enter">
                    {#each adminService.collections as col}
                        <button onclick={() => adminService.activeCollection = col} class="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {adminService.activeCollection === col ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'}">
                            {col}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="p-3 md:p-4 border-t border-neutral-200 bg-white md:bg-transparent flex flex-row md:flex-col gap-2 shrink-0">
            <button onclick={() => logsModal?.open()} class="flex-1 md:w-full bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-indigo-600 py-2 md:py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold transition-colors text-xs md:text-sm">
                <span class="text-base leading-none">📡</span> Live Logs
            </button>
            <button onclick={() => controlModal?.open()} class="flex-1 md:w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 py-2 md:py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs md:text-sm font-bold">
                <span class="text-base leading-none">🎛️</span> Kontrolle
            </button>
        </div>
    </div>

    <!-- === MAIN CONTENT === -->
    <div class="flex-1 flex flex-col relative min-w-0 bg-neutral-50/30 overflow-hidden">        
        {#if activeTab === 'dashboard'}
            <div class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6 md:space-y-8 animate-enter">
                <div>
                    <h3 class="font-black text-neutral-900 text-lg md:text-xl mb-4 flex items-center gap-2"><span>🩺</span> System-Status</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                        <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
                            <div class="flex items-center gap-3 relative z-10">
                                <span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                                <h4 class="font-bold text-neutral-900 text-sm">PocketBase Backend</h4>
                            </div>
                            <p class="text-xs text-neutral-500 font-medium relative z-10">Verbindung stabil & verschlüsselt</p>
                            <div class="mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit border border-emerald-100 relative z-10">Live (Realtime) aktiv</div>
                        </div>
                        <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-blue-200 transition-colors">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
                            <div class="flex items-center gap-3 relative z-10">
                                <span class="text-xl leading-none">🌐</span>
                                <h4 class="font-bold text-neutral-900 text-sm">Microservice API</h4>
                            </div>
                            <p class="text-xs text-neutral-500 font-medium relative z-10">Bereit für E-Mails & KI-Diktate</p>
                            <div class="mt-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit border border-blue-100 relative z-10">{import.meta.env.DEV ? 'Lokaler Dev-Modus' : 'Produktiv-Umgebung'}</div>
                        </div>
                        <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
                            <div class="flex items-center gap-3 relative z-10">
                                <span class="text-xl leading-none">🛡️</span>
                                <h4 class="font-bold text-neutral-900 text-sm">Authentifizierung</h4>
                            </div>
                            <p class="text-xs text-neutral-500 font-medium relative z-10">Session gültig</p>
                            <div class="mt-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-fit border border-indigo-100 truncate relative z-10" title={pb.authStore.model?.email}>{pb.authStore.model?.email}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="font-black text-neutral-900 text-lg md:text-xl mb-4 flex items-center gap-2"><span>📈</span> Datenbank Metriken</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center"><span class="text-3xl font-black text-indigo-600 mb-1">{totalUsers}</span><span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Benutzer</span></div>
                        <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center"><span class="text-3xl font-black text-emerald-600 mb-1">{totalClients}</span><span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Klienten</span></div>
                        <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center"><span class="text-3xl font-black text-amber-600 mb-1">{totalAppointments}</span><span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Termine</span></div>
                        <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center"><span class="text-3xl font-black text-rose-600 mb-1">{totalInvoices}</span><span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Rechnungen</span></div>
                    </div>
                </div>

                <div>
                    <h3 class="font-black text-neutral-900 text-lg md:text-xl mb-4 flex items-center gap-2"><span>🚀</span> Push-Nachricht senden</h3>
                    <div class="bg-white border border-neutral-200 p-5 md:p-6 rounded-2xl shadow-sm">
                        {#if pushUsers.length === 0}
                            <div class="text-center py-6 text-neutral-400 font-medium flex flex-col items-center gap-2">
                                <span class="text-3xl opacity-50">📱</span>
                                <p>Keine Benutzer mit aktiven Push-Abonnements gefunden.</p>
                            </div>
                        {:else}
                            <form onsubmit={(e) => { e.preventDefault(); sendCustomPush(); }} class="space-y-4">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label for="push-target" class="block text-sm font-semibold text-neutral-700 mb-1.5">Empfänger (muss gekoppelt sein)</label>
                                        <select id="push-target" bind:value={pushTargetId} class="orga-input-clear py-2.5 cursor-pointer text-sm" required disabled={isSendingPush}>
                                            <option value="">Bitte wählen...</option>
                                            {#each pushUsers as pu}
                                                <option value={pu.id}>{pu.name_first} {pu.name_last} ({pu.email})</option>
                                            {/each}
                                        </select>
                                    </div>
                                    <div><label for="push-title" class="block text-sm font-semibold text-neutral-700 mb-1.5">Titel</label><input id="push-title" type="text" bind:value={pushTitle} class="orga-input-clear py-2.5 text-sm" required disabled={isSendingPush} /></div>
                                    <div class="sm:col-span-2"><label for="push-body" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachricht</label><textarea id="push-body" bind:value={pushBody} rows="2" class="orga-input-clear py-2.5 resize-none text-sm custom-scrollbar" required disabled={isSendingPush}></textarea></div>
                                </div>
                                <div class="flex justify-end pt-2"><button type="submit" class="orga-button-primary w-full sm:w-auto py-2.5 text-sm shadow-indigo-600/20" disabled={isSendingPush || !pushTargetId}>{isSendingPush ? 'Sendet...' : 'Push-Nachricht abschicken 🚀'}</button></div>
                            </form>
                        {/if}
                    </div>
                </div>
            </div>
            
        {:else if activeTab === 'system_mails'}
            <div class="flex-1 overflow-hidden flex flex-col p-4 md:p-6 animate-enter">
                <div class="bg-white border border-neutral-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
                    <div class="p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div>
                            <h3 class="font-black text-neutral-900 text-lg flex items-center gap-2"><span>🤖</span> System-E-Mails</h3>
                            <p class="text-xs text-neutral-500 mt-1">Protokoll automatisch generierter E-Mails</p>
                        </div>
                        <div class="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
                            {systemMails.length} Einträge
                        </div>
                    </div>
                    <div class="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-white">
                        <table class="w-full text-left border-collapse min-w-150">
                            <thead class="bg-white sticky top-0 z-10 shadow-sm border-b border-neutral-200">
                                <tr>
                                    <th class="p-4 font-bold text-neutral-800 text-xs uppercase tracking-wider">Datum</th>
                                    <th class="p-4 font-bold text-neutral-800 text-xs uppercase tracking-wider">Empfänger</th>
                                    <th class="p-4 font-bold text-neutral-800 text-xs uppercase tracking-wider">Betreff</th>
                                    <th class="p-4 font-bold text-neutral-800 text-xs uppercase tracking-wider text-center">Klient</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-neutral-100">
                                {#if systemMails.length === 0}
                                    <tr><td colspan="4" class="p-12 text-center text-neutral-400 font-medium">Keine System-E-Mails gefunden.</td></tr>
                                {/if}
                                {#each systemMails as mail}
                                    <tr class="hover:bg-indigo-50/30 transition-colors">
                                        <td class="p-4 text-xs font-semibold text-neutral-500 whitespace-nowrap">{mail.date ? new Date(mail.date).toLocaleString('de-DE') : '-'}</td>
                                        <td class="p-4 text-sm font-bold text-neutral-800">{mail.to_address}</td>
                                        <td class="p-4 text-sm text-neutral-600 truncate max-w-xs" title={mail.subject}>{mail.subject}</td>
                                        <td class="p-4 text-center">
                                            {#if mail.expand?.client}
                                                {@const c = Array.isArray(mail.expand.client) ? mail.expand.client[0] : mail.expand.client}
                                                <span class="px-2 py-1 bg-neutral-100 text-neutral-600 border border-neutral-200 text-[10px] font-bold rounded-md whitespace-nowrap">{c.name_first} {c.name_last}</span>
                                            {:else}
                                                <span class="text-neutral-300">-</span>
                                            {/if}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
        {:else if activeTab === 'database'}
            <div class="flex-1 overflow-hidden flex flex-col animate-enter">
                <div class="p-4 md:p-6 border-b border-neutral-200 bg-white flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0 shadow-sm z-10">
                    <div class="flex flex-col sm:flex-row items-center gap-4 w-full">
                        <div class="md:hidden w-full">
                            <!-- Dropdown für Tabellen (Mobile) -->
                            <select bind:value={adminService.activeCollection} class="orga-input-clear w-full py-2.5 text-sm font-bold bg-indigo-50 border-indigo-200 text-indigo-800 cursor-pointer">
                                {#each adminService.collections as col}
                                    <option value={col}>{col}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="w-full sm:flex-1 max-w-md relative">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span class="text-neutral-400">🔍</span></div>
                            <input type="text" bind:value={adminService.searchQuery} placeholder="In JSON-Daten suchen..." class="orga-input-clear pl-12 py-2.5 text-sm border-neutral-200 w-full bg-neutral-50 focus:bg-white transition-colors" />
                        </div>
                    </div>
                    
                    <button onclick={handleCreate} class="orga-button-primary py-2.5 px-6 w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20 text-sm shrink-0 whitespace-nowrap flex items-center justify-center gap-2">
                        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg> Neuen Eintrag
                    </button>
                </div>
                
                <div class="flex-1 overflow-hidden p-0 sm:p-6">
                    <div class="h-full rounded-none sm:rounded-2xl overflow-hidden sm:border border-neutral-200 shadow-sm">
                        <AdminDataTable data={adminService.activeData} onEdit={handleEdit} onDelete={handleDelete} />
                    </div>
                </div>
            </div>
        {:else if activeTab === 'flyer'}
        <div class="flex-1 overflow-hidden flex flex-col animate-enter bg-white">
            <FlyerGenerator />
        </div>
        {/if}
    </div>
</div>



<AdminRecordModal bind:this={modal} onSave={adminService.saveRecord} />
<AdminControlModal bind:this={controlModal} />
<AdminLogsModal bind:this={logsModal} />