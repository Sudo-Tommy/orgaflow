import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const authHeader = request.headers.get('authorization');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (authHeader) headers['Authorization'] = authHeader;

        // Leitet die Anfrage an die Headless-Chromium PDF-Engine des Microservice weiter
        const resp = await fetch('http://127.0.0.1:3000/api/generate-pdf', {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const errText = await resp.text();
            return new Response(errText, { status: resp.status });
        }

        const pdfBuffer = await resp.arrayBuffer();
        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="dokument.pdf"'
            }
        });
    } catch (err: any) {
        console.error("Fehler beim Weiterleiten an die Microservice PDF-Engine:", err);
        return json({ error: err.message || 'PDF-Generierung fehlgeschlagen' }, { status: 500 });
    }
};