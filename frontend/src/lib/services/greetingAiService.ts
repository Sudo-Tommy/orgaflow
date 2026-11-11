/**
 * greetingAiService.ts
 * Intelligente, KI-gestützte Begrüßung mit PocketBase-Caching und zeitgesteuerten 4 Zeitfenstern:
 * - Morgen: 04:00 - 11:59 Uhr
 * - Mittag: 12:00 - 15:59 Uhr
 * - Nachmittag: 16:00 - 19:59 Uhr
 * - Spätschicht / Nacht: ab 20:00 Uhr
 */

import { pb } from '$lib/services/pocketbase';
import { getDashboardGreeting, type GreetingInfo } from '$lib/services/greetingService';

export type TimeSlot = 'morning' | 'lunch' | 'afternoon' | 'night';

export interface GreetingContext {
    weekday?: string;
    weather?: string;
    todaysAppointmentsCount?: number;
    birthdaysTodayCount?: number;
    isSpecialDay?: string;
    hasBlockedDayToday?: boolean;
}

const memoryCache = new Map<string, GreetingInfo>();
const pendingRequests = new Map<string, Promise<GreetingInfo>>();

function sanitizeGreetingText(greeting = '', name = '') {
    if (!greeting) return 'Hallo';
    let clean = greeting.trim();
    if (name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        clean = clean.replace(new RegExp(`[,\\s!]+${escaped}[,!\\s]*$`, 'gi'), '').trim();
        clean = clean.replace(new RegExp(`^${escaped}[,!\\s]+`, 'gi'), '').trim();
    }
    return clean.replace(/[,!.\s]+$/, '').trim() || 'Hallo';
}

export function getTimeSlot(now: Date = new Date()): TimeSlot {
    const hour = now.getHours();
    if (hour >= 4 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 20) return 'afternoon';
    return 'night';
}

export function getDateKey(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function getSlotKey(userId: string = 'anon', now: Date = new Date()): string {
    const slot = getTimeSlot(now);
    const date = getDateKey(now);
    const safeUser = userId ? userId.trim() : 'anon';
    return `${safeUser}_${date}_${slot}`;
}

export async function loadAiGreeting(
    userName: string = 'Tommy',
    userId: string = '',
    context: GreetingContext = {},
    forceRefresh = false
): Promise<GreetingInfo> {
    const now = new Date();
    const timeSlot = getTimeSlot(now);
    const dateKey = getDateKey(now);
    const slotKey = getSlotKey(userId, now);

    // 1. Memory-Cache
    if (!forceRefresh && memoryCache.has(slotKey)) {
        return memoryCache.get(slotKey)!;
    }

    // 2. Gleichzeitige Anfragen bündeln (Debounce / In-Flight Request)
    if (pendingRequests.has(slotKey)) {
        return pendingRequests.get(slotKey)!;
    }

    const fetchPromise = (async (): Promise<GreetingInfo> => {
        try {
            // A: Zuerst in PocketBase nachsehen (Idempotenz: 1x pro User & Situation)
            if (!forceRefresh) {
                try {
                    const existing = await pb.collection('ai_greetings').getFirstListItem(`slot_key = "${slotKey}"`, { requestKey: null });
                    if (existing && existing.greeting && existing.sub_greeting) {
                        const result: GreetingInfo = {
                            greeting: sanitizeGreetingText(existing.greeting, userName),
                            subGreeting: existing.sub_greeting,
                            emoji: existing.emoji || '☕'
                        };
                        memoryCache.set(slotKey, result);
                        return result;
                    }
                } catch {
                    // Nicht in DB, weiter zur KI-Generierung
                }
            }

            // B: KI-Generierung anfordern (mit Nginx / Microservice Route Fallback)
            const endpoints: string[] = [];
            if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                endpoints.push('http://localhost:3000/api/emails/ai/greeting');
            }
            endpoints.push('/api/emails/ai/greeting');
            endpoints.push('/api/ai/greeting');

            let response: Response | null = null;
            for (const ep of endpoints) {
                try {
                    const res = await fetch(ep, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userName,
                            userId,
                            timeSlot,
                            date: dateKey,
                            slotKey,
                            forceRefresh,
                            context
                        })
                    });
                    if (res.ok) {
                        response = res;
                        break;
                    }
                } catch {
                    // Weiterer Endpunkt
                }
            }

            if (response && response.ok) {
                const data = await response.json();
                if (data.success && data.greeting) {
                    const result: GreetingInfo = {
                        greeting: sanitizeGreetingText(data.greeting.greeting, userName),
                        subGreeting: data.greeting.subGreeting,
                        emoji: data.greeting.emoji || '☕'
                    };
                    memoryCache.set(slotKey, result);
                    return result;
                }
            }
        } catch (err) {
            console.warn('[Greeting AI] Fallback zu statischer Begrüßung:', err);
        }

        // C: Failsafe Fallback auf bestehende Sprüche
        const fallback = getDashboardGreeting();
        return fallback;
    })();

    pendingRequests.set(slotKey, fetchPromise);

    try {
        const finalGreeting = await fetchPromise;
        return finalGreeting;
    } finally {
        pendingRequests.delete(slotKey);
    }
}
