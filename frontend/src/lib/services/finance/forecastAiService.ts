export async function fetchAiForecastSpeculation(payload: any): Promise<{ data: any; model: string }> {
    const isLocal = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname.includes('ihre-seniorenassistenz.com'));
    
    const primaryUrl = isLocal 
        ? 'http://localhost:3000/api/ai/forecast-speculation' 
        : '/api/emails/ai/forecast-speculation';

    let res: Response | null = null;
    try {
        res = await fetch(primaryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.warn(`[AI Forecast] Primärer Endpunkt ${primaryUrl} fehlgeschlagen, versuche Fallback:`, err);
    }

    // Sekundärer Fallback
    if (!res || !res.ok) {
        const fallbackUrl = isLocal 
            ? '/api/emails/ai/forecast-speculation'
            : 'https://ihre-seniorenassistenz.com/api/emails/ai/forecast-speculation';
        try {
            res = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (fallbackErr) {
            console.warn(`[AI Forecast] Fallback-Endpunkt ${fallbackUrl} ebenfalls fehlgeschlagen:`, fallbackErr);
        }
    }

    if (!res || !res.ok) {
        const errData = res ? await res.json().catch(() => ({})) : {};
        throw new Error(errData.error || (res ? `HTTP ${res.status}` : 'Netzwerkfehler'));
    }

    const jsonRes = await res.json();
    return {
        data: jsonRes.data,
        model: jsonRes.model || 'gemini-3.8-flash'
    };
}
