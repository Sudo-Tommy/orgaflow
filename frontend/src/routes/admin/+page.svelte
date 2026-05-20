<script lang="ts">
    import { useAdminService } from "$lib/services/adminService.svelte";
    import AdminDataTable from "$lib/components/admin/AdminDataTable.svelte";
    import AdminRecordModal from "$lib/components/admin/AdminRecordModal.svelte";
    import AdminControlModal from "$lib/components/admin/AdminControlModal.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    const adminService = useAdminService();
    // svelte-ignore non_reactive_update
    let modal: ReturnType<typeof AdminRecordModal>;
    // svelte-ignore non_reactive_update
    let controlModal: ReturnType<typeof AdminControlModal>;

    let activeTab = $state<"dashboard" | "database" | "system_mails">("dashboard");

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
    <div class="flex items-center gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
        <button onclick={() => controlModal?.open()} class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 w-full sm:w-auto py-3 sm:py-2.5 flex items-center justify-center gap-2">
            <span class="text-lg leading-none">🎛️</span> System-Kontrolle
        </button>
    </div>
</div>

<div class="orga-filter-bar animate-enter delay-100 items-center border-b-0 pb-0">
    <!-- Tab Switcher -->
    <div class="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0 w-full md:w-auto">
        <button onclick={() => activeTab = 'dashboard'} class="flex-1 md:flex-none px-4 py-2 sm:py-1.5 text-sm font-bold rounded-md transition-colors {activeTab === 'dashboard' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">📊 System-Übersicht</button>
        <button onclick={() => activeTab = 'database'} class="flex-1 md:flex-none px-4 py-2 sm:py-1.5 text-sm font-bold rounded-md transition-colors {activeTab === 'database' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">🗄️ Datenbank-Explorer</button>
        <button onclick={() => activeTab = 'system_mails'} class="flex-1 md:flex-none px-4 py-2 sm:py-1.5 text-sm font-bold rounded-md transition-colors {activeTab === 'system_mails' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">🤖 System-E-Mails</button>
    </div>
</div>

{#if activeTab === 'dashboard'}
    <div class="animate-enter delay-200 space-y-6 mt-6">
        <!-- System Health -->
        <h3 class="font-bold text-neutral-900 text-lg border-b border-neutral-200 pb-2">System-Status</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="orga-card-white p-6 flex flex-col gap-2 relative overflow-hidden"><div class="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full blur-2xl"></div><div class="flex items-center gap-3"><span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span><h4 class="font-bold text-neutral-900 text-sm">PocketBase Backend</h4></div><p class="text-xs text-neutral-500 font-medium">Verbindung stabil & verschlüsselt</p><div class="mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit border border-emerald-100">Live (Realtime) aktiv</div></div>
            <div class="orga-card-white p-6 flex flex-col gap-2 relative overflow-hidden"><div class="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full blur-2xl"></div><div class="flex items-center gap-3"><span class="text-xl">🌐</span><h4 class="font-bold text-neutral-900 text-sm">Microservice API</h4></div><p class="text-xs text-neutral-500 font-medium">Bereit für E-Mails & KI-Diktate</p><div class="mt-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit border border-blue-100">{import.meta.env.DEV ? 'Lokaler Dev-Modus' : 'Produktiv-Umgebung'}</div></div>
            <div class="orga-card-white p-6 flex flex-col gap-2 relative overflow-hidden"><div class="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full blur-2xl"></div><div class="flex items-center gap-3"><span class="text-xl">🛡️</span><h4 class="font-bold text-neutral-900 text-sm">Authentifizierung</h4></div><p class="text-xs text-neutral-500 font-medium">Session gültig</p><div class="mt-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-fit border border-indigo-100 truncate">{pb.authStore.model?.email}</div></div>
        </div>

        <!-- System Metriken -->
        <h3 class="font-bold text-neutral-900 text-lg border-b border-neutral-200 pb-2 mt-8">Datenbank Metriken</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center"><span class="text-3xl font-black text-brand-600 mb-1">{totalUsers}</span><span class="text-xs font-bold uppercase tracking-wider text-neutral-500">Benutzer</span></div>
            <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center"><span class="text-3xl font-black text-brand-600 mb-1">{totalClients}</span><span class="text-xs font-bold uppercase tracking-wider text-neutral-500">Klienten</span></div>
            <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center"><span class="text-3xl font-black text-brand-600 mb-1">{totalAppointments}</span><span class="text-xs font-bold uppercase tracking-wider text-neutral-500">Termine</span></div>
            <div class="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center"><span class="text-3xl font-black text-brand-600 mb-1">{totalInvoices}</span><span class="text-xs font-bold uppercase tracking-wider text-neutral-500">Rechnungen</span></div>
        </div>

        <!-- Push-Benachrichtigungen Senden -->
        <h3 class="font-bold text-neutral-900 text-lg border-b border-neutral-200 pb-2 mt-8">Benutzerdefinierte Push-Benachrichtigung</h3>
        <div class="orga-card-white p-6">
            {#if pushUsers.length === 0}
                <p class="text-sm text-neutral-500 italic">Keine Benutzer mit aktiven Push-Abonnements gefunden.</p>
            {:else}
                <form onsubmit={(e) => { e.preventDefault(); sendCustomPush(); }} class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="push-target" class="block text-sm font-semibold text-neutral-700 mb-1.5">Empfänger (muss gekoppelt sein)</label>
                            <select id="push-target" bind:value={pushTargetId} class="orga-input-clear py-3 sm:py-2.5 cursor-pointer" required disabled={isSendingPush}>
                                <option value="">Bitte wählen...</option>
                                {#each pushUsers as pu}
                                    <option value={pu.id}>{pu.name_first} {pu.name_last} ({pu.email})</option>
                                {/each}
                            </select>
                        </div>
                        <div><label for="push-title" class="block text-sm font-semibold text-neutral-700 mb-1.5">Titel</label><input id="push-title" type="text" bind:value={pushTitle} class="orga-input-clear py-3 sm:py-2.5" required disabled={isSendingPush} /></div>
                        <div class="sm:col-span-2"><label for="push-body" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachricht</label><textarea id="push-body" bind:value={pushBody} rows="2" class="orga-input-clear py-3 sm:py-2.5 resize-none" required disabled={isSendingPush}></textarea></div>
                    </div>
                    <div class="flex justify-end pt-2"><button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isSendingPush || !pushTargetId}>{isSendingPush ? 'Sendet...' : 'Push-Nachricht senden 🚀'}</button></div>
                </form>
            {/if}
        </div>
    </div>
{:else if activeTab === 'system_mails'}
    <div class="animate-enter delay-200 mt-6">
        <div class="orga-card-white overflow-hidden">
            <div class="p-4 border-b border-neutral-100 bg-neutral-50/50">
                <h3 class="font-bold text-neutral-900">Automatisch versendete System-E-Mails</h3>
                <p class="text-xs text-neutral-500 mt-1">Dies ist ein Log der E-Mails, die vom System automatisch versendet wurden (z.B. Portal-Login-Codes).</p>
            </div>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-150">
                    <thead class="bg-neutral-50/80 border-b border-neutral-200">
                        <tr>
                            <th class="p-4 font-bold text-neutral-800">Datum</th>
                            <th class="p-4 font-bold text-neutral-800">Empfänger</th>
                            <th class="p-4 font-bold text-neutral-800">Betreff</th>
                            <th class="p-4 font-bold text-neutral-800 text-center">Klient</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-50">
                        {#if systemMails.length === 0}
                            <tr><td colspan="4" class="p-10 text-center text-neutral-400 italic">Keine System-E-Mails gefunden.</td></tr>
                        {/if}
                        {#each systemMails as mail}
                            <tr class="hover:bg-neutral-50/50 transition-colors">
                                <td class="p-4 text-sm text-neutral-600 whitespace-nowrap">{mail.date ? new Date(mail.date).toLocaleString('de-DE') : '-'}</td>
                                <td class="p-4 text-sm font-medium text-neutral-800">{mail.to_address}</td>
                                <td class="p-4 text-sm text-neutral-700">{mail.subject}</td>
                                <td class="p-4 text-center">
                                    {#if mail.expand?.client}
                                        {@const c = Array.isArray(mail.expand.client) ? mail.expand.client[0] : mail.expand.client}
                                        <span class="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">{c.name_first} {c.name_last}</span>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
{:else}
    <div class="flex flex-col lg:flex-row gap-6 h-[calc(100vh-16rem)] min-h-150 animate-enter delay-200 mt-6">
        <!-- Sidebar mit allen Tabellen -->
        <div class="w-full lg:w-64 shrink-0 flex flex-col gap-4">
            <div class="orga-card-white flex-1 p-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar shadow-sm">
                <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 px-3 pt-2">Collections</h3>
                {#each adminService.collections as col}
                    <button onclick={() => adminService.activeCollection = col} class="text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between {adminService.activeCollection === col ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:bg-neutral-100'}">
                        <span class="truncate">{col}</span>
                        {#if adminService.activeCollection === col}<svg class="w-4 h-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>{/if}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Hauptbereich: Filter & Tabelle -->
        <div class="flex-1 flex flex-col min-w-0 gap-4">
            <div class="orga-card-white p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                <div class="w-full sm:w-auto flex-1 max-w-md relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span class="text-neutral-400">🔍</span></div>
                    <input type="text" bind:value={adminService.searchQuery} placeholder="In gesamten JSON-Daten suchen..." class="orga-input-clear pl-12 py-3 sm:py-2.5 border-neutral-200 w-full" />
                </div>
                <button onclick={handleCreate} class="orga-button-primary py-3 sm:py-2.5 px-6 w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20"><svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg> Neuen Eintrag</button>
            </div>
            <AdminDataTable data={adminService.activeData} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
    </div>
{/if}

<AdminRecordModal bind:this={modal} onSave={adminService.saveRecord} />
<AdminControlModal bind:this={controlModal} />