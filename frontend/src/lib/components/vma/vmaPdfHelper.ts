import type { TravelReport, VmaTotals } from "./vmaTypes";
import { formatDuration } from "./vmaCalculationService";

export function buildPdfPayload(
    effectiveUser: any,
    period: string,
    userName: string,
    userAddress: string | null,
    companyData: any,
    travelReports: TravelReport[],
    totals: VmaTotals
) {
    return {
        userName,
        userAddress: userAddress || '',
        company: companyData,
        period,
        createdDate: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        reports: travelReports.map(r => ({
            date: r.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            weekday: r.date.toLocaleDateString('de-DE', { weekday: 'short' }),
            times: r.timesFormatted,
            timesFormatted: r.timesFormatted,
            departureTime: r.departureFormatted,
            arrivalTime: r.arrivalFormatted,
            purpose: r.purpose,
            destination: r.destination,
            origin: r.startPlace,
            route: r.routeFormatted,
            distanceKm: r.totalKm > 0 ? r.totalKm : null,
            absence: formatDuration(r.totalAbsenceHours),
            absenceFormatted: formatDuration(r.totalAbsenceHours),
            absenceHours: r.totalAbsenceHours,
            mileageCosts: r.mileageCosts,
            ticketCosts: r.ticketCosts,
            travelCosts: r.travelCosts,
            travelCostsFormatted: `${r.travelCosts.toFixed(2).replace('.', ',')} €`,
            travelDetails: r.totalKm > 0 
                ? `${r.totalKm.toFixed(1)} km PKW${r.ticketCosts > 0 ? ` + ${r.ticketCosts.toFixed(2).replace('.', ',')} € Ticket` : ''}` 
                : (r.ticketCosts > 0 ? `${r.ticketCosts.toFixed(2).replace('.', ',')} € Ticket` : ''),
            grossPerDiem: r.grossPerDiem,
            netPerDiem: r.netPerDiem,
            perDiem: `${r.netPerDiem.toFixed(2).replace('.', ',')} €`,
            vmaFormatted: `${r.netPerDiem.toFixed(2).replace('.', ',')} €`,
            deductionText: r.deductionText,
            deductions: r.deductionText,
            accommodation: r.accommodation,
            accommodationFormatted: `${r.accommodation.toFixed(2).replace('.', ',')} €`,
            incidentalCosts: r.incidentalCosts,
            incidentalFormatted: `${r.incidentalCosts.toFixed(2).replace('.', ',')} €`,
            incidentalNote: r.incidentalNote,
            dayTotal: r.dayTotal,
            total: `${r.dayTotal.toFixed(2).replace('.', ',')} €`,
            dayTotalFormatted: `${r.dayTotal.toFixed(2).replace('.', ',')} €`
        })),
        totals: {
            absenceHoursFormatted: formatDuration(totals.absence),
            totalKm: totals.km,
            totalMileageCosts: totals.mileage,
            totalTicketCosts: totals.ticket,
            totalTravelCosts: totals.travel,
            totalGrossVma: totals.grossVma,
            totalDeductions: totals.deductions,
            totalNetVma: totals.vma,
            totalAccommodation: totals.accommodation,
            totalIncidentals: totals.incidental,
            grandTotal: totals.total
        },
        totalSum: `${totals.total.toFixed(2).replace('.', ',')} €`,
        totalAbsenceSum: formatDuration(totals.absence),
        totalVMASum: totals.vma.toFixed(2).replace('.', ','),
        totalAccommodationSum: totals.accommodation.toFixed(2).replace('.', ',')
    };
}

export async function requestPdfBlob(payload: any, token: string, microserviceUrl: string): Promise<Blob | null> {
    try {
        const res = await fetch(`${microserviceUrl}/api/emails/vma/pdf`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            return await res.blob();
        }
    } catch (e) {
        console.warn("[VMA] PDF Generierungsfehler:", e);
    }
    return null;
}
