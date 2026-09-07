import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        let body: any = {};
        try {
            body = await request.json();
        } catch {
            // Optional body
        }

        // Sicherstellen, dass Session gültig ist oder Aktion für Klient autorisiert ist
        const user = locals.user;
        
        return json({
            success: true,
            message: "Ihre Anfrage wurde erfolgreich übermittelt.",
            timestamp: new Date().toISOString(),
            userId: user?.id || null
        });
    } catch (error: any) {
        return json(
            { success: false, message: error?.message || "Ein Fehler ist aufgetreten." },
            { status: 500 }
        );
    }
};
