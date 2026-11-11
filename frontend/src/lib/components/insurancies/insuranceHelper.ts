import { toastStore } from "$lib/services/toastService.svelte";

export function getTypeBadgeClass(typeStr: string = ""): string {
    const t = typeStr.toLowerCase();
    if (t.includes("gkv") || t.includes("gesetzlich")) {
        return "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60";
    }
    if (t.includes("pkv") || t.includes("privat")) {
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60";
    }
    if (t.includes("beihilfe")) {
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60";
    }
    if (t.includes("berufsgenossenschaft") || t.includes("bg")) {
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60";
    }
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
}

export function getTypeIconStyle(typeStr: string = ""): { bg: string; text: string } {
    const t = typeStr.toLowerCase();
    if (t.includes("gkv") || t.includes("gesetzlich")) {
        return { bg: "bg-teal-50 dark:bg-teal-950/50 border-teal-200/70 dark:border-teal-800/60", text: "text-teal-600 dark:text-teal-400" };
    }
    if (t.includes("pkv") || t.includes("privat")) {
        return { bg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/70 dark:border-indigo-800/60", text: "text-indigo-600 dark:text-indigo-400" };
    }
    if (t.includes("beihilfe")) {
        return { bg: "bg-purple-50 dark:bg-purple-950/50 border-purple-200/70 dark:border-purple-800/60", text: "text-purple-600 dark:text-purple-400" };
    }
    if (t.includes("berufsgenossenschaft")) {
        return { bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200/70 dark:border-amber-800/60", text: "text-amber-600 dark:text-amber-400" };
    }
    return { bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700", text: "text-slate-600 dark:text-slate-300" };
}

export async function copyToClipboard(text: string, label: string, event?: Event): Promise<boolean> {
    event?.stopPropagation();
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        toastStore.success(`${label} in Zwischenablage kopiert`);
        return true;
    } catch {
        toastStore.error("Kopieren fehlgeschlagen.");
        return false;
    }
}

export function exportInsurancesCsv(data: any[], getClientCount: (id: string) => number) {
    if (!data || data.length === 0) {
        toastStore.info("Keine Daten zum Exportieren vorhanden.");
        return;
    }

    const headers = ["Name", "Zusatz / Abteilung", "Versicherungsart", "Straße", "PLZ", "Stadt", "Telefon", "E-Mail", "Versicherte Klienten", "Notizen"];
    const rows = data.map((ins: any) => {
        const clientCount = getClientCount(ins.id);
        return [
            `"${(ins.name || "").replace(/"/g, '""')}"`,
            `"${(ins.addition || "").replace(/"/g, '""')}"`,
            `"${(ins.type || "").replace(/"/g, '""')}"`,
            `"${(ins.street || "").replace(/"/g, '""')}"`,
            `"${(ins.zip || "").replace(/"/g, '""')}"`,
            `"${(ins.city || "").replace(/"/g, '""')}"`,
            `"${(ins.phone || "").replace(/"/g, '""')}"`,
            `"${(ins.email || "").replace(/"/g, '""')}"`,
            `"${clientCount}"`,
            `"${(ins.notes || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orgaflow_krankenkassen_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastStore.success(`${data.length} Krankenkassen als CSV exportiert.`);
}
