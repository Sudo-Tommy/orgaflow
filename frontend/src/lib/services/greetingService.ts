/**
 * greetingService.ts
 * Humorvolle und zeitgesteuerte Begrüßungslogik für das Dashboard.
 */

export interface GreetingInfo {
    greeting: string;
    subGreeting: string;
    emoji: string;
}

export function getDashboardGreeting(): GreetingInfo {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const month = now.getMonth() + 1;
    const date = now.getDate();

    // 1. Feier- & Aktionstage
    if (month === 12 && date >= 24 && date <= 26) {
        return {
            greeting: 'Fröhliche Weihnachten',
            emoji: '🎄',
            subGreeting: 'Weihnachten: Das Fest der Liebe und der überfüllten Postfächer.'
        };
    }
    if (month === 12 && date === 31) {
        return {
            greeting: 'Guten Rutsch',
            emoji: '🥂',
            subGreeting: 'Lass die Korken knallen – aber bitte nicht die Server!'
        };
    }
    if (month === 1 && date === 1) {
        return {
            greeting: 'Frohes Neues Jahr',
            emoji: '🍀',
            subGreeting: 'Neues Jahr, neue Klienten-Dramen. Auf geht\'s!'
        };
    }

    // 2. Wochentags-Humor
    if (day === 1 && hour < 12) {
        return {
            greeting: 'Guten Morgen',
            emoji: '☕',
            subGreeting: 'Montag: Der Tag, an dem der Kaffee immer am schwächsten zu sein scheint.'
        };
    }
    if (day === 5 && hour >= 13) {
        return {
            greeting: 'Hoch die Hände',
            emoji: '🎉',
            subGreeting: 'Freitag! Das Wochenende blinzelt dir schon verführerisch zu.'
        };
    }
    if (day === 0) {
        return {
            greeting: 'Schönen Sonntag',
            emoji: '🛋️',
            subGreeting: 'Sonntag: Couch einmümmeln, Heißgetränk genießen und die Arbeitswelt einfach mal pausieren.'
        };
    }
    if (day === 6) {
        return {
            greeting: 'Schönes Wochenende',
            emoji: '☕',
            subGreeting: 'Samstag! Erstmal gemütlich durchatmen und den Feierabendmodus voll auskosten.'
        };
    }

    // 3. Tageszeiten nach den 4 Kernzeitfenstern
    if (hour >= 4 && hour < 12) {
        return {
            greeting: 'Guten Morgen',
            emoji: '☕',
            subGreeting: 'Morgenstund hat Gold im Mund – und Kaffee im Becher!'
        };
    }
    if (hour >= 12 && hour < 16) {
        return {
            greeting: 'Mahlzeit',
            emoji: '🍽️',
            subGreeting: 'Zeit für eine Stärkung, damit das Gehirn wieder anspringt.'
        };
    }
    if (hour >= 16 && hour < 20) {
        return {
            greeting: 'Guten Nachmittag',
            emoji: '🚀',
            subGreeting: 'Endspurt! Der Feierabend ist theoretisch bereits in Sichtweite.'
        };
    }
    return {
        greeting: 'Gute Nacht',
        emoji: '🦉',
        subGreeting: 'Schlaf wird sowieso überbewertet – aber gönn dir eine Pause!'
    };
}

export function getSpecialDayName(now: Date = new Date()): string | null {
    const month = now.getMonth() + 1;
    const date = now.getDate();
    if (month === 12 && date >= 24 && date <= 26) return 'Weihnachten';
    if (month === 12 && date === 31) return 'Silvester';
    if (month === 1 && date === 1) return 'Neujahr';
    if (month === 10 && date === 31) return 'Halloween';
    if (month === 2 && date === 14) return 'Valentinstag';
    if (month === 4 && date === 1) return '1. April';
    if (month === 5 && date === 4) return 'May the 4th (Star Wars Day)';
    return null;
}
