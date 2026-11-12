import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { pb } from '$lib/services/pocketbase';
import type { AppointmentRecord, ClientRecord } from '$lib/types/pocketbase';

export interface WidgetAppointmentItem {
    id: string;
    time: string;
    client: string;
}

interface WidgetBridgePlugin {
    refreshWidget(): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

export function buildTodayWidgetAppointments(
    appointments: AppointmentRecord[],
    clients: ClientRecord[],
    userId?: string,
    now: Date = new Date()
): WidgetAppointmentItem[] {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return appointments
        .filter((app) => {
            if (!app.appointment || app.status === 'abgesagt' || app.description?.includes('[BLOCK]')) return false;
            if (userId && (app.user || app.assigned_to) && app.user !== userId && app.assigned_to !== userId) return false;
            const ts = new Date(app.appointment).getTime();
            return ts >= startOfDay && ts <= endOfDay;
        })
        .sort((a, b) => new Date(a.appointment!).getTime() - new Date(b.appointment!).getTime())
        .slice(0, 4)
        .map((app) => {
            const firstId = Array.isArray(app.client) ? app.client[0] : app.client;
            const expClient = (app.expand as any)?.client;
            const cObj = Array.isArray(expClient) ? expClient[0] : expClient || (firstId ? clientMap.get(firstId) : null);
            const name = cObj ? `${cObj.name_first || ''} ${cObj.name_last || ''}`.trim() : '';
            const time = new Date(app.appointment!).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            return {
                id: app.id,
                time,
                client: name || app.description || 'Termin'
            };
        });
}

export async function syncTodayWidget(appointments: AppointmentRecord[], clients: ClientRecord[]): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
        const userId = (pb.authStore.record || pb.authStore.model)?.id;
        const items = buildTodayWidgetAppointments(appointments, clients, userId);
        await Preferences.set({ key: 'widget_today', value: JSON.stringify(items) });
        await WidgetBridge.refreshWidget();
    } catch {
        // Unkritisch
    }
}
