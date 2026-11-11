import { pb } from "$lib/services/pocketbase";

export function normalizeStatus(statusRaw: string): "open" | "in_progress" | "resolved" {
    const s = (statusRaw || "").toLowerCase();
    if (s === "in_progress" || s.includes("bearbeit")) return "in_progress";
    if (s === "resolved" || s === "gelöst" || s.includes("gelöst") || s.includes("geschlossen")) return "resolved";
    return "open";
}

export function getStatusLabel(statusRaw: string): string {
    const norm = normalizeStatus(statusRaw);
    if (norm === "in_progress") return "In Bearbeitung";
    if (norm === "resolved") return "Gelöst";
    return "Offen";
}

export const STATUS_DB_VALUES: Record<string, string> = {
    open: "Neu",
    in_progress: "In Bearbeitung",
    resolved: "Gelöst"
};

export function getStatusBadgeClasses(statusRaw: string): string {
    const norm = normalizeStatus(statusRaw);
    if (norm === "in_progress") {
        return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80";
    }
    if (norm === "resolved") {
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80";
    }
    return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80";
}

export function getCategoryBadgeClasses(cat: string): string {
    const c = (cat || "").toLowerCase();
    if (c.includes("critical") || c.includes("baum") || c.includes("fehler")) {
        return "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60";
    }
    if (c.includes("minor") || c.includes("schluckauf")) {
        return "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
    }
    if (c.includes("layout") || c.includes("pixel")) {
        return "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60";
    }
    if (c.includes("praise") || c.includes("butter")) {
        return "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
    }
    return "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60";
}

export function parseAnnotations(raw: string): any[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function getScreenshotUrl(ticket: any): string {
    if (!ticket || !ticket.screenshot) return "";
    return pb.files.getURL(ticket, ticket.screenshot);
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return "–";
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }) + " Uhr";
    } catch {
        return dateStr;
    }
}
