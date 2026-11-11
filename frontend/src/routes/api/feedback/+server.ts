import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import PocketBase from "pocketbase";

/**
 * POST /api/feedback
 *
 * Empfängt ein Multipart-FormData:
 *  - category        (string)
 *  - comment         (string, optional wenn Pfeilbeschreibungen vorhanden sind)
 *  - url             (string)
 *  - resolution      (string)
 *  - userAgent       (string)
 *  - annotations_data (JSON-String mit Pfeilen)
 *  - user            (string, optional)
 *  - screenshot      (File/Blob, Pflicht)
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const formData = await request.formData();

        const category = String(formData.get("category") || "Kleiner Schluckauf (minor)");
        const userComment = String(formData.get("comment") || "").trim();
        const url = String(formData.get("url") || "");
        const resolution = String(formData.get("resolution") || "");
        const userAgent = String(formData.get("userAgent") || "");
        const annotationsRaw = String(formData.get("annotations_data") || "[]");
        const formUserId = formData.get("user") as string | null;
        const screenshot = formData.get("screenshot") as File | null;

        if (!screenshot || screenshot.size === 0) {
            throw error(400, { message: "Screenshot-Datei ist erforderlich." });
        }

        // Parse Pfeile und generiere strukturierten Gesamtkommentar
        let parsedAnnotations: Array<{ label?: string; text?: string }> = [];
        try {
            parsedAnnotations = JSON.parse(annotationsRaw);
        } catch {
            parsedAnnotations = [];
        }

        const arrowLines = parsedAnnotations
            .map((a, idx) => {
                const desc = (a.text || a.label || "").trim();
                return desc ? `Pfeil #${idx + 1}: ${desc}` : null;
            })
            .filter(Boolean);

        let finalComment = userComment;
        if (arrowLines.length > 0) {
            const annotationsSection = arrowLines.join("\n");
            finalComment = finalComment
                ? `${finalComment}\n\n--- Markierungen ---\n${annotationsSection}`
                : annotationsSection;
        }

        if (!finalComment) {
            finalComment = "Keine Beschreibung angegeben.";
        }

        // PocketBase-Instanz nutzen (aus locals oder neuer Client)
        const pb = locals?.pb || new PocketBase(process.env.POCKETBASE_URL || "http://127.0.0.1:8090");

        const pbFormData = new FormData();
        pbFormData.append("category", category);
        pbFormData.append("comment", finalComment);
        pbFormData.append("url", url);
        pbFormData.append("resolution", resolution);
        pbFormData.append("userAgent", userAgent);
        pbFormData.append("annotations_data", annotationsRaw);
        pbFormData.append("status", "Neu");
        pbFormData.append("screenshot", screenshot);

        const activeUserId = locals?.user?.id || formUserId;
        if (activeUserId) {
            pbFormData.append("user", activeUserId);
        }

        const record = await pb.collection("support_tickets").create(pbFormData);

        return json({ success: true, id: record.id });
    } catch (err: any) {
        console.error("Feedback API error:", err);
        const status = err.status || 500;
        const message = err.response?.message || err.message || "Fehler beim Übertragen des Feedbacks";
        return json({ success: false, message }, { status });
    }
};
