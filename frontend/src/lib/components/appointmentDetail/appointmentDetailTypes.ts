export type TabType = 'overview' | 'time_tasks' | 'report' | 'travel' | 'billing' | 'client' | 'time' | 'tasks' | 'expenditures' | 'map' | 'all';

export type BillingType = 'EL' | 'VHP' | 'Kombi' | '45a' | 'Privat' | '';

export type RouteTargetMode = 'destination' | 'client' | 'client_to_destination';
export type PcStartPointMode = 'user' | 'client';

export interface RouteMetrics {
    distance: number | null;
    duration: number | null;
    isCalculating: boolean;
}

export interface ActiveStartPoint {
    mode: 'device' | 'client' | 'user';
    icon: string;
    badge: string;
    title: string;
    address: string;
    queryOrigin: string;
}
