<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { onMount, onDestroy } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let dialog: HTMLDialogElement;
    let logs = $state<any[]>([]);
    let isLoading = $state(false);
    let autoRefresh = $state(true);
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let isRealtimeActive = $state(false);
    let errorMsg = $state("");
    let userMap = $state<Record<string, string>>({});
    let onlyErrors = $state(false);
    let searchQuery = $state("");
    let viewMode = $state<'list' | 'users'>('users');
    let hideSystemLogs = $state(true);
    let hideInactive = $state(true);
    let currentTime = $state(Date.now());
    let timeTicker: any;
    
    let detailDialog: HTMLDialogElement;
    let selectedLogDetail = $state<any>(null);

    let categoryFilter = $state('all');
    
    const categories = [
        { id: 'all', name: 'Alle Aktionen', icon: '🌍' },
        { id: 'auth', name: 'Logins & Auth', icon: '🔑' },
        { id: 'appointments', name: 'Termine & Zeiten', icon: '📅' },
        { id: 'clients', name: 'Klienten & Akten', icon: '👥' },
        { id: 'emails', name: 'E-Mails & Chat', icon: '✉️' },
        { id: 'invoices', name: 'Finanzen & Rechnungen', icon: '💶' },
    ];

    export function open() {
        dialog?.showModal();
        errorMsg = "";
        loadUsers();
        loadLogs();
        if (autoRefresh && !isRealtimeActive) startAutoRefresh();
        
        // Lässt eine "Stoppuhr" im Hintergrund ticken, um inaktive Nutzer automatisch auszublenden
        clearInterval(timeTicker);
        timeTicker = setInterval(() => currentTime = Date.now(), 30000);
    }

    export function close() {
        stopAutoRefresh();
        if (isRealtimeActive) {
            pb.collection('_logs').unsubscribe('*');
            isRealtimeActive = false;
        }
        clearInterval(timeTicker);
        dialog?.close();
    }
    
    function showLogDetail(log: any) {
        selectedLogDetail = log;
        setTimeout(() => detailDialog?.showModal(), 0);
    }

    function closeLogDetail() {
        detailDialog?.close();
        selectedLogDetail = null;
    }

    async function loadUsers() {
        try {
            const newMap: Record<string, string> = {};
            
            // Aktueller Nutzer als sicherer Fallback
            const current = pb.authStore.record || pb.authStore.model;
            if (current?.id) {
                newMap[current.id] = `${current.name_first || ''} ${current.name_last || ''}`.trim() || current.email || current.username || 'Aktueller Nutzer';
            }

            // Alle Mitarbeiter & Admins laden (Robustes Promise.allSettled fängt Berechtigungsfehler ab)
            const [usersRes, supersRes] = await Promise.allSettled([
                pb.collection('users').getFullList({ requestKey: null }),
                pb.collection('_superusers').getFullList({ requestKey: null })
            ]);

            if (usersRes.status === 'fulfilled') {
                usersRes.value.forEach((u: any) => { newMap[u.id] = `${u.name_first || ''} ${u.name_last || ''}`.trim() || u.username || u.email || 'Mitarbeiter'; });
            }
            if (supersRes.status === 'fulfilled') {
                supersRes.value.forEach((u: any) => { newMap[u.id] = u.email || 'Superadmin'; });
            }
            
            // Auch Klienten aus dem lokalen Store registrieren (für Ansicht von Portal-Aktivitäten)
            if (orgaStore.clients?.data) {
                orgaStore.clients.data.forEach((c: any) => { newMap[c.id] = `${c.name_first || ''} ${c.name_last || ''}`.trim() || 'Klient'; });
            }

            userMap = newMap;
        } catch(e) { console.error("Fehler beim Laden der User-Map:", e); }
    }

    async function loadLogs() {
        isLoading = true;
        try {
            // 1. Versuch: Über unseren eigenen PB_HOOKS Endpunkt (Umgeht die 403/404 Blockade von PB v0.23+)
            const res = await pb.send("/api/orgaflow/logs", {});
            logs = res.items ? res.items.map(formatLog) : [];
            errorMsg = "";
        } catch (customErr) {
            try {
                // 2. Versuch: Direkter Zugriff auf _logs (falls PocketBase das in Zukunft wieder direkt erlaubt)
                const res = await pb.collection('_logs').getList(1, 50, { sort: '-created' });
                logs = res.items.map(formatLog);
                errorMsg = "";

                if (!isRealtimeActive) {
                    try {
                        await pb.collection('_logs').subscribe('*', (e) => {
                            if (e.action === 'create') logs = [formatLog(e.record), ...logs].slice(0, 100);
                        });
                        isRealtimeActive = true;
                        stopAutoRefresh();
                    } catch (subErr) { console.warn("Realtime für Logs fehlgeschlagen:", subErr); }
                }
            } catch (err: any) {
                try {
                    // 3. Versuch: Altes PocketBase (v0.22 und älter)
                    const res = await pb.send("/api/logs/requests", { query: { page: 1, perPage: 50, sort: '-created' } });
                    logs = res.items;
                    errorMsg = "";
                } catch (fallbackErr) {
                    errorMsg = "System-Logs sind blockiert (403/404). Um die Logs live zu sehen, muss die 'main.pb.js' Hook-Datei auf dem Server angelegt werden (siehe Entwickler-Antwort).";
                    stopAutoRefresh();
                    autoRefresh = false;
                }
            }
        } finally {
            isLoading = false;
        }
    }

    function formatLog(item: any) {
        if (item.collectionId === '_logs' || item.collectionName === '_logs' || typeof item.level !== 'undefined') {
            let data = item.data || {};
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) {}
            }

            let url = data.url || item.message || '';
            let isLogin = false;
            if (url.includes('auth-with-password')) {
                isLogin = true;
            }

            if (data.type !== 'request') {
                return { id: item.id, created: item.created, method: 'LOG', url: url, status: item.level >= 0 ? 200 : 500, userIp: '-', auth: '-', authId: '', execTime: 0, isLogin, raw: item };
            }
            return {
                id: item.id, created: item.created, method: data.method || 'REQ', url: url,
                status: data.status || 200, userIp: data.remoteIp || data.userIp || '', auth: data.auth || 'guest', authId: data.authId || '',
                execTime: data.execTime ? parseFloat(data.execTime).toFixed(1) : 0,
                isLogin,
                raw: item
            };
        }
        return { ...item, raw: item }; // Fallback für alte PB Versionen
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        refreshInterval = setInterval(loadLogs, 3000);
    }

    function stopAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
    }

    function toggleAutoRefresh() {
        autoRefresh = !autoRefresh;
        if (autoRefresh) startAutoRefresh();
        else stopAutoRefresh();
    }

    onDestroy(() => {
        stopAutoRefresh();
    });

    function getMethodColor(method: string) {
        switch((method || '').toUpperCase()) {
            case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'POST': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'PATCH':
            case 'PUT': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'DELETE': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-neutral-100 text-neutral-700 border-neutral-200';
        }
    }

    let filteredLogs = $derived.by(() => {
        return logs.filter(log => {
            // Filtert das ständige Live-Abfragen unserer eigenen Log-Endpunkte heraus
            if (hideSystemLogs && (log.url.includes('/api/orgaflow/logs') || log.url.includes('_logs') || log.url.includes('/api/logs/requests'))) {
                return false;
            }
            
            const matchesError = !onlyErrors || log.status >= 400;
            if (!matchesError) return false;

            // Smarter Kategorie-Filter
            if (categoryFilter !== 'all') {
                const u = log.url.toLowerCase();
                switch(categoryFilter) {
                    case 'auth': if (!u.includes('auth-with-password') && !u.includes('auth-refresh')) return false; break;
                    case 'appointments': if (!u.includes('appointment') && !u.includes('time_record') && !u.includes('drive_record')) return false; break;
                    case 'clients': if (!u.includes('client') && !u.includes('contact') && !u.includes('retirement_home')) return false; break;
                    case 'emails': if (!u.includes('email') && !u.includes('mailbox') && !u.includes('live_chat')) return false; break;
                    case 'invoices': if (!u.includes('invoice') && !u.includes('expenditure') && !u.includes('accounting') && !u.includes('personal_')) return false; break;
                }
            }

            if (!searchQuery) return true;
            
            const q = searchQuery.toLowerCase();
            const userName = (userMap[log.authId] || '').toLowerCase();
            
            return (log.url || '').toLowerCase().includes(q) ||
                   (log.authId || '').toLowerCase().includes(q) ||
                   userName.includes(q) ||
                   (log.userIp || '').toLowerCase().includes(q) ||
                   (log.method || '').toLowerCase().includes(q);
        });
    });
    
    function getStatusColor(status: number) {
        if (status >= 200 && status < 300) return 'text-emerald-600';
        if (status >= 300 && status < 400) return 'text-blue-600';
        if (status >= 400 && status < 500) return 'text-amber-600';
        if (status >= 500) return 'text-rose-600';
        return 'text-neutral-600';
    }

    // Gruppiert alle sichtbaren Logs automatisch nach Nutzer
    let userLogs = $derived.by(() => {
        const groups: Record<string, any[]> = {};
        filteredLogs.forEach(log => {
            const id = log.authId || 'guest';
            if (!groups[id]) groups[id] = [];
            groups[id].push(log);
        });
        
        const FIVE_MINUTES = 5 * 60 * 1000;
        
        return Object.entries(groups).map(([id, ulogs]) => {
            const userName = id === 'guest' ? 'Gäste / Unbekannt' : (userMap[id] || id);
            return {
                id,
                userName,
                logs: ulogs
            };
        }).filter(g => !hideInactive || (currentTime - new Date(g.logs[0].created).getTime()) < FIVE_MINUTES)
          .sort((a, b) => new Date(b.logs[0].created).getTime() - new Date(a.logs[0].created).getTime());
    });
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-7xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl w-full h-[85vh] flex relative overflow-hidden shadow-2xl border border-neutral-100">
        
        <!-- === SIDEBAR (Desktop) === -->
        <div class="hidden md:flex flex-col w-64 lg:w-72 bg-neutral-50/80 border-r border-neutral-200 shrink-0 z-10">
            <div class="p-6 border-b border-neutral-200 bg-white">
                <h2 class="text-xl font-black text-neutral-900 flex items-center gap-2"><span>📡</span> Log-Terminal</h2>
                <p class="text-xs font-medium text-neutral-500 mt-1">Live System-Überwachung</p>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar pb-6">
                <div class="p-4 border-b border-neutral-200">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 px-1">Ansicht</p>
                    <div class="flex bg-neutral-200/50 p-1 rounded-lg border border-neutral-200/50 shadow-inner">
                        <button onclick={() => viewMode = 'list'} class="flex-1 px-2 py-1.5 text-xs font-bold rounded-md transition-colors {viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Liste</button>
                        <button onclick={() => viewMode = 'users'} class="flex-1 px-2 py-1.5 text-xs font-bold rounded-md transition-colors {viewMode === 'users' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Nutzer-Cards</button>
                    </div>
                </div>

                <div class="p-4 border-b border-neutral-200">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 px-1">Smarte Kategorien</p>
                    <div class="space-y-1">
                        {#each categories as cat}
                            <button onclick={() => categoryFilter = cat.id} class="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-semibold {categoryFilter === cat.id ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-neutral-600 hover:bg-neutral-100 border border-transparent'}">
                                <span class="text-base leading-none">{cat.icon}</span> {cat.name}
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="p-4 border-b border-neutral-200">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3 px-1">Zusätzliche Filter</p>
                    <div class="space-y-3 px-1">
                        <label class="flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-neutral-700 group">
                            <input type="checkbox" bind:checked={onlyErrors} class="rounded border-neutral-300 text-rose-500 focus:ring-rose-500 w-4 h-4 group-hover:border-rose-400 transition-colors"> Nur Fehler (>= 400)
                        </label>
                        <label class="flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-neutral-700 group">
                            <input type="checkbox" bind:checked={hideSystemLogs} class="rounded border-neutral-300 text-indigo-500 focus:ring-indigo-500 w-4 h-4 group-hover:border-indigo-400 transition-colors"> System-Pings verbergen
                        </label>
                        {#if viewMode === 'users'}
                        <label class="flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-neutral-700 group animate-enter">
                            <input type="checkbox" bind:checked={hideInactive} class="rounded border-neutral-300 text-emerald-500 focus:ring-emerald-500 w-4 h-4 group-hover:border-emerald-400 transition-colors"> Inaktive ausblenden (>5m)
                        </label>
                        {/if}
                    </div>
                </div>
            </div>

            <div class="p-4 bg-white border-t border-neutral-200 mt-auto flex flex-col gap-3 shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <div class="relative w-full">
                    <input type="text" bind:value={searchQuery} placeholder="Suchen (URL, ID, Name)..." class="orga-input-clear py-2 px-3 text-xs bg-neutral-50 border border-neutral-200 w-full rounded-lg pl-8" />
                    <span class="absolute left-2.5 top-2 text-neutral-400 text-[10px]">🔍</span>
                </div>
                <div class="flex items-center gap-2">
                    {#if isRealtimeActive}
                        <span class="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200 shadow-sm flex-1 justify-center">
                            <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Realtime Aktiv
                        </span>
                    {:else}
                        <button type="button" onclick={toggleAutoRefresh} class="flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer {autoRefresh ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-neutral-500 bg-neutral-50 border-neutral-200'} transition-colors outline-none px-2 py-1.5 rounded-lg border shadow-sm flex-1">
                            <div class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors {autoRefresh ? 'bg-emerald-500' : 'bg-neutral-300'}"><span class="inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform {autoRefresh ? 'translate-x-3.5' : 'translate-x-0.5'}"></span></div> Auto-Sync
                        </button>
                    {/if}
                    <button onclick={loadLogs} disabled={isLoading} class="orga-button-ghost py-1.5 px-3 text-xs bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 shadow-sm flex items-center justify-center transition-colors shrink-0 rounded-lg"><span class={isLoading ? 'animate-spin' : ''}>↻</span></button>
                </div>
            </div>
        </div>

        <!-- === MAIN CONTENT === -->
        <div class="flex-1 flex flex-col relative h-full min-w-0 bg-neutral-50/40">
            
            <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 w-10 h-10 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-600 rounded-full hidden md:flex items-center justify-center transition-colors z-20 shadow-sm"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>

            <!-- Mobile Header (Hidden on Desktop) -->
            <div class="md:hidden flex flex-col bg-white border-b border-neutral-200 shrink-0 z-10 shadow-sm">
                <div class="p-4 flex items-center justify-between">
                    <h2 class="text-lg font-black text-neutral-900 flex items-center gap-2"><span>📡</span> Log-Terminal</h2>
                    <button aria-label="Schließen" onclick={close} class="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div class="px-4 pb-3 flex gap-2 overflow-x-auto custom-scrollbar">
                    <select bind:value={viewMode} class="text-xs font-bold bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 shrink-0 outline-none"><option value="list">Liste</option><option value="users">Nutzer-Cards</option></select>
                    <select bind:value={categoryFilter} class="text-xs font-bold bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 shrink-0 outline-none">
                        {#each categories as cat}<option value={cat.id}>{cat.name}</option>{/each}
                    </select>
                    <div class="relative w-32 shrink-0">
                        <input type="text" bind:value={searchQuery} placeholder="Suchen..." class="orga-input-clear py-1.5 px-3 text-xs bg-neutral-50 border border-neutral-200 w-full rounded-lg pl-7" />
                        <span class="absolute left-2 top-1.5 text-neutral-400 text-[10px]">🔍</span>
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 relative">
                {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100 shrink-0 shadow-sm">{errorMsg}</div>{/if}

            {#if filteredLogs.length === 0 && !isLoading && !errorMsg}
                    <div class="text-center py-12 md:py-20 text-neutral-400 font-medium flex flex-col items-center gap-3">
                    <span class="text-4xl opacity-50">📭</span>
                        <span class="text-neutral-800 font-bold text-base">Die Verbindung steht, aber es gibt keine passenden Einträge.</span>
                    {#if logs.length === 0}
                            <span class="text-sm text-neutral-500 max-w-md mt-2 px-4 leading-relaxed">Tipp: Öffne dein <b>PocketBase Dashboard &rarr; Settings &rarr; Logs</b> und stelle sicher, dass <i>"Log requests"</i> aktiviert ist.</span>
                    {/if}
                </div>
            {:else if filteredLogs.length === 0 && isLoading}
                <div class="flex justify-center items-center py-12"><div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
            {:else if viewMode === 'list'}
                    <div class="space-y-3 max-w-5xl">
                    {#each filteredLogs as log}
                            <button type="button" onclick={() => showLogDetail(log)} class="w-full text-left bg-white border border-neutral-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm font-mono flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center hover:border-indigo-300 hover:shadow-md transition-all group overflow-hidden relative cursor-pointer shadow-sm">
                            <div class="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 {log.status >= 400 ? 'bg-rose-500' : 'bg-transparent'}"></div>
                            
                            <div class="flex items-center justify-between w-full sm:w-auto pl-2 sm:pl-1">
                                <div class="w-16 sm:w-20 shrink-0 flex items-center">
                                        <span class="px-2 py-1 rounded text-[10px] sm:text-xs font-bold border shadow-sm {getMethodColor(log.method)}">{log.method}</span>
                                </div>
                                <!-- Auf Mobile: Status und Uhrzeit oben rechts -->
                                <div class="flex sm:hidden items-center gap-2">
                                    <span class="font-black text-sm {getStatusColor(log.status)}">{log.status}</span>
                                    <span class="text-[10px] text-neutral-400 font-semibold">{new Date(log.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                </div>
                            </div>

                            <div class="flex-1 min-w-0 pl-2 sm:pl-0 mt-1 sm:mt-0">
                                    <p class="text-neutral-900 font-bold truncate text-xs sm:text-sm" title={log.url}>{log.url}</p>
                                    <div class="text-[10px] text-neutral-500 mt-1.5 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5">
                                    <span class="flex items-center gap-1">🌐 {log.userIp}</span>
                                    {#if log.auth !== 'guest' && log.auth !== '-'}
                                            <span class="flex items-center gap-1 font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded shadow-sm" title="ID: {log.authId}">👤 {userMap[log.authId] || log.authId || log.auth}</span>
                                    {/if}
                                    <span class="flex items-center gap-1">⏱️ {log.execTime}ms</span>
                                    {#if log.isLogin && log.status === 200}
                                        <span class="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-1.5 rounded border border-emerald-200 animate-pulse">🔑 LOGIN ERFOLGREICH</span>
                                    {:else if log.isLogin}
                                        <span class="flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-1.5 rounded border border-rose-200">🔒 LOGIN FEHLGESCHLAGEN</span>
                                    {/if}
                                </div>
                            </div>

                            <!-- Auf Desktop: Status und Uhrzeit rechts -->
                                <div class="hidden sm:flex flex-col items-end justify-center gap-1.5 shrink-0 w-28 border-l border-neutral-100 pl-4">
                                <span class="font-black text-lg {getStatusColor(log.status)}">{log.status}</span>
                                <span class="text-[10px] text-neutral-400 font-semibold">{new Date(log.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            {:else}
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {#each userLogs as userGroup}
                            <div class="bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-80 transition-all hover:shadow-md hover:border-indigo-300">
                                <div class="bg-white border-b border-neutral-200 p-3 sm:p-4 flex items-center justify-between shrink-0">
                                <h3 class="font-bold text-neutral-900 truncate pr-2 flex items-center gap-2 text-sm sm:text-base">
                                        <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs shadow-inner shrink-0">👤</span>
                                    <span class="truncate">{userGroup.userName}</span>
                                </h3>
                                    <span class="text-[10px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-full shrink-0">{userGroup.logs.length} Aktionen</span>
                            </div>
                                <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                {#each userGroup.logs as log}
                                        <button type="button" onclick={() => showLogDetail(log)} class="w-full text-left bg-white border border-neutral-100 rounded-xl p-2.5 text-xs flex flex-col gap-1.5 shadow-sm relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                                        <div class="absolute left-0 top-0 bottom-0 w-1 {log.status >= 400 ? 'bg-rose-500' : 'bg-transparent'}"></div>
                                        <div class="flex items-center justify-between pl-1.5">
                                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border {getMethodColor(log.method)}">{log.method}</span>
                                                <span class="text-[10px] text-neutral-400 font-semibold">{new Date(log.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        </div>
                                            <p class="font-mono text-[10px] text-neutral-700 truncate pl-1.5" title={log.url}>{log.url}</p>
                                        {#if log.isLogin && log.status === 200}
                                                <span class="ml-1.5 self-start flex items-center gap-1 font-bold text-[9px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded shadow-sm animate-pulse mt-1">🔑 ERFOLG</span>
                                        {:else if log.isLogin}
                                                <span class="ml-1.5 self-start flex items-center gap-1 font-bold text-[9px] text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded shadow-sm mt-1">🔒 FEHLGESCHLAGEN</span>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        </div>
    </div>
</dialog>

<dialog bind:this={detailDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === detailDialog) closeLogDetail(); }}>
    <div class="bg-white rounded-3xl p-4 sm:p-6 md:p-8 w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
        <button aria-label="Schließen" onclick={closeLogDetail} class="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors z-20"><svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <div class="pr-10 sm:pr-12">
            <h3 class="text-lg sm:text-xl font-bold text-neutral-900 mb-1 sm:mb-2 flex items-center gap-2"><span>📄</span> Log-Details</h3>
            <p class="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4 border-b border-neutral-100 pb-3 sm:pb-4">Genaue Payload und Header der Server-Anfrage</p>
        </div>

        {#if selectedLogDetail}
            <div class="flex-1 overflow-y-auto custom-scrollbar bg-neutral-950 text-emerald-400 p-3 sm:p-5 rounded-xl border border-neutral-800 font-mono text-[10px] sm:text-[11px] md:text-xs shadow-inner">
                <pre class="whitespace-pre-wrap break-all leading-relaxed">{JSON.stringify(selectedLogDetail.raw, null, 2)}</pre>
            </div>
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-4 shrink-0">
                <button type="button" onclick={closeLogDetail} class="orga-button-ghost py-3 sm:py-2 text-sm bg-neutral-100 hover:bg-neutral-200 border-none w-full sm:w-auto">Schließen</button>
                <button type="button" onclick={() => { navigator.clipboard.writeText(JSON.stringify(selectedLogDetail.raw, null, 2)); toastStore.success("Erfolgreich kopiert!"); }} class="orga-button-primary py-3 sm:py-2 px-5 text-sm shadow-indigo-600/20 w-full sm:w-auto">📋 Kopieren</button>
            </div>
        {/if}
    </div>
</dialog>