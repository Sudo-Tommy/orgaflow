import { FileText, Image, File as FileIcon } from "lucide-svelte";

export function getCleanFileName(fn: string): string {
    return fn ? fn.replace(/_[a-zA-Z0-9]{10}\./, '.') : '';
}

export function getFileIcon(fn: string) {
    const lower = fn ? fn.toLowerCase() : '';
    if (lower.endsWith('.pdf')) return FileText;
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) return Image;
    return FileIcon;
}

export function checkIsDuplicate(file: File, clientDocs: string[] = [], appointmentDocs: string[] = []): boolean {
    const baseName = file.name.toLowerCase();
    const existsInClient = clientDocs.some(d => d.toLowerCase().includes(baseName) || getCleanFileName(d).toLowerCase() === baseName);
    const existsInApp = appointmentDocs.some(d => d.toLowerCase().includes(baseName) || getCleanFileName(d).toLowerCase() === baseName);
    return existsInClient || existsInApp;
}
