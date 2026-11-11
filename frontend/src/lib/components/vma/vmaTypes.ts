export interface TravelMealState {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
}

export interface TravelReport {
    key: string;
    date: Date;
    departure: Date | null;
    arrival: Date | null;
    departureFormatted: string;
    arrivalFormatted: string;
    timesFormatted: string;
    destination: string;
    destinationAddress: string;
    originAddress: string | null;
    startPlace: string;
    routeFormatted: string;
    purpose: string;
    totalKm: number;
    isGoogleEstimatedKm: boolean;
    mileageCosts: number;
    ticketCosts: number;
    travelCosts: number;
    grossPerDiem: number;
    meals: TravelMealState;
    totalDeduction: number;
    deductionText: string;
    netPerDiem: number;
    accommodation: number;
    incidentalCosts: number;
    incidentalNote: string;
    totalAbsenceHours: number;
    dayTotal: number;
    outwardMinutes: number;
    returnMinutes: number;
    hasTimeWarning?: boolean;
    timeWarningText?: string;
}

export interface VmaTotals {
    absence: number;
    km: number;
    mileage: number;
    ticket: number;
    travel: number;
    grossVma: number;
    deductions: number;
    vma: number;
    accommodation: number;
    incidental: number;
    total: number;
}
