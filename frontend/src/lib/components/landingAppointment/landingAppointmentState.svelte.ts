import { pb } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";
import { notifyAppointmentRequestAsync } from "$lib/services/notificationClientService";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import type { ContactRecord } from "$lib/types/orgaTypes";
import { hasDoctorOrAuthorityKeyword, type OpenAppointmentOptions } from "./landingAppointmentTypes";

export function createLandingAppointmentState() {
    let isLoading = $state(false);
    let successMsg = $state("");
    let errorMsg = $state("");
    let companies = $state<any[]>([]);
    let company_id = $state("");

    let sender_name = $state("");
    let email = $state("");
    let phone = $state("");
    let street = $state("");
    let zip_city = $state("");
    let request_text = $state("");
    let time = $state("");
    let preferredContact = $state<"phone" | "email" | "mail">("phone");
    let isPortalUser = $state(false);
    let userRole = $state<"client" | "caregiver" | "contact" | "admin" | "guest">("guest");
    let activeClientName = $state("");
    let isFixedClient = $state(false);
    let isFixedCompany = $state(false);
    let portalClients = $state<{ id: string; name: string; company?: string }[]>([]);
    let selectedPortalClient = $state("");
    let attachments = $state<File[]>([]);
    let website = $state("");
    let formToken = $state("");

    let isDoctorAppointmentManual = $state<boolean | null>(null);
    let selectedDoctorOrAuthority = $state<ContactRecord | null>(null);

    let currentDate = $state(new Date());
    let selectedDate = $state<Date | null>(null);
    let occupiedDates = $state<string[]>([]);
    let occupiedTimesByDate = $state<Record<string, string[]>>({});

    let isDoctorAppointment = $derived.by(() => {
        if (selectedDoctorOrAuthority !== null) return true;
        if (isDoctorAppointmentManual !== null) return isDoctorAppointmentManual;
        return hasDoctorOrAuthorityKeyword(request_text);
    });

    let isValidContact = $derived.by(() => {
        if (isPortalUser) return true;
        if (preferredContact === "email") return email.trim().length >= 5 && email.includes("@");
        if (preferredContact === "phone") return phone.trim().length >= 6;
        if (preferredContact === "mail") return street.trim().length >= 3 && zip_city.trim().length >= 5;
        return false;
    });

    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const firstDay = new Date(y, m, 1);
        let startDay = (firstDay.getDay() || 7) - 1;
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

    async function fetchFormToken() {
        try {
            const apiBase = typeof window !== "undefined" && !window.location.hostname.includes("ihre-seniorenassistenz.com") ? `http://${window.location.hostname}:3000` : "/api/emails";
            const res = await fetch(`${apiBase}/form-token`);
            if (res.ok) {
                const data = await res.json();
                formToken = data.token || "";
            }
        } catch (e) {
            console.warn("[LandingAppointmentModal] Form-Token konnte nicht geladen werden:", e);
        }
    }

    async function loadCompanies() {
        try {
            companies = await pb.collection("company").getFullList({ sort: "city", requestKey: null });
            if (companies.length > 0 && !company_id) company_id = companies[0].id;
        } catch {
            console.warn("Firmen konnten nicht geladen werden.");
        }
    }

    async function loadOccupiedDates(compId: string) {
        occupiedDates = [];
        occupiedTimesByDate = {};
        if (!compId) return;
        try {
            const res = await pb.collection("public_busy_days").getFullList({ requestKey: null });
            const filtered = res.filter((r: any) => {
                if (r.is_visible !== true || r.is_private === true) return false;
                let c = r.company;
                if (!c) return false;
                if (typeof c === "string") {
                    if (c.startsWith("[")) {
                        try { c = JSON.parse(c); } catch { return false; }
                    } else return c === compId || c.includes(compId);
                }
                return Array.isArray(c) ? c.includes(compId) : false;
            });
            const counts: Record<string, number> = {};
            const times: Record<string, string[]> = {};
            filtered.forEach((r: any) => {
                if (!r.appointment) return;
                const dObj = new Date(r.appointment.replace(" ", "T"));
                if (isNaN(dObj.getTime())) return;
                const d = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                const isBlocked = r.is_blocked || (r.description && r.description.includes("[BLOCK]"));
                counts[d] = (counts[d] || 0) + (isBlocked ? 100 : 1);
                if (!isBlocked) {
                    const tStr = dObj.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                    if (!times[d]) times[d] = [];
                    if (!times[d].includes(tStr)) times[d].push(tStr);
                }
            });
            for (const key in times) times[key].sort();
            occupiedDates = Object.entries(counts).filter(([_, count]) => count >= 4).map(([d]) => d);
            occupiedTimesByDate = times;
        } catch (err) {
            console.warn("Konnte belegte Tage nicht laden.", err);
        }
    }

    function initFromAuth(options?: OpenAppointmentOptions) {
        const model = pb.authStore.model;
        let portalTokenPayload: any = null;
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("portal_token") || sessionStorage.getItem("portal_token");
            if (token) {
                try { portalTokenPayload = JSON.parse(atob(token.split(".")[1])); } catch {}
            }
        }
        const authUser = portalTokenPayload || model;
        if (authUser && !options?.role) {
            isPortalUser = true;
            if (authUser.type === "client" || authUser.role === "client") {
                userRole = "client";
                isFixedClient = true;
                selectedPortalClient = authUser.id;
            } else if (authUser.type === "contact") userRole = "contact";
            else if (authUser.role === "caregiver") userRole = "caregiver";
            else if (pb.authStore.isValid) userRole = "admin";

            if (!sender_name) {
                sender_name = `${authUser.name_first || ""} ${authUser.name_last || ""}`.trim() || authUser.name || authUser.username || "Portal-Nutzer";
                email = authUser.email || email;
                phone = authUser.phone || authUser.handy || authUser.tel || phone;
                street = `${authUser.street || ""} ${authUser.housenr || ""}`.trim() || street;
                const zip = authUser.zip || "";
                const city = authUser.city || "";
                if (zip || city) zip_city = `${zip} ${city}`.trim();
            }
            if (authUser.company && !company_id) {
                const cId = Array.isArray(authUser.company) ? authUser.company[0] : authUser.company;
                if (cId && companies.some((c) => c.id === cId)) company_id = cId;
            }
        }
    }

    function open(options?: OpenAppointmentOptions) {
        successMsg = "";
        errorMsg = "";
        portalClients = [];
        selectedPortalClient = "";
        attachments = [];
        isFixedClient = false;
        isFixedCompany = false;
        userRole = "guest";
        activeClientName = "";
        isPortalUser = false;
        isDoctorAppointmentManual = null;
        selectedDoctorOrAuthority = null;
        time = "";
        selectedDate = null;
        website = "";

        if (options) {
            if (options.role && options.role !== "guest") { userRole = options.role as any; isPortalUser = true; }
            if (options.clientId) { selectedPortalClient = options.clientId; if (options.role === "client") isFixedClient = true; }
            if (options.clientName) activeClientName = options.clientName;
            if (options.companyId) { company_id = options.companyId; isFixedCompany = true; }
            if (options.availableClients?.length) portalClients = options.availableClients;
            if (options.senderName) sender_name = options.senderName;
            if (options.email) email = options.email;
            if (options.phone) phone = options.phone;
            if (options.street) street = options.street;
            if (options.zip_city) zip_city = options.zip_city;
        }

        initFromAuth(options);
        fetchFormToken();
    }

    return {
        get isLoading() { return isLoading; }, set isLoading(v) { isLoading = v; },
        get successMsg() { return successMsg; }, set successMsg(v) { successMsg = v; },
        get errorMsg() { return errorMsg; }, set errorMsg(v) { errorMsg = v; },
        get companies() { return companies; }, set companies(v) { companies = v; },
        get company_id() { return company_id; }, set company_id(v) { company_id = v; },
        get sender_name() { return sender_name; }, set sender_name(v) { sender_name = v; },
        get email() { return email; }, set email(v) { email = v; },
        get phone() { return phone; }, set phone(v) { phone = v; },
        get street() { return street; }, set street(v) { street = v; },
        get zip_city() { return zip_city; }, set zip_city(v) { zip_city = v; },
        get request_text() { return request_text; }, set request_text(v) { request_text = v; },
        get time() { return time; }, set time(v) { time = v; },
        get preferredContact() { return preferredContact; }, set preferredContact(v) { preferredContact = v; },
        get isPortalUser() { return isPortalUser; }, set isPortalUser(v) { isPortalUser = v; },
        get userRole() { return userRole; }, set userRole(v) { userRole = v; },
        get activeClientName() { return activeClientName; }, set activeClientName(v) { activeClientName = v; },
        get isFixedClient() { return isFixedClient; }, set isFixedClient(v) { isFixedClient = v; },
        get isFixedCompany() { return isFixedCompany; }, set isFixedCompany(v) { isFixedCompany = v; },
        get portalClients() { return portalClients; }, set portalClients(v) { portalClients = v; },
        get selectedPortalClient() { return selectedPortalClient; }, set selectedPortalClient(v) { selectedPortalClient = v; },
        get attachments() { return attachments; }, set attachments(v) { attachments = v; },
        get website() { return website; }, set website(v) { website = v; },
        get formToken() { return formToken; },
        get isDoctorAppointmentManual() { return isDoctorAppointmentManual; }, set isDoctorAppointmentManual(v) { isDoctorAppointmentManual = v; },
        get selectedDoctorOrAuthority() { return selectedDoctorOrAuthority; }, set selectedDoctorOrAuthority(v) { selectedDoctorOrAuthority = v; },
        get currentDate() { return currentDate; }, set currentDate(v) { currentDate = v; },
        get selectedDate() { return selectedDate; }, set selectedDate(v) { selectedDate = v; },
        get occupiedDates() { return occupiedDates; },
        get occupiedTimesByDate() { return occupiedTimesByDate; },
        get isDoctorAppointment() { return isDoctorAppointment; },
        get isValidContact() { return isValidContact; },
        get calendarDays() { return calendarDays; },
        loadCompanies,
        loadOccupiedDates,
        open,
        nextMonth() { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); selectedDate = null; },
        prevMonth() { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1); selectedDate = null; }
    };
}
