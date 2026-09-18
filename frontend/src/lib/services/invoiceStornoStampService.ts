import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import stornoStampPng from "$lib/assets/storno-stamp.png";

/**
 * Verarbeitet die Stempelung einer stornierten Rechnung mit dem "STORNIERT"-Stempel.
 * Versucht primär den Microservice-Endpunkt aufzurufen.
 * Fällt bei Nicht-Erreichbarkeit transparent auf clientseitiges pdf-lib Stamping zurück.
 * 
 * @param invoiceId Die ID der stornierten Rechnung in PocketBase
 */
export async function stampInvoiceAsStorniert(invoiceId: string): Promise<{ success: boolean; method?: string; error?: any }> {
    if (!invoiceId) {
        return { success: false, error: "Keine Rechnungs-ID übergeben." };
    }

    // 1. Primärer Versuch: Microservice
    try {
        const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
        const token = pb.authStore?.token || '';
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let resp = await fetch(`${microserviceUrl}/api/emails/invoices/${invoiceId}/stamp-storno`, {
            method: 'POST',
            headers
        });

        if (resp.status === 404) {
            resp = await fetch(`${microserviceUrl}/api/invoices/${invoiceId}/stamp-storno`, {
                method: 'POST',
                headers
            });
        }

        if (resp.ok) {
            const result = await resp.json();
            // Aktualisiere lokalen Store mit aktuellem Datensatz
            await refreshInvoiceInStore(invoiceId);
            return { success: true, method: 'microservice' };
        }
    } catch (msErr) {
        console.warn("Microservice für Storno-Stempelung nicht erreichbar, wechsle auf Client-Side Fallback:", msErr);
    }

    // 2. Client-Side Fallback via pdf-lib
    try {
        const invoice = await pb.collection('invoices').getOne(invoiceId, { requestKey: null });
        if (!invoice || !invoice.pdf) {
            return { success: false, error: "Keine PDF-Datei in der Rechnung hinterlegt." };
        }

        const pdfList = Array.isArray(invoice.pdf) ? invoice.pdf : [invoice.pdf];
        if (pdfList.length === 0 || !pdfList[0]) {
            return { success: false, error: "PDF-Dateiliste ist leer." };
        }

        const mainPdfFilename = pdfList[0];
        const fileUrl = pb.files.getURL(invoice, mainPdfFilename);

        const pdfResp = await fetch(fileUrl);
        if (!pdfResp.ok) {
            throw new Error(`Konnte Original-PDF nicht laden (${pdfResp.statusText})`);
        }
        const pdfBytes = await pdfResp.arrayBuffer();

        // Dynamischer Import von pdf-lib zur Optimierung des Bundles
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Stempel-Grafik laden
        const stampResp = await fetch(stornoStampPng);
        if (!stampResp.ok) {
            throw new Error(`Konnte Stempel-Grafik nicht laden (${stampResp.statusText})`);
        }
        const stampBuffer = await stampResp.arrayBuffer();
        const stampImage = await pdfDoc.embedPng(stampBuffer);

        // Auf alle Seiten zentriert und dominant aufbringen (~68% Breite, max 420pt, 85% Deckkraft)
        const pages = pdfDoc.getPages();
        for (const page of pages) {
            const { width, height } = page.getSize();
            const stampW = Math.min(width * 0.68, 420);
            const stampH = stampW * (551 / 646);
            const stampX = (width - stampW) / 2;
            const stampY = (height - stampH) / 2;

            page.drawImage(stampImage, {
                x: stampX,
                y: stampY,
                width: stampW,
                height: stampH,
                opacity: 0.85
            });
        }

        const stampedBytes = await pdfDoc.save();

        const formData = new FormData();
        const stampedBlob = new Blob([stampedBytes as any], { type: 'application/pdf' });
        formData.append('pdf', stampedBlob, mainPdfFilename);

        // Falls ein Zeitnachweis als zweites PDF vorlag, diesen beibehalten
        if (pdfList.length > 1) {
            for (let i = 1; i < pdfList.length; i++) {
                const extraFilename = pdfList[i];
                const extraUrl = pb.files.getURL(invoice, extraFilename);
                const extraResp = await fetch(extraUrl).catch(() => null);
                if (extraResp && extraResp.ok) {
                    const extraBytes = await extraResp.arrayBuffer();
                    formData.append('pdf', new Blob([extraBytes], { type: 'application/pdf' }), extraFilename);
                }
            }
        }

        formData.append('status', 'Storniert');

        await pb.collection('invoices').update(invoiceId, formData);
        await refreshInvoiceInStore(invoiceId);

        return { success: true, method: 'client-fallback' };
    } catch (clientErr: any) {
        console.error("Fehler bei Client-Side Storno-Stempelung:", clientErr);
        return { success: false, error: clientErr?.message || clientErr };
    }
}

async function refreshInvoiceInStore(invoiceId: string) {
    try {
        const freshInvoice = await pb.collection('invoices').getOne(invoiceId, { requestKey: null });
        if (orgaStore.invoices?.data) {
            const idx = orgaStore.invoices.data.findIndex((i: any) => i.id === invoiceId);
            if (idx !== -1) {
                orgaStore.invoices.data[idx] = freshInvoice as any;
            }
        }
    } catch (e) {
        console.warn("Konnte Rechnung im lokalen Store nach Stempelung nicht aktualisieren:", e);
    }
}
