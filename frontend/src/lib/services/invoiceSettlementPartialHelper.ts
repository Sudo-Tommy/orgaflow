import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import type { InvoiceRecord } from '$lib/types/orgaTypes';
import { extractRelationArray } from './invoiceSettlementHelpers';

export interface AppCostUpdate {
    id: string;
    settled: boolean;
    original_amount: number;
    already_paid_amount: number;
    remaining_amount: number;
    parent_invoice: string;
}

export function computeSingleAppGross(app: any, wage: number, km: number, taxRate: number): number {
    let netto = 0;
    if (app.expand?.time_record) {
        for (const tr of app.expand.time_record) {
            if (tr.start && tr.end) {
                const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
                if (diffMs > 0) netto += (diffMs / 3600000) * wage;
            }
        }
    }
    if (app.expand?.drive_record) {
        for (const dr of app.expand.drive_record) {
            if (dr.lump_sum > 0) netto += Number(dr.lump_sum);
            if (dr.km > 0) netto += Number(dr.km) * km;
        }
    }
    if (app.expand?.expenditures) {
        for (const exp of app.expand.expenditures) {
            if (exp.sum > 0) netto += Number(exp.sum);
        }
    }
    return Math.round(netto * (1 + (taxRate / 100)) * 100) / 100;
}

export async function fetchInvoiceAppointments(invoice: InvoiceRecord): Promise<any[]> {
    const appIds = extractRelationArray(invoice.appointments, invoice.expand?.appointments);
    if (appIds.length === 0) return [];

    const localApps = orgaStore.appointments?.data || [];
    const found: any[] = [];
    const missingIds: string[] = [];

    for (const id of appIds) {
        const local = localApps.find((a: any) => a.id === id);
        if (local) found.push(local);
        else missingIds.push(id);
    }

    if (missingIds.length > 0) {
        try {
            const filterStr = missingIds.map(id => `id = "${id}"`).join(' || ');
            const fetched = await pb.collection('appointments').getFullList({
                filter: filterStr,
                expand: 'time_record,drive_record,expenditures,parent_invoice',
                requestKey: null
            });
            found.push(...fetched);
        } catch (e) {
            console.error('[fetchInvoiceAppointments] Fehler beim Nachladen von Terminen:', e);
        }
    }

    return found.sort((a, b) => new Date(a.appointment || 0).getTime() - new Date(b.appointment || 0).getTime());
}

export function computeFifoAllocation(apps: any[], totalGross: number, receivedAmount: number, invoice: InvoiceRecord): AppCostUpdate[] {
    if (apps.length === 0) return [];
    const wage = Number(invoice.hourly_wage) || 40;
    const km = Number(invoice.travel_expanses_rate) || 0.3;
    const tax = parseFloat(String(invoice.tax_rate || '0')) || 0;

    let costs = apps.map(app => {
        if (apps.length === 1) return totalGross;
        const c = computeSingleAppGross(app, wage, km, tax);
        return c > 0 ? c : Math.round((totalGross / apps.length) * 100) / 100;
    });

    const sumCosts = costs.reduce((acc, v) => acc + v, 0);
    if (sumCosts > 0 && Math.abs(sumCosts - totalGross) > 0.01) {
        const factor = totalGross / sumCosts;
        costs = costs.map(c => Math.round(c * factor * 100) / 100);
        const adjustedSum = costs.reduce((acc, v) => acc + v, 0);
        const diff = Math.round((totalGross - adjustedSum) * 100) / 100;
        costs[costs.length - 1] = Math.round((costs[costs.length - 1] + diff) * 100) / 100;
    }

    let remPay = Math.round(receivedAmount * 100) / 100;
    return apps.map((app, idx) => {
        const cost = costs[idx];
        if (remPay >= cost) {
            remPay = Math.max(0, Math.round((remPay - cost) * 100) / 100);
            return {
                id: app.id,
                settled: true,
                original_amount: cost,
                already_paid_amount: cost,
                remaining_amount: 0,
                parent_invoice: invoice.id
            };
        } else if (remPay > 0) {
            const covered = remPay;
            const rest = Math.round((cost - covered) * 100) / 100;
            remPay = 0;
            return {
                id: app.id,
                settled: false,
                original_amount: cost,
                already_paid_amount: covered,
                remaining_amount: rest,
                parent_invoice: invoice.id
            };
        }
        return {
            id: app.id,
            settled: false,
            original_amount: cost,
            already_paid_amount: 0,
            remaining_amount: cost,
            parent_invoice: invoice.id
        };
    });
}

export async function applyAppointmentUpdates(updates: AppCostUpdate[], invoice: InvoiceRecord): Promise<void> {
    for (const up of updates) {
        try {
            await pb.collection('appointments').update(up.id, {
                settled: up.settled,
                original_amount: up.original_amount,
                already_paid_amount: up.already_paid_amount,
                remaining_amount: up.remaining_amount,
                parent_invoice: up.parent_invoice
            });

            if (orgaStore.appointments) {
                const local = orgaStore.appointments.data.find((a: any) => a.id === up.id);
                if (local) {
                    local.settled = up.settled;
                    local.original_amount = up.original_amount;
                    local.already_paid_amount = up.already_paid_amount;
                    local.remaining_amount = up.remaining_amount;
                    local.parent_invoice = up.parent_invoice;
                    if (!local.expand) local.expand = {};
                    local.expand.parent_invoice = invoice;
                }
            }
        } catch (err) {
            console.error(`[applyAppointmentUpdates] Fehler bei Termin ${up.id}:`, err);
        }
    }
}
