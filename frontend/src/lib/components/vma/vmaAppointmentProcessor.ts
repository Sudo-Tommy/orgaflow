import type { TravelReport, TravelMealState } from "./vmaTypes";
import { 
    PER_DIEM_RATES, MEAL_DEDUCTIONS, KM_RATE, ACCOMMODATION_LUMP_SUM, 
    TICKET_KEYWORDS, HOTEL_KEYWORDS, formatTime 
} from "./vmaCalculationService";
import { groupAppointmentsIntoTrips } from "./vmaTripGrouper";

export interface ProcessAppointmentsParams {
    appointments: any[];
    effectiveUser: any;
    userAddress: string | null;
    companyAddress?: string | null;
    mealDeductions: Record<string, TravelMealState>;
    estimateTravelFn: (origin: string, dest: string) => Promise<{ duration: number; distance: number; provider: string }>;
}

export function resolveAppointmentAddress(app: any): string {
    const directLoc = (app?.location_address || '').trim();
    if (directLoc && directLoc.length > 3) return directLoc;
    const client = Array.isArray(app?.expand?.client) ? app.expand.client[0] : app?.expand?.client;
    if (client) {
        const line1 = `${client.street || ''} ${client.housenr || ''}`.trim();
        const line2 = `${client.zip || ''} ${client.city || ''}`.trim();
        const full = [line1, line2].filter(Boolean).join(', ');
        if (full.length > 3) return full;
    }
    return '';
}

export async function processAppointmentsToReports(params: ProcessAppointmentsParams): Promise<TravelReport[]> {
    const { appointments, effectiveUser, userAddress, companyAddress, mealDeductions, estimateTravelFn } = params;
    const originCalcAddr = (companyAddress && companyAddress.length > 5) ? companyAddress : userAddress;
    const trips = groupAppointmentsIntoTrips(appointments);
    if (trips.length === 0) return [];

    const processedReports: TravelReport[] = [];

    for (const trip of trips) {
        const firstApp = trip[0];
        const lastApp = trip[trip.length - 1];

        let departureTime = new Date(firstApp.appointment);
        if (firstApp.expand?.time_record?.length > 0) {
            const earliestRec = firstApp.expand.time_record.reduce((min: any, curr: any) =>
                (curr.start && new Date(curr.start).getTime() < new Date(min.start || Infinity).getTime()) ? curr : min
            );
            if (earliestRec.start && !isNaN(new Date(earliestRec.start).getTime())) {
                const recStart = new Date(earliestRec.start);
                if (recStart.getTime() < departureTime.getTime()) departureTime = recStart;
            }
        }

        const departureCalcAddr = resolveAppointmentAddress(firstApp);
        const tripHasManualKm = trip.some(a => (a.expand?.drive_record || []).some((dr: any) => (dr.km || 0) > 0));
        let outwardKm = 0;
        let outwardMinutes = 0;
        if (originCalcAddr && departureCalcAddr && !tripHasManualKm) {
            const outward = await estimateTravelFn(originCalcAddr, departureCalcAddr);
            outwardKm = outward.distance;
            outwardMinutes = outward.duration;
            const travelMins = Math.ceil(outward.duration / 15) * 15;
            departureTime = new Date(departureTime.getTime() - travelMins * 60 * 1000);
        }

        let lastAppEndTime = new Date(lastApp.appointment);
        if (lastApp.expand?.time_record?.length > 0) {
            const latest = lastApp.expand.time_record.reduce((max: any, curr: any) =>
                (curr.end && new Date(curr.end).getTime() > new Date(max.end || 0).getTime()) ? curr : max
            );
            if (latest.end) lastAppEndTime = new Date(latest.end);
        } else {
            lastAppEndTime.setHours(lastAppEndTime.getHours() + 1);
        }

        let arrivalTime = lastAppEndTime;
        const arrivalCalcAddr = resolveAppointmentAddress(lastApp);
        let returnKm = 0;
        let returnMinutes = 0;
        if (originCalcAddr && arrivalCalcAddr && !tripHasManualKm) {
            const returnTrip = await estimateTravelFn(arrivalCalcAddr, originCalcAddr);
            returnKm = returnTrip.distance;
            returnMinutes = returnTrip.duration;
            const travelMins = Math.ceil(returnTrip.duration / 15) * 15;
            arrivalTime = new Date(arrivalTime.getTime() + travelMins * 60 * 1000);
        }

        let hasTimeWarning = false;
        let timeWarningText = '';
        if (arrivalTime.getTime() <= departureTime.getTime()) {
            hasTimeWarning = true;
            timeWarningText = 'Zeiten prüfen: Rückkehr vor Abreise';
            const fallbackMs = Math.max(3600000, (outwardMinutes + returnMinutes + 60) * 60000);
            arrivalTime = new Date(departureTime.getTime() + fallbackMs);
        }

        const isMultiDay = arrivalTime.toLocaleDateString('en-CA') !== departureTime.toLocaleDateString('en-CA');
        const startDayTs = new Date(departureTime).setHours(0,0,0,0);
        const endDayTs = new Date(arrivalTime).setHours(0,0,0,0);
        const tripDaysCount = Math.max(1, Math.round((endDayTs - startDayTs) / (1000 * 60 * 60 * 24)) + 1);

        for (let i = 0; i < tripDaysCount; i++) {
            const currentDay = new Date(departureTime);
            currentDay.setDate(currentDay.getDate() + i);
            const currentDayStr = currentDay.toLocaleDateString('en-CA');
            const reportKey = `${currentDayStr}_${effectiveUser.id}`;

            let dayAbsenceHours = 0;
            if (!isMultiDay) {
                dayAbsenceHours = Math.max(0, (arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60));
            } else {
                if (i === 0) {
                    const endOfDay = new Date(currentDay); endOfDay.setHours(23, 59, 59, 999);
                    dayAbsenceHours = Math.max(0, (endOfDay.getTime() - departureTime.getTime()) / (1000 * 60 * 60));
                } else if (i === tripDaysCount - 1) {
                    const startOfDay = new Date(currentDay); startOfDay.setHours(0, 0, 0, 0);
                    dayAbsenceHours = Math.max(0, (arrivalTime.getTime() - startOfDay.getTime()) / (1000 * 60 * 60));
                } else {
                    dayAbsenceHours = 24;
                }
            }

            let grossPerDiem = 0;
            if (!isMultiDay) {
                if (dayAbsenceHours > 8) grossPerDiem = PER_DIEM_RATES.SINGLE_DAY_OVER_8H;
            } else {
                grossPerDiem = (i === 0 || i === tripDaysCount - 1) ? PER_DIEM_RATES.MULTI_DAY_BOUND : PER_DIEM_RATES.FULL_DAY;
            }

            const meals = mealDeductions[reportKey] || { breakfast: false, lunch: false, dinner: false };
            let totalDeduction = 0;
            const parts: string[] = [];
            if (meals.breakfast) { totalDeduction += MEAL_DEDUCTIONS.BREAKFAST; parts.push('F -5,60 €'); }
            if (meals.lunch) { totalDeduction += MEAL_DEDUCTIONS.LUNCH; parts.push('M -11,20 €'); }
            if (meals.dinner) { totalDeduction += MEAL_DEDUCTIONS.DINNER; parts.push('A -11,20 €'); }
            totalDeduction = Math.round(totalDeduction * 100) / 100;
            const netPerDiem = grossPerDiem > 0 ? Math.round(Math.max(0, grossPerDiem - totalDeduction) * 100) / 100 : 0;
            const deductionText = parts.length > 0 ? `-${totalDeduction.toFixed(2).replace('.', ',')} € (${parts.map(p => p[0]).join(', ')})` : '';

            const dayApps = trip.filter(a => new Date(a.appointment).toLocaleDateString('en-CA') === currentDayStr);
            const manualKm = dayApps.flatMap(a => a.expand?.drive_record || []).reduce((sum, dr) => sum + (dr.km || 0), 0);
            let totalKm = manualKm;
            let isGoogleEstimatedKm = false;
            if (totalKm === 0 && (outwardKm > 0 || returnKm > 0)) {
                totalKm = Math.round((outwardKm + returnKm) * 10) / 10;
                isGoogleEstimatedKm = true;
            }
            const mileageCosts = Math.round(totalKm * KM_RATE * 100) / 100;

            const dayExpenditures = dayApps.flatMap(a => a.expand?.expenditures || []);
            const ticketCosts = Math.round(dayExpenditures
                .filter(e => TICKET_KEYWORDS.some(k => (e.titel || '').toLowerCase().includes(k)))
                .reduce((sum, exp) => sum + (exp.sum || 0), 0) * 100) / 100;
            const travelCosts = Math.round((mileageCosts + ticketCosts) * 100) / 100;

            const hotelCosts = Math.round(dayExpenditures
                .filter(e => HOTEL_KEYWORDS.some(k => (e.titel || '').toLowerCase().includes(k)))
                .reduce((sum, exp) => sum + (exp.sum || 0), 0) * 100) / 100;
            let accommodation = hotelCosts;
            if (accommodation === 0 && isMultiDay && i < tripDaysCount - 1) {
                accommodation = ACCOMMODATION_LUMP_SUM;
            }

            const incidentalCosts = Math.round(dayExpenditures
                .filter(e => {
                    const t = (e.titel || '').toLowerCase();
                    return !TICKET_KEYWORDS.some(k => t.includes(k)) && !HOTEL_KEYWORDS.some(k => t.includes(k)) && !t.includes('privat');
                })
                .reduce((sum, exp) => sum + (exp.sum || 0), 0) * 100) / 100;

            const incidentalNotes = dayExpenditures
                .filter(e => {
                    const t = (e.titel || '').toLowerCase();
                    return !TICKET_KEYWORDS.some(k => t.includes(k)) && !HOTEL_KEYWORDS.some(k => t.includes(k));
                })
                .map(e => e.titel).filter(Boolean).join(', ');

            const dayTotal = Math.round((travelCosts + netPerDiem + accommodation + incidentalCosts) * 100) / 100;

            let purpose = '';
            const clientNames = dayApps.flatMap(a => a.expand?.client || []).map(c => `${c.name_first} ${c.name_last}`).filter((v, idx, arr) => v && arr.indexOf(v) === idx);
            if (clientNames.length > 0) {
                purpose = `Kundenbesuch / Seniorenassistenz: ${clientNames.join(', ')}`;
            } else {
                const titles = dayApps.map(a => a.title || a.description).filter(Boolean);
                purpose = titles[0] || (isMultiDay ? trip[0].description || 'Auswärtige Betreuung' : 'Dienstgang / Betrieblicher Anlass');
            }

            const destinationsList = dayApps.map(a => resolveAppointmentAddress(a)).filter(Boolean);
            const targetAddress = destinationsList[0] || departureCalcAddr || '';
            const startCity = originCalcAddr ? originCalcAddr.split(',').pop()?.trim() || 'Betriebssitz' : 'Betriebssitz';
            let destCity = targetAddress ? targetAddress.split(',').pop()?.trim() || 'Einsatzort' : 'Einsatzort';
            if (destCity === 'Einsatzort' && dayApps[0]?.expand?.client) {
                const cl = Array.isArray(dayApps[0].expand.client) ? dayApps[0].expand.client[0] : dayApps[0].expand.client;
                if (cl?.city) destCity = `${cl.zip || ''} ${cl.city}`.trim();
            }
            const routeFormatted = `${startCity} → ${destCity} → ${startCity}`;

            const depTime = (i === 0) ? departureTime : null;
            const arrTime = (i === tripDaysCount - 1) ? arrivalTime : null;
            const departureFormatted = formatTime(depTime);
            const arrivalFormatted = formatTime(arrTime);
            const timesFormatted = depTime && arrTime 
                ? `${departureFormatted} - ${arrivalFormatted}` 
                : (depTime ? `ab ${departureFormatted}` : (arrTime ? `bis ${arrivalFormatted}` : 'Ganztägig (24h)'));

            processedReports.push({
                key: reportKey, date: currentDay, departure: depTime, arrival: arrTime,
                departureFormatted, arrivalFormatted, timesFormatted,
                destination: destCity, destinationAddress: targetAddress,
                originAddress: originCalcAddr, startPlace: startCity, routeFormatted,
                purpose, totalKm, isGoogleEstimatedKm, mileageCosts, ticketCosts,
                travelCosts, grossPerDiem, meals, totalDeduction, deductionText,
                netPerDiem, accommodation, incidentalCosts, incidentalNote: incidentalNotes,
                totalAbsenceHours: dayAbsenceHours, dayTotal, outwardMinutes, returnMinutes,
                hasTimeWarning, timeWarningText
            });
        }
    }
    return processedReports.sort((a, b) => a.date.getTime() - b.date.getTime());
}
