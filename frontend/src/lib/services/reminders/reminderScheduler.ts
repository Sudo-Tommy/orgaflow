import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { goto } from '$app/navigation';
import { pb } from '$lib/services/pocketbase';
import {
    buildReminderNotifications,
    DEFAULT_REMINDER_PREFS,
    normalizeOffsets,
    type ReminderPrefs
} from './reminderRules';
import type { AppointmentRecord, ClientRecord } from '$lib/types/pocketbase';

const PREFS_KEY = 'orga_reminder_prefs_v1';
const CHANNEL_ID = 'orgaflow_reminders';

class ReminderScheduler {
    private listenerAttached = false;
    private channelCreated = false;
    private rescheduleTimer: any = null;

    async initListeners(): Promise<void> {
        if (!Capacitor.isNativePlatform() || this.listenerAttached) return;
        this.listenerAttached = true;

        try {
            await this.ensureChannel();
            await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
                const route = event?.notification?.extra?.route;
                if (typeof route === 'string' && route.startsWith('/')) {
                    goto(route);
                }
            });
        } catch (e) {
            console.warn('Erinnerungs-Listener konnte nicht gestartet werden:', e);
        }
    }

    private async ensureChannel(): Promise<void> {
        if (!Capacitor.isNativePlatform() || this.channelCreated) return;
        this.channelCreated = true;
        try {
            await LocalNotifications.createChannel({
                id: CHANNEL_ID,
                name: 'Termin-Erinnerungen',
                description: 'Hinweise vor anstehenden Klientenbesuchen und Tagesübersicht',
                importance: 4,
                visibility: 1,
                vibration: true
            });
        } catch {
            // Kanal existiert ggf. schon oder Plattform unterstützt keine Channels
        }
    }

    async requestPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const current = await LocalNotifications.checkPermissions();
            if (current.display === 'granted') return true;
            const requested = await LocalNotifications.requestPermissions();
            return requested.display === 'granted';
        } catch {
            return false;
        }
    }

    async loadPrefs(): Promise<ReminderPrefs> {
        const record: any = pb.authStore.record || pb.authStore.model;
        if (record && (record.notify_offsets !== undefined || record.notify_daily_time !== undefined)) {
            const fromUser: ReminderPrefs = {
                offsets: normalizeOffsets(record.notify_offsets),
                dailyTime: typeof record.notify_daily_time === 'string' ? record.notify_daily_time : DEFAULT_REMINDER_PREFS.dailyTime,
                afterEnd: typeof record.notify_after_end === 'boolean' ? record.notify_after_end : DEFAULT_REMINDER_PREFS.afterEnd,
                absences: typeof record.notify_absences === 'boolean' ? record.notify_absences : DEFAULT_REMINDER_PREFS.absences
            };
            await Preferences.set({ key: PREFS_KEY, value: JSON.stringify(fromUser) }).catch(() => {});
            return fromUser;
        }
        try {
            const { value } = await Preferences.get({ key: PREFS_KEY });
            if (value) {
                const parsed = JSON.parse(value);
                return {
                    offsets: normalizeOffsets(parsed.offsets),
                    dailyTime: typeof parsed.dailyTime === 'string' ? parsed.dailyTime : DEFAULT_REMINDER_PREFS.dailyTime,
                    afterEnd: parsed.afterEnd ?? DEFAULT_REMINDER_PREFS.afterEnd,
                    absences: parsed.absences ?? DEFAULT_REMINDER_PREFS.absences
                };
            }
        } catch {}
        return { ...DEFAULT_REMINDER_PREFS };
    }

    async savePrefs(prefs: ReminderPrefs): Promise<void> {
        const normalized: ReminderPrefs = {
            offsets: normalizeOffsets(prefs.offsets),
            dailyTime: prefs.dailyTime || '',
            afterEnd: Boolean(prefs.afterEnd),
            absences: Boolean(prefs.absences)
        };
        await Preferences.set({ key: PREFS_KEY, value: JSON.stringify(normalized) });

        const record: any = pb.authStore.record || pb.authStore.model;
        if (record?.id && !pb.authStore.isSuperuser) {
            try {
                const updated = await pb.collection('users').update(record.id, {
                    notify_offsets: normalized.offsets,
                    notify_daily_time: normalized.dailyTime,
                    notify_after_end: normalized.afterEnd,
                    notify_absences: normalized.absences
                });
                pb.authStore.save(pb.authStore.token, updated);
            } catch (e) {
                console.warn('Erinnerungs-Einstellungen lokal gespeichert, Server-Abgleich folgt:', e);
            }
        }
    }

    scheduleReschedule(appointments: AppointmentRecord[], clients: ClientRecord[]): void {
        clearTimeout(this.rescheduleTimer);
        this.rescheduleTimer = setTimeout(() => {
            this.rescheduleAll(appointments, clients);
        }, 600);
    }

    async rescheduleAll(appointments: AppointmentRecord[], clients: ClientRecord[]): Promise<number> {
        if (!Capacitor.isNativePlatform()) return 0;
        await this.initListeners();

        try {
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') return 0;

            const prefs = await this.loadPrefs();
            const userId = (pb.authStore.record || pb.authStore.model)?.id;
            const planned = buildReminderNotifications({ appointments, clients, userId, prefs });

            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel({
                    notifications: pending.notifications.map((n) => ({ id: n.id }))
                });
            }

            if (planned.length === 0) return 0;

            await LocalNotifications.schedule({
                notifications: planned.map((item) => ({
                    id: item.id,
                    title: item.title,
                    body: item.body,
                    channelId: CHANNEL_ID,
                    schedule: { at: item.at, allowWhileIdle: true },
                    extra: item.extra
                }))
            });
            return planned.length;
        } catch (e) {
            console.warn('Erinnerungen konnten nicht geplant werden:', e);
            return 0;
        }
    }

    async sendTestNotification(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        const granted = await this.requestPermissions();
        if (!granted) return false;
        await this.ensureChannel();
        await LocalNotifications.schedule({
            notifications: [{
                id: 999999,
                title: 'Test-Erinnerung von Seniorenassistenz',
                body: 'Termin-Erinnerungen funktionieren auf diesem Gerät zuverlässig.',
                channelId: CHANNEL_ID,
                schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
                extra: { route: '/calendar' }
            }]
        });
        return true;
    }
}

export const reminderScheduler = new ReminderScheduler();
