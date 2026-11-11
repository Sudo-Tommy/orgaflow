import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import { resolveMatchingInquiriesForContact } from '$lib/services/contactPickerService';
import type { ContactRecord, Salutation } from '$lib/types/orgaTypes';

export interface GoogleContactResult {
    company_name: string;
    name_first: string;
    name_last: string;
    salutation: Salutation;
    street: string;
    housenr: string;
    zip: string;
    city: string;
    phone: string;
    email: string;
    website: string;
    category?: string;
    description?: string;
}

export interface GoogleContactFormData {
    companyName: string;
    salutation: Salutation;
    nameFirst: string;
    nameLast: string;
    street: string;
    houseNr: string;
    zip: string;
    city: string;
    phone: string;
    email: string;
    notes: string;
}

export interface OpenGoogleContactParams {
    query: string;
    location?: string;
    type?: 'doctor' | 'location' | 'general';
    context?: string;
}

function sanitizeSalutation(val?: string): Salutation {
    if (!val) return 'Keine Angabe';
    const l = val.toLowerCase().trim();
    if (l === 'herr' || l.startsWith('herr')) return 'Herr';
    if (l === 'frau' || l.startsWith('frau')) return 'Frau';
    return 'Keine Angabe';
}

export function useGoogleContactSelection() {
    let isOpen = $state(false);
    let isLoading = $state(false);
    let isSaving = $state(false);
    let searchQuery = $state('');
    let searchLocation = $state('');
    let searchType = $state<'doctor' | 'location' | 'general'>('doctor');
    let searchContext = $state('');
    let results = $state<GoogleContactResult[]>([]);
    let selectedIndex = $state<number>(0);
    let existingContact = $state<ContactRecord | null>(null);

    let form = $state<GoogleContactFormData>({
        companyName: '', salutation: 'Keine Angabe', nameFirst: '', nameLast: '',
        street: '', houseNr: '', zip: '', city: '', phone: '', email: '', notes: ''
    });

    let resolveCallback: ((contact: ContactRecord | null) => void) | null = null;
    let abortCtrl: AbortController | null = null;

    function resetForm() {
        form.companyName = ''; form.salutation = 'Keine Angabe'; form.nameFirst = '';
        form.nameLast = ''; form.street = ''; form.houseNr = ''; form.zip = '';
        form.city = ''; form.phone = ''; form.email = ''; form.notes = '';
        existingContact = null;
    }

    function populateFallbackFromQuery() {
        form.companyName = searchQuery.trim();
        form.nameLast = searchType === 'doctor'
            ? searchQuery.replace(/^(?:Dr\.?\s*med\.?|Dr\.?|Herr|Frau|Praxis|Arzt)\s+/i, '').trim()
            : '';
        const zipMatch = searchLocation.trim().match(/^(\d{5})\s+(.*)$/);
        if (zipMatch) {
            form.zip = zipMatch[1];
            form.city = zipMatch[2].trim();
        } else {
            form.city = searchLocation.trim();
        }
    }

    function selectResult(index: number) {
        if (!results[index]) return;
        selectedIndex = index;
        const r = results[index];
        form.companyName = r.company_name || '';
        form.salutation = sanitizeSalutation(r.salutation);
        let fName = r.name_first || '';
        if (r.salutation && !['Herr', 'Frau', 'Keine Angabe'].includes(r.salutation)) {
            if (!fName.includes(r.salutation)) fName = `${r.salutation} ${fName}`.trim();
        }
        form.nameFirst = fName;
        form.nameLast = r.name_last || '';
        form.street = r.street || '';
        form.houseNr = r.housenr || '';
        form.zip = r.zip || '';
        form.city = r.city || '';
        form.phone = r.phone || '';
        form.email = r.email || '';
        const notes = [r.category ? `Kategorie: ${r.category}` : '', r.description, r.website ? `Web: ${r.website}` : ''].filter(Boolean);
        form.notes = notes.join(' | ');
    }

    async function checkExistingInPocketBase(query: string) {
        const clean = query.replace(/^(?:Dr\.?\s*med\.?|Dr\.?|Herr|Frau|Praxis|Arzt)\s+/i, '').trim();
        if (clean.length < 3) return;
        try {
            const targetCol = pb.authStore.isValid ? 'contacts' : 'public_doctors';
            const list = await pb.collection(targetCol).getList<ContactRecord>(1, 1, {
                filter: `company_name ~ "${clean}" || name_last ~ "${clean}"`,
                requestKey: null
            });
            if (list.items.length > 0) existingContact = list.items[0];
        } catch {}
    }

    async function performSearch() {
        if (!searchQuery && !searchLocation) return;
        if (abortCtrl) abortCtrl.abort();
        abortCtrl = new AbortController();
        isLoading = true;

        const timeoutId = setTimeout(() => {
            if (abortCtrl) abortCtrl.abort();
        }, 10000);

        try {
            checkExistingInPocketBase(searchQuery);
            const res = await fetch('/api/contacts/google-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
                signal: abortCtrl.signal,
                body: JSON.stringify({ query: searchQuery, location: searchLocation, type: searchType, context: searchContext })
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            results = data.results || [];
            if (results.length > 0) {
                selectResult(0);
                toastStore.success(`${results.length} Ergebnis(se) über Google ermittelt.`);
            } else {
                toastStore.info("Keine direkten Treffer – Daten können manuell angepasst werden.");
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err?.name !== 'AbortError') {
                toastStore.info("Google-Recherche verzögert – Daten können manuell eingetragen werden.");
            }
        } finally {
            isLoading = false;
        }
    }

    async function handleSaveContact(onSuccess?: (contact: ContactRecord) => void) {
        if (!form.companyName && !form.nameLast) {
            toastStore.warning("Bitte mindestens einen Nachnamen oder eine Praxis-/Einrichtungsbezeichnung eingeben.");
            return;
        }
        isSaving = true;
        try {
            const payload: Partial<ContactRecord> = {
                salutation: sanitizeSalutation(form.salutation),
                company_name: form.companyName.trim(),
                name_first: form.nameFirst.trim(),
                name_last: form.nameLast.trim(),
                street: form.street.trim(),
                housenr: form.houseNr.trim(),
                zip: form.zip.trim(),
                city: form.city.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                notes: form.notes.trim(),
                portal_pin: '',
                portal_code: ''
            };
            if (pb.authStore.model?.id) payload.created_by = pb.authStore.model.id;

            const created = await pb.collection('contacts').create(payload, { requestKey: null }) as ContactRecord;
            if (orgaStore.contacts) orgaStore.contacts.optimisticCreate(created);
            resolveMatchingInquiriesForContact(created);

            const displayName = form.companyName || `${form.nameFirst} ${form.nameLast}`.trim();
            toastStore.success(`Kontakt "${displayName}" angelegt & verknüpft!`);
            if (onSuccess) onSuccess(created);
        } catch (err: any) {
            console.error("Fehler beim Speichern des Kontakts:", err);
            toastStore.error("Kontakt konnte nicht gespeichert werden: " + (err.message || ''));
        } finally {
            isSaving = false;
        }
    }

    function open(dialog: HTMLDialogElement | undefined, params: OpenGoogleContactParams): Promise<ContactRecord | null> {
        searchQuery = params.query || '';
        searchLocation = params.location || '';
        searchType = params.type || 'doctor';
        searchContext = params.context || '';
        results = [];
        selectedIndex = 0;
        resetForm();
        populateFallbackFromQuery();
        isOpen = true;
        dialog?.showModal();
        checkExistingInPocketBase(searchQuery);

        return new Promise((resolve) => { resolveCallback = resolve; });
    }

    function close(dialog: HTMLDialogElement | undefined, result: ContactRecord | null = null) {
        if (abortCtrl) abortCtrl.abort();
        isOpen = false;
        dialog?.close();
        if (resolveCallback) { resolveCallback(result); resolveCallback = null; }
    }

    return {
        get isOpen() { return isOpen; }, get isLoading() { return isLoading; },
        get isSaving() { return isSaving; }, get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; }, get searchLocation() { return searchLocation; },
        set searchLocation(v) { searchLocation = v; }, get searchType() { return searchType; },
        get results() { return results; }, get selectedIndex() { return selectedIndex; },
        get existingContact() { return existingContact; }, get form() { return form; },
        selectResult, performSearch, handleSaveContact, open, close
    };
}
