/**
 * omniDateParser.js
 * Echtzeit-Datums-, Zeitzonen- (Europe/Berlin) und Phonetik/Fuzzy-Parser für Omni Live-Tools.
 */

const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
const MONTH_NAMES = [
    'januar', 'februar', 'märz', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'dezember'
];

export function getBerlinNowInfo(now = new Date()) {
    const parts = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', weekday: 'long', hour12: false
    }).formatToParts(now);

    const map = {};
    for (const p of parts) map[p.type] = p.value;
    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);
    const isoDate = `${map.year}-${map.month}-${map.day}`;
    const berlinMidday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    return {
        weekday: map.weekday || WEEKDAYS_LONG[berlinMidday.getUTCDay()],
        dateStr: `${map.day}.${map.month}.${map.year}`,
        timeStr: `${map.hour}:${map.minute}`,
        isoDate,
        year,
        month,
        day,
        utcMidday: berlinMidday
    };
}

export function formatBerlinDateTime(pbDateStr) {
    if (!pbDateStr) return { weekdayShort: '', weekdayLong: '', dateStr: '', timeStr: '', isoDate: '' };
    const clean = String(pbDateStr).trim().replace(' ', 'T');
    const d = new Date(clean);
    if (isNaN(d.getTime())) return { weekdayShort: '', weekdayLong: '', dateStr: String(pbDateStr), timeStr: '', isoDate: '' };

    const parts = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', weekday: 'long', hour12: false
    }).formatToParts(d);
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    const isoDate = `${map.year}-${map.month}-${map.day}`;
    const wIdx = WEEKDAYS_LONG.findIndex(w => w.toLowerCase() === String(map.weekday || '').toLowerCase());

    return {
        weekdayLong: map.weekday || '',
        weekdayShort: wIdx >= 0 ? WEEKDAYS_SHORT[wIdx] : (map.weekday || '').slice(0, 2) + '.',
        dateStr: `${map.day}.${map.month}.${map.year}`,
        timeStr: `${map.hour}:${map.minute} Uhr`,
        isoDate
    };
}

function addDaysUtc(utcMidday, days) {
    const d = new Date(utcMidday.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

function toIsoDate(utcDate) {
    const y = utcDate.getUTCFullYear();
    const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(utcDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function toDeDate(utcDate) {
    const y = utcDate.getUTCFullYear();
    const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(utcDate.getUTCDate()).padStart(2, '0');
    return `${d}.${m}.${y}`;
}

function getMondayOfWeek(utcMidday) {
    const dow = utcMidday.getUTCDay(); // 0=Sun, 1=Mon...
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    return addDaysUtc(utcMidday, diffToMon);
}

export function resolveRequestedDateRange(text = '', now = new Date()) {
    const lower = String(text || '').toLowerCase();
    const berlin = getBerlinNowInfo(now);
    const today = berlin.utcMidday;

    // 1. Explizites Datum DD.MM.YYYY oder DD.MM.
    const explicitMatch = lower.match(/\b(\d{1,2})\.(\d{1,2})\.(?:(\d{2,4}))?/);
    if (explicitMatch) {
        const d = parseInt(explicitMatch[1], 10);
        const m = parseInt(explicitMatch[2], 10);
        let y = explicitMatch[3] ? parseInt(explicitMatch[3], 10) : berlin.year;
        if (y < 100) y += 2000;
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
            const target = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
            return { startIso: toIsoDate(target), endIso: toIsoDate(target), label: `am ${toDeDate(target)}` };
        }
    }

    // 2. Übermorgen / Morgen / Gestern / Heute
    if (lower.includes('übermorgen') || lower.includes('uebermorgen')) {
        const t = addDaysUtc(today, 2);
        return { startIso: toIsoDate(t), endIso: toIsoDate(t), label: `übermorgen (${toDeDate(t)})` };
    }
    if (/\bmorgen\b/.test(lower) && !lower.includes('guten morgen')) {
        const t = addDaysUtc(today, 1);
        return { startIso: toIsoDate(t), endIso: toIsoDate(t), label: `morgen (${toDeDate(t)})` };
    }
    if (/\bgestern\b/.test(lower)) {
        const t = addDaysUtc(today, -1);
        return { startIso: toIsoDate(t), endIso: toIsoDate(t), label: `gestern (${toDeDate(t)})` };
    }
    if (/\bheute\b/.test(lower) || lower.includes('heutigen')) {
        return { startIso: toIsoDate(today), endIso: toIsoDate(today), label: `heute (${toDeDate(today)})` };
    }

    // 3. Nächste Woche / Kommende Woche / Diese Woche / Letzte Woche
    if (lower.includes('nächste woche') || lower.includes('nächster woche') || lower.includes('naechste woche') || lower.includes('kommende woche') || lower.includes('kommender woche')) {
        const nextMon = addDaysUtc(getMondayOfWeek(today), 7);
        const nextSun = addDaysUtc(nextMon, 6);
        return { startIso: toIsoDate(nextMon), endIso: toIsoDate(nextSun), label: `nächste Woche (${toDeDate(nextMon)} – ${toDeDate(nextSun)})` };
    }
    if (lower.includes('diese woche') || lower.includes('dieser woche') || lower.includes('aktuelle woche') || lower.includes('laufende woche')) {
        const mon = getMondayOfWeek(today);
        const sun = addDaysUtc(mon, 6);
        return { startIso: toIsoDate(mon), endIso: toIsoDate(sun), label: `diese Woche (${toDeDate(mon)} – ${toDeDate(sun)})` };
    }
    if (lower.includes('letzte woche') || lower.includes('letzter woche') || lower.includes('vergangene woche') || lower.includes('vorige woche')) {
        const prevMon = addDaysUtc(getMondayOfWeek(today), -7);
        const prevSun = addDaysUtc(prevMon, 6);
        return { startIso: toIsoDate(prevMon), endIso: toIsoDate(prevSun), label: `letzte Woche (${toDeDate(prevMon)} – ${toDeDate(prevSun)})` };
    }

    // 4. Wochentage (Montag bis Sonntag)
    const weekdayMap = [
        { keys: ['montag'], dow: 1, name: 'Montag' },
        { keys: ['dienstag'], dow: 2, name: 'Dienstag' },
        { keys: ['mittwoch'], dow: 3, name: 'Mittwoch' },
        { keys: ['donnerstag'], dow: 4, name: 'Donnerstag' },
        { keys: ['freitag'], dow: 5, name: 'Freitag' },
        { keys: ['samstag', 'sonnabend'], dow: 6, name: 'Samstag' },
        { keys: ['sonntag'], dow: 0, name: 'Sonntag' }
    ];
    for (const wd of weekdayMap) {
        if (wd.keys.some(k => lower.includes(k))) {
            const curDow = today.getUTCDay();
            let diff = (wd.dow - curDow + 7) % 7;
            if (diff === 0 && (lower.includes('nächsten') || lower.includes('kommenden'))) diff = 7;
            const target = addDaysUtc(today, diff);
            return { startIso: toIsoDate(target), endIso: toIsoDate(target), label: `${wd.name} (${toDeDate(target)})` };
        }
    }

    // 5. Monatsabfragen (diesen Monat, nächsten Monat oder Monatsname)
    for (let mIdx = 0; mIdx < MONTH_NAMES.length; mIdx++) {
        if (lower.includes(MONTH_NAMES[mIdx])) {
            const first = new Date(Date.UTC(berlin.year, mIdx, 1, 12, 0, 0));
            const last = new Date(Date.UTC(berlin.year, mIdx + 1, 0, 12, 0, 0));
            const capMonth = MONTH_NAMES[mIdx].charAt(0).toUpperCase() + MONTH_NAMES[mIdx].slice(1);
            return { startIso: toIsoDate(first), endIso: toIsoDate(last), label: `${capMonth} ${berlin.year} (${toDeDate(first)} – ${toDeDate(last)})` };
        }
    }
    if (lower.includes('diesen monat') || lower.includes('diesem monat') || lower.includes('aktuellen monat')) {
        const first = new Date(Date.UTC(berlin.year, berlin.month - 1, 1, 12, 0, 0));
        const last = new Date(Date.UTC(berlin.year, berlin.month, 0, 12, 0, 0));
        return { startIso: toIsoDate(first), endIso: toIsoDate(last), label: `diesen Monat (${toDeDate(first)} – ${toDeDate(last)})` };
    }
    if (lower.includes('nächsten monat') || lower.includes('kommenden monat')) {
        const first = new Date(Date.UTC(berlin.year, berlin.month, 1, 12, 0, 0));
        const last = new Date(Date.UTC(berlin.year, berlin.month + 1, 0, 12, 0, 0));
        return { startIso: toIsoDate(first), endIso: toIsoDate(last), label: `nächsten Monat (${toDeDate(first)} – ${toDeDate(last)})` };
    }

    // Standard: Heute bis in 14 Tagen
    const end14 = addDaysUtc(today, 14);
    return { startIso: toIsoDate(today), endIso: toIsoDate(end14), label: `die kommenden 14 Tage (${toDeDate(today)} – ${toDeDate(end14)})` };
}

export function normalizePhonetic(str = '') {
    return String(str || '')
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\b(frau|herr|herrn|dr|med|prof|familie|klient|klientin|von|bei|für|fuer|und|der|die|das|wie|ist|hat|noch)\b/g, ' ')
        .replace(/(bayer|beyer|baier|bayr)/g, 'baier')
        .replace(/(meyer|maier|mayer|meier)/g, 'maier')
        .replace(/(schmidt|schmitt|schmid|schmied)/g, 'schmidt')
        .replace(/ph/g, 'f').replace(/th/g, 't').replace(/dt/g, 't')
        .replace(/(ai|ey|ay)/g, 'ei')
        .replace(/\s+/g, ' ')
        .trim();
}

export function fuzzyMatchRecordName(fullName = '', userQuery = '') {
    const normTarget = normalizePhonetic(fullName);
    const rawTarget = String(fullName || '').toLowerCase();
    const rawQuery = String(userQuery || '').toLowerCase();
    if (!normTarget) return 0;

    const targetParts = normTarget.split(' ').filter(p => p.length >= 2);
    const rawParts = rawTarget.split(/\s+/).filter(p => p.length >= 2);
    const queryTokens = normalizePhonetic(userQuery).split(' ').filter(p => p.length >= 2);

    let score = 0;
    for (const part of rawParts) {
        if (part.length >= 3 && rawQuery.includes(part)) score += 3;
    }
    for (const tPart of targetParts) {
        if (queryTokens.includes(tPart)) score += 4;
        else if (tPart.length >= 4 && queryTokens.some(q => q.length >= 3 && (tPart.includes(q) || q.includes(tPart)))) score += 2;
    }
    return score;
}

