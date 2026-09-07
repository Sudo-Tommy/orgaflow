<script module lang="ts">
    export interface OpenAppointmentOptions {
        clientId?: string;
        clientName?: string;
        companyId?: string;
        role?: 'client' | 'caregiver' | 'contact' | 'user' | 'admin' | 'guest';
        senderName?: string;
        email?: string;
        phone?: string;
        street?: string;
        zip_city?: string;
        availableClients?: { id: string; name: string; company?: string }[];
    }
</script>

<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { Paperclip, X, Eye, Calendar, Clock, MapPin, CheckCircle2, ShieldCheck, User, Users, HeartHandshake, Sparkles } from 'lucide-svelte';
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { notifyAppointmentRequestAsync } from "$lib/services/notificationClientService";
    import { onMount } from "svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isOpen = $state(false);
    
    let isLoading = $state(false);
    let successMsg = $state("");
    let errorMsg = $state("");

    let companies = $state<any[]>([]);
    let company_id = $state("");

    // Form Data
    let sender_name = $state("");
    let email = $state("");
    let phone = $state("");
    let street = $state("");
    let zip_city = $state("");
    let request_text = $state("");
    let time = $state("");
    let preferredContact = $state<"phone" | "email" | "mail">("phone");
    let isPortalUser = $state(false);
    let userRole = $state<'client' | 'caregiver' | 'contact' | 'admin' | 'guest'>('guest');
    let activeClientName = $state("");
    let isFixedClient = $state(false);
    let isFixedCompany = $state(false);
    let portalClients = $state<{id: string, name: string, company?: string}[]>([]);
    let selectedPortalClient = $state("");
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let attachments = $state<File[]>([]);
    // svelte-ignore non_reactive_update
    let fileInput: HTMLInputElement;

    const appointmentCategories = [
        { label: "Arzt- & Therapiebegleitung", icon: "🩺" },
        { label: "Einkauf & Besorgungen", icon: "🛒" },
        { label: "Spaziergang & Alltagsbegleitung", icon: "🌳" },
        { label: "Behördengang & Anträge", icon: "🏛️" },
        { label: "Pflegekassen-Beratung", icon: "💡" },
        { label: "Persönlicher Austausch", icon: "☕" }
    ];

    function applyCategory(catLabel: string) {
        const prefix = `${catLabel}: `;
        if (request_text.startsWith(prefix)) return;
        request_text = request_text.trim() 
            ? `${prefix}${request_text.replace(/^[A-Za-z0-9äöüÄÖÜ &-]+:\s*/, '')}`
            : prefix;
    }

    let isValidContact = $derived.by(() => {
        if (isPortalUser) return true;
        if (preferredContact === 'email') return email.trim().length >= 5 && email.includes('@');
        if (preferredContact === 'phone') return phone.trim().length >= 6;
        if (preferredContact === 'mail') return street.trim().length >= 3 && zip_city.trim().length >= 5;
        return false;
    });

    // Calendar State
    let currentDate = $state(new Date());
    let selectedDate = $state<Date | null>(null);
    let occupiedDates = $state<string[]>([]);
    let occupiedTimesByDate = $state<Record<string, string[]>>({});

    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const firstDay = new Date(y, m, 1);
        let startDay = firstDay.getDay() || 7;
        startDay -= 1;

        const days = [];
        const prevLastDay = new Date(y, m, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ date: new Date(y, m - 1, prevLastDay - i), isCurrentMonth: false });
        }
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            days.push({ date: new Date(y, m, i), isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(y, m + 1, i), isCurrentMonth: false });
        }
        return days;
    });

    onMount(async () => {
        try {
            companies = await pb.collection('company').getFullList({ sort: 'city', requestKey: null });
            if (companies.length > 0 && !company_id) company_id = companies[0].id;
        } catch (e) {
            console.warn("Firmen konnten nicht geladen werden.");
        }
    });

    $effect(() => {
        if (company_id) {
            loadOccupiedDates(company_id);
        }
    });

    async function loadOccupiedDates(compId: string) {
        occupiedDates = [];
        occupiedTimesByDate = {};
        try {
            const res = await pb.collection('public_busy_days').getFullList({ requestKey: null });
            
            const filteredRes = res.filter((r: any) => {
                if (r.is_visible !== true || r.is_private === true) return false;
                let c = r.company;
                if (!c) return false;
                if (typeof c === 'string') {
                    if (c.startsWith('[')) { 
                        try { c = JSON.parse(c); } catch { return false; } 
                    } else {
                        return c === compId || c.includes(compId);
                    }
                }
                if (Array.isArray(c)) return c.includes(compId);
                return false;
            });
            
            const counts: Record<string, number> = {};
            const times: Record<string, string[]> = {};
            
            filteredRes.forEach((r: any) => {
                if (r.appointment) {
                    const dObj = new Date(r.appointment.replace(' ', 'T'));
                    if (isNaN(dObj.getTime())) return;
                    const d = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    
                    if (r.is_blocked || (r.description && r.description.includes('[BLOCK]'))) {
                        counts[d] = (counts[d] || 0) + 100;
                    } else {
                        counts[d] = (counts[d] || 0) + 1;
                    }

                    if (!(r.is_blocked || (r.description && r.description.includes('[BLOCK]')))) {
                        const tStr = dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        if (!times[d]) times[d] = [];
                        if (!times[d].includes(tStr)) times[d].push(tStr);
                    }
                }
            });

            for (const key in times) {
                times[key].sort();
            }

            const busy: string[] = [];
            for (const [d, count] of Object.entries(counts)) {
                if (count >= 4) busy.push(d);
            }
            occupiedDates = busy;
            occupiedTimesByDate = times;
        } catch (err) {
            console.warn("Konnte belegte Tage nicht laden.", err);
        }
    }

    function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files) {
            attachments = [...attachments, ...Array.from(input.files)];
        }
        input.value = '';
    }

    function previewAttachment(file: File) {
        if (pdfPreviewModal) {
            const url = URL.createObjectURL(file);
            pdfPreviewModal.open(url, file.name, file.name);
        }
    }

    function removeAttachment(index: number) {
        attachments = attachments.filter((_, i) => i !== index);
    }

    export function open(options?: OpenAppointmentOptions) {
        successMsg = "";
        errorMsg = "";
        portalClients = [];
        selectedPortalClient = "";
        attachments = [];
        isFixedClient = false;
        isFixedCompany = false;
        userRole = 'guest';
        activeClientName = "";
        isPortalUser = false;

        // 1. Spezifische Optionen verarbeiten (aus dem Portal)
        if (options) {
            if (options.role && options.role !== 'guest') {
                userRole = options.role as any;
                isPortalUser = true;
            }
            if (options.clientId) {
                selectedPortalClient = options.clientId;
                if (options.role === 'client') isFixedClient = true;
            }
            if (options.clientName) {
                activeClientName = options.clientName;
            }
            if (options.companyId) {
                company_id = options.companyId;
                isFixedCompany = true;
            }
            if (options.availableClients && options.availableClients.length > 0) {
                portalClients = options.availableClients;
            }
            if (options.senderName) sender_name = options.senderName;
            if (options.email) email = options.email;
            if (options.phone) phone = options.phone;
            if (options.street) street = options.street;
            if (options.zip_city) zip_city = options.zip_city;
        }

        // 2. Automatischer Fallback für Portal-Token / PB-Session, falls nicht per Option übergeben
        let model = pb.authStore.model;
        let portalTokenPayload: any = null;
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            if (token) {
                try { portalTokenPayload = JSON.parse(atob(token.split('.')[1])); } catch (e) {}
            }
        }

        const authUser = portalTokenPayload || model;
        if (authUser && !options?.role) {
            isPortalUser = true;
            if (authUser.type === 'client' || authUser.role === 'client') {
                userRole = 'client';
                isFixedClient = true;
                selectedPortalClient = authUser.id;
            } else if (authUser.type === 'contact') {
                userRole = 'contact';
            } else if (authUser.role === 'caregiver') {
                userRole = 'caregiver';
            } else if (pb.authStore.isValid) {
                userRole = 'admin';
            }

            if (!sender_name) {
                sender_name = `${authUser.name_first || ''} ${authUser.name_last || ''}`.trim() || authUser.name || authUser.username || "Portal-Nutzer";
                email = authUser.email || email;
                phone = authUser.phone || authUser.handy || authUser.tel || phone;
                street = `${authUser.street || ''} ${authUser.housenr || ''}`.trim() || street;
                const zip = authUser.zip || '';
                const city = authUser.city || '';
                if (zip || city) zip_city = `${zip} ${city}`.trim();
            }

            if (authUser.company && !company_id) {
                const cId = Array.isArray(authUser.company) ? authUser.company[0] : authUser.company;
                if (cId && companies.some(c => c.id === cId)) company_id = cId;
            }
        }

        // 3. Wenn Betreuer / Admin mehrere Klienten hat, Liste bei Bedarf nachladen
        if (portalClients.length === 0 && (userRole === 'caregiver' || userRole === 'admin')) {
            if (pb.authStore.isValid && pb.authStore.model?.email) {
                pb.collection('clients').getFullList({ 
                    filter: `caregiver.email ?= "${pb.authStore.model.email}" || contacts.email ?= "${pb.authStore.model.email}"`,
                    requestKey: null 
                })
                    .then(res => { 
                        portalClients = res.map(c => ({ id: c.id, name: `${c.name_first} ${c.name_last}`.trim(), company: c.company })); 
                        if (!selectedPortalClient && portalClients.length > 0) selectedPortalClient = portalClients[0].id;
                    })
                    .catch(() => {});
            } else if (typeof window !== 'undefined') {
                const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
                if (token) {
                    const apiBaseUrl = (!window.location.hostname.includes('ihre-seniorenassistenz.com')) 
                        ? `http://${window.location.hostname}:3000/portal` 
                        : '/api/emails/portal';
                    fetch(`${apiBaseUrl}/clients`, { headers: { 'Authorization': `Bearer ${token}` } })
                        .then(res => res.json())
                        .then(data => { 
                            if (data.success && data.clients) {
                                portalClients = data.clients.map((c: any) => ({ id: c.id, name: `${c.name_first} ${c.name_last}`.trim(), company: c.company }));
                                if (!selectedPortalClient && portalClients.length > 0) selectedPortalClient = portalClients[0].id;
                            }
                        })
                        .catch(() => {});
                }
            }
        }

        isOpen = true;
        try {
            if (!dialog?.open) {
                dialog?.showModal();
            }
        } catch (e) {
            console.warn("[LandingAppointmentModal] Fehler beim Öffnen:", e);
        }
    }

    export function close() {
        isOpen = false;
        try {
            if (dialog?.open) {
                dialog.close();
            }
        } catch (e) {
            console.warn("[LandingAppointmentModal] Fehler beim Schließen:", e);
        }
    }

    function nextMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        selectedDate = null;
    }
    
    function prevMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        selectedDate = null;
    }

    function onClientSelected(clientId: string) {
        selectedPortalClient = clientId;
        const matched = portalClients.find(c => c.id === clientId);
        if (matched?.company && companies.some(c => c.id === matched.company)) {
            company_id = matched.company;
        }
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (isLoading) return;
        isLoading = true;
        errorMsg = "";
        successMsg = "";

        if (!selectedDate) {
            errorMsg = "Bitte wählen Sie ein Wunschdatum im Kalender aus.";
            isLoading = false;
            return;
        }

        const formattedDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        
        if (!isPortalUser) {
            if (preferredContact === 'email' && !email.trim()) {
                errorMsg = "Bitte geben Sie Ihre E-Mail-Adresse an.";
                isLoading = false;
                return;
            }
            if (preferredContact === 'phone' && !phone.trim()) {
                errorMsg = "Bitte geben Sie Ihre Telefonnummer an.";
                isLoading = false;
                return;
            }
            if (preferredContact === 'mail' && (!street.trim() || !zip_city.trim())) {
                errorMsg = "Bitte geben Sie Ihre vollständige Postadresse an.";
                isLoading = false;
                return;
            }
        }

        let contactMethod = preferredContact === 'email' ? 'e-mail-address' : (preferredContact === 'mail' ? 'mail-adress' : 'telephone');

        // Rollen- und Klienten-Header im Anfragetext vermerken
        let clientHeader = "";
        if (userRole === 'client') {
            clientHeader = `[PORTAL-ANFRAGE: KLIENT DIREKT]\nKlient: ${sender_name}\n\n`;
        } else if (userRole === 'caregiver') {
            const cName = portalClients.find(c => c.id === selectedPortalClient)?.name || activeClientName || "Zugeordneter Klient";
            clientHeader = `[PORTAL-ANFRAGE: BETREUER]\nBetreuer: ${sender_name}\nBetrifft Klient: ${cName}\n\n`;
        } else if (userRole === 'contact') {
            const cName = portalClients.find(c => c.id === selectedPortalClient)?.name || activeClientName || "Angehöriger";
            clientHeader = `[PORTAL-ANFRAGE: ANGEHÖRIGER / KONTAKT]\nKontakt: ${sender_name}\nBetrifft Klient: ${cName}\n\n`;
        } else if (selectedPortalClient) {
            const cName = portalClients.find(c => c.id === selectedPortalClient)?.name || selectedPortalClient;
            clientHeader = `Betrifft Klient: ${cName}\n\n`;
        }

        const final_request_text = `${clientHeader}${request_text.trim()}\n\n--- Kontaktdaten ---\nE-Mail: ${email || '-'}\nTelefon: ${phone || '-'}\nAdresse: ${street || '-'}, ${zip_city || '-'}`;

        const formData = new FormData();
        formData.append('company', company_id);
        formData.append('sender_name', sender_name || 'Portal-Nutzer');
        formData.append('request_text', final_request_text);
        formData.append('date', formattedDate);
        formData.append('time', time);
        formData.append('contact_method', contactMethod);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('street', street);
        formData.append('zip_city', zip_city);
        formData.append('status', 'requested');
        
        if (selectedPortalClient) {
            formData.append('client_id', selectedPortalClient);
        }

        attachments.forEach(file => {
            formData.append('attachments', file);
        });

        try {
            const newRecord = await pb.collection('appointment_requests').create(formData);
            
            notifyAppointmentRequestAsync({
                appointmentRequestId: newRecord.id,
                senderName: sender_name,
                email,
                phone,
                requestText: final_request_text,
                date: formattedDate,
                time
            }).catch(notifyErr => {
                console.warn("[LandingAppointmentModal] Benachrichtigungstrigger:", notifyErr);
            });

            successMsg = "Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns umgehend bei Ihnen.";
            toastStore.success("Anfrage erfolgreich übermittelt! Wir melden uns in Kürze.");
            
            request_text = ""; 
            time = ""; 
            selectedDate = null; 
            attachments = [];
            
            if (!isPortalUser) {
                sender_name = ""; 
                email = ""; 
                phone = ""; 
                street = ""; 
                zip_city = ""; 
                preferredContact = "phone";
            }

            if (typeof window !== 'undefined' && 'ontouchstart' in window) {
                setTimeout(() => close(), 2200);
            }
        } catch (err: any) {
            console.error(err);
            errorMsg = "Es gab einen Fehler beim Senden. Bitte rufen Sie uns direkt an.";
            toastStore.error("Fehler beim Senden der Anfrage. Bitte kontaktieren Sie uns direkt.");
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm w-full max-w-5xl m-0 sm:m-auto fixed sm:relative inset-x-0 bottom-0 sm:bottom-auto max-h-[92vh] rounded-t-3xl sm:rounded-3xl border-none shadow-2xl z-[9999] touch-pan-y"
    onclick={(e) => {
        if (e.target === dialog) {
            e.stopPropagation();
            close();
        }
    }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <!-- Drag Handle für Mobile Bottom-Sheet -->
    <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0"></div>

    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800">
        
        <!-- Header -->
        <div class="bg-white/95 dark:bg-slate-900/95 px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs backdrop-blur-md">
            <div class="flex items-center gap-3.5 sm:gap-4">
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0">
                    📅
                </div>
                <div>
                    <h2 class="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {isPortalUser ? 'Termin online anfragen' : 'Termin online vereinbaren'}
                    </h2>
                    <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {isPortalUser 
                            ? 'Direkte Anfrage für Ihre persönliche Seniorenassistenz' 
                            : 'Kostenlos und unverbindlich. Wir melden uns umgehend bei Ihnen.'}
                    </p>
                </div>
            </div>
            <button 
                aria-label="Schließen" 
                onclick={close} 
                class="w-10 h-10 min-w-[44px] min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 outline-none"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Body -->
        <div class="p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar">
            {#if successMsg}
                <div class="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800 text-center animate-enter my-8 shadow-md">
                    <span class="text-5xl block mb-4">✅</span>
                    <h3 class="text-2xl font-black mb-2 text-emerald-900 dark:text-emerald-100">Anfrage erfolgreich übermittelt!</h3>
                    <p class="font-medium text-base text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">{successMsg}</p>
                    <button type="button" onclick={close} class="mt-8 orga-button-primary w-full sm:w-auto min-h-[44px] px-8 py-3 text-sm font-bold mx-auto cursor-pointer">
                        Fenster schließen
                    </button>
                </div>
            {:else}
                {#if errorMsg}
                    <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 text-center mb-6 font-bold animate-enter shadow-xs">
                        {errorMsg}
                    </div>
                {/if}

                <form onsubmit={handleSubmit} class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pb-4">
                    
                    <!-- Linke Spalte: Kalender & Standort -->
                    <div class="lg:col-span-5 space-y-5">
                        
                        <!-- 1. Standort / Betreuungsregion -->
                        <div class="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shadow-xs">
                            <div class="flex items-center justify-between mb-2">
                                <label for="req-company" class="block text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <MapPin class="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    <span>1. Betreuungsstandort *</span>
                                </label>
                                {#if isFixedCompany}
                                    <span class="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Zugewiesen</span>
                                {/if}
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                {isFixedCompany ? 'Ihr fester Betreuungsstandort ist automatisch hinterlegt.' : 'Bitte wählen Sie Ihre Region, um verfügbare Tage zu laden.'}
                            </p>
                            <select 
                                id="req-company" 
                                bind:value={company_id} 
                                class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer w-full text-sm font-semibold shadow-xs min-h-[44px]" 
                                required 
                                disabled={isLoading || isFixedCompany}
                            >
                                {#each companies as comp}
                                    <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
                                {/each}
                            </select>
                        </div>

                        <!-- 2. Wunschdatum & Monatskalender -->
                        <div class="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shadow-xs">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Calendar class="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    <span>2. Wunschdatum *</span>
                                </h3>
                                <div class="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-xs">
                                    <button 
                                        type="button" 
                                        onclick={prevMonth} 
                                        class="w-8 h-8 min-w-[32px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                                        aria-label="Vorheriger Monat"
                                    >◀</button>
                                    <span class="text-xs font-bold text-slate-900 dark:text-slate-100 w-20 sm:w-24 text-center">
                                        {currentDate.toLocaleString('de-DE', {month:'short', year:'numeric'})}
                                    </span>
                                    <button 
                                        type="button" 
                                        onclick={nextMonth} 
                                        class="w-8 h-8 min-w-[32px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                                        aria-label="Nächster Monat"
                                    >▶</button>
                                </div>
                            </div>

                            <div class="grid grid-cols-7 gap-1 text-center mb-2">
                                {#each ['Mo','Di','Mi','Do','Fr','Sa','So'] as day}
                                    <div class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1">{day}</div>
                                {/each}
                            </div>

                            <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
                                {#each calendarDays as day}
                                    {@const isPast = day.date.getTime() < new Date().setHours(0,0,0,0)}
                                    {@const dateStr = new Date(day.date.getTime() - day.date.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                    {@const isOccupied = occupiedDates.includes(dateStr)}
                                    {@const dayTimes = occupiedTimesByDate[dateStr] || []}
                                    <button 
                                        type="button" 
                                        disabled={isPast || isOccupied} 
                                        onclick={() => selectedDate = day.date} 
                                        class="aspect-square flex flex-col items-center justify-start pt-1 sm:pt-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all border shadow-xs {
                                            isPast ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600' : 
                                            (isOccupied ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40 cursor-not-allowed' : 'bg-white dark:bg-slate-800 cursor-pointer hover:bg-amber-50 dark:hover:bg-slate-700 hover:text-amber-800 dark:hover:text-amber-300 hover:border-amber-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700')
                                        } {!day.isCurrentMonth && !isOccupied && !isPast ? 'opacity-50 text-slate-400' : ''} {selectedDate && day.date.getTime() === selectedDate.getTime() && !isOccupied && !isPast ? 'bg-amber-600! dark:bg-amber-600! text-white! border-amber-700! dark:border-amber-500! shadow-md scale-105 ring-2 ring-amber-500/30' : ''}"
                                    >
                                        <span class={isOccupied ? 'line-through decoration-rose-400 decoration-2' : ''}>{day.date.getDate()}</span>
                                        {#if isOccupied}
                                            <span class="text-[7px] sm:text-[8px] font-black uppercase tracking-normal mt-0.5 text-rose-500 dark:text-rose-400 truncate max-w-full px-0.5 leading-none">Belegt</span>
                                        {:else if dayTimes.length > 0 && !isPast}
                                            <div class="flex flex-col gap-px mt-0.5 items-center w-full px-0">
                                                {#each dayTimes.slice(0, 2) as t}
                                                    <span class="text-[7px] sm:text-[8px] leading-tight font-bold line-through {selectedDate && day.date.getTime() === selectedDate.getTime() ? 'text-amber-100 decoration-amber-100' : 'text-rose-500 dark:text-rose-400 decoration-rose-500 opacity-70'}">{t}</span>
                                                {/each}
                                                {#if dayTimes.length > 2}
                                                    <span class="text-[7px] sm:text-[8px] leading-tight font-bold {selectedDate && day.date.getTime() === selectedDate.getTime() ? 'text-amber-100' : 'text-rose-500 dark:text-rose-400'}">...</span>
                                                {/if}
                                            </div>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                            
                            <!-- Tages-Detailinfo -->
                            {#if selectedDate}
                                {@const selDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                {@const selTimes = occupiedTimesByDate[selDateStr] || []}
                                <div class="mt-5 border-t border-slate-200 dark:border-slate-700/80 pt-4 animate-enter">
                                    <h4 class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                                        <span>📅</span> Gewählt: {selectedDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                                    </h4>
                                    
                                    {#if selTimes.length > 0}
                                        <div class="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 rounded-xl p-3 shadow-xs">
                                            <p class="text-xs font-bold text-rose-800 dark:text-rose-300 mb-2">Bereits vergebene Zeiten:</p>
                                            <div class="flex flex-wrap gap-1.5">
                                                {#each selTimes as t}
                                                    <span class="text-xs font-bold bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-lg shadow-xs line-through opacity-80">{t} Uhr</span>
                                                {/each}
                                            </div>
                                            <p class="text-[11px] text-rose-700 dark:text-rose-300 mt-2.5 font-medium leading-tight">
                                                💡 Wählen Sie nach Möglichkeit eine Wunsch-Uhrzeit außerhalb der belegten Zeiten.
                                            </p>
                                        </div>
                                    {:else}
                                        <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl p-3 shadow-xs flex items-center gap-2.5">
                                            <span class="text-xl">✨</span>
                                            <div>
                                                <p class="text-xs font-bold text-emerald-800 dark:text-emerald-300">Ganztägig verfügbar</p>
                                                <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Buchen Sie völlig frei Ihre gewünschte Uhrzeit.</p>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Rechte Spalte: Formulardaten & Anliegen -->
                    <div class="lg:col-span-7 flex flex-col space-y-5">
                        
                        <div class="p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full">
                            
                            <!-- Rollen-Header & Klienten-Zuordnung im Portal -->
                            {#if isPortalUser}
                                <div class="mb-5 p-4 rounded-2xl border transition-all {
                                    userRole === 'client' ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200' :
                                    (userRole === 'caregiver' ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200' :
                                    'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200')
                                }">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 {
                                                userRole === 'client' ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100' :
                                                (userRole === 'caregiver' ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100' :
                                                'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100')
                                            }">
                                                {#if userRole === 'client'}👤{:else if userRole === 'caregiver'}📋{:else}🤝{/if}
                                            </div>
                                            <div>
                                                <span class="text-[11px] font-black uppercase tracking-wider block opacity-75">
                                                    {#if userRole === 'client'}Angemeldeter Klient{:else if userRole === 'caregiver'}Angemeldeter Betreuer{:else}Angehöriger / Notfallkontakt{/if}
                                                </span>
                                                <p class="text-sm font-bold">{sender_name || 'Portal-Benutzer'}</p>
                                            </div>
                                        </div>
                                        <span class="text-xs font-semibold opacity-75 hidden sm:inline-block">Profil verifiziert ✓</span>
                                    </div>

                                    <!-- Klienten-Auswahl für Betreuer mit mehreren Klienten -->
                                    {#if userRole === 'caregiver' || portalClients.length > 1}
                                        <div class="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/60">
                                            <label for="req-portal-client" class="block text-xs font-bold mb-1.5 text-indigo-950 dark:text-indigo-200">
                                                Für welchen Klienten möchten Sie den Termin buchen? *
                                            </label>
                                            <select 
                                                id="req-portal-client" 
                                                value={selectedPortalClient} 
                                                onchange={(e) => onClientSelected((e.target as HTMLSelectElement).value)}
                                                class="orga-input-clear bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 text-slate-900 dark:text-slate-100 text-sm w-full cursor-pointer min-h-[44px] font-semibold" 
                                                disabled={isLoading}
                                            >
                                                {#if !selectedPortalClient}
                                                    <option value="">-- Bitte Klienten auswählen --</option>
                                                {/if}
                                                {#each portalClients as c}
                                                    <option value={c.id}>{c.name}</option>
                                                {/each}
                                            </select>
                                        </div>
                                    {:else if activeClientName && userRole !== 'client'}
                                        <div class="mt-2.5 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/60 text-xs">
                                            <span class="opacity-75">Betrifft Klient:</span> <strong class="font-bold">{activeClientName}</strong>
                                        </div>
                                    {/if}
                                </div>
                            {/if}

                            <!-- Schnellauswahl Termin-Anlässe -->
                            <div class="mb-4">
                                <span class="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                    <Sparkles class="w-3.5 h-3.5 text-amber-500" />
                                    <span>Häufige Anlässe (Klick zum Einfügen)</span>
                                </span>
                                <div class="flex flex-wrap gap-1.5">
                                    {#each appointmentCategories as cat}
                                        <button 
                                            type="button" 
                                            onclick={() => applyCategory(cat.label)} 
                                            class="px-3 py-1.5 min-h-[36px] bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.label}</span>
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <!-- Gast-Eingaben (nur wenn nicht eingeloggt) -->
                            {#if !isPortalUser}
                                <div class="space-y-4 mb-4">
                                    <div>
                                        <label for="req-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ihr Vor- und Nachname *</label>
                                        <input id="req-name" type="text" bind:value={sender_name} class="orga-input-clear bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]" placeholder="Max Mustermann" required disabled={isLoading} />
                                    </div>
                                    
                                    <div>
                                        <!-- svelte-ignore a11y_label_has_associated_control -->
                                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bevorzugter Kontaktweg *</label>
                                        <div class="flex flex-col sm:flex-row gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <button type="button" onclick={() => preferredContact = 'phone'} class="flex-1 py-2 min-h-[40px] text-xs font-bold rounded-lg transition-colors cursor-pointer {preferredContact === 'phone' ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}">📞 Telefon</button>
                                            <button type="button" onclick={() => preferredContact = 'email'} class="flex-1 py-2 min-h-[40px] text-xs font-bold rounded-lg transition-colors cursor-pointer {preferredContact === 'email' ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}">✉️ E-Mail</button>
                                            <button type="button" onclick={() => preferredContact = 'mail'} class="flex-1 py-2 min-h-[40px] text-xs font-bold rounded-lg transition-colors cursor-pointer {preferredContact === 'mail' ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}">📮 Postweg</button>
                                        </div>
                                    </div>

                                    <div class="p-3.5 bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700 rounded-xl">
                                        {#if preferredContact === 'email'}
                                            <div>
                                                <label for="req-email" class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Ihre E-Mail-Adresse *</label>
                                                <input id="req-email" type="email" inputmode="email" bind:value={email} class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]" placeholder="beispiel@email.de" required disabled={isLoading} />
                                            </div>
                                        {:else if preferredContact === 'phone'}
                                            <div>
                                                <label for="req-phone" class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Ihre Telefon- oder Handynummer *</label>
                                                <input id="req-phone" type="tel" inputmode="tel" bind:value={phone} class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]" placeholder="0151..." required disabled={isLoading} />
                                            </div>
                                        {:else if preferredContact === 'mail'}
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label for="req-street" class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Straße & Hausnr. *</label>
                                                    <input id="req-street" type="text" bind:value={street} class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]" placeholder="Musterstr. 1" required disabled={isLoading} />
                                                </div>
                                                <div>
                                                    <label for="req-zip" class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">PLZ & Ort *</label>
                                                    <input id="req-zip" type="text" bind:value={zip_city} class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]" placeholder="06108 Halle" required disabled={isLoading} />
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}

                            <!-- Wunschzeit & Anliegen -->
                            <div class="space-y-4 flex-1">
                                <div>
                                    <label for="req-time" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                                        <Clock class="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                                        <span>Wunsch-Uhrzeit (optional)</span>
                                    </label>
                                    <input 
                                        id="req-time" 
                                        type="time" 
                                        bind:value={time} 
                                        class="orga-input-clear bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]" 
                                        disabled={isLoading} 
                                    />
                                    {#if selectedDate && time}
                                        {@const selDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                        {@const selTimes = occupiedTimesByDate[selDateStr] || []}
                                        {#if selTimes.includes(time)}
                                            <p class="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                                                <span>⚠️</span> <span>Diese Zeit ist an diesem Tag bereits belegt.</span>
                                            </p>
                                        {/if}
                                    {/if}
                                </div>

                                <div class="flex-1 flex flex-col">
                                    <label for="req-text" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Wie können wir Ihnen helfen? *
                                    </label>
                                    <textarea 
                                        id="req-text" 
                                        bind:value={request_text} 
                                        class="orga-input-clear bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none custom-scrollbar flex-1 min-h-[120px] text-sm" 
                                        placeholder="Beschreiben Sie kurz Ihr Anliegen oder wählen Sie oben eine Kategorie..." 
                                        required 
                                        disabled={isLoading}
                                    ></textarea>
                                </div>
                            </div>
                            
                            <!-- Dateianhänge -->
                            <div class="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                                <div class="flex items-center justify-between mb-2.5">
                                    <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Paperclip class="w-3.5 h-3.5 text-slate-400" /> 
                                        <span>Dokumente oder Fotos anhängen</span>
                                    </h3>
                                    <input type="file" bind:this={fileInput} multiple class="hidden" onchange={handleFileSelect} disabled={isLoading} />
                                    <button 
                                        type="button" 
                                        onclick={() => fileInput?.click()} 
                                        class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors flex items-center gap-1 bg-brand-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-brand-200/60 dark:border-slate-700 cursor-pointer min-h-[36px]" 
                                        disabled={isLoading}
                                    >
                                        + Datei wählen
                                    </button>
                                </div>
                                
                                {#if attachments.length > 0}
                                    <div class="flex flex-wrap gap-2 mb-4">
                                        {#each attachments as file, i}
                                            <div class="flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 shadow-2xs max-w-full">
                                                <span class="truncate flex-1 font-bold">{file.name}</span>
                                                {#if file.type === 'application/pdf' || file.type.startsWith('image/')}
                                                    <button 
                                                        type="button" 
                                                        onclick={() => previewAttachment(file)} 
                                                        class="shrink-0 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer" 
                                                        title="Vorschau" 
                                                        disabled={isLoading}
                                                    >
                                                        <Eye class="w-3.5 h-3.5" />
                                                    </button>
                                                {/if}
                                                <button 
                                                    type="button" 
                                                    onclick={() => removeAttachment(i)} 
                                                    class="shrink-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer" 
                                                    title="Entfernen"
                                                    disabled={isLoading}
                                                >
                                                    <X class="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}

                                <button 
                                    type="submit" 
                                    class="orga-button-primary w-full text-base py-3.5 min-h-[48px] shadow-brand-600/30 hover:shadow-brand-600/50 cursor-pointer font-black" 
                                    disabled={isLoading || !selectedDate || (!isPortalUser && !sender_name.trim()) || !isValidContact || (userRole === 'caregiver' && !selectedPortalClient && portalClients.length > 0)}
                                >
                                    {isLoading ? "Wird sicher übermittelt..." : "Termin verbindlich anfragen"}
                                </button>
                                
                                <p class="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 flex items-center justify-center gap-1.5">
                                    <span>🔒</span>
                                    <span>Verschlüsselte Übertragung nach DSGVO &amp; streng vertraulich.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</dialog>

<PdfPreviewModal bind:this={pdfPreviewModal} />