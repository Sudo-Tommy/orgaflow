import { pb } from "./pocketbase";

export interface InquiryAiResult {
    clientName: string;
    contactInfo: {
        email: string;
        phone: string;
    };
    category: 'Erstberatung' | 'Begleitung' | 'Alltagshilfe' | 'Verhinderungspflege' | 'Sonstiges';
    urgency: 'low' | 'medium' | 'high';
    appointmentRequested: boolean;
    preferredDate: string | null;
    summary: string;
    suggestedResponse: string;

    // Rückwärtskompatible Aliase
    sender?: {
        name: string;
        email: string;
        phone: string;
        address?: string;
    };
    appointment_wish?: {
        has_wish: boolean;
        proposed_date?: string | null;
        notes?: string;
    };
    draft_reply?: string;
}

export interface ProcessInquiryResponse {
    success: boolean;
    cached: boolean;
    inquiry_id?: string;
    appointment_id?: string | null;
    result: InquiryAiResult;
    error?: string;
}

// In-Flight Deduplication & Client Cache gegen Doppel-Trigger
const inFlightRequests = new Map<string, Promise<ProcessInquiryResponse>>();
const clientMemoryCache = new Map<string, ProcessInquiryResponse>();

export async function processInquiryWithAi(
    rawText: string, 
    inquiryId?: string, 
    forceRefresh: boolean = false
): Promise<ProcessInquiryResponse> {
    const cleanText = rawText.trim();
    if (!cleanText) {
        throw new Error("Bitte geben Sie einen Anfragetext ein.");
    }

    const cacheKey = `${inquiryId || ''}_${cleanText}`;

    // Clientseitiger Memory-Cache (sofern kein forceRefresh)
    if (!forceRefresh && clientMemoryCache.has(cacheKey)) {
        return clientMemoryCache.get(cacheKey)!;
    }

    // In-Flight Deduplication: Wenn derselbe Request bereits läuft, hänge an die existierende Promise an
    if (!forceRefresh && inFlightRequests.has(cacheKey)) {
        return await inFlightRequests.get(cacheKey)!;
    }

    const executePromise = (async () => {
        const payload = {
            raw_text: cleanText,
            inquiry_id: inquiryId || undefined,
            force_refresh: forceRefresh
        };

        const token = pb.authStore.token;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        // Primary: SvelteKit endpoint (/api/ai/process-inquiry) mit direktem Server-Handling
        // Fallback: Microservice (/api/emails/ai/process-inquiry)
        const isLocal = typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com');
        const microserviceUrl = isLocal ? 'http://localhost:3000/api/ai/process-inquiry' : '/api/emails/ai/process-inquiry';

        let res = await fetch('/api/ai/process-inquiry', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res || !res.ok) {
            // Fallback auf Microservice
            res = await fetch(microserviceUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || `Server meldet Status ${res.status}`);
        }

        const data: ProcessInquiryResponse = await res.json();
        
        // Kompatibilitätsbrücke für ältere UI-Aufrufe
        if (data.result) {
            if (!data.result.sender && data.result.clientName) {
                data.result.sender = {
                    name: data.result.clientName,
                    email: data.result.contactInfo?.email || '',
                    phone: data.result.contactInfo?.phone || '',
                    address: ''
                };
            }
            if (!data.result.draft_reply && data.result.suggestedResponse) {
                data.result.draft_reply = data.result.suggestedResponse;
            }
            if (!data.result.appointment_wish) {
                data.result.appointment_wish = {
                    has_wish: data.result.appointmentRequested,
                    proposed_date: data.result.preferredDate,
                    notes: ''
                };
            }
        }

        clientMemoryCache.set(cacheKey, data);
        return data;
    })();

    inFlightRequests.set(cacheKey, executePromise);

    try {
        return await executePromise;
    } finally {
        inFlightRequests.delete(cacheKey);
    }
}
