import { sanitizeHeaderValue } from '../../utils/security.js';

const LEXOFFICE_BASE_URL = 'https://api.lexoffice.io/v1';
const MIN_REQUEST_INTERVAL_MS = 550; // Strikt < 2 Anfragen/Sekunde gemäß LexOffice Rate-Limit
const REQUEST_TIMEOUT_MS = 20000;

let lastRequestTime = 0;
let requestQueue = Promise.resolve();

export function enqueueLexOfficeCall(taskFn) {
    const nextTask = requestQueue.then(async () => {
        const now = Date.now();
        const elapsed = now - lastRequestTime;
        if (elapsed < MIN_REQUEST_INTERVAL_MS) {
            await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
        }
        lastRequestTime = Date.now();
        return await taskFn();
    });
    requestQueue = nextTask.catch(() => { });
    return nextTask;
}

export async function lexofficeRequest(apiKey, endpoint, options = {}, maxRetries = 3) {
    if (!apiKey) throw new Error('Kein LexOffice-Schlüssel angegeben.');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${LEXOFFICE_BASE_URL}${cleanEndpoint}`;

    if (!url.startsWith('https://')) {
        throw new Error('Sicherheitsfehler: LexOffice-Verbindungen müssen zwingend über HTTPS erfolgen.');
    }

    const safeToken = sanitizeHeaderValue(apiKey);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let response;
        try {
            response = await enqueueLexOfficeCall(async () => {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
                try {
                    const headers = {
                        'Authorization': `Bearer ${safeToken}`,
                        'Accept': options.accept || 'application/json',
                        ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
                        ...(options.headers || {})
                    };
                    return await fetch(url, {
                        method: options.method || 'GET',
                        headers,
                        body: options.body
                            ? (typeof options.body === 'string' || options.body instanceof FormData
                                ? options.body
                                : JSON.stringify(options.body))
                            : undefined,
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timer);
                }
            });
        } catch (netErr) {
            if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
                continue;
            }
            throw netErr;
        }

        if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
            if (attempt < maxRetries) {
                const retryAfter = Number(response.headers.get('retry-after')) || 0;
                const backoffMs = Math.max(retryAfter * 1000, (attempt + 1) * 1500);
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
                continue;
            }
        }

        if (response.status === 401) {
            if (attempt === 0 && maxRetries > 0) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            const authErr = new Error('Der LexOffice-Zugangsschlüssel ist ungültig oder abgelaufen. Bitte neu verbinden.');
            authErr.status = 401;
            authErr.needsReconnect = true;
            throw authErr;
        }

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            let detail = errText;
            try {
                const parsed = JSON.parse(errText);
                detail = parsed.message || parsed.IssueList?.[0]?.i18nKey || errText;
            } catch { }
            const apiErr = new Error(`LexOffice-Antwort (${response.status}): ${detail || response.statusText}`);
            apiErr.status = response.status;
            throw apiErr;
        }

        if (options.rawResponse) return response;
        if (response.status === 204) return null;
        return await response.json();
    }
}

export async function fetchLexOfficeProfile(apiKey) {
    return await lexofficeRequest(apiKey, '/profile', {}, 2);
}

export function extractLexOfficeFileId(lexDetail) {
    if (!lexDetail?.files) return null;
    if (Array.isArray(lexDetail.files) && lexDetail.files.length > 0) {
        return typeof lexDetail.files[0] === 'string' ? lexDetail.files[0] : (lexDetail.files[0]?.id || null);
    }
    return lexDetail.files.documentFileId || null;
}

export async function downloadLexOfficeInvoicePdf(apiKey, lexofficeInvoiceId, voucherType = 'invoice', existingDocumentFileId = null) {
    let documentFileId = existingDocumentFileId;
    if (!documentFileId && (voucherType === 'invoice' || voucherType === 'creditnote')) {
        const typeSegment = voucherType === 'creditnote' ? 'credit-notes' : 'invoices';
        const docInfo = await lexofficeRequest(apiKey, `/${typeSegment}/${encodeURIComponent(lexofficeInvoiceId)}/document`).catch(() => null);
        documentFileId = docInfo?.documentFileId;
    }
    if (!documentFileId) return null;

    const rawRes = await lexofficeRequest(apiKey, `/files/${encodeURIComponent(documentFileId)}`, {
        accept: 'application/pdf, application/octet-stream, */*',
        rawResponse: true
    });
    const arrayBuffer = await rawRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function attachFileToLexOfficeVoucher(apiKey, voucherId, pdfBuffer, filename = 'rechnung.pdf') {
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, filename);

    return await lexofficeRequest(apiKey, `/vouchers/${encodeURIComponent(voucherId)}/files`, {
        method: 'POST',
        body: formData
    });
}
