<script lang="ts">
    import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
    import { onMount, onDestroy } from "svelte";
    import { MICROSERVICE_URL } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import RequestReplyModal from "./RequestReplyModal.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";
    import GoogleContactSelectionModal from "$lib/components/contacts/GoogleContactSelectionModal.svelte";
    import { Paperclip, FolderDown, X, Search, RefreshCw, Sparkles, Trash2, ChevronLeft, Calendar, Check, Clock, MapPin, User, Mail, Phone, ExternalLink } from "lucide-svelte";

    let { onclose }: { onclose?: () => void } = $props();

    const reqService = useRequestAdmin();
    let activeTab = $state<'requests' | 'changes' | 'feedbacks' | 'admissions'>('requests');

    // Modals
    let replyModal = $state<ReturnType<typeof RequestReplyModal>>();
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let clientDetailModal = $state<ReturnType<typeof ClientDetailModal>>();
    let appointmentModal = $state<ReturnType<typeof AppointmentModal>>();
    let googleContactModal = $state<ReturnType<typeof GoogleContactSelectionModal>>();

    // Auth & Permissions
    let currentUser = $state(pb.authStore.model);
    pb.authStore.onChange(() => currentUser = pb.authStore.model);
    let isGodMode = $derived(pb.authStore.isSuperuser || currentUser?.role === 'superadmin');
    let isAdmin = $derived(isGodMode || currentUser?.role === 'admin');

    // KI-Zusammenfassung & Concurrency Locks
    let reqViewModes = $state<Record<string, 'ai' | 'original'>>({});
    let summarizingReqIds = $state<Record<string, boolean>>({});
    let transferringReqIds = $state<Record<string, boolean>>({});
    let syncingAppIds = $state<Record<string, boolean>>({});
    let isBatchGenerating = $state(false);
    let isRefreshing = $state(false);

    // Filter & Search States
    let requestSearch = $state('');
    let requestStatusFilter = $state<'all' | 'open' | 'accepted'>('all');
    let changeSearch = $state('');
    let feedbackSearch = $state('');
    let feedbackRatingFilter = $state<'all' | 'critical' | 'good'>('all');
    let showAllFeedbacks = $state(false);
    let admissionSearch = $state('');

    // Attachment & Client Picker Popups
    let attachDropdownOpen = $state<{ reqId: string, filename: string } | null>(null);
    let attachSearchQuery = $state("");
    let activeClientPickerReqId = $state<string | null>(null);
    let clientPickerSearch = $state('');

    // Feedbacks State
    let feedbacks = $state<any[]>([]);
    let isFeedbacksLoading = $state(false);

    // ==========================================
    // HELPER & UTILITY FUNCTIONS
    // ==========================================
    const isRequestOpen = (r: any) => r.status !== 'accepted' && r.status !== 'denied';

    function getViewMode(reqId: string): 'ai' | 'original' {
        return reqViewModes[reqId] || 'ai';
    }

    function setViewMode(reqId: string, mode: 'ai' | 'original') {
        reqViewModes[reqId] = mode;
    }

    function formatContact(method: string) {
        switch(method) {
            case 'telephone': return '📞 Telefonrückruf';
            case 'e-mail-address': return '✉️ E-Mail';
            case 'whatsapp': return '💬 WhatsApp';
            case 'mail-adress': return '📮 Postbrief';
            default: return '📞 Unbekannt';
        }
    }

    function escapeRegex(str: string): string {
        return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function cleanPersonName(raw: string): string {
        return (raw || '')
            .replace(/^(herr|frau|herrn|dr\.|prof\.|familie|dr\. med\.)\s+/i, '')
            .replace(/\((.*?)\)/g, '')
            .trim();
    }

    function normalizePhone(p: string): string {
        return (p || '').replace(/\D+/g, '').replace(/^49/, '0');
    }

    function getClientEmail(req: any): string | null {
        if (!req) return null;
        if (req.email && req.email.includes('@')) return req.email.trim();
        const m = req.request_text ? req.request_text.match(/E-Mail:\s*([^\n]+)/) : null;
        if (m && m[1]?.includes('@')) return m[1].trim();
        return null;
    }

    function parseAddress(streetRaw: string = '', zipCityRaw: string = '') {
        let streetName = (streetRaw || '').trim();
        let houseNr = '';
        const houseNrMatch = streetName.match(/^(.*?)\s+(\d+[\s\w\-\/]*)$/);
        if (houseNrMatch) {
            streetName = houseNrMatch[1].trim();
            houseNr = houseNrMatch[2].trim();
        }

        let zip = '';
        let city = (zipCityRaw || '').trim();
        const zipMatch = city.match(/^(\d{5})\s+(.*)$/);
        if (zipMatch) {
            zip = zipMatch[1];
            city = zipMatch[2].trim();
        }

        return { streetName, houseNr, zip, city };
    }

    function parseNameAndSalutation(rawName: string = '') {
        let salutation: "Herr" | "Frau" | "Divers" | "Keine Angabe" = "Keine Angabe";
        const lowerRaw = rawName.toLowerCase();
        if (lowerRaw.startsWith('frau')) salutation = 'Frau';
        else if (lowerRaw.startsWith('herr')) salutation = 'Herr';

        const cleanName = cleanPersonName(rawName || 'Neuer Klient');
        let firstName = "";
        let lastName = cleanName;

        if (cleanName.includes(',')) {
            const p = cleanName.split(',');
            lastName = p[0].trim();
            firstName = p.slice(1).join(' ').trim();
        } else {
            const p = cleanName.split(' ').filter(Boolean);
            if (p.length === 2) {
                firstName = p[0];
                lastName = p[1];
            } else if (p.length > 2) {
                firstName = p.slice(0, -1).join(' ');
                lastName = p[p.length - 1];
            }
        }
        return { salutation, firstName, lastName };
    }

    async function linkContactToClient(client: any, contactId: string) {
        if (!client?.id || !contactId) return;
        try {
            const currentContacts = Array.isArray(client.contacts) ? [...client.contacts] : (client.contacts ? [client.contacts] : []);
            if (!currentContacts.includes(contactId)) {
                currentContacts.push(contactId);
                await pb.collection('clients').update(client.id, { contacts: currentContacts }, { requestKey: null });
                client.contacts = currentContacts;
            }
        } catch (cErr) {
            console.warn("Konnte Kontakt nicht mit Klient verknüpfen:", cErr);
        }
    }

    function formatRequestTime(req: any): string {
        if (!req) return '';
        const rawTime = req.time ? String(req.time).trim() : '';
        if (rawTime) {
            if (/^\d{1,2}:\d{2}/.test(rawTime)) {
                const m = rawTime.match(/^(\d{1,2}):(\d{2})/);
                if (m) return `um ${m[1].padStart(2, '0')}:${m[2]} Uhr`;
            }
            const cleanTime = rawTime.includes(' ') && !rawTime.includes('T') ? rawTime.replace(' ', 'T') : rawTime;
            const d = new Date(cleanTime);
            if (!isNaN(d.getTime())) {
                return `um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
            }
        }
        if (req.request_text) {
            const textMatch = req.request_text.match(/(?:Wunschtermin|Wunschzeit|Wunsch-Uhrzeit|Uhrzeit|um)\s*:?\s*(\d{1,2}:\d{2})/i) || req.request_text.match(/\b(\d{1,2}:\d{2})\s*Uhr\b/i);
            if (textMatch && textMatch[1]) {
                const [th, tm] = textMatch[1].split(':');
                return `um ${th.padStart(2, '0')}:${tm} Uhr`;
            }
        }
        return '';
    }

    function formatDisplayDate(dStr?: string): string {
        if (!dStr) return '';
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function resolveAppointmentTiming(req: any) {
        let appDateStr = "";
        let appTimeStr = "";

        if (req.date) {
            const d = new Date(req.date);
            if (!isNaN(d.getTime())) {
                const pad = (n: number) => n.toString().padStart(2, '0');
                appDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            }
        }
        if (!appDateStr) {
            const today = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            appDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        }

        if (req.time) {
            const rawTime = String(req.time).trim();
            if (/^\d{1,2}:\d{2}/.test(rawTime)) {
                const m = rawTime.match(/^(\d{1,2}):(\d{2})/);
                if (m) appTimeStr = `${m[1].padStart(2, '0')}:${m[2]}`;
            } else {
                const cleanTime = rawTime.includes(' ') && !rawTime.includes('T') ? rawTime.replace(' ', 'T') : rawTime;
                const t = new Date(cleanTime);
                if (!isNaN(t.getTime())) {
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    appTimeStr = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
                }
            }
        }
        if (!appTimeStr && req.request_text) {
            const textMatch = req.request_text.match(/(?:Wunschtermin|Wunschzeit|Wunsch-Uhrzeit|Uhrzeit|um)\s*:?\s*(\d{1,2}:\d{2})/i) || req.request_text.match(/\b(\d{1,2}:\d{2})\s*Uhr\b/i);
            if (textMatch && textMatch[1]) {
                const [th, tm] = textMatch[1].split(':');
                appTimeStr = `${th.padStart(2, '0')}:${tm}`;
            }
        }
        if (!appTimeStr) appTimeStr = "10:00";

        const [h, min] = appTimeStr.split(':').map(Number);
        const endH = (h + 1) % 24;
        const appEndTimeStr = `${endH.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        return {
            appointmentUtc: new Date(`${appDateStr}T${appTimeStr}:00`).toISOString(),
            endUtc: new Date(`${appDateStr}T${appEndTimeStr}:00`).toISOString(),
            appDateStr,
            appStartTimeStr: appTimeStr,
            appEndTimeStr
        };
    }

    function resolveTitleAndNotes(req: any, client: any, executionMode = '') {
        let title = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() 
                 || req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim()
                 || req.title?.trim()
                 || `Termin mit ${client.name_first || ''} ${client.name_last || ''}`.trim();

        const noteParts: string[] = [];
        if (executionMode) {
            noteParts.push(`📞 DURCHFÜHRUNG / ORT: ${executionMode}`);
        } else if (req.ai_summary) {
            const locMatch = req.ai_summary.match(/📍\s*Ort:\s*([^\n\r]+)/i);
            if (locMatch && /telefonisch|intern|online|zoom|videocall/i.test(locMatch[1])) {
                noteParts.push(`📞 DURCHFÜHRUNG / ORT: ${locMatch[1].trim()}`);
            }
        }

        if (req.ai_summary) noteParts.push(`📌 KI-ZUSAMMENFASSUNG:\n${req.ai_summary}`);
        if (req.request_text) noteParts.push(`💬 KUNDENNACHRICHT:\n${req.request_text}`);
        noteParts.push(`📞 KONTAKTDATEN AUS ANFRAGE:\nName: ${req.sender_name || '-'}\nTelefon: ${req.phone || '-'}\nE-Mail: ${req.email || '-'}\nAdresse: ${req.street || ''} ${req.zip_city || ''}\nKontaktweg: ${formatContact(req.contact_method)}`);
        if (req.id) noteParts.push(`📌 ANFRAGE-REFERENZ:\n[ANFRAGE_ID: ${req.id}]`);

        return { title, notes: noteParts.join('\n\n---\n\n') };
    }

    function getRatingBadgeClass(val: number) {
        if (val <= 3) return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
        if (val <= 6) return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
        if (val <= 8) return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
        return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800";
    }

    // ==========================================
    // RECOGNITION & MATCHING HEURISTICS
    // ==========================================
    function getDetectedClient(req: any) {
        const clientList: any[] = orgaStore.clients?.data || [];
        const directId = Array.isArray(req.client_id) ? req.client_id[0] : req.client_id;
        if (directId) {
            const found = clientList.find(c => c.id === directId);
            if (found) return found;
        }

        const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const titleTask = `${aiTitle}\n${aiTask}`;

        if (aiTitle || aiTask) {
            for (const c of clientList) {
                const lName = (c.name_last || '').trim();
                if (lName.length >= 3 && new RegExp(`(?:Herr|Herrn|Frau|Klient|Patient)?\\s*\\b${escapeRegex(lName)}\\b`, 'i').test(titleTask)) return c;
                if (lName.length >= 4 && new RegExp(`\\b${escapeRegex(lName)}\\b`, 'i').test(titleTask)) return c;
            }
        }

        const fullText = `${aiTitle}\n${aiTask}\n${req.request_text || ''}\n${req.ai_summary || ''}`;
        for (const c of clientList) {
            const lName = (c.name_last || '').trim();
            const fName = (c.name_first || '').trim();
            if (lName.length >= 3) {
                if (fName && fullText.toLowerCase().includes(`${fName.toLowerCase()} ${lName.toLowerCase()}`)) return c;
                if (new RegExp(`(?:Herr|Herrn|Frau|Klient|Patient)\\s+${escapeRegex(lName)}\\b`, 'i').test(fullText)) return c;
            }
        }

        if (req.email?.includes('@')) {
            const found = clientList.find(c => c.email && c.email.toLowerCase().trim() === req.email.toLowerCase().trim());
            if (found) return found;
        }

        const senderClean = cleanPersonName(req.sender_name || '');
        if (senderClean) {
            const found = clientList.find(c => {
                const f = (c.name_first || '').toLowerCase();
                const l = (c.name_last || '').toLowerCase();
                return senderClean.toLowerCase() === `${f} ${l}`.trim() || senderClean.toLowerCase() === `${l} ${f}`.trim();
            });
            if (found) return found;
        }

        return null;
    }

    async function findOrCreateClientForRequest(req: any): Promise<{ client: any, isNew: boolean }> {
        const existing = getDetectedClient(req);
        if (existing) return { client: existing, isNew: false };

        const clientList: any[] = orgaStore.clients?.data || [];
        const senderClean = cleanPersonName(req.sender_name || '');
        const senderEmail = (req.email || '').toLowerCase().trim();
        const reqPhoneClean = normalizePhone(req.phone);

        // Check caregiver / contacts
        if (senderClean || senderEmail || reqPhoneClean.length >= 6) {
            const matchedByCaregiver = clientList.find(c => {
                const cg = Array.isArray(c.expand?.caregiver) ? c.expand.caregiver[0] : c.expand?.caregiver;
                if (cg) {
                    if (senderClean && `${cg.name_first || ''} ${cg.name_last || ''}`.toLowerCase().includes(senderClean.toLowerCase())) return true;
                    if (senderEmail && cg.email?.toLowerCase().trim() === senderEmail) return true;
                    if (reqPhoneClean.length >= 6 && cg.phone && normalizePhone(cg.phone) === reqPhoneClean) return true;
                }
                if (c.expand?.contacts && Array.isArray(c.expand.contacts)) {
                    return c.expand.contacts.some((ct: any) => {
                        if (senderClean && `${ct.name_first || ''} ${ct.name_last || ''}`.toLowerCase().includes(senderClean.toLowerCase())) return true;
                        if (senderClean && ct.company_name?.toLowerCase().includes(senderClean.toLowerCase())) return true;
                        return senderEmail && ct.email?.toLowerCase().trim() === senderEmail;
                    });
                }
                return false;
            });
            if (matchedByCaregiver) return { client: matchedByCaregiver, isNew: false };
        }

        // Check address match
        if (req.street && req.zip_city) {
            const reqSt = req.street.toLowerCase().replace(/\s+/g, ' ').trim();
            const found = clientList.find(c => {
                const cSt = `${c.street || ''} ${c.housenr || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
                return cSt && (cSt.includes(reqSt) || reqSt.includes(cSt));
            });
            if (found) return { client: found, isNew: false };
        }

        // Kein passender Klient gefunden -> Automatisch neuen Klienten anlegen
        const { salutation, firstName, lastName } = parseNameAndSalutation(req.sender_name);
        const { streetName, houseNr, zip, city } = parseAddress(req.street, req.zip_city);

        const newClientPayload: any = {
            salutation,
            name_first: firstName || 'Neuer',
            name_last: lastName || 'Klient',
            street: streetName,
            housenr: houseNr,
            zip,
            city,
            email: req.email || '',
            phone: req.phone || '',
            status: 'Aktiv',
            company: req.company || currentUser?.company || '',
            assigned_employee: currentUser?.id || '',
            notes: `Automatisch aus Terminanfrage übernommen.\n\nOriginalanfrage:\n${req.request_text || ''}`
        };

        const created = await pb.collection('clients').create(newClientPayload, { requestKey: null });
        if (orgaStore.clients) {
            orgaStore.clients.data = [created as any, ...orgaStore.clients.data];
        }
        return { client: created, isNew: true };
    }

    function isSenderOrCaregiverContact(ct: any, req: any, client?: any): boolean {
        if (!ct) return false;
        const sEmail = (req?.email || '').toLowerCase().trim();
        const sName = cleanPersonName(req?.sender_name || '').toLowerCase().trim();
        const ctEmail = (ct.email || '').toLowerCase().trim();
        const ctFirst = (ct.name_first || '').toLowerCase().trim();
        const ctLast = (ct.name_last || '').toLowerCase().trim();
        const ctComp = (ct.company_name || '').toLowerCase().trim();

        if (sEmail && ctEmail && sEmail === ctEmail) return true;
        if (sName) {
            if (ctLast && ctLast.length >= 3 && (sName === ctLast || sName.includes(ctLast))) {
                if (ctFirst && sName.includes(ctFirst)) return true;
                if (ctComp && (ctComp.includes('betreuer') || ctComp.includes('beistand') || ctComp.includes('kanzlei') || ctComp.includes('pflege'))) return true;
            }
            if (ctComp && sName.length >= 4 && ctComp.includes(sName)) return true;
        }

        if (client) {
            const cGiverId = client.caregiver?.id || client.caregiver || client.expand?.caregiver?.id;
            if (cGiverId && ct.id === cGiverId) return true;
            if (client.expand?.caregiver?.email && ctEmail && client.expand.caregiver.email.toLowerCase().trim() === ctEmail) return true;
        }
        return false;
    }

    function extractDoctorOrTargetQuery(req: any): { query: string; cleanKeyword: string; isDoctor: boolean } | null {
        const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const rawLoc = req.ai_summary?.match(/📍\s*Ort:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const fullText = `${aiTitle}\n${aiTask}\n${rawLoc}\n${req.request_text || ''}\n${req.ai_summary || ''}`;

        const parenMatch = aiTitle.match(/\(((?:Arzt|Ärztin|Hausarzt|Hausärztin|Facharzt|Fachärztin|Zahnarzt|Zahnärztin|Frauenarzt|Frauenärztin|Kardiologe|Orthopäde|Augenarzt|Dr\.|Praxis|Klinik|Klinikum|Therapie|Physio)[^\)]+)\)/i);
        if (parenMatch?.[1]) {
            const raw = parenMatch[1].trim();
            const cleaned = raw.replace(/^(?:Arzt|Ärztin|Hausarzt|Hausärztin|Facharzt|Fachärztin|Zahnarzt|Zahnärztin|Frauenarzt|Frauenärztin|Dr\.\s*med\.?|Dr\.|Praxis|Herr|Hr\.|Frau|Fr\.)\s*/gi, '').trim();
            return { query: raw, cleanKeyword: cleaned.toLowerCase(), isDoctor: true };
        }

        const arztPrefixMatch = fullText.match(/(?:Arzt|Praxis|Klinik|Therapie|Zielort):\s*([^\n\r,\.]+)/i);
        if (arztPrefixMatch?.[1]) {
            const raw = arztPrefixMatch[1].trim();
            const cleaned = raw.replace(/^(?:Arzt|Ärztin|Hausarzt|Hausärztin|Facharzt|Dr\.\s*med\.?|Dr\.|Praxis|Herr|Hr\.|Frau|Fr\.)\s*/gi, '').trim();
            if (cleaned.length >= 3) return { query: raw, cleanKeyword: cleaned.toLowerCase(), isDoctor: true };
        }

        const docMatch = fullText.match(/(?:Hausarzt|Hausärztin|Facharzt|Fachärztin|Zahnarzt|Zahnärztin|Frauenarzt|Frauenärztin|Kardiologe|Kardiologin|Orthopäde|Orthopädin|Augenarzt|Augenärztin|Neurologe|Neurologin|Hautarzt|Hautärztin|HNO|Arzt|Ärztin|Praxis|Dr\.\s*med\.?|Dr\.)\s+(?:(?:Fr\.|Frau|Hr\.|Herr)\s+)?(?:Dr\.\s*)?([A-ZÄÖÜ][a-zäöüß]+)/i);
        if (docMatch?.[1]) {
            return { query: docMatch[0].trim(), cleanKeyword: docMatch[1].trim().toLowerCase(), isDoctor: true };
        }

        const instMatch = fullText.match(/(?:Klinikum|Klinik|Krankenhaus|Pflegeheim|Seniorenresidenz|Therapiezentrum|Physiotherapie|Ergotherapie|Logopädie|Apotheke|Zentrum|MVZ)\s+([A-ZÄÖÜ][a-zäöüß\.\-]+)/i);
        if (instMatch?.[1]) {
            return { query: instMatch[0].trim(), cleanKeyword: instMatch[1].toLowerCase(), isDoctor: false };
        }
        return null;
    }

    function getDetectedContact(req: any, client?: any): any {
        const allContacts: any[] = orgaStore.contacts?.data || [];
        if (!allContacts.length) return null;

        const effectiveClient = client || getDetectedClient(req);
        const clientContacts: any[] = [];
        if (effectiveClient) {
            if (Array.isArray(effectiveClient.expand?.contacts) && effectiveClient.expand.contacts.length > 0) {
                clientContacts.push(...effectiveClient.expand.contacts);
            } else if (Array.isArray(effectiveClient.contacts) && effectiveClient.contacts.length > 0) {
                for (const cId of effectiveClient.contacts) {
                    const found = allContacts.find(c => c.id === cId);
                    if (found) clientContacts.push(found);
                }
            }
        }

        const target = extractDoctorOrTargetQuery(req);
        if (target?.cleanKeyword && target.cleanKeyword.length >= 3) {
            for (const ct of [...clientContacts, ...allContacts]) {
                if (isSenderOrCaregiverContact(ct, req, effectiveClient)) continue;
                const lName = (ct.name_last || '').toLowerCase().trim();
                const comp = (ct.company_name || '').toLowerCase().trim();
                if (lName && (lName === target.cleanKeyword || lName.includes(target.cleanKeyword) || target.cleanKeyword.includes(lName))) return ct;
                if (comp && comp.includes(target.cleanKeyword)) return ct;
            }
        }

        const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        const searchPool = `${aiTitle}\n${aiTask}\n${req.request_text || ''}`.toLowerCase();

        for (const ct of [...clientContacts, ...allContacts]) {
            if (isSenderOrCaregiverContact(ct, req, effectiveClient)) continue;
            const lName = (ct.name_last || '').toLowerCase().trim();
            const comp = (ct.company_name || '').toLowerCase().trim();
            if (lName && lName.length >= 3 && searchPool.includes(lName)) return ct;
            if (comp && comp.length >= 4 && searchPool.includes(comp)) return ct;
        }

        return null;
    }

    function getDetectedLocation(req: any, client?: any, contact?: any): string {
        const ct = contact || getDetectedContact(req, client);
        if (ct?.street) {
            const addr = `${ct.street} ${ct.housenr || ''}`.trim();
            const city = `${ct.zip || ''} ${ct.city || ''}`.trim();
            return [addr, city].filter(Boolean).join(', ');
        }

        const locMatch = req.ai_summary?.match(/📍\s*Ort:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        if (locMatch && /telefonisch|intern|online|zoom|videocall/i.test(locMatch)) return '';
        if (locMatch) return locMatch;
        if (req.street && req.zip_city) return `${req.street}, ${req.zip_city}`.trim();
        return '';
    }

    function getDetectedExecutionMode(req: any) {
        const locMatch = req.ai_summary?.match(/📍\s*Ort:\s*([^\n\r]+)/i)?.[1]?.trim();
        return (locMatch && /telefonisch|intern|online|zoom|videocall/i.test(locMatch)) ? locMatch : '';
    }

    function resolveLocationAndContact(req: any, client: any) {
        const matchedContact = getDetectedContact(req, client);
        const aiLocation = req.ai_summary?.match(/📍\s*Ort:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
        let addressText = (req.street && req.zip_city) ? `${req.street}, ${req.zip_city}`.trim() : '';
        if (!addressText && req.request_text) {
            const m = req.request_text.match(/(?:Adresse|Ort):\s*([^\n\r]+)/i);
            if (m && m[1] && m[1].trim() !== '-') addressText = m[1].trim();
        }

        const rawLoc = aiLocation || addressText;
        const isNonPhysical = /telefonisch|intern|telefon|online|zoom|videocall/i.test(rawLoc);

        if (matchedContact) {
            const addrPart = `${matchedContact.street || ''} ${matchedContact.housenr || ''}`.trim();
            const cityPart = `${matchedContact.zip || ''} ${matchedContact.city || ''}`.trim();
            const namePart = matchedContact.company_name?.trim() || `${matchedContact.name_first || ''} ${matchedContact.name_last || ''}`.trim();

            const formatted = [namePart, addrPart, cityPart].filter(Boolean).join(', ');
            return {
                useClientAddress: false,
                locationAddress: formatted || (isNonPhysical ? '' : rawLoc),
                contactId: matchedContact.id,
                executionMode: isNonPhysical ? rawLoc : ''
            };
        }

        const isBeimKlienten = /beim klienten|zuhause|beim kunden|beim patienten|vor ort|wohnung des klienten/i.test(aiLocation) ||
            (!isNonPhysical && client?.street && client.street.length >= 4 && (
                rawLoc.toLowerCase().includes(client.street.toLowerCase()) || (req.street && req.street.toLowerCase().includes(client.street.toLowerCase()))
            ));

        if (isBeimKlienten) {
            const fullClientAddr = [`${client?.street || ''} ${client?.housenr || ''}`.trim(), `${client?.zip || ''} ${client?.city || ''}`.trim()].filter(Boolean).join(', ');
            return {
                useClientAddress: true,
                locationAddress: fullClientAddr,
                contactId: '',
                executionMode: isNonPhysical ? rawLoc : ''
            };
        }

        const explicitMatch = (req.ai_summary || req.request_text || '').match(/(?:Arzt|Praxis|Zielort|Adresse):\s*([^,\n\r]+,\s*[0-9]{5}\s+[^\n\r]+)/i);
        if (explicitMatch?.[1]) {
            return {
                useClientAddress: false,
                locationAddress: explicitMatch[1].trim(),
                contactId: '',
                executionMode: isNonPhysical ? rawLoc : ''
            };
        }

        return {
            useClientAddress: false,
            locationAddress: isNonPhysical ? '' : (rawLoc || addressText),
            contactId: '',
            executionMode: isNonPhysical ? rawLoc : ''
        };
    }

    function findExistingAppointmentForRequest(req: any, clientId?: string, appointmentUtc?: string): any | null {
        const apps = orgaStore.appointments?.data || [];
        if (!apps.length || !req) return null;

        if (req.id) {
            const found = apps.find((a: any) => a.notes?.includes(`[ANFRAGE_ID: ${req.id}]`) || a.notes?.includes(req.id));
            if (found) return found;
        }

        if (clientId && appointmentUtc) {
            const reqTime = new Date(appointmentUtc).getTime();
            const byExactTime = apps.find((a: any) => {
                const hasClient = a.client && (Array.isArray(a.client) ? a.client.includes(clientId) : a.client === clientId);
                return hasClient && a.appointment && new Date(a.appointment).getTime() === reqTime;
            });
            if (byExactTime) return byExactTime;
        }

        if (clientId && req.date) {
            const reqDateStr = new Date(req.date).toISOString().split('T')[0];
            const byDate = apps.find((a: any) => {
                const hasClient = a.client && (Array.isArray(a.client) ? a.client.includes(clientId) : a.client === clientId);
                return hasClient && a.appointment && new Date(a.appointment).toISOString().split('T')[0] === reqDateStr;
            });
            if (byDate) return byDate;
        }
        return null;
    }

    function getLinkedAppointments(req: any): any[] {
        const client = getDetectedClient(req);
        const apps = orgaStore.appointments?.data || [];
        if (!apps.length || !req) return [];

        return apps.filter((a: any) => {
            if (req.id && a.notes && (a.notes.includes(`[ANFRAGE_ID: ${req.id}]`) || a.notes.includes(req.id))) return true;
            if (!client) return false;
            const hasClient = a.client && (Array.isArray(a.client) ? a.client.includes(client.id) : a.client === client.id);
            if (!hasClient || !req.date || !a.appointment) return false;
            return new Date(req.date).toISOString().split('T')[0] === new Date(a.appointment).toISOString().split('T')[0];
        });
    }

    function detectMissingContactQuery(req: any, client?: any): string | null {
        if (getDetectedContact(req, client)) return null;
        return extractDoctorOrTargetQuery(req)?.query || null;
    }

    function detectMissingLocationQuery(req: any, contact?: any): string | null {
        if (contact) return null;
        const loc = getDetectedLocation(req);
        if (!loc || /telefonisch|intern|online|zoom|videocall|beim klienten|zuhause/i.test(loc)) return null;

        const existing = orgaStore.contacts?.data?.find((ct: any) => {
            const fullAddr = `${ct.street || ''} ${ct.housenr || ''}`.trim();
            const comp = ct.company_name || '';
            return (fullAddr && fullAddr.length >= 5 && loc.toLowerCase().includes(fullAddr.toLowerCase())) ||
                   (comp && comp.length >= 4 && loc.toLowerCase().includes(comp.toLowerCase()));
        });
        return existing ? null : loc;
    }

    // ==========================================
    // DATA LOADING & LIFECYCLE
    // ==========================================
    async function loadAiSummaryForRequest(req: any, force = false) {
        if (!req?.id || (!force && req.ai_summary) || summarizingReqIds[req.id]) return;
        summarizingReqIds[req.id] = true;
        try {
            const res = await fetch(`${MICROSERVICE_URL}/ai/summarize-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({ id: req.id, force })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.summary) req.ai_summary = data.summary;
            }
        } catch (err) {
            console.warn('[AI Summary] Fehler beim Laden:', err);
        } finally {
            summarizingReqIds[req.id] = false;
        }
    }

    async function loadFeedbacks() {
        isFeedbacksLoading = true;
        try {
            let filter = 'id != ""';
            if (!isGodMode) {
                const userCompanyId = currentUser?.company;
                if (!userCompanyId) {
                    feedbacks = [];
                    return;
                }
                filter = `client.company = "${userCompanyId}"`;
            }
            feedbacks = await pb.collection('feedbacks').getFullList({ filter, sort: '-created', expand: 'client', requestKey: null });
        } catch (e) {
            console.error("Fehler beim Laden der Feedbacks:", e);
        } finally {
            isFeedbacksLoading = false;
        }
    }

    const feedbackCallback = (e: any) => {
        if (e.action === 'create') feedbacks = [e.record, ...feedbacks];
        else if (e.action === 'update') feedbacks = feedbacks.map(f => f.id === e.record.id ? e.record : f);
        else if (e.action === 'delete') feedbacks = feedbacks.filter(f => f.id !== e.record.id);
    };

    const requestsCallback = () => reqService.init();

    onMount(() => {
        reqService.init();
        loadFeedbacks();
        pb.collection('feedbacks').subscribe('*', feedbackCallback, { requestKey: null });
        pb.collection('appointment_requests').subscribe('*', requestsCallback);
    });

    onDestroy(() => {
        reqService.cleanup();
        pb.collection('feedbacks').unsubscribe('*');
        pb.collection('appointment_requests').unsubscribe('*');
    });

    $effect(() => {
        if (activeTab === 'requests') {
            for (const r of visibleRequests) {
                if (!r.ai_summary && !summarizingReqIds[r.id]) {
                    loadAiSummaryForRequest(r);
                }
            }
        }
    });

    // ==========================================
    // DERIVED DATA COLLECTIONS & COUNTS
    // ==========================================
    let visibleRequests = $derived.by(() => {
        let list = reqService.requests;
        if (isGodMode) return list;

        const userComp = currentUser?.company;
        const userCompanyIds: string[] = Array.isArray(userComp) ? userComp : (userComp ? [userComp] : []);
        if (userCompanyIds.length === 0) return list;

        return list.filter(r => {
            if (!r.company || (Array.isArray(r.company) && r.company.length === 0)) return true;
            const reqComps = Array.isArray(r.company) ? r.company : [r.company];
            return reqComps.some((rc: any) => userCompanyIds.includes(rc));
        });
    });

    let pendingCount = $derived(visibleRequests.filter(isRequestOpen).length);
    let requestsWithoutSummaryCount = $derived(visibleRequests.filter(r => !r.ai_summary).length);

    let selectedRequestId = $state<string | null>(null);
    let showMobileDetail = $state(false);

    let filteredRequests = $derived.by(() => {
        let list = [...visibleRequests];
        if (requestStatusFilter === 'open') list = list.filter(isRequestOpen);
        else if (requestStatusFilter === 'accepted') list = list.filter(r => r.status === 'accepted');

        if (requestSearch.trim()) {
            const q = requestSearch.toLowerCase().trim();
            list = list.filter(r => `${r.sender_name || ''} ${r.email || ''} ${r.request_text || ''} ${r.ai_summary || ''} ${r.phone || ''} ${r.zip_city || ''} ${r.street || ''}`.toLowerCase().includes(q));
        }

        // Chronologische Sortierung nach Wunschtermin (dringendste / nächste Termine zuerst)
        return list.sort((a: any, b: any) => {
            const aOpen = isRequestOpen(a);
            const bOpen = isRequestOpen(b);
            if (aOpen && !bOpen) return -1;
            if (!aOpen && bOpen) return 1;

            const aDate = a.date ? new Date(a.date).getTime() : 0;
            const bDate = b.date ? new Date(b.date).getTime() : 0;

            if (aDate && bDate) return aDate - bDate;
            if (aDate && !bDate) return -1;
            if (!aDate && bDate) return 1;

            return new Date(b.created).getTime() - new Date(a.created).getTime();
        });
    });

    let selectedRequest = $derived.by(() => {
        if (!filteredRequests.length) return null;
        if (selectedRequestId) {
            const found = filteredRequests.find(r => r.id === selectedRequestId);
            if (found) return found;
        }
        return filteredRequests[0] || null;
    });

    $effect(() => {
        if (filteredRequests.length > 0) {
            if (!selectedRequestId || !filteredRequests.some(r => r.id === selectedRequestId)) {
                selectedRequestId = filteredRequests[0].id;
            }
        } else {
            selectedRequestId = null;
        }
    });

    let changeRequests = $derived.by(() => {
        let list = (orgaStore.appointments?.data || []).filter((a: any) => a.requestet_changes?.status === 'pending');
        if (!isGodMode) {
            const userCompanyId = currentUser?.company;
            if (isAdmin && userCompanyId) {
                list = list.filter((a: any) => a.expand?.user?.company === userCompanyId);
            } else {
                list = list.filter((a: any) => a.user === currentUser?.id);
            }
        }
        return list.sort((a: any, b: any) => new Date(b.requestet_changes.created).getTime() - new Date(a.requestet_changes.created).getTime());
    });
    let pendingChangesCount = $derived(changeRequests.length);

    let filteredChanges = $derived.by(() => {
        if (!changeSearch.trim()) return changeRequests;
        const q = changeSearch.toLowerCase().trim();
        return changeRequests.filter((a: any) => `${a.expand?.client?.[0]?.name_first || ''} ${a.expand?.client?.[0]?.name_last || ''} ${a.requestet_changes?.text || ''}`.toLowerCase().includes(q));
    });

    let visibleFeedbacks = $derived(feedbacks.filter(f => showAllFeedbacks || f.status !== 'Archieviert'));
    let newFeedbacksCount = $derived(feedbacks.filter(f => f.status === 'Neu').length);

    let filteredFeedbacks = $derived.by(() => {
        let list = visibleFeedbacks;
        if (feedbackRatingFilter === 'critical') list = list.filter(f => (f.rating || 0) <= 5);
        else if (feedbackRatingFilter === 'good') list = list.filter(f => (f.rating || 0) > 5);

        if (feedbackSearch.trim()) {
            const q = feedbackSearch.toLowerCase().trim();
            list = list.filter(f => `${f.name_first || ''} ${f.name_last || ''} ${f.message || ''}`.toLowerCase().includes(q));
        }
        return list;
    });

    let newClients = $derived.by(() => {
        let list = (orgaStore.clients?.data || []).filter((c: any) => c.status === 'Inaktiv' && c.notes?.includes('NEUAUFNAHME-ANFRAGE'));
        if (!isGodMode) {
            const userCompanyId = currentUser?.company;
            if (isAdmin && userCompanyId) {
                list = list.filter((c: any) => {
                    const comp = c.company;
                    if (Array.isArray(comp)) return comp.includes(userCompanyId);
                    if (typeof comp === 'string' && comp.startsWith('[')) {
                        try { return JSON.parse(comp).includes(userCompanyId); } catch { return false; }
                    }
                    return comp === userCompanyId || (comp && comp.includes(userCompanyId));
                });
            } else {
                list = [];
            }
        }
        return list.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    });
    let pendingAdmissionsCount = $derived(newClients.length);

    let filteredAdmissions = $derived.by(() => {
        if (!admissionSearch.trim()) return newClients;
        const q = admissionSearch.toLowerCase().trim();
        return newClients.filter((c: any) => `${c.name_first || ''} ${c.name_last || ''} ${c.notes || ''}`.toLowerCase().includes(q));
    });

    let filteredAttachClients = $derived.by(() => {
        const q = attachSearchQuery.toLowerCase().trim();
        let list = orgaStore.clients?.data || [];
        if (q) list = list.filter((c: any) => `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase().includes(q));
        return list.slice(0, 15);
    });

    // ==========================================
    // ACTIONS & MUTATIONS
    // ==========================================
    async function batchGenerateAllSummaries() {
        if (isBatchGenerating) return;
        const targets = visibleRequests.filter(r => !r.ai_summary);
        if (targets.length === 0) {
            toastStore.info("Alle sichtbaren Anfragen haben bereits eine KI-Zusammenfassung.");
            return;
        }
        isBatchGenerating = true;
        toastStore.info(`Starte KI-Generierung für ${targets.length} frühere Anfrage(n)...`);
        let count = 0;
        for (const r of targets) {
            try {
                await loadAiSummaryForRequest(r, true);
                count++;
            } catch {}
        }
        isBatchGenerating = false;
        toastStore.success(`KI-Zusammenfassungen für ${count} frühere Anfrage(n) erfolgreich generiert!`);
    }

    async function acceptClient(id: string) {
        try {
            const client = await pb.collection('clients').getOne(id, { requestKey: null });
            let updatedNotes = client.notes || '';
            let newInsuranceId: string | null = null;
            let newInsName = '';

            const match = updatedNotes.match(/\[NEUE_KRANKENKASSE:\s*({.*?})\]/);
            if (match) {
                try {
                    const insData = JSON.parse(match[1]);
                    newInsName = (insData.name || '').trim();
                    if (newInsName) {
                        const existingList = await pb.collection('insurancies').getFullList({
                            filter: `name ~ "${newInsName}"`,
                            requestKey: null
                        }).catch(() => []);
                        
                        const exactMatch = existingList.find((i: any) => i.name.toLowerCase().trim() === newInsName.toLowerCase().trim());
                        if (exactMatch) {
                            newInsuranceId = exactMatch.id;
                        } else {
                            const created = await pb.collection('insurancies').create({
                                name: newInsName,
                                street: insData.street || '',
                                zip: insData.zip || '',
                                city: insData.city || '',
                                type: 'GKV (Gesetzlich)'
                            });
                            newInsuranceId = created.id;
                            if (orgaStore.insurancies) {
                                orgaStore.insurancies.data = [created as any, ...orgaStore.insurancies.data];
                            }
                        }
                    }
                    updatedNotes = updatedNotes.replace(/\[NEUE_KRANKENKASSE:\s*{.*?}\]\n?/g, '').trim();
                } catch (err) {
                    console.error("Fehler beim Verarbeiten der neuen Krankenkasse:", err);
                }
            }

            const updatePayload: any = { status: 'Aktiv', notes: updatedNotes };
            if (newInsuranceId) updatePayload.insurance = [newInsuranceId];

            const updatedClient = await pb.collection('clients').update(id, updatePayload, {
                expand: 'insurance,contacts,caregiver,retirement_homes',
                requestKey: null
            });

            if (orgaStore.clients) {
                const idx = orgaStore.clients.data.findIndex((c: any) => c.id === id);
                if (idx !== -1) orgaStore.clients.data[idx] = updatedClient as any;
            }

            toastStore.success(newInsuranceId && newInsName 
                ? `Klient aufgenommen und Krankenkasse "${newInsName}" direkt neu angelegt!` 
                : "Klient wurde erfolgreich aufgenommen (Status: Aktiv).");
        } catch (e: any) {
            console.error(e);
            toastStore.error("Fehler beim Aufnehmen des Klienten: " + (e.message || ''));
        }
    }

    async function deleteNewClient(id: string) {
        if (await confirmStore.ask("Möchten Sie diese Anfrage und den dazugehörigen Klienten-Datensatz wirklich unwiderruflich löschen?", "Anfrage löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('clients').delete(id);
                toastStore.info("Aufnahme-Anfrage gelöscht.");
            } catch { toastStore.error("Fehler beim Löschen."); }
        }
    }

    function previewAttachment(req: any, filename: string) {
        pdfPreviewModal?.open(pb.files.getURL(req, filename), filename, filename);
    }

    async function copyToClient(req: any, filename: string, clientId: string, silent = false) {
        attachDropdownOpen = null;
        try {
            if (!silent) toastStore.info("Übertrage Datei...");
            const url = pb.files.getURL(req, filename);
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], filename, { type: blob.type });

            const formData = new FormData();
            formData.append('documents', file);

            await pb.collection('clients').update(clientId, formData);
            if (!silent) toastStore.success("Datei wurde erfolgreich in der Klienten-Akte gespeichert.");
        } catch (e) {
            if (!silent) toastStore.error("Fehler beim Speichern der Datei.");
            console.error(e);
        }
    }

    async function handlePropose(id: string) {
        const req = reqService.requests.find((r) => r.id === id);
        const email = getClientEmail(req);
        if (email) {
            replyModal?.open(req, 'propose', email);
        } else {
            toastStore.warning("Dieser Klient hat keine gültige E-Mail-Adresse hinterlegt.");
        }
    }

    async function assignClientToRequest(req: any, client: any) {
        req.client_id = client.id;
        activeClientPickerReqId = null;
        try {
            await pb.collection('appointment_requests').update(req.id, { client_id: client.id }, { requestKey: null });
            toastStore.success(`Klient "${client.name_first} ${client.name_last}" erfolgreich zugeordnet.`);
        } catch (e) {
            console.error(e);
            toastStore.error("Fehler beim Zuordnen des Klienten.");
        }
    }

    async function handleGoogleContactSearch(req: any, type: 'doctor' | 'location') {
        const client = getDetectedClient(req);
        const locationContext = client?.city ? `${client.zip || ''} ${client.city}`.trim() : (req.zip_city || 'Halle (Saale)');
        const query = type === 'doctor' ? (detectMissingContactQuery(req) || 'Arzt') : (detectMissingLocationQuery(req) || req.street || '');

        const createdContact = await googleContactModal?.open({
            query,
            location: locationContext,
            type,
            context: `${req.ai_summary || ''}\n${req.request_text || ''}`
        });

        if (createdContact) {
            if (client?.id) await linkContactToClient(client, createdContact.id);
            if (req?.id && req.status !== 'accepted') {
                await reqService.updateStatus(req.id, 'accepted');
            }
        }
        return createdContact;
    }

    async function createContactFromRequest(req: any) {
        if (!req) return;
        const { salutation, firstName, lastName } = parseNameAndSalutation(req.sender_name);
        const { streetName, houseNr, zip, city } = parseAddress(req.street, req.zip_city);

        const payload: any = {
            salutation,
            company_name: '',
            name_first: firstName,
            name_last: lastName || 'Unbekannt',
            street: streetName,
            housenr: houseNr,
            zip,
            city,
            phone: req.phone || '',
            email: req.email || '',
            notes: `Aus Kundenanfrage übernommen:\n${req.request_text || req.ai_summary || ''}`
        };

        try {
            const created = await pb.collection('contacts').create(payload, { requestKey: null });
            if (orgaStore.contacts?.data) {
                orgaStore.contacts.data = [created as any, ...orgaStore.contacts.data];
            }

            const client = getDetectedClient(req);
            if (client?.id) await linkContactToClient(client, created.id);
            if (req.id) await reqService.updateStatus(req.id, 'accepted');

            const displayName = [created.name_first, created.name_last].filter(Boolean).join(' ') || created.company_name;
            toastStore.success(`Kontakt "${displayName}" erfolgreich erstellt & Anfrage erledigt!`);
        } catch (err: any) {
            console.error("Fehler beim Anlegen des Kontakts:", err);
            toastStore.error("Kontakt konnte nicht erstellt werden: " + (err.message || ''));
        }
    }

    async function transferRequestToAppointment(req: any, options: { openModal?: boolean, forceNew?: boolean } = { openModal: false, forceNew: false }) {
        if (!req?.id || transferringReqIds[req.id]) return;
        transferringReqIds[req.id] = true;

        try {
            const { client: linkedClient, isNew: isNewClient } = await findOrCreateClientForRequest(req);
            const { appointmentUtc, endUtc } = resolveAppointmentTiming(req);

            if (!options.forceNew) {
                const existingApp = findExistingAppointmentForRequest(req, linkedClient?.id, appointmentUtc);
                if (existingApp) {
                    if (req.status !== 'accepted') await reqService.updateStatus(req.id, 'accepted');
                    if (req.client_id !== linkedClient.id) {
                        await pb.collection('appointment_requests').update(req.id, { client_id: linkedClient.id }, { requestKey: null }).catch(() => {});
                        req.client_id = linkedClient.id;
                    }

                    const formattedDate = new Date(existingApp.appointment || appointmentUtc).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const formattedTime = new Date(existingApp.appointment || appointmentUtc).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                    if (options.openModal) {
                        appointmentModal?.open(existingApp);
                        toastStore.info(`Bestehender Termin (${formattedDate} um ${formattedTime} Uhr) geöffnet.`);
                    } else {
                        toastStore.warning(`Termin existiert bereits im Kalender (${formattedDate} um ${formattedTime} Uhr).`);
                    }
                    return existingApp;
                }
            }

            toastStore.info(options.openModal ? "Übernehme Anfrage in Kalender..." : "Erstelle Termin mit 1-Click...");

            let { useClientAddress, locationAddress, contactId, executionMode } = resolveLocationAndContact(req, linkedClient);

            if (!contactId && !useClientAddress) {
                const missingContact = detectMissingContactQuery(req, linkedClient);
                if (missingContact) {
                    const promptResult = await handleGoogleContactSearch(req, 'doctor');
                    if (promptResult?.id) {
                        contactId = promptResult.id;
                        if (promptResult.street && promptResult.city) {
                            const namePart = [promptResult.company_name, `${promptResult.name_first || ''} ${promptResult.name_last || ''}`.trim()].filter(Boolean).join(' - ');
                            const addrPart = `${promptResult.street || ''} ${promptResult.housenr || ''}`.trim();
                            const cityPart = `${promptResult.zip || ''} ${promptResult.city || ''}`.trim();
                            locationAddress = [namePart, addrPart, cityPart].filter(Boolean).join(', ');
                        }
                    }
                }
            }

            let trId: string | null = null;
            try {
                const tr = await pb.collection('time_records').create({ start: appointmentUtc, end: endUtc }, { requestKey: null });
                trId = tr.id;
            } catch (trErr) {
                console.warn("Time-Record konnte nicht angelegt werden:", trErr);
            }

            const { title, notes } = resolveTitleAndNotes(req, linkedClient, executionMode);

            if (req.attachments?.length && linkedClient?.id) {
                for (const attachment of req.attachments) {
                    await copyToClient(req, attachment, linkedClient.id, true).catch(() => {});
                }
            }

            const appointmentData: any = {
                appointment: appointmentUtc,
                description: title,
                notes,
                location_address: locationAddress,
                client: [linkedClient.id],
                user: linkedClient.assigned_employee || currentUser?.id || '',
                is_private: false,
                is_visible: true,
                settled: false,
                is_series: false
            };
            if (contactId) appointmentData.appointment_at = [contactId];
            if (trId) appointmentData.time_record = [trId];

            const createdApp = await pb.collection('appointments').create(appointmentData, {
                expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at',
                requestKey: null
            });

            const updatePayload: any = { client_id: linkedClient.id };
            if (req.status !== 'accepted') {
                updatePayload.status = 'accepted';
                await reqService.updateStatus(req.id, 'accepted');
            } else {
                await pb.collection('appointment_requests').update(req.id, updatePayload, { requestKey: null }).catch(() => {});
            }
            req.client_id = linkedClient.id;

            if (orgaStore.appointments) {
                const existingIdx = orgaStore.appointments.data.findIndex((a: any) => a.id === createdApp.id);
                if (existingIdx !== -1) {
                    orgaStore.appointments.data[existingIdx] = createdApp as any;
                } else {
                    orgaStore.appointments.data = [createdApp as any, ...(orgaStore.appointments.data || [])];
                }
            }

            if (options.openModal) {
                createdApp.use_client_address = useClientAddress;
                appointmentModal?.open(createdApp);
                toastStore.success(isNewClient 
                    ? `Klient "${linkedClient.name_first} ${linkedClient.name_last}" neu angelegt & Termin geöffnet!` 
                    : `Termin für "${linkedClient.name_first} ${linkedClient.name_last}" geöffnet!`);
            } else {
                const formattedDate = new Date(appointmentUtc).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const formattedTime = new Date(appointmentUtc).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                toastStore.success(`⚡ 1-Click: Termin für "${linkedClient.name_first} ${linkedClient.name_last}" am ${formattedDate} um ${formattedTime} Uhr erstellt!`);

                const clientEmail = getClientEmail(req);
                if (clientEmail) replyModal?.open(req, 'accepted', clientEmail);
            }

            return createdApp;
        } catch (e: any) {
            console.error("Fehler beim Übernehmen des Termins:", e);
            toastStore.error("Termin konnte nicht erstellt werden: " + (e.message || ''));
        } finally {
            transferringReqIds[req.id] = false;
        }
    }

    async function syncAppointmentFromRequest(req: any, targetApp: any) {
        if (!req || !targetApp?.id || syncingAppIds[targetApp.id]) return;
        syncingAppIds[targetApp.id] = true;

        try {
            toastStore.info("Aktualisiere Termindaten mit Anfrage...");
            const { client: linkedClient } = await findOrCreateClientForRequest(req);
            const { appointmentUtc, endUtc } = resolveAppointmentTiming(req);
            const { locationAddress, contactId, executionMode } = resolveLocationAndContact(req, linkedClient);
            const { title, notes } = resolveTitleAndNotes(req, linkedClient, executionMode);

            let trId = Array.isArray(targetApp.time_record) ? targetApp.time_record[0] : targetApp.time_record;
            if (trId) {
                await pb.collection('time_records').update(trId, { start: appointmentUtc, end: endUtc }, { requestKey: null }).catch(() => {});
            } else {
                const newTr = await pb.collection('time_records').create({ start: appointmentUtc, end: endUtc }, { requestKey: null }).catch(() => null);
                if (newTr) trId = newTr.id;
            }

            const updatePayload: any = {
                appointment: appointmentUtc,
                description: title,
                notes,
                location_address: locationAddress
            };
            if (linkedClient?.id) updatePayload.client = [linkedClient.id];
            if (contactId) updatePayload.appointment_at = [contactId];
            if (trId) updatePayload.time_record = [trId];

            const updatedApp = await pb.collection('appointments').update(targetApp.id, updatePayload, {
                expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at',
                requestKey: null
            });

            if (req.status !== 'accepted') await reqService.updateStatus(req.id, 'accepted');
            if (linkedClient?.id && req.client_id !== linkedClient.id) {
                await pb.collection('appointment_requests').update(req.id, { client_id: linkedClient.id }, { requestKey: null }).catch(() => {});
                req.client_id = linkedClient.id;
            }

            if (orgaStore.appointments) {
                const idx = orgaStore.appointments.data.findIndex((a: any) => a.id === targetApp.id);
                if (idx !== -1) orgaStore.appointments.data[idx] = updatedApp as any;
            }

            const formattedDate = new Date(appointmentUtc).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = new Date(appointmentUtc).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            toastStore.success(`⚡ Daten im Termin aktualisiert: ${formattedDate} um ${formattedTime} Uhr!`);
        } catch (err: any) {
            console.error("Fehler beim Synchronisieren des Termins:", err);
            toastStore.error("Fehler beim Aktualisieren: " + (err.message || ''));
        } finally {
            syncingAppIds[targetApp.id] = false;
        }
    }

    async function handleStatus(id: string, status: 'accepted' | 'denied' | 'requested') {
        const req = reqService.requests.find((r) => r.id === id);
        try {
            if (status === 'accepted' && req) {
                await transferRequestToAppointment(req, { openModal: true });
                return;
            }

            await reqService.updateStatus(id, status);

            if (req && status !== 'requested') {
                const clientEmail = getClientEmail(req);
                if (clientEmail) {
                    replyModal?.open(req, status, clientEmail);
                } else {
                    toastStore.success(`Anfrage wurde auf '${status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}' gesetzt.`);
                }
            }
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Aktualisieren oder beim Senden der E-Mail.");
        }
    }

    async function handleDelete(id: string) {
        if (confirm("Möchten Sie diese Anfrage wirklich unwiderruflich löschen?")) {
            try {
                await reqService.deleteReq(id);
                toastStore.info("Anfrage wurde gelöscht.");
            } catch {
                toastStore.error("Fehler beim Löschen der Anfrage.");
            }
        }
    }

    async function updateFeedbackStatus(id: string, status: string) {
        try {
            await pb.collection('feedbacks').update(id, { status });
            toastStore.success(`Feedback auf '${status}' gesetzt.`);
        } catch {
            toastStore.error("Fehler beim Aktualisieren.");
        }
    }

    async function deleteFeedback(id: string) {
        if (await confirmStore.ask("Möchten Sie dieses Feedback wirklich löschen?", "Feedback löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('feedbacks').delete(id);
                toastStore.info("Feedback wurde gelöscht.");
            } catch {
                toastStore.error("Fehler beim Löschen des Feedbacks.");
            }
        }
    }

    async function markChangeAsDone(id: string) {
        try {
            await pb.collection('appointments').update(id, { requestet_changes: null });
            toastStore.success("Änderungswunsch als erledigt markiert.");
        } catch {
            toastStore.error("Fehler beim Aktualisieren des Termins.");
        }
    }

    async function handleSyncAll() {
        isRefreshing = true;
        try {
            await Promise.allSettled([
                reqService.init(),
                loadFeedbacks(),
                orgaStore.appointments?.init?.(),
                orgaStore.clients?.init?.()
            ]);
            toastStore.success("Posteingang synchronisiert! 🔄");
        } catch {
            toastStore.error("Aktualisierung fehlgeschlagen.");
        } finally {
            isRefreshing = false;
        }
    }

    // Tab Definitionen für Desktop & Mobile Nav
    const TABS = [
        { id: 'requests', label: 'Anfragen', icon: '📬', color: 'indigo' },
        { id: 'changes', label: 'Änderungen', icon: '🔄', color: 'sky' },
        { id: 'feedbacks', label: 'Feedback', icon: '⭐', color: 'amber' },
        { id: 'admissions', label: 'Aufnahmen', icon: '👤', color: 'emerald' }
    ] as const;

    function getTabBadge(id: typeof activeTab) {
        switch (id) {
            case 'requests':
                return pendingCount > 0 
                    ? { count: pendingCount, pulse: true, color: 'bg-indigo-600 text-white' }
                    : { count: visibleRequests.length, pulse: false, color: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
            case 'changes':
                return { count: pendingChangesCount, pulse: true, color: 'bg-sky-600 text-white' };
            case 'feedbacks':
                return newFeedbacksCount > 0
                    ? { count: newFeedbacksCount, pulse: true, color: 'bg-amber-500 text-white' }
                    : { count: visibleFeedbacks.length, pulse: false, color: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
            case 'admissions':
                return { count: pendingAdmissionsCount, pulse: true, color: 'bg-emerald-600 text-white' };
        }
    }
</script>

{#snippet emptyState(icon: string, title: string, subtitle: string)}
    <div class="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs p-8 max-w-lg mx-auto shadow-xs">
        <span class="text-5xl mb-3 block opacity-80">{icon}</span>
        <h3 class="text-slate-900 dark:text-white font-bold text-base mb-1">{title}</h3>
        <p class="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">{subtitle}</p>
    </div>
{/snippet}

{#snippet searchInput(value: () => string, onInput: (val: string) => void, placeholder: string, ringClass: string)}
    <div class="relative flex-1 min-w-[220px] max-w-md">
        <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
            type="text"
            value={value()}
            oninput={(e) => onInput(e.currentTarget.value)}
            {placeholder}
            class="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 {ringClass} font-medium"
        />
        {#if value()}
            <button type="button" onclick={() => onInput('')} class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X class="w-3.5 h-3.5" />
            </button>
        {/if}
    </div>
{/snippet}

<div class="flex-1 flex flex-col min-h-0 overflow-hidden select-none antialiased">
    <!-- TOP APP COMMAND BAR -->
    <header class="h-14 sm:h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-xs z-20">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs shadow-indigo-600/30 shrink-0 text-base">
                📬
            </div>
            <div class="truncate">
                <div class="flex items-center gap-2">
                    <h2 class="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight">Posteingang</h2>
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Live Hub
                    </span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate hidden sm:block">Anfragen, Änderungen &amp; Feedback</p>
            </div>
        </div>

        <!-- Center: Segmented Navigation Control Tabs (Desktop) -->
        <div class="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
            {#each TABS as tab}
                {@const badge = getTabBadge(tab.id)}
                <button 
                    type="button"
                    onclick={() => activeTab = tab.id} 
                    class="px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer {activeTab === tab.id ? `bg-white dark:bg-slate-900 text-${tab.color}-600 dark:text-${tab.color}-400 shadow-xs` : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                >
                    <span>{tab.icon}</span> <span>{tab.label}</span>
                    {#if badge.count > 0}
                        <span class="px-1.5 py-0.2 rounded-md {badge.color} text-[10px] font-black shadow-xs {badge.pulse ? 'animate-pulse' : ''}">{badge.count}</span>
                    {/if}
                </button>
            {/each}
        </div>

        <!-- Right: Actions Cluster -->
        <div class="flex items-center gap-2 shrink-0">
            <button
                type="button"
                onclick={handleSyncAll}
                disabled={isRefreshing || reqService.isLoading || isFeedbacksLoading}
                class="w-8 h-8 md:w-9 md:h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Posteingang aktualisieren"
            >
                <RefreshCw class="w-4 h-4 {isRefreshing || reqService.isLoading || isFeedbacksLoading ? 'animate-spin text-indigo-600' : ''}" />
            </button>

            {#if onclose}
                <button 
                    type="button"
                    aria-label="Schließen" 
                    onclick={onclose} 
                    class="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shadow-2xs shrink-0 active:scale-95 cursor-pointer"
                >
                    <X class="w-4 h-4" />
                </button>
            {/if}
        </div>
    </header>

    <!-- Mobile Sub-Bar: Segmented Tab Pills -->
    <div class="md:hidden flex items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 py-1.5 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
        {#each TABS as tab}
            {@const badge = getTabBadge(tab.id)}
            <button 
                type="button"
                onclick={() => activeTab = tab.id} 
                class="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap {activeTab === tab.id ? `bg-${tab.color}-50 dark:bg-${tab.color}-950/80 text-${tab.color}-600 dark:text-${tab.color}-400` : 'text-slate-600 dark:text-slate-400'}"
            >
                <span>{tab.icon} {tab.label}</span>
                {#if badge.count > 0}
                    <span class="px-1.5 py-0.2 rounded-full {badge.color} text-[9px] font-black">{badge.count}</span>
                {/if}
            </button>
        {/each}
    </div>

    <!-- Context-Sensitive Sub-Toolbar -->
    {#if activeTab === 'requests'}
        <div class="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {@render searchInput(() => requestSearch, (v) => requestSearch = v, "Anfragen nach Name, Klient, Ort, E-Mail suchen...", "focus:ring-indigo-500")}

            <div class="flex items-center gap-2 flex-wrap">
                <div class="inline-flex p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold">
                    <button 
                        type="button"
                        onclick={() => requestStatusFilter = 'open'} 
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer {requestStatusFilter === 'open' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        Offen ({pendingCount})
                    </button>
                    <button 
                        type="button"
                        onclick={() => requestStatusFilter = 'all'} 
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer {requestStatusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        Alle ({visibleRequests.length})
                    </button>
                    <button 
                        type="button"
                        onclick={() => requestStatusFilter = 'accepted'} 
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer {requestStatusFilter === 'accepted' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        Angenommen
                    </button>
                </div>

                {#if requestsWithoutSummaryCount > 0}
                    <button 
                        type="button" 
                        onclick={batchGenerateAllSummaries}
                        disabled={isBatchGenerating}
                        class="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Fehlende KI-Kalendertexte für frühere Anfragen automatisch nachgenerieren"
                    >
                        <Sparkles class="w-3.5 h-3.5 {isBatchGenerating ? 'animate-spin' : ''}" />
                        <span>{isBatchGenerating ? 'Generiere...' : `${requestsWithoutSummaryCount} frühere nachgenerieren`}</span>
                    </button>
                {/if}
            </div>
        </div>
    {:else if activeTab === 'changes'}
        <div class="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {@render searchInput(() => changeSearch, (v) => changeSearch = v, "Änderungswünsche nach Klient oder Text suchen...", "focus:ring-sky-500")}
            <span class="inline-flex px-3 py-1 text-xs font-bold rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Offene Änderungswünsche: {filteredChanges.length}
            </span>
        </div>
    {:else if activeTab === 'feedbacks'}
        <div class="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {@render searchInput(() => feedbackSearch, (v) => feedbackSearch = v, "Feedbacks nach Name oder Text durchsuchen...", "focus:ring-amber-500")}

            <div class="flex items-center gap-2 flex-wrap">
                <select
                    bind:value={feedbackRatingFilter}
                    class="py-1.5 px-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                >
                    <option value="all">Alle Bewertungen</option>
                    <option value="critical">⚠️ Kritisch (≤ 5)</option>
                    <option value="good">⭐ Positiv (&gt; 5)</option>
                </select>

                <div class="inline-flex p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold">
                    <button 
                        type="button"
                        onclick={() => showAllFeedbacks = false} 
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer {!showAllFeedbacks ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        Aktuell ({feedbacks.filter(f => f.status !== 'Archieviert').length})
                    </button>
                    <button 
                        type="button"
                        onclick={() => showAllFeedbacks = true} 
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer {showAllFeedbacks ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                    >
                        Alle ({feedbacks.length})
                    </button>
                </div>
            </div>
        </div>
    {:else if activeTab === 'admissions'}
        <div class="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {@render searchInput(() => admissionSearch, (v) => admissionSearch = v, "Aufnahmeanträge nach Klient oder Notiz suchen...", "focus:ring-emerald-500")}
            <span class="inline-flex px-3 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Offene Aufnahmeanträge: {filteredAdmissions.length}
            </span>
        </div>
    {/if}

    <!-- Content: Fluid container -->
    {#if activeTab === 'requests'}
        <div class="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row bg-slate-50/40 dark:bg-slate-950/30">
            {#if reqService.isLoading}
                <div class="flex-1 flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 gap-3">
                    <span class="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></span>
                    <p class="text-sm font-medium">Lade Anfragen...</p>
                </div>
            {:else if visibleRequests.length === 0}
                <div class="flex-1 p-6 flex items-center justify-center">
                    {@render emptyState('🙌', 'Alles erledigt!', 'Es liegen aktuell keine neuen Terminanfragen vor.')}
                </div>
            {:else}
                <!-- MASTER COLUMN: Left side list of requests -->
                <aside class="w-full md:w-80 lg:w-[380px] shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col min-h-0 h-full {showMobileDetail ? 'hidden md:flex' : 'flex'}">
                    <!-- Master Header Bar -->
                    <div class="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                        <span>Anfragen ({filteredRequests.length})</span>
                        <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                            <Clock class="w-3 h-3" />
                            Dringendste zuerst
                        </span>
                    </div>

                    <!-- Master Scrollable List -->
                    <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/80">
                        {#if filteredRequests.length === 0}
                            <div class="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                                Keine Anfragen für diesen Filter gefunden.
                            </div>
                        {:else}
                            {#each filteredRequests as req (req.id)}
                                {@const detectedClient = getDetectedClient(req)}
                                {@const linkedApps = getLinkedAppointments(req)}
                                {@const isSelected = selectedRequest?.id === req.id}
                                {@const isOpen = isRequestOpen(req)}

                                <button
                                    type="button"
                                    onclick={() => { selectedRequestId = req.id; showMobileDetail = true; }}
                                    class="w-full text-left p-3.5 sm:p-4 transition-all cursor-pointer relative group flex flex-col gap-1.5 {isSelected 
                                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-l-4 border-l-indigo-600 dark:border-l-indigo-400 shadow-2xs' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent'}"
                                >
                                    <!-- Line 1: Status badge & Received time -->
                                    <div class="flex items-center justify-between gap-2 text-xs">
                                        <div class="flex items-center gap-1.5 flex-wrap">
                                            {#if req.status === 'accepted'}
                                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    ✅ Angenommen
                                                </span>
                                            {:else if req.status === 'denied'}
                                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                    ❌ Abgelehnt
                                                </span>
                                            {:else}
                                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                    ⏳ Offen
                                                </span>
                                            {/if}

                                            {#if linkedApps.length > 0}
                                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800" title="Bereits im Kalender angelegt">
                                                    📅 Im Kalender
                                                </span>
                                            {/if}
                                        </div>

                                        <span class="text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                                            {new Date(req.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>

                                    <!-- Line 2: Sender Name & Contact Method -->
                                    <div class="flex items-center justify-between gap-2">
                                        <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate {isSelected ? 'text-indigo-950 dark:text-indigo-100 font-black' : ''}">
                                            {req.sender_name || 'Unbekannter Absender'}
                                        </h4>
                                        <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                            {formatContact(req.contact_method)}
                                        </span>
                                    </div>

                                    <!-- Line 3: Appointment Date & Time Pill -->
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        {#if req.date || req.time || formatRequestTime(req)}
                                            <div class="inline-flex items-center gap-1 px-2 py-0.8 text-xs font-bold rounded-lg {isOpen ? 'bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                                                <Calendar class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                <span>{req.date ? formatDisplayDate(req.date) : 'Wunschtermin'} {formatRequestTime(req)}</span>
                                            </div>
                                        {:else}
                                            <span class="text-[11px] text-slate-400 italic">Kein Terminwunsch</span>
                                        {/if}

                                        {#if detectedClient}
                                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-md border border-emerald-200/80 dark:border-emerald-800/80 truncate max-w-[150px]">
                                                👤 {detectedClient.name_first} {detectedClient.name_last}
                                            </span>
                                        {:else}
                                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 rounded-md border border-amber-200/80 dark:border-amber-800/80">
                                                ✨ Neukunde
                                            </span>
                                        {/if}
                                    </div>

                                    <!-- Line 4: 1-line snippet of request or AI summary -->
                                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                                        {req.ai_summary ? req.ai_summary.replace(/^[^\n]+\n/, '') : (req.request_text || '')}
                                    </p>
                                </button>
                            {/each}
                        {/if}
                    </div>
                </aside>

                <!-- DETAIL COLUMN: Right side details & 1-Click Guided Workflow -->
                <main class="flex-1 min-h-0 h-full flex flex-col overflow-y-auto custom-scrollbar bg-slate-50/60 dark:bg-slate-950/30 {showMobileDetail ? 'flex' : 'hidden md:flex'}">
                    {#if !selectedRequest}
                        <div class="flex-1 flex items-center justify-center p-8">
                            {@render emptyState('👈', 'Keine Anfrage ausgewählt', 'Wähle links eine Anfrage aus der Liste aus, um Details einzusehen und den geführten 1-Click-Workflow zu starten.')}
                        </div>
                    {:else}
                        {@const req = selectedRequest}
                        {@const detectedClient = getDetectedClient(req)}
                        {@const detectedContact = getDetectedContact(req, detectedClient)}
                        {@const detectedLoc = getDetectedLocation(req, detectedClient, detectedContact)}
                        {@const detectedMode = getDetectedExecutionMode(req)}
                        {@const linkedApps = getLinkedAppointments(req)}
                        {@const missingContact = detectMissingContactQuery(req, detectedClient)}
                        {@const missingLoc = detectMissingLocationQuery(req, detectedContact)}
                        {@const clientEmail = getClientEmail(req)}

                        <!-- Mobile Header with Back Button -->
                        <div class="md:hidden px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                            <button
                                type="button"
                                onclick={() => showMobileDetail = false}
                                class="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                            >
                                <ChevronLeft class="w-4 h-4" />
                                <span>Zurück zur Liste ({filteredRequests.length})</span>
                            </button>
                        </div>

                        <!-- Detail Body Content Container -->
                        <div class="p-4 sm:p-6 space-y-4 max-w-4xl w-full mx-auto">
                            <!-- 1. SENDER HEADER & TOP ACTIONS CARD -->
                            <div class="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                                <div class="flex flex-wrap items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <h3 class="font-black text-slate-900 dark:text-white text-lg sm:text-xl truncate">
                                                {req.sender_name}
                                            </h3>
                                            {#if req.status === 'accepted'}
                                                <span class="px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800">✅ Angenommen</span>
                                            {:else if req.status === 'denied'}
                                                <span class="px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 rounded-lg border border-rose-200 dark:border-rose-800">❌ Abgelehnt</span>
                                            {:else}
                                                <span class="px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 rounded-lg border border-amber-200 dark:border-amber-800">⏳ Offen</span>
                                            {/if}
                                            <span class="text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-lg border border-brand-200 dark:border-brand-800">
                                                {formatContact(req.contact_method)}
                                            </span>
                                        </div>
                                        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                            Eingegangen am {new Date(req.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(req.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                        </p>
                                    </div>

                                    <!-- Quick Top Right Actions -->
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        {#if req.status === 'requested'}
                                            <button
                                                type="button"
                                                onclick={() => handleStatus(req.id, 'denied')}
                                                class="px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 rounded-xl transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer"
                                            >
                                                Ablehnen
                                            </button>
                                            <button
                                                type="button"
                                                onclick={() => handlePropose(req.id)}
                                                class="px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 rounded-xl transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer"
                                            >
                                                Vorschlag
                                            </button>
                                            <button 
                                                type="button" 
                                                onclick={() => createContactFromRequest(req)} 
                                                class="px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs"
                                                title="Diesen Absender als Kontakt anlegen & Anfrage als erledigt markieren"
                                            >
                                                👤 Als Kontakt
                                            </button>
                                        {:else}
                                            <button
                                                type="button"
                                                onclick={() => handleStatus(req.id, 'requested')}
                                                class="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                            >
                                                Zurücksetzen
                                            </button>
                                        {/if}

                                        {#if clientEmail}
                                            <button
                                                type="button"
                                                onclick={() => replyModal?.open(req, req.status, clientEmail)}
                                                class="px-2.5 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 rounded-xl transition-colors border border-sky-200 dark:border-sky-800 cursor-pointer"
                                                title="Antwort-E-Mail an Absender verfassen"
                                            >
                                                ✉️ Antworten
                                            </button>
                                        {/if}

                                        <button
                                            type="button"
                                            onclick={() => handleDelete(req.id)}
                                            class="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                            title="Anfrage löschen"
                                        >
                                            <Trash2 class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <!-- Contact Details Row (Email, Phone, Address) -->
                                <div class="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                                    {#if clientEmail}
                                        <a href="mailto:{clientEmail}" class="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">
                                            <Mail class="w-3.5 h-3.5 text-slate-400" />
                                            <span>{clientEmail}</span>
                                        </a>
                                    {/if}
                                    {#if req.phone}
                                        <a href="tel:{req.phone}" class="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">
                                            <Phone class="w-3.5 h-3.5 text-slate-400" />
                                            <span>{req.phone}</span>
                                        </a>
                                    {/if}
                                    {#if req.street || req.zip_city}
                                        <span class="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                            <MapPin class="w-3.5 h-3.5 text-slate-400" />
                                            <span>{[req.street, req.zip_city].filter(Boolean).join(', ')}</span>
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <!-- 2. HERO: GEFÜHRTER 1-CLICK WORKFLOW CARD -->
                            <div class="rounded-3xl border-2 border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-5 sm:p-6 shadow-sm flex flex-col gap-4">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <div class="flex items-center gap-2">
                                        <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                            ⚡
                                        </div>
                                        <div>
                                            <h4 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                                Geführte Kalender-Übernahme
                                            </h4>
                                            <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                Automatisch erkannte Termindaten prüfen & per 1-Click in OrgaFlow übernehmen
                                            </p>
                                        </div>
                                    </div>

                                    {#if linkedApps.length > 0}
                                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold shadow-2xs">
                                            ✅ Termin bereits im Kalender
                                        </span>
                                    {/if}
                                </div>

                                <!-- Recognized Data Grid -->
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <!-- Klient Card / Selector -->
                                    <div class="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1.5 shadow-2xs relative">
                                        <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                            <User class="w-3 h-3 text-indigo-500" />
                                            Klient / Akte:
                                        </span>
                                        <div class="flex items-center justify-between gap-1.5">
                                            {#if detectedClient}
                                                <div class="min-w-0">
                                                    <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                        {detectedClient.name_first} {detectedClient.name_last}
                                                    </p>
                                                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ In Datenbank</span>
                                                </div>
                                            {:else}
                                                <div class="min-w-0">
                                                    <p class="text-xs font-bold text-amber-700 dark:text-amber-300 truncate">
                                                        Neukunde (wird angelegt)
                                                    </p>
                                                    <span class="text-[10px] text-slate-400">Automatische Neuanlage</span>
                                                </div>
                                            {/if}

                                            <button 
                                                type="button" 
                                                onclick={() => { activeClientPickerReqId = activeClientPickerReqId === req.id ? null : req.id; clientPickerSearch = ''; }} 
                                                class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                                                title="Anderen Klienten zuweisen"
                                            >
                                                ✏️ Ändern
                                            </button>
                                        </div>

                                        <!-- Klienten-Auswahl Popup -->
                                        {#if activeClientPickerReqId === req.id}
                                            <div class="absolute left-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95">
                                                <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                                                    <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">Klient zuweisen</span>
                                                    <button type="button" onclick={() => activeClientPickerReqId = null} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer">✕</button>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    bind:value={clientPickerSearch} 
                                                    placeholder="Klient suchen..." 
                                                    class="w-full px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg mb-1.5 focus:outline-hidden focus:border-brand-500"
                                                />
                                                <div class="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                                                    {#each (orgaStore.clients?.data || []).filter((c: any) => {
                                                        if (!clientPickerSearch) return true;
                                                        const q = clientPickerSearch.toLowerCase();
                                                        return (c.name_first || '').toLowerCase().includes(q) || (c.name_last || '').toLowerCase().includes(q);
                                                    }).slice(0, 20) as clientOption}
                                                        <button 
                                                            type="button" 
                                                            onclick={() => assignClientToRequest(req, clientOption)} 
                                                            class="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-between cursor-pointer"
                                                        >
                                                            <span class="font-medium">{clientOption.name_first} {clientOption.name_last}</span>
                                                            {#if detectedClient?.id === clientOption.id}
                                                                <span class="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">✓</span>
                                                            {/if}
                                                        </button>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Termin & Uhrzeit Card -->
                                    <div class="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1 shadow-2xs">
                                        <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                            <Calendar class="w-3 h-3 text-indigo-500" />
                                            Wunschtermin:
                                        </span>
                                        {#if req.date || req.time || formatRequestTime(req)}
                                            <p class="text-xs font-bold text-slate-900 dark:text-white">
                                                {req.date ? formatDisplayDate(req.date) : 'Datum nach Vereinbarung'}
                                            </p>
                                            <span class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                                {formatRequestTime(req) || 'Standard: 10:00 Uhr'}
                                            </span>
                                        {:else}
                                            <p class="text-xs font-bold text-slate-500 italic">Kein konkreter Zeitpunkt</p>
                                            <span class="text-[10px] text-slate-400">Wird auf heute 10:00 Uhr gesetzt</span>
                                        {/if}
                                    </div>

                                    <!-- Ort / Kontakt Card -->
                                    <div class="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1 shadow-2xs">
                                        <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                            <MapPin class="w-3 h-3 text-indigo-500" />
                                            Ort &amp; Durchführung:
                                        </span>
                                        {#if detectedContact}
                                            <p class="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">
                                                🩺 {detectedContact.company_name || `${detectedContact.name_first || ''} ${detectedContact.name_last || ''}`.trim()}
                                            </p>
                                        {:else if missingContact}
                                            <button 
                                                type="button" 
                                                onclick={() => handleGoogleContactSearch(req, 'doctor')}
                                                class="text-left text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate"
                                                title="Über Google ermitteln"
                                            >
                                                🌐 Google: "{missingContact}"
                                            </button>
                                        {/if}

                                        {#if detectedLoc}
                                            <span class="text-[11px] text-slate-600 dark:text-slate-300 truncate font-medium" title={detectedLoc}>
                                                📍 {detectedLoc}
                                            </span>
                                        {:else if detectedMode}
                                            <span class="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                                                📞 {detectedMode}
                                            </span>
                                        {:else}
                                            <span class="text-[10px] text-slate-400 italic">Adresse aus Klientenakte</span>
                                        {/if}
                                    </div>
                                </div>

                                <!-- Big Primary Action Buttons -->
                                <div class="flex flex-wrap items-center gap-3 pt-2">
                                    {#if linkedApps.length > 0}
                                        <button 
                                            type="button"
                                            disabled={syncingAppIds[linkedApps[0].id]}
                                            onclick={() => syncAppointmentFromRequest(req, linkedApps[0])}
                                            class="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 active:scale-95 rounded-xl transition-all border border-amber-300 dark:border-amber-700 text-center whitespace-nowrap shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                                            title="Daten des verknüpften Termins aktualisieren"
                                        >
                                            {#if syncingAppIds[linkedApps[0].id]}
                                                <span class="inline-block animate-spin">⏳</span>
                                                <span>Wird synchronisiert...</span>
                                            {:else}
                                                <span>🔄</span>
                                                <span>Termin mit Anfrage aktualisieren</span>
                                            {/if}
                                        </button>

                                        <button 
                                            type="button"
                                            onclick={() => appointmentModal?.open(linkedApps[0])} 
                                            class="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 active:scale-95 rounded-xl transition-all border border-emerald-300 dark:border-emerald-700 text-center whitespace-nowrap shadow-xs cursor-pointer flex items-center justify-center gap-2"
                                            title="Zugehörigen Termin im Kalender anzeigen"
                                        >
                                            <span>📅</span>
                                            <span>Termin im Kalender öffnen</span>
                                        </button>

                                        <button 
                                            type="button"
                                            disabled={transferringReqIds[req.id]}
                                            onclick={async () => {
                                                if (await confirmStore.ask("Für diese Anfrage existiert bereits ein Termin. Möchten Sie wirklich einen zusätzlichen weiteren Termin anlegen?", "Weiteren Termin anlegen?", "Termin anlegen", "Abbrechen", false)) {
                                                    transferRequestToAppointment(req, { openModal: true, forceNew: true });
                                                }
                                            }}
                                            class="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer px-2 py-1"
                                        >
                                            + Weiterer Termin
                                        </button>
                                    {:else}
                                        <!-- Dominanter 1-Click Hero Button -->
                                        <button 
                                            type="button"
                                            disabled={transferringReqIds[req.id]}
                                            onclick={() => transferRequestToAppointment(req, { openModal: false })} 
                                            class="flex-1 sm:flex-none px-6 py-3 text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-2xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 border border-emerald-500 whitespace-nowrap disabled:opacity-50" 
                                            title="Termin sofort anlegen & als erledigt markieren"
                                        >
                                            {#if transferringReqIds[req.id]}
                                                <span class="inline-block animate-spin">⏳</span>
                                                <span>Wird angelegt...</span>
                                            {:else}
                                                <span class="text-base">⚡</span>
                                                <span>1-Click Termin übernehmen</span>
                                            {/if}
                                        </button>

                                        <!-- Sekundärer Button: Öffnen & Prüfen -->
                                        <button 
                                            type="button"
                                            disabled={transferringReqIds[req.id]}
                                            onclick={() => transferRequestToAppointment(req, { openModal: true })} 
                                            class="flex-1 sm:flex-none px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl transition-colors border border-slate-200 dark:border-slate-700 text-center whitespace-nowrap shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50" 
                                            title="Termin erstellen und im vollständigen Bearbeitungsfenster prüfen"
                                        >
                                            <span>📅</span>
                                            <span>Prüfen &amp; Öffnen</span>
                                        </button>
                                    {/if}
                                </div>
                            </div>

                            <!-- 3. INHALTSBEREICH: KALENDER-FOKUS (KI) VS. ORIGINALTEXT -->
                            <div class="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                                    <div class="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold shadow-2xs">
                                        <button 
                                            type="button" 
                                            onclick={() => setViewMode(req.id, 'ai')}
                                            class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer {getViewMode(req.id) === 'ai' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-700 dark:text-indigo-300 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
                                        >
                                            <span>✨ Kalender-Fokus (KI)</span>
                                        </button>
                                        <button 
                                            type="button" 
                                            onclick={() => setViewMode(req.id, 'original')}
                                            class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer {getViewMode(req.id) === 'original' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
                                        >
                                            <span>📄 Original-Nachricht</span>
                                        </button>
                                    </div>

                                    <button 
                                        type="button" 
                                        onclick={() => { setViewMode(req.id, 'ai'); loadAiSummaryForRequest(req, true); }}
                                        disabled={summarizingReqIds[req.id]}
                                        class="text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
                                        title={req.ai_summary ? "KI-Kalenderfassung neu berechnen" : "KI-Kalenderfassung jetzt generieren"}
                                    >
                                        <Sparkles class="w-3.5 h-3.5 {summarizingReqIds[req.id] ? 'animate-spin' : ''}" />
                                        <span>{req.ai_summary ? 'KI neu generieren' : 'KI generieren'}</span>
                                    </button>
                                </div>

                                {#if getViewMode(req.id) === 'ai'}
                                    {#if summarizingReqIds[req.id]}
                                        <div class="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl text-xs text-indigo-800 dark:text-indigo-200 font-medium flex items-center gap-2.5 animate-pulse">
                                            <span class="text-base animate-spin">✨</span>
                                            <span>Gemini fasst die Anfrage für Ihren Kalender zusammen...</span>
                                        </div>
                                    {:else if req.ai_summary}
                                        <div class="bg-indigo-50/20 dark:bg-slate-800/40 p-4 rounded-xl border border-indigo-100 dark:border-slate-700/70 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
                                            {req.ai_summary}
                                        </div>
                                    {:else}
                                        <div class="bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center">
                                            <p class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Noch keine KI-Kalenderfassung vorhanden.</p>
                                            <button 
                                                type="button" 
                                                onclick={() => loadAiSummaryForRequest(req, true)}
                                                disabled={summarizingReqIds[req.id]}
                                                class="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Sparkles class="w-3.5 h-3.5" />
                                                <span>Jetzt mit Gemini generieren</span>
                                            </button>
                                        </div>
                                    {/if}
                                {:else}
                                    <div class="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                                        "{req.request_text || 'Kein Textinhalt vorhanden'}"
                                    </div>
                                {/if}
                            </div>

                            <!-- 4. ATTACHMENTS (if any) -->
                            {#if req.attachments && req.attachments.length > 0}
                                <div class="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                                    <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                        <Paperclip class="w-3.5 h-3.5" />
                                        <span>Anhänge ({req.attachments.length})</span>
                                    </h4>

                                    <div class="flex flex-wrap gap-2">
                                        {#each req.attachments as attachment}
                                            <div class="relative flex items-center group">
                                                <button 
                                                    type="button" 
                                                    onclick={() => previewAttachment(req, attachment)} 
                                                    class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-l-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs cursor-pointer" 
                                                    title="Anhang ansehen: {attachment}"
                                                >
                                                    <Paperclip class="w-3.5 h-3.5" />
                                                    <span class="truncate max-w-44">{attachment}</span>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onclick={() => { attachDropdownOpen = (attachDropdownOpen?.reqId === req.id && attachDropdownOpen?.filename === attachment) ? null : { reqId: req.id, filename: attachment }; attachSearchQuery = ""; }} 
                                                    class="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 border-y border-r border-slate-200 dark:border-slate-700 rounded-r-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs border-l-0 cursor-pointer" 
                                                    title="In Klienten-Akte speichern"
                                                >
                                                    <FolderDown class="w-3.5 h-3.5" />
                                                </button>
                                                
                                                {#if attachDropdownOpen?.reqId === req.id && attachDropdownOpen?.filename === attachment}
                                                    <button type="button" class="fixed inset-0 w-full h-full cursor-default z-30" onclick={() => attachDropdownOpen = null} tabindex="-1" aria-label="Schließen"></button>
                                                    <div class="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl z-40 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                                                        <div class="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                            <input type="text" bind:value={attachSearchQuery} placeholder="Klient suchen..." class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                        </div>
                                                        <div class="max-h-40 overflow-y-auto custom-scrollbar p-1">
                                                            {#if filteredAttachClients.length === 0}
                                                                <p class="text-xs text-slate-400 dark:text-slate-500 text-center py-2">Keine Klienten gefunden</p>
                                                            {:else}
                                                                {#each filteredAttachClients as c}
                                                                    <button type="button" onclick={() => copyToClient(req, attachment, c.id)} class="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg transition-colors truncate cursor-pointer">
                                                                        {c.name_first} {c.name_last}
                                                                    </button>
                                                                {/each}
                                                            {/if}
                                                        </div>
                                                    </div>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </main>
            {/if}
        </div>
    {:else}
        <div class="p-4 sm:p-6 bg-slate-50/40 dark:bg-slate-950/30 flex-1 overflow-y-auto custom-scrollbar">
            {#if activeTab === 'changes'}
            {#if filteredChanges.length === 0}
                {@render emptyState(changeSearch.trim() ? '🔍' : '🙌', changeSearch.trim() ? 'Keine Treffer gefunden' : 'Alles aktuell!', changeSearch.trim() ? 'Bitte Suchbegriff anpassen.' : 'Es liegen keine Änderungswünsche für Termine vor.')}
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each filteredChanges as req (req.id)}
                        <div class="border border-sky-200 dark:border-sky-800/80 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col relative transition-all shadow-xs hover:shadow-md ring-1 ring-sky-500/10 dark:ring-sky-400/20">
                            <div class="flex justify-between items-start mb-3 gap-2">
                                <div class="min-w-0">
                                    <h3 class="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate">{req.expand?.client?.[0]?.name_first || ''} {req.expand?.client?.[0]?.name_last || 'Unbekannter Klient'}</h3>
                                    <p class="text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 inline-block px-2.5 py-0.5 rounded-lg mt-1 border border-sky-200 dark:border-sky-800">
                                        Termin: {req.appointment ? new Date(req.appointment).toLocaleDateString('de-DE') : '-'} um {req.appointment ? new Date(req.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-'} Uhr
                                    </p>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Angefragt am {new Date(req.requestet_changes.created).toLocaleDateString('de-DE')}</p>
                                </div>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-sm text-slate-700 dark:text-slate-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed shadow-inner">
                                "{req.requestet_changes.text}"
                            </div>
                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                                <button onclick={() => markChangeAsDone(req.id)} class="px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-all border border-emerald-200 dark:border-emerald-800 shadow-2xs active:scale-95 cursor-pointer">Als erledigt markieren</button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else if activeTab === 'feedbacks'}
            {#if isFeedbacksLoading}
                <div class="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 gap-3">
                    <span class="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                    <p class="text-sm font-medium">Lade Feedbacks...</p>
                </div>
            {:else if filteredFeedbacks.length === 0}
                {@render emptyState(feedbackSearch.trim() || feedbackRatingFilter !== 'all' ? '🔍' : '🙌', feedbackSearch.trim() || feedbackRatingFilter !== 'all' ? 'Keine Treffer gefunden' : 'Keine Feedbacks!', feedbackSearch.trim() || feedbackRatingFilter !== 'all' ? 'Bitte Suchbegriff oder Bewertungsfilter anpassen.' : 'Aktuell liegen in dieser Ansicht keine Bewertungen vor.')}
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each filteredFeedbacks as f (f.id)}
                        <div class="border rounded-2xl p-4 sm:p-5 flex flex-col relative transition-all duration-200 shadow-xs hover:shadow-md {f.status === 'Neu' ? 'border-amber-300/80 dark:border-amber-700/70 bg-white dark:bg-slate-900 ring-1 ring-amber-500/10 dark:ring-amber-400/20' : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'}">
                            <div class="flex justify-between items-start mb-3 gap-2">
                                <div class="min-w-0">
                                    {#if f.name_first || f.name_last}
                                        <h3 class="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate">{f.name_first} {f.name_last}</h3>
                                    {:else}
                                        <h3 class="font-bold text-slate-400 dark:text-slate-500 text-base sm:text-lg italic">Anonymes Feedback</h3>
                                    {/if}
                                    <div class="flex items-center gap-1 mt-1">
                                        <span class="text-xs font-black {getRatingBadgeClass(f.rating)} px-2.5 py-0.5 rounded-lg border shadow-2xs">{f.rating} / 10</span>
                                    </div>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">{new Date(f.created).toLocaleDateString('de-DE')} {new Date(f.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <span class="text-xs font-bold mt-1 block {f.status === 'Neu' ? 'text-amber-600 dark:text-amber-400' : (f.status === 'Gelesen' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}">{f.status}</span>
                                </div>
                            </div>
                            
                            {#if f.message}
                                <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-sm text-slate-700 dark:text-slate-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed shadow-inner">
                                    "{f.message}"
                                </div>
                            {/if}

                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                                {#if f.status === 'Neu'}
                                    <button onclick={() => updateFeedbackStatus(f.id, 'Gelesen')} class="px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800 shadow-2xs cursor-pointer">Gelesen</button>
                                {/if}
                                {#if f.status !== 'Archieviert'}
                                    <button onclick={() => updateFeedbackStatus(f.id, 'Archieviert')} class="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer">Archivieren</button>
                                {/if}
                                <button onclick={() => deleteFeedback(f.id)} class="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors shrink-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer" title="Löschen">
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else if activeTab === 'admissions'}
            {#if filteredAdmissions.length === 0}
                {@render emptyState(admissionSearch.trim() ? '🔍' : '🙌', admissionSearch.trim() ? 'Keine Treffer gefunden' : 'Alles aktuell!', admissionSearch.trim() ? 'Bitte Suchbegriff anpassen.' : 'Es liegen keine Anfragen zur Neuaufnahme vor.')}
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each filteredAdmissions as client (client.id)}
                        <div class="border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col relative transition-all shadow-xs hover:shadow-md ring-1 ring-emerald-500/10 dark:ring-emerald-400/20">
                            <div class="flex justify-between items-start mb-3 gap-2">
                                <div class="min-w-0 pr-4">
                                    <h3 class="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate">{client.name_first} {client.name_last}</h3>
                                    <div class="flex flex-wrap gap-2 mt-1">
                                        <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 inline-block px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">Neuaufnahme</span>
                                        {#if client.notes && client.notes.includes('[NEUE_KRANKENKASSE:')}
                                            {@const match = client.notes.match(/\[NEUE_KRANKENKASSE:\s*({.*?})\]/)}
                                            {#if match && match[1]}
                                                {@const newInsName = (() => { try { return JSON.parse(match[1]).name; } catch(e) { return 'Neu'; } })()}
                                                <span class="text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:teal-950/60 inline-block px-2.5 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800" title="Neue Krankenkasse wird bei Aufnahme automatisch angelegt">🏥 Kasse: {newInsName}</span>
                                            {/if}
                                        {/if}
                                        {#if client.expand?.caregiver}
                                            {@const caregiver = Array.isArray(client.expand.caregiver) ? client.expand.caregiver[0] : client.expand.caregiver}
                                            <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 inline-block px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 truncate max-w-50" title="Betreuer">👤 {caregiver.name_first} {caregiver.name_last}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Angefragt am {new Date(client.created).toLocaleDateString('de-DE')}</p>
                                </div>
                            </div>
                            
                            <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-sm text-slate-700 dark:text-slate-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed shadow-inner custom-scrollbar overflow-y-auto max-h-32">
                                {(client.notes || '').replace(/\[NEUE_KRANKENKASSE:\s*{.*?}\]/g, '').replace('⚠️ NEUAUFNAHME-ANFRAGE:', '').trim()}
                            </div>
                            
                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                                <button onclick={() => clientDetailModal?.open(client.id)} class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer">Details ansehen</button>
                                <button onclick={() => acceptClient(client.id)} class="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl transition-all border border-emerald-600 dark:border-emerald-500 shadow-xs cursor-pointer active:scale-95">Aufnehmen (Aktivieren)</button>
                                <button onclick={() => deleteNewClient(client.id)} class="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors shrink-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer" title="Ablehnen / Löschen">
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
{/if}
</div>

<RequestReplyModal bind:this={replyModal} />
<ClientDetailModal bind:this={clientDetailModal} />
<PdfPreviewModal bind:this={pdfPreviewModal} />
<AppointmentModal bind:this={appointmentModal} />
<GoogleContactSelectionModal bind:this={googleContactModal} />