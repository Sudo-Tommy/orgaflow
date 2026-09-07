// pb_hooks/weekly_feedback_digest.pb.js
/// <reference path="../pb_data/types.d.ts" />

/**
 * Wöchentliche Auto-Update-Schleife (Feedback-to-Prompt Engine)
 * 
 * Läuft vollautomatisch jeden Montag um 02:00 Uhr (Cron: "0 2 * * 1").
 * Aggregiert Nutzer-Feedbacks, Chat-Logs, Vorschläge, Kunden- und Terminanfragen
 * und stößt die strukturierte Prompt-Synthese an.
 */

cronAdd("weekly_feedback_digest", "0 2 * * 1", () => {
    console.log("[PocketBase Cron] Starte wöchentlichen Feedback-Digest...");

    try {
        // Microservice Endpunkt für Synthese ansprechen
        const microserviceUrl = "http://127.0.0.1:3000/api/admin/system-prompts/generate";
        
        const response = $http.send({
            url: microserviceUrl,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                triggeredBy: "pb_cron_weekly_digest",
                timestamp: new Date().toISOString(),
                includeProposals: true,
                includeChat: true,
                includeInquiries: true,
                includeAppointmentRequests: true
            }),
            timeout: 120 // 2 Minuten Timeout für Gemini-Generierung
        });

        if (response.statusCode === 200) {
            console.log("[PocketBase Cron] Wöchentlicher Feedback-Digest erfolgreich generiert!");
            try {
                const mailboxColl = $app.findCollectionByNameOrId("mailbox_messages");
                const resData = response.json || {};
                const kwTitle = resData.title || "Wöchentlicher System-Ausbesserungsprompt";
                const totalCount = resData.counts?.total || 0;

                const msgRecord = new Record(mailboxColl);
                msgRecord.set("folder", "System");
                msgRecord.set("subject", "🧠 Auto-Update Engine: " + kwTitle + " generiert");
                msgRecord.set("body_text", "Die Auto-Update Engine hat die wöchentliche Feedback-to-Prompt Synthese erfolgreich durchgeführt.\n\n" +
                    "Titel: " + kwTitle + "\n" +
                    "Aggregierte Vorgänge: " + totalCount + "\n" +
                    "Status: Offen (bereit zur Umsetzung in Antigravity)\n\n" +
                    "Öffnen Sie die System-Spezifikationen unter /admin/system-prompts zur Prüfung und Übernahme.");
                msgRecord.set("to_address", "system@orgaflow.local");
                msgRecord.set("date", new Date().toISOString());
                $app.save(msgRecord);
            } catch (notifyErr) {
                console.warn("[PocketBase Cron] Notifikation konnte nicht in mailbox_messages abgelegt werden:", notifyErr);
            }
        } else {
            console.warn("[PocketBase Cron] Fehler beim Feedback-Digest (HTTP " + response.statusCode + "): " + response.raw);
        }
    } catch (err) {
        console.error("[PocketBase Cron Exception] Wöchentlicher Feedback-Digest fehlgeschlagen:", err);
    }
});

// Admin-Route zum manuellen Auslösen des Digests direkt über PocketBase
// Ausschließlich für Superadmins und Inhaber (_superusers / role === 'superadmin' | 'owner')
routerAdd("POST", "/api/orgaflow/system-prompts/generate", (c) => {
    const authRecord = c.auth || (typeof c.get === 'function' ? c.get("authRecord") : null);

    if (!authRecord) {
        throw new ForbiddenError("Zugriff verweigert: Sie sind nicht eingeloggt.");
    }

    const collName = typeof authRecord.collectionName === 'function' ? authRecord.collectionName() : authRecord.collection().name;
    const isRealSuperuser = collName === "_superusers";
    const isOwnerOrSuperadmin = collName === "users" && (authRecord.getString("role") === "superadmin" || authRecord.getString("role") === "owner");

    if (!isRealSuperuser && !isOwnerOrSuperadmin) {
        throw new ForbiddenError("Zugriff verweigert: Nur für Inhaber und Superadmins (HRBAC).");
    }

    try {
        let reqBody = {};
        try {
            reqBody = c.requestInfo().body || {};
        } catch (_) {}
        reqBody.triggeredBy = "admin_manual_trigger";

        const microserviceUrl = "http://127.0.0.1:3000/api/admin/system-prompts/generate";
        const response = $http.send({
            url: microserviceUrl,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBody),
            timeout: 120
        });

        return c.json(response.statusCode, response.json);
    } catch (e) {
        return c.json(500, { error: "Fehler beim Anstoßen der Prompt-Generierung: " + e.message });
    }
});
