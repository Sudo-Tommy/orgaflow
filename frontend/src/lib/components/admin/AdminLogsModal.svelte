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
    let realtimeCallback: ((e: any) => void) | null = null;
    let currentPage = $state(1);
    let hasMore = $state(true);
    let errorMsg = $state("");
    let userMap = $state<Record<string, string>>({});
    let onlyErrors = $state(false);
    let searchQuery = $state("");
    let viewMode = $state<'list' | 'users' | 'daily'>('daily');
    let hideSystemLogs = $state(true);
    let hideInactive = $state(true);
    let currentTime = $state(Date.now());
    let timeTicker: any;
    
    let detailDialog: HTMLDialogElement;
    let selectedLogDetail = $state<any>(null);
    let ipLocationData = $state<any>(null);

    let totalVisits = $state(0);
    
    let currentVisitors = $derived.by(() => {
        const fiveMinsAgo = currentTime - 5 * 60 * 1000;
        const recentLogs = logs.filter(l => new Date(l.created).getTime() > fiveMinsAgo);
        const uniqueUsers = new Set(recentLogs.map(l => l.authId || l.userIp).filter(id => id && id !== '-'));
        return uniqueUsers.size;
    });

    let categoryFilter = $state('all');
    let dateFilter = $state('all');
    let sortBy = $state<'time' | 'user'>('time');
    
    const categories = [
        { id: 'all', name: 'Alle Aktionen', icon: '🌍' },
        { id: 'auth', name: 'Logins & Auth', icon: '🔑' },
        { id: 'appointments', name: 'Termine & Zeiten', icon: '📅' },
        { id: 'clients', name: 'Klienten & Akten', icon: '👥' },
        { id: 'emails', name: 'E-Mails & Chat', icon: '✉️' },
        { id: 'invoices', name: 'Finanzen & Rechnungen', icon: '💶' },
    ];

    // Ermittelt dynamisch alle verfügbaren Tage aus den geladenen Logs
    let availableDates = $derived.by(() => {
        const dates = new Map<string, string>();
        const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

        logs.forEach(l => {
            if (!l.created) return;
            const dateStr = new Date(l.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            if (!dates.has(dateStr)) {
                let label = dateStr;
                if (dateStr === today) label = "Heute (" + dateStr + ")";
                else if (dateStr === yesterday) label = "Gestern (" + dateStr + ")";
                dates.set(dateStr, label);
            }
        });
        
        return Array.from(dates.entries())
            .map(([date, label]) => ({ date, label, sortKey: date.split('.').reverse().join('-') }))
            .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    });

    export function open() {
        dialog?.showModal();
        errorMsg = "";
        currentPage = 1;
        hasMore = true;
        logs = [];
        dateFilter = 'all';
        loadUsers();
        loadLogs();
        if (autoRefresh && !isRealtimeActive) startAutoRefresh();
        
        // Lässt eine "Stoppuhr" im Hintergrund ticken, um inaktive Nutzer automatisch auszublenden
        clearInterval(timeTicker);
        timeTicker = setInterval(() => currentTime = Date.now(), 30000);
    }

    export function close() {
        stopAutoRefresh();
        clearInterval(timeTicker);
        dialog?.close();
    }
    
    function showLogDetail(log: any) {
        selectedLogDetail = log;
        ipLocationData = null; // Alten Standort-Cache leeren
        
        // IP-Adresse nach Standort auflösen (Interne Netzwerke und Localhost überspringen)
        const ip = log.userIp;
        if (ip && ip !== '-' && !ip.includes('WebSocket') && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
            fetch(`https://ipapi.co/${ip}/json/`)
                .then(res => res.json())
                .then(data => {
                    // Prüfen, ob sinnvolle Geodaten zurückkamen (ohne Rate-Limit-Fehler)
                    if (data && data.latitude && data.longitude) {
                        ipLocationData = data;
                    }
                }).catch(e => console.warn("Standort konnte nicht geladen werden:", e));
        }

        setTimeout(() => detailDialog?.showModal(), 0);
    }

    function closeLogDetail() {
        detailDialog?.close();
        selectedLogDetail = null;
    }

    function exportLogs() {
        const csvRows: string[] = [
            ['Zeitpunkt', 'Status', 'Methode', 'Aktion', 'Beschreibung', 'Nutzer', 'IP-Adresse', 'Endgerät', 'URL']
            .map(v => `"${(v+'').replace(/"/g, '""')}"`).join(',')
        ];
        
        filteredLogs.forEach(l => {
            const user = userMap[l.authId] || l.authId || l.auth;
            csvRows.push([
                new Date(l.created).toLocaleString('de-DE'),
                l.status,
                l.method,
                l.action,
                l.description,
                user,
                l.userIp,
                `${l.deviceName} (${l.userAgent})`,
                l.url
            ].map(v => `"${(v+'').replace(/"/g, '""')}"`).join(','));
        });
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `OrgaFlow_Logs_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        toastStore.success("CSV-Export gestartet!");
    }

    function clearLocalLogs() {
        logs = [];
        totalVisits = 0;
        currentPage = 1;
        hasMore = false;
        toastStore.success("Ansicht geleert. (Alte Logs werden von PocketBase im Hintergrund automatisch vom Server gelöscht)");
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

    async function loadLogs(isSilent = false, loadMore = false) {
        if (!isSilent) isLoading = true;
        
        let targetPage = 1;
        if (loadMore) {
            currentPage++;
            targetPage = currentPage;
        } else if (!isSilent) {
            currentPage = 1;
        }
        
        try {
            let res;
            // 1. Versuch: Über unseren eigenen PB_HOOKS Endpunkt
            try {
                res = await pb.send("/api/orgaflow/logs", { query: { page: targetPage, perPage: 1000 } });
            } catch (customErr) {
                try {
                    // 2. Versuch: Direkter Zugriff auf _logs
                    res = await pb.collection('_logs').getList(targetPage, 1000, { sort: '-created' });
                } catch (err: any) {
                    // 3. Versuch: Altes PocketBase (v0.22 und älter)
                    res = await pb.send("/api/logs/requests", { query: { page: targetPage, perPage: 1000, sort: '-created' } });
                }
            }
            
            if (!res || !res.items) throw new Error("Keine Logs erhalten");
            
            const newLogs = res.items.map(formatLog);
            
            if (!isSilent) {
                hasMore = newLogs.length >= 1000;
            }
            
            if (loadMore) {
                const existingIds = new Set(logs.map((l: any) => l.id));
                const uniqueNewLogs = newLogs.filter((l: any) => !existingIds.has(l.id));
                logs = [...logs, ...uniqueNewLogs];
            } else if (isSilent) {
                if (logs.length > 0 && newLogs.length > 0) {
                    const existingIds = new Set(logs.map((l: any) => l.id));
                    const additions = newLogs.filter((l: any) => !existingIds.has(l.id));
                    if (additions.length > 0) {
                        logs = [...additions, ...logs].slice(0, 5000);
                    }
                } else if (logs.length === 0) {
                    logs = newLogs;
                }
            } else {
                logs = newLogs;
            }
            
            if (res.totalVisits || res.totalItems) {
                totalVisits = res.totalVisits || res.totalItems;
            }
            errorMsg = "";
        } catch (fallbackErr) {
            if (!logs.length) {
                errorMsg = "System-Logs sind blockiert (403/404). Um die Logs live zu sehen, muss die 'main.pb.js' Hook-Datei auf dem Server angelegt werden (siehe Entwickler-Antwort).";
                stopAutoRefresh();
                autoRefresh = false;
            }
        } finally {
            if (!isSilent) isLoading = false;
        }
    }

    function formatLog(item: any) {
        let data = item.data || {};
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) {}
        }

        const url = data.url || item.message || '';
        const method = data.method || item.method || 'GET';
        const status = data.status || (typeof item.level !== 'undefined' && item.level >= 0 ? 200 : 500) || 200;
        
        // Zieht die IP für den "Jetzt online" Zähler korrekt aus dem data-Objekt
        const ip = data.remoteIp || data.remoteIP || data.userIp || data.userIP || item.userIp || '-';
        const referer = data.referer || '-';
        const execTime = typeof data.execTime !== 'undefined' ? parseFloat(data.execTime).toFixed(1) : 0;

        let rawUserAgent = item.userAgent || data.userAgent || (data.headers && (data.headers['user-agent'] || data.headers['User-Agent'])) || '';
        let deviceIcon = '💻';
        let deviceName = 'Unbekanntes Gerät';
        let browserName = '';

        if (rawUserAgent) {
            if (rawUserAgent.includes('iPhone')) { deviceIcon = '📱'; deviceName = 'Apple iPhone'; }
            else if (rawUserAgent.includes('iPad')) { deviceIcon = '📱'; deviceName = 'Apple iPad'; }
            else if (rawUserAgent.includes('Mac OS')) { deviceIcon = '🍏'; deviceName = 'Apple Mac'; }
            else if (rawUserAgent.includes('Android')) { deviceIcon = '🤖'; deviceName = 'Android Gerät'; }
            else if (rawUserAgent.includes('Windows')) { deviceIcon = '🪟'; deviceName = 'Windows PC'; }
            else if (rawUserAgent.includes('Linux')) { deviceIcon = '🐧'; deviceName = 'Linux PC'; }
            
            if (rawUserAgent.includes('Edg/') || rawUserAgent.includes('Edge')) browserName = 'Microsoft Edge';
            else if (rawUserAgent.includes('OPR/') || rawUserAgent.includes('Opera')) browserName = 'Opera Browser';
            else if (rawUserAgent.includes('Firefox') || rawUserAgent.includes('FxiOS')) browserName = 'Mozilla Firefox';
            else if (rawUserAgent.includes('CriOS') || rawUserAgent.includes('Chrome')) browserName = 'Google Chrome';
            else if (rawUserAgent.includes('Safari') && !rawUserAgent.includes('Chrome')) browserName = 'Apple Safari';
            
            if (deviceName !== 'Unbekanntes Gerät' && browserName) {
                deviceName = `${deviceName} mit ${browserName}`;
            } else if (browserName) {
                deviceName = `Gerät mit ${browserName}`;
            }
        } else {
            deviceIcon = '⚙️';
            deviceName = 'Internes System';
        }

        let action = url || 'System-Ereignis';
        let description = item.message || "Keine weitere Beschreibung.";
        let icon = "⚙️";

        // --- MENSCHLICHE ÜBERSETZUNGEN ---
        if (url.includes("/public_busy_days")) {
            action = "Kalender aufgerufen";
            description = "Ein Besucher prüft freie Termine auf der Landingpage.";
            icon = "📅";
        } else if (url.includes("/appointment_requests") && method === "POST") {
            action = "Neue Terminanfrage";
            description = "Eine neue Terminanfrage wurde über die Webseite gesendet!";
            icon = "📬";
        } else if (url.includes("/auth-with-password") || url.includes("/auth-refresh")) {
            action = "Login-Versuch";
            description = status === 200 ? "Erfolgreiche Anmeldung." : "Fehlgeschlagene Anmeldung.";
            icon = status === 200 ? "🔓" : "❌";
        } else if (url.includes("/api/orgaflow/logs")) {
            action = "Log-Terminal aktiv";
            description = "Ein Administrator liest gerade die Server-Ereignisse aus.";
            icon = "📡";
        } else if (url.includes("/api/emails/portal")) {
            action = "System-E-Mail";
            description = "Es wurde eine E-Mail über das Portal versendet.";
            icon = "📧";
        } else if (url.includes("/api/collections/")) {
            const coll = url.split("/api/collections/")[1]?.split("/")[0] || "Unbekannt";
            const isRead = method === "GET";
            action = "Datenbank-Zugriff";
            description = `${isRead ? 'Lesezugriff auf' : 'Schreibzugriff auf'} Tabelle '${coll}'.`;
            icon = "🗄️";
        } else if (item.message === "Live-Log Terminal aktiv") {
            action = "Log-Abfrage";
            description = "Ein Administrator liest gerade die Server-Ereignisse aus.";
            icon = "📡";
        }

        let isLogin = url.includes('auth-with-password') || url.includes('auth-refresh');

        return {
            id: item.id, 
            created: item.created, 
            method: method, 
            url: url,
            status: status, 
            userIp: ip, 
            auth: data.auth || 'guest', 
            authId: data.authId || '',
            execTime: execTime,
            isLogin,
            action,
            description,
            icon,
            userAgent: rawUserAgent,
            deviceIcon: deviceIcon,
            deviceName: deviceName,
            referer: referer,
            raw: item
        };
    }

    function formatQueryParams(url: string) {
        if (!url || !url.includes('?')) return '';
        try {
            const query = url.split('?')[1];
            const params = new URLSearchParams(query);
            const formatted: string[] = [];
            params.forEach((value, key) => {
                formatted.push(`${key}: ${value}`);
            });
            return formatted.join(' | ');
        } catch (e) {
            return url.split('?')[1].replace(/&/g, ' | ');
        }
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        isRealtimeActive = true;
        
        // 1. Sanftes Polling für reine Lese-Zugriffe (Seitenaufrufe), da diese keine DB-Events auslösen
        refreshInterval = setInterval(() => loadLogs(true), 5000);
        
        // 2. Realtime-Workaround: Abonnieren ALLER Tabellen für einen echten Live-Debugger
        realtimeCallback = (e: any) => {
            const actionText = e.action === 'create' ? 'erstellt' : (e.action === 'update' ? 'bearbeitet' : 'gelöscht');
            
            const liveLog = {
                id: "live_" + e.record.id + "_" + Date.now(),
                created: new Date().toISOString(),
                method: e.action === 'delete' ? 'DELETE' : (e.action === 'create' ? 'POST' : 'PATCH'),
                status: 200,
                userIp: "WebSocket (Live)",
                authId: e.record.user || e.record.updated_by || e.record.created_by || "-",
                message: "Live Datenbank-Ereignis",
                data: { url: `/api/collections/${e.collectionName}/records/${e.record.id}`, userAgent: "PocketBase Realtime Tracker" },
                raw: e.record
            };
            
            const formatted = formatLog(liveLog);
            formatted.action = "Live Datenbank-Änderung ⚡";
            formatted.description = `Ein Datensatz in der Tabelle '${e.collectionName}' wurde soeben ${actionText}.`;
            formatted.icon = "⚡";
            
            logs = [formatted, ...logs].slice(0, 5000);
            totalVisits++;
        };

        pb.collection('*').subscribe('*', realtimeCallback).catch((err) => console.warn("Realtime Debugger nicht verfügbar:", err));
    }

    function stopAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        if (isRealtimeActive && realtimeCallback) pb.collection('*').unsubscribe('*').catch(()=>{});
        isRealtimeActive = false;
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
        let result = logs.filter(log => {
            // Filter nach Datum
            if (dateFilter !== 'all') {
                const logDate = new Date(log.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                if (logDate !== dateFilter) return false;
            }

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

        if (sortBy === 'user') {
            result.sort((a, b) => {
                const nameA = (userMap[a.authId] || a.authId || a.auth || 'guest').toLowerCase();
                const nameB = (userMap[b.authId] || b.authId || b.auth || 'guest').toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return new Date(b.created).getTime() - new Date(a.created).getTime();
            });
        } else {
            result.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        }

        return result;
    });
    
    function getStatusColor(status: number) {
        if (status >= 200 && status < 300) return 'text-emerald-600';
        if (status >= 300 && status < 400) return 'text-blue-600';
        if (status >= 400 && status < 500) return 'text-amber-600';
        if (status >= 500) return 'text-rose-600';
        return 'text-neutral-600';
    }

    function bundleLogs(userLogs: any[]) {
        const bundled: any[] = [];
        for (const log of userLogs) {
            // Bündeln anhand der exakten Aktion
            const existing = bundled.find(b => b.action === log.action);
            if (existing) {
                existing.count = (existing.count || 1) + 1;
                // Setze den Zeitpunkt auf die allerneueste Anfrage
                if (new Date(log.created).getTime() > new Date(existing.created).getTime()) {
                    existing.created = log.created;
                }
            } else {
                bundled.push({ ...log, count: 1 });
            }
        }
        // Nach Aktualität sortieren
        return bundled.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
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
        
        let result = Object.entries(groups).map(([id, ulogs]) => {
            const userName = id === 'guest' ? 'Gäste / Unbekannt' : (userMap[id] || id);
            return {
                id,
                userName,
                logs: ulogs
            };
        }).filter(g => !hideInactive || (currentTime - new Date(g.logs[0].created).getTime()) < FIVE_MINUTES);

        if (sortBy === 'user') {
            result.sort((a, b) => {
                const nameA = a.userName.toLowerCase();
                const nameB = b.userName.toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });
        } else {
            result.sort((a, b) => new Date(b.logs[0].created).getTime() - new Date(a.logs[0].created).getTime());
        }

        return result;
    });

    // Tagesübersicht mit Page-Click-Counter
    let dailyStats = $derived.by(() => {
        const stats: Record<string, { date: string, dateObj: Date, uniqueIps: Set<string>, actions: number, activeUsers: Set<string>, pageClicks: number, events: any[] }> = {};
        
        filteredLogs.forEach(log => {
            const d = new Date(log.created);
            const dateKey = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            if (!stats[dateKey]) {
                stats[dateKey] = {
                    date: dateKey,
                    dateObj: d,
                    uniqueIps: new Set(),
                    actions: 0,
                    activeUsers: new Set(),
                    pageClicks: 0,
                    events: []
                };
            }
            
            stats[dateKey].actions++;
            
            if (log.userIp && log.userIp !== '-' && log.userIp !== 'WebSocket (Live)') {
                stats[dateKey].uniqueIps.add(log.userIp);
            }
            
            if (log.authId && log.authId !== '-' && log.authId !== 'guest') {
                stats[dateKey].activeUsers.add(userMap[log.authId] || log.authId);
            }
            
            // "Page-Click" heuristisch: Ein lesender Zugriff (GET) der nicht vom System selbst kommt
            if (log.method === 'GET' && !log.url.includes('/api/orgaflow/logs') && !log.url.includes('_logs')) {
                stats[dateKey].pageClicks++;
            }
            
            stats[dateKey].events.push(log);
        });
        
        return Object.values(stats).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    });
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-7xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl w-full h-[85vh] flex relative overflow-hidden shadow-2xl border border-neutral-100">
        
        <!-- === SIDEBAR (Desktop) === -->
        <div class="hidden md:flex flex-col w-64 lg:w-72 bg-neutral-50/80 border-r border-neutral-200 shrink-0 z-10">
            <div class="p-6 border-b border-neutral-200 bg-white">
                <h2 class="text-xl font-black text-neutral-900 flex items-center gap-2"><span>📡</span> Log-Terminal</h2>
                <p class="text-xs font-medium text-neutral-500 mt-1">Live System-Überwachung</p>
                
                <div class="flex gap-2 mt-4 pt-4 border-t border-neutral-100">
                    <div class="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center" title="Aktive Nutzer (letzte 5 Min)">
                        <div class="text-emerald-600 font-black text-lg leading-none">{currentVisitors}</div>
                        <div class="text-[9px] text-emerald-800 font-bold uppercase tracking-wider mt-1">Jetzt online</div>
                    </div>
                    <div class="flex-1 bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-center" title="Gesamte Aufrufe (Log-Historie)">
                        <div class="text-indigo-600 font-black text-lg leading-none">{totalVisits}</div>
                        <div class="text-[9px] text-indigo-800 font-bold uppercase tracking-wider mt-1">Unique IPs</div>
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar pb-6">
                <div class="p-4 border-b border-neutral-200">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 px-1">Ansicht</p>
                    <div class="flex bg-neutral-200/50 p-1 rounded-lg border border-neutral-200/50 shadow-inner mb-3">
                        <button onclick={() => viewMode = 'list'} class="flex-1 px-1 py-1.5 text-[10px] xl:text-xs font-bold rounded-md transition-colors {viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Liste</button>
                        <button onclick={() => viewMode = 'users'} class="flex-1 px-1 py-1.5 text-[10px] xl:text-xs font-bold rounded-md transition-colors {viewMode === 'users' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Nutzer</button>
                        <button onclick={() => viewMode = 'daily'} class="flex-1 px-1 py-1.5 text-[10px] xl:text-xs font-bold rounded-md transition-colors {viewMode === 'daily' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Tage</button>
                    </div>
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 px-1">Sortierung</p>
                    <div class="flex bg-neutral-200/50 p-1 rounded-lg border border-neutral-200/50 shadow-inner">
                        <button onclick={() => sortBy = 'time'} class="flex-1 px-2 py-1.5 text-xs font-bold rounded-md transition-colors {sortBy === 'time' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Nach Zeit</button>
                        <button onclick={() => sortBy = 'user'} class="flex-1 px-2 py-1.5 text-xs font-bold rounded-md transition-colors {sortBy === 'user' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Nach Nutzer</button>
                    </div>
                </div>

                <div class="p-4 border-b border-neutral-200">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 px-1">Datum / Zeitraum</p>
                    <select bind:value={dateFilter} class="orga-input-clear py-2 px-3 text-xs bg-neutral-50 border border-neutral-200 w-full rounded-lg font-bold text-neutral-700 outline-none">
                        <option value="all">Alle geladenen Tage</option>
                        {#each availableDates as d}<option value={d.date}>{d.label}</option>{/each}
                    </select>
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
            <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                <button type="button" onclick={clearLocalLogs} class="orga-button-ghost py-1.5 px-2.5 text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 shadow-sm flex items-center justify-center transition-colors shrink-0 rounded-lg font-bold" title="Speicher der aktuellen Ansicht leeren">🗑️</button>
                <button type="button" onclick={exportLogs} class="orga-button-ghost py-1.5 px-3 text-xs bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 shadow-sm flex items-center justify-center transition-colors shrink-0 rounded-lg text-neutral-600 gap-1.5 font-bold" title="Aktuelle Ansicht als CSV exportieren"><span>⬇️</span> CSV</button>
                    {#if isRealtimeActive}
                        <button type="button" onclick={toggleAutoRefresh} class="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg border border-emerald-200 shadow-sm flex-1 transition-colors outline-none cursor-pointer">
                            <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Realtime Aktiv
                        </button>
                    {:else}
                        <button type="button" onclick={toggleAutoRefresh} class="flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer {autoRefresh ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-neutral-500 bg-neutral-50 border-neutral-200'} transition-colors outline-none px-2 py-1.5 rounded-lg border shadow-sm flex-1">
                            <div class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors {autoRefresh ? 'bg-emerald-500' : 'bg-neutral-300'}"><span class="inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform {autoRefresh ? 'translate-x-3.5' : 'translate-x-0.5'}"></span></div> Auto-Sync
                        </button>
                    {/if}
                    <button onclick={() => loadLogs(false)} disabled={isLoading} class="orga-button-ghost py-1.5 px-3 text-xs bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 shadow-sm flex items-center justify-center transition-colors shrink-0 rounded-lg"><span class={isLoading ? 'animate-spin' : ''}>↻</span></button>
                </div>
            </div>
        </div>

        <!-- === MAIN CONTENT === -->
        <div class="flex-1 flex flex-col relative h-full min-w-0 bg-neutral-50/40">
            
            <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 w-10 h-10 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-600 rounded-full hidden md:flex items-center justify-center transition-colors z-20 shadow-sm"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>

            <!-- Mobile Header (Hidden on Desktop) -->
            <div class="md:hidden flex flex-col bg-white border-b border-neutral-200 shrink-0 z-10 shadow-sm">
                <div class="p-4 flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-black text-neutral-900 flex items-center gap-2"><span>📡</span> Log-Terminal</h2>
                        <div class="flex gap-3 mt-1.5">
                            <span class="text-xs font-bold text-emerald-600 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {currentVisitors} Online</span>
                            <span class="text-xs font-bold text-indigo-600">👁️ {totalVisits} Unique IPs</span>
                        </div>
                    </div>
                <div class="flex items-center gap-2">
                    <button onclick={clearLocalLogs} class="w-8 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg flex items-center justify-center transition-colors shadow-sm" title="Speicher leeren">🗑️</button>
                    <button onclick={exportLogs} class="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg flex items-center justify-center transition-colors shadow-sm" title="CSV Export">⬇️</button>
                    <button aria-label="Schließen" onclick={close} class="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                </div>
                <div class="px-4 pb-3 flex gap-2 overflow-x-auto custom-scrollbar">
                    <select bind:value={viewMode} class="text-xs font-bold bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 shrink-0 outline-none">
                        <option value="list">Liste</option>
                        <option value="users">Nutzer-Cards</option>
                        <option value="daily">Tagesübersicht</option>
                    </select>
                    <select bind:value={dateFilter} class="text-xs font-bold bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 shrink-0 outline-none">
                        <option value="all">Alle Tage</option>
                        {#each availableDates as d}<option value={d.date}>{d.label}</option>{/each}
                    </select>
                    <select bind:value={sortBy} class="text-xs font-bold bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 shrink-0 outline-none"><option value="time">Nach Zeit</option><option value="user">Nach Nutzer</option></select>
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
                                <div class="flex items-center gap-2 mb-0.5">
                                    <span class="text-base sm:text-lg shrink-0 leading-none">{log.icon}</span>
                                    <p class="text-neutral-900 font-bold truncate text-xs sm:text-sm" title={log.action}>{log.action}</p>
                                </div>
                                <p class="text-xs text-neutral-500 leading-snug truncate mb-1.5">{log.description}</p>
                                <div class="text-[10px] text-neutral-500 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5">
                                    <span class="flex items-center gap-1" title={log.url}>🔗 {log.url.split('?')[0].substring(0,30)}{log.url.length > 30 ? '...' : ''}</span>
                                    <span class="flex items-center gap-1">🌐 {log.userIp}</span>
                                <span class="flex items-center gap-1" title={log.userAgent}>{log.deviceIcon} {log.deviceName}</span>
                                    {#if log.auth !== 'guest' && log.auth !== '-'}
                                        <span class="flex items-center gap-1 font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded shadow-sm" title="ID: {log.authId}">👤 {userMap[log.authId] || log.authId || log.auth}</span>
                                    {/if}
                                    <span class="flex items-center gap-1">⏱️ {log.execTime}ms</span>
                                </div>
                            </div>

                            <!-- Auf Desktop: Status und Uhrzeit rechts -->
                                <div class="hidden sm:flex flex-col items-end justify-center gap-1.5 shrink-0 w-28 border-l border-neutral-100 pl-4">
                                <span class="font-black text-lg {getStatusColor(log.status)}">{log.status}</span>
                                <span class="text-[10px] text-neutral-400 font-semibold text-right">{new Date(log.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            {:else if viewMode === 'users'}
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
                                {#each bundleLogs(userGroup.logs) as log}
                                        <button type="button" onclick={() => showLogDetail(log)} class="w-full text-left bg-white border border-neutral-100 rounded-xl p-2.5 text-xs flex flex-col gap-1.5 shadow-sm relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                                        <div class="absolute left-0 top-0 bottom-0 w-1 {log.status >= 400 ? 'bg-rose-500' : 'bg-transparent'}"></div>
                                        <div class="flex items-center justify-between pl-1.5">
                                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border {getMethodColor(log.method)}">{log.method}</span>
                                                <span class="text-[10px] text-neutral-400 font-semibold">{new Date(log.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        </div>
                                        <div class="flex items-start gap-2 pl-1.5 pt-1 mt-0.5">
                                            <span class="text-base leading-none shrink-0">{log.icon}</span>
                                            <div class="min-w-0 flex-1">
                                                <div class="flex items-center gap-1.5 mb-0.5">
                                                    {#if log.count > 1}
                                                        <span class="text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-md shadow-sm shrink-0">{log.count}x</span>
                                                    {/if}
                                                    <p class="text-xs font-bold text-neutral-900 truncate" title={log.action}>{log.action}</p>
                                                </div>
                                                <p class="text-[10px] text-neutral-500 mt-0.5 leading-snug line-clamp-2">{log.description}</p>
                                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[9px] font-bold text-neutral-400">
                                                <span class="flex items-center gap-1">🌐 {log.userIp}</span>
                                                <span class="flex items-center gap-1" title={log.userAgent}>{log.deviceIcon} {log.deviceName}</span>
                                            </div>
                                            </div>
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {:else if viewMode === 'daily'}
                <div class="space-y-6 max-w-5xl">
                    {#each dailyStats as day}
                        <div class="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                            <!-- Header -->
                            <div class="bg-neutral-50 border-b border-neutral-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 class="font-black text-lg text-neutral-900 flex items-center gap-2">
                                        <span>📅</span> {day.date === new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) ? 'Heute' : day.date}
                                    </h3>
                                    <p class="text-xs text-neutral-500 mt-1 font-medium">Zusammenfassung des Tages</p>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <div class="bg-white border border-neutral-200 px-3 py-1.5 rounded-lg text-center shadow-sm" title="Jeder Lese-Zugriff auf die Datenbank wird als ein Seitenaufruf gezählt">
                                        <div class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Seitenaufrufe</div>
                                        <div class="text-lg font-black text-indigo-600 leading-none">{day.pageClicks}</div>
                                    </div>
                                    <div class="bg-white border border-neutral-200 px-3 py-1.5 rounded-lg text-center shadow-sm" title="Anzahl der unterschiedlichen Geräte/Netzwerke">
                                        <div class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Besucher (IPs)</div>
                                        <div class="text-lg font-black text-emerald-600 leading-none">{day.uniqueIps.size}</div>
                                    </div>
                                    <div class="bg-white border border-neutral-200 px-3 py-1.5 rounded-lg text-center shadow-sm" title="Summe aller Protokoll-Einträge inkl. Hintergrund-Aktivitäten">
                                        <div class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Aktionen gesamt</div>
                                        <div class="text-lg font-black text-amber-600 leading-none">{day.actions}</div>
                                    </div>
                                </div>
                            </div>
                            <!-- Content -->
                            <div class="p-4 flex flex-col gap-4">
                                {#if day.activeUsers.size > 0}
                                    <div class="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                                        <p class="text-xs font-bold text-indigo-800 mb-2">Angemeldete Nutzer an diesem Tag:</p>
                                        <div class="flex flex-wrap gap-2">
                                            {#each Array.from(day.activeUsers) as user}
                                                <span class="bg-white border border-indigo-200 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">👤 {user}</span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                
                                <div>
                                    <p class="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Aktivitäten-Protokoll (Auszug)</p>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {#each bundleLogs(day.events).slice(0, 12) as log}
                                            <button type="button" onclick={() => showLogDetail(log)} class="text-left bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs flex flex-col gap-1.5 shadow-sm relative overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                                                <div class="absolute left-0 top-0 bottom-0 w-1 {log.status >= 400 ? 'bg-rose-500' : 'bg-indigo-500'}"></div>
                                                <div class="flex items-center justify-between pl-1.5">
                                                    <span class="text-[10px] text-neutral-500 font-bold">{new Date(log.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                                    {#if log.count > 1}
                                                        <span class="text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-md shadow-sm">{log.count}x</span>
                                                    {/if}
                                                </div>
                                                <div class="flex items-start gap-2 pl-1.5 mt-0.5">
                                                    <span class="text-base leading-none shrink-0">{log.icon}</span>
                                                    <div class="min-w-0 flex-1">
                                                        <p class="text-xs font-bold text-neutral-900 truncate" title={log.action}>{log.action}</p>
                                                        <p class="text-[10px] text-neutral-500 mt-0.5 line-clamp-2 leading-snug">{log.description}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        {/each}
                                    </div>
                                    {#if bundleLogs(day.events).length > 12}
                                        <p class="text-xs font-medium text-neutral-400 mt-3 text-center">... und {bundleLogs(day.events).length - 12} weitere, ähnliche Aktionen an diesem Tag.</p>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
            
            {#if hasMore && filteredLogs.length > 0 && !errorMsg}
                <div class="flex justify-center mt-6 mb-4">
                    <button type="button" onclick={() => loadLogs(false, true)} disabled={isLoading} class="bg-white border border-neutral-200 text-neutral-600 hover:text-indigo-600 hover:border-indigo-300 font-bold py-2.5 px-6 rounded-xl text-xs shadow-sm transition-colors flex items-center gap-2">
                        {#if isLoading}
                            <div class="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div> Lädt...
                        {:else}
                            <span>⬇️</span> Ältere Logs laden
                        {/if}
                    </button>
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
            <p class="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4 border-b border-neutral-100 pb-3 sm:pb-4">Genaue Auswertung der Server-Anfrage</p>
        </div>

        {#if selectedLogDetail}
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 shrink-0">
                <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Akteur</p>
                    <p class="text-sm font-bold text-neutral-900 truncate" title="{userMap[selectedLogDetail.authId] || selectedLogDetail.authId || selectedLogDetail.auth}">👤 {userMap[selectedLogDetail.authId] || selectedLogDetail.authId || selectedLogDetail.auth}</p>
                </div>
                <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">IP Adresse</p>
                    <p class="text-sm font-bold text-neutral-900 truncate">🌐 {selectedLogDetail.userIp}</p>
                </div>
                <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Endgerät</p>
                    <p class="text-sm font-bold text-neutral-900 truncate" title="{selectedLogDetail.userAgent}">{selectedLogDetail.deviceIcon} {selectedLogDetail.deviceName}</p>
                </div>
                <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Zeitpunkt</p>
                    <p class="text-sm font-bold text-neutral-900 truncate">⏱️ {new Date(selectedLogDetail.created).toLocaleString('de-DE')}</p>
                </div>
            </div>
            
            <h4 class="text-sm font-bold text-neutral-900 mb-2 mt-2">Weitere Hintergrund-Details</h4>
            <div class="flex-1 overflow-y-auto custom-scrollbar bg-neutral-50 p-4 sm:p-5 rounded-xl border border-neutral-100 flex flex-col gap-5">
                <div class="flex flex-col gap-1.5">
                    <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">System-Nachricht</span>
                    <span class="text-sm font-medium text-neutral-800">{selectedLogDetail.raw?.message || 'Keine Nachricht'}</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-neutral-200/60 pt-5">
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Aufgerufener Bereich</span>
                        <span class="text-sm font-medium text-neutral-800 break-all">{selectedLogDetail.url?.split('?')[0] || 'Unbekannt'}</span>
                    </div>
                    {#if selectedLogDetail.url?.includes('?')}
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Such- & Filterparameter</span>
                        <span class="text-xs font-mono font-medium text-neutral-700 break-all bg-white px-2.5 py-1.5 rounded-lg border border-neutral-100 shadow-sm">{formatQueryParams(selectedLogDetail.url)}</span>
                    </div>
                    {/if}
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Aktions-Typ</span>
                        <span class="text-sm font-medium text-neutral-800 flex items-center gap-2">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold border {getMethodColor(selectedLogDetail.method)}">{selectedLogDetail.method}</span>
                            {selectedLogDetail.method === 'GET' ? 'Daten abfragen (Ansehen)' : 
                             selectedLogDetail.method === 'POST' ? 'Neue Daten anlegen (Speichern)' : 
                             selectedLogDetail.method === 'PATCH' || selectedLogDetail.method === 'PUT' ? 'Daten bearbeiten (Ändern)' :
                             selectedLogDetail.method === 'DELETE' ? 'Daten löschen (Entfernen)' : 
                             'Unbekannt'}
                        </span>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Server-Antwort (Status)</span>
                        <span class="text-sm font-bold {selectedLogDetail.status >= 400 ? 'text-rose-600' : 'text-emerald-600'}">
                            {selectedLogDetail.status === 200 ? 'Erfolgreich ausgeführt (200)' : 
                             selectedLogDetail.status === 400 ? 'Fehlerhafte Anfrage (400)' :
                             selectedLogDetail.status === 401 ? 'Nicht angemeldet (401)' :
                             selectedLogDetail.status === 403 ? 'Zugriff verweigert (403)' :
                             selectedLogDetail.status === 404 ? 'Nicht gefunden (404)' :
                             selectedLogDetail.status === 500 ? 'Interner Server-Fehler (500)' :
                             `Abgeschlossen (${selectedLogDetail.status})`}
                        </span>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Herkunft (Referer)</span>
                        <span class="text-sm font-medium text-neutral-800 break-all">
                            {#if selectedLogDetail.referer !== '-'}
                                <a href={selectedLogDetail.referer} target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 hover:underline">{selectedLogDetail.referer}</a>
                            {:else}
                                <span class="text-neutral-500 italic">Direktaufruf / Intern</span>
                            {/if}
                        </span>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Verarbeitungsdauer</span>
                        <span class="text-sm font-medium text-neutral-800">{selectedLogDetail.execTime} Millisekunden</span>
                    </div>
                </div>

                {#if selectedLogDetail.userAgent}
                    <div class="border-t border-neutral-200/60 pt-5 flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Browser-Fingerabdruck (Identifikation)</span>
                        <span class="text-[11px] text-neutral-500 break-all font-mono bg-white p-2.5 rounded-lg border border-neutral-200 shadow-inner mt-0.5">{selectedLogDetail.userAgent}</span>
                    </div>
                {/if}
                
                <!-- IP-Standort Landkarte -->
                {#if ipLocationData}
                    <div class="border-t border-neutral-200/60 pt-5 flex flex-col gap-1.5 animate-enter">
                        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Ungefährer Standort (IP-Routing)</span>
                        <div class="rounded-xl overflow-hidden border border-neutral-200 shadow-sm h-48 sm:h-56 bg-neutral-200 relative mt-0.5 group">
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <iframe 
                                width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" 
                                src="https://www.openstreetmap.org/export/embed.html?bbox={ipLocationData.longitude - 0.05}%2C{ipLocationData.latitude - 0.05}%2C{ipLocationData.longitude + 0.05}%2C{ipLocationData.latitude + 0.05}&amp;layer=mapnik&amp;marker={ipLocationData.latitude}%2C{ipLocationData.longitude}"
                                class="w-full h-full grayscale-20 group-hover:grayscale-0 transition-all duration-500">
                            </iframe>
                            <div class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm border border-neutral-200 text-neutral-800 pointer-events-none">
                                📍 {ipLocationData.city}, {ipLocationData.region} ({ipLocationData.country_name})
                            </div>
                            <div class="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-[9px] font-bold px-2.5 py-1 rounded-lg shadow-sm border border-neutral-200 text-neutral-500 pointer-events-none hidden sm:block">
                                Provider: {ipLocationData.org || 'Unbekannt'}
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-5 shrink-0">
                <button type="button" onclick={closeLogDetail} class="orga-button-ghost py-3 sm:py-2 text-sm bg-neutral-100 hover:bg-neutral-200 border-none w-full sm:w-auto">Schließen</button>
            </div>
        {/if}
    </div>
</dialog>