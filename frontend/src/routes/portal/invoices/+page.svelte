<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { env } from '$env/dynamic/public';

    const microserviceUrl = import.meta.env.DEV ? 'http://127.0.0.1:3000' : (env.PUBLIC_MICROSERVICE_URL || '');
    
    let invoices = $state<any[]>([]);
    let isLoading = $state(true);
    let errorMsg = $state("");

    function getSafeUrl(url: string) {
        if (!url) return '';
        if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
            return url.replace(/http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/gi, window.location.origin);
        }
        return url;
    }

    function decodeJwt(token: string) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return null;
        }
    }

    onMount(async () => {
        const token = localStorage.getItem('portal_token');
        if (!token) { goto('/portal'); return; }

        try {
            const res = await fetch(`${microserviceUrl}/api/emails/portal/invoices`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            
            if (res.status === 401 || data.error) {
                localStorage.removeItem('portal_token'); goto('/portal'); return;
            }
            
            const allInvoices = data.invoices || [];
            const payload = decodeJwt(token);
            
            if (!payload || !payload.id) {
                invoices = allInvoices;
                return;
            }

            const userId = payload.id;
            const collection = payload.collectionName; // 'clients', 'contacts' oder 'users'
            
            if (collection === 'users' || collection === '_superusers') {
                // Admins dürfen zu Testzwecken im Portal alles sehen
                invoices = allInvoices;
            } else if (collection === 'clients') {
                // Klient sieht nur seine eigenen Rechnungen
                invoices = allInvoices.filter((inv: any) => inv.client === userId || (Array.isArray(inv.client) && inv.client.includes(userId)) || inv.expand?.client?.id === userId);
            } else {
                // Betreuer / Kontakt -> Hole verknüpfte Klienten aus PocketBase
                let allowedClientIds: string[] = [];
                try {
                    const pbBaseUrl = import.meta.env.DEV ? 'http://127.0.0.1:8090' : (env.PUBLIC_POCKETBASE_URL || window.location.origin);
                    const filter = encodeURIComponent(`caregiver='${userId}' || contacts~'${userId}'`);
                    const cRes = await fetch(`${pbBaseUrl}/api/collections/clients/records?filter=${filter}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (cRes.ok) {
                        const cData = await cRes.json();
                        if (cData && cData.items) allowedClientIds = cData.items.map((c: any) => c.id);
                    }
                } catch(e) { console.error("Konnte verknüpfte Klienten nicht abrufen", e); }
                
                invoices = allInvoices.filter((inv: any) => allowedClientIds.includes(inv.client) || (Array.isArray(inv.client) && inv.client.some((cId: string) => allowedClientIds.includes(cId))) || allowedClientIds.includes(inv.expand?.client?.id));
            }
            
        } catch (err) {
            errorMsg = "Verbindung zum Server konnte nicht hergestellt werden.";
        } finally { isLoading = false; }
    });

    function logout() { localStorage.removeItem('portal_token'); goto('/portal'); }
</script>

<svelte:head><title>Meine Dokumente</title></svelte:head>

<div class="w-full max-w-4xl mx-auto flex flex-col h-[90vh]">
    <header class="flex items-center justify-between bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-neutral-100 mb-6 shrink-0">
        <div class="flex items-center gap-4">
            <img src="/favicon.png" alt="Ihre Seniorenassistenz Logo" class="w-12 h-12 object-contain drop-shadow-sm" />
            <div>
                <h1 class="text-xl font-bold text-neutral-900">Meine Rechnungen</h1>
                <p class="text-xs text-neutral-500 font-medium">Sicheres Klienten-Portal</p>
            </div>
        </div>
        <button onclick={logout} class="orga-button-ghost py-2 text-sm text-rose-600 hover:bg-rose-50 hover:border-rose-200">Abmelden</button>
    </header>

    <div class="flex-1 bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col">
        {#if isLoading}
            <div class="flex-1 flex flex-col items-center justify-center p-12"><div class="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div><p class="text-neutral-500 font-medium">Lade Ihre Dokumente...</p></div>
        {:else if errorMsg}
            <div class="p-8 text-center text-rose-600 bg-rose-50 m-6 rounded-2xl font-bold border border-rose-100">{errorMsg}</div>
        {:else if invoices.length === 0}
            <div class="flex-1 flex flex-col items-center justify-center p-12 text-center"><span class="text-5xl mb-4 opacity-50">📂</span><h3 class="text-lg font-bold text-neutral-900 mb-1">Keine Dokumente vorhanden</h3><p class="text-neutral-500 text-sm">Aktuell liegen keine abrufbaren Rechnungen für Sie vor.</p></div>
        {:else}
            <div class="overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4">
                {#each invoices as inv}
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-neutral-200 hover:border-brand-300 hover:shadow-md transition-all bg-neutral-50/30 gap-4 group">
                        <div class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-lg shadow-sm shrink-0">📑</div>
                            <div>
                                <h3 class="font-bold text-neutral-900 text-base">{inv.invoice_nr || 'Dokument'}</h3>
                                <p class="text-sm text-neutral-500 mt-0.5">Ausgestellt am {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</p>
                                <span class="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md {inv.status === 'Abgeschlossen' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">{inv.status === 'Abgeschlossen' ? 'Bezahlt' : 'Offen / Eingereicht'}</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-start sm:items-end gap-3">
                            {#if inv.brutto > 0}
                                <span class="font-black text-xl text-neutral-900">{inv.brutto.toFixed(2).replace('.', ',')} €</span>
                            {/if}
                            <div class="flex gap-2 w-full sm:w-auto">
                                {#if inv.files}
                                    {#each inv.files as file, i}
                                        <a href={getSafeUrl(file.url)} target="_blank" class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-neutral-200 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 text-sm font-bold text-neutral-700 rounded-xl transition-colors shadow-sm">
                                            {file.name.toLowerCase().includes('zeit') || file.name.toLowerCase().includes('nachweis') || i > 0 ? '⏱️ Zeitnachweis' : '⬇️ Rechnung'}
                                        </a>
                                    {/each}
                                {:else if inv.download_urls}
                                    {#each inv.download_urls as url, i}
                                        <a href={getSafeUrl(url)} target="_blank" class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-neutral-200 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 text-sm font-bold text-neutral-700 rounded-xl transition-colors shadow-sm">
                                            {i === 0 ? '⬇️ Rechnung' : '⏱️ Zeitnachweis'}
                                        </a>
                                    {/each}
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>