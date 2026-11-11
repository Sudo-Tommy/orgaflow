import { pb } from "$lib/services/pocketbase";

export interface VmaSettlementRecord {
    id: string;
    user: string;
    period: string;
    year: number;
    month: number;
    total_km: number;
    total_travel_costs: number;
    total_vma: number;
    total_accommodation: number;
    total_incidentals: number;
    total_amount: number;
    details: any[];
    status: 'entwurf' | 'eingereicht' | 'genehmigt' | 'abgerechnet';
    pdf_file?: string;
    created: string;
    updated: string;
    expand?: any;
    month_name?: string;
    km_allowance?: number;
    grand_total?: number;
    submitted_at?: string;
    approved_at?: string;
}

export interface SaveSettlementParams {
    id?: string | null;
    userId: string;
    period: string;
    year: number;
    month: number;
    totals: {
        km: number;
        travel: number;
        vma: number;
        accommodation: number;
        incidental: number;
        total: number;
    };
    details: any[];
    status?: 'entwurf' | 'eingereicht' | 'genehmigt' | 'abgerechnet';
    pdfBlob?: Blob | null;
    fileName?: string;
}

class VmaSettlementService {
    allSettlements = $state<VmaSettlementRecord[]>([]);
    isLoading = $state(false);

    /**
     * Vorab-Prüfung auf bereits vorhandene Abrechnung in PocketBase (Idempotenz).
     * Verhindert redundante Berechnungen und Google Routes API-Aufrufe.
     */
    async checkExistingSettlement(userId: string, year: number, month: number): Promise<VmaSettlementRecord | null> {
        if (!userId || !year) return null;
        try {
            const filter = `user = "${userId}" && year = ${year} && month = ${month}`;
            const list = await pb.collection('vma_settlements').getFullList<VmaSettlementRecord>({
                filter,
                sort: '-updated,-created',
                requestKey: null
            });
            return list.length > 0 ? list[0] : null;
        } catch (err) {
            console.warn("[VmaSettlementService] Vorab-Prüfung fehlgeschlagen:", err);
            return null;
        }
    }

    /**
     * Lädt alle gespeicherten Abrechnungen aus PocketBase für das Archiv.
     */
    async loadSettlements(userId?: string): Promise<VmaSettlementRecord[]> {
        this.isLoading = true;
        try {
            const filter = userId ? `user = "${userId}"` : '';
            const records = await pb.collection('vma_settlements').getFullList<VmaSettlementRecord>({
                filter: filter || undefined,
                sort: '-year,-month,-created',
                requestKey: null
            });
            this.allSettlements = records;
            return records;
        } catch (err) {
            console.error("[VmaSettlementService] Fehler beim Laden der Abrechnungen:", err);
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Persistiert die VMA-Abrechnung inkl. Metadaten, 4-Säulen-Summen und PDF-Beleg.
     * Führt eine Duplikatsprüfung durch und aktualisiert bestehende Datensätze (Idempotenz).
     */
    async saveSettlement(params: SaveSettlementParams): Promise<VmaSettlementRecord> {
        const {
            id,
            userId,
            period,
            year,
            month,
            totals,
            details,
            status = 'entwurf',
            pdfBlob,
            fileName
        } = params;

        // Duplikatsprüfung: Gibt es bereits einen Eintrag für diesen Zeitraum & Mitarbeiter?
        let existingRecordId = id;
        if (!existingRecordId) {
            const existing = await this.checkExistingSettlement(userId, year, month);
            if (existing) {
                existingRecordId = existing.id;
            }
        }

        const formData = new FormData();
        formData.append('user', userId);
        formData.append('period', period);
        formData.append('year', String(year));
        formData.append('month', String(month));
        formData.append('total_km', String(totals.km || 0));
        formData.append('total_travel_costs', String(totals.travel || 0));
        formData.append('total_vma', String(totals.vma || 0));
        formData.append('total_accommodation', String(totals.accommodation || 0));
        formData.append('total_incidentals', String(totals.incidental || 0));
        formData.append('total_amount', String(totals.total || 0));
        formData.append('details', JSON.stringify(details));
        formData.append('status', status);

        if (pdfBlob) {
            const safeFileName = fileName || `Reisekosten_${period.replace(/\s+/g, '_')}.pdf`;
            const pdfFile = new File([pdfBlob], safeFileName, { type: 'application/pdf' });
            formData.append('pdf_file', pdfFile);
        }

        let savedRecord: VmaSettlementRecord;
        if (existingRecordId) {
            savedRecord = await pb.collection('vma_settlements').update<VmaSettlementRecord>(existingRecordId, formData);
        } else {
            savedRecord = await pb.collection('vma_settlements').create<VmaSettlementRecord>(formData);
        }

        // Cache im Service aktualisieren
        await this.loadSettlements(userId);
        return savedRecord;
    }

    /**
     * Aktualisiert den Status einer Abrechnung (z. B. 'entwurf' -> 'eingereicht' -> 'genehmigt' -> 'abgerechnet')
     */
    async updateStatus(id: string, status: 'entwurf' | 'eingereicht' | 'genehmigt' | 'abgerechnet'): Promise<VmaSettlementRecord> {
        const updated = await pb.collection('vma_settlements').update<VmaSettlementRecord>(id, { status });
        const idx = this.allSettlements.findIndex(s => s.id === id);
        if (idx !== -1) {
            this.allSettlements[idx] = updated;
        }
        return updated;
    }

    /**
     * Löscht eine Abrechnung aus PocketBase.
     */
    async deleteSettlement(id: string, userId?: string): Promise<boolean> {
        await pb.collection('vma_settlements').delete(id);
        this.allSettlements = this.allSettlements.filter(s => s.id !== id);
        if (userId) {
            await this.loadSettlements(userId);
        }
        return true;
    }

    /**
     * Liefert die direkte Download- bzw. Vorschau-URL für das PDF-Dokument in PocketBase.
     */
    getPdfUrl(record: VmaSettlementRecord): string | null {
        if (!record || !record.pdf_file) return null;
        return pb.files.getURL(record, record.pdf_file);
    }
}

export const vmaSettlementService = new VmaSettlementService();
