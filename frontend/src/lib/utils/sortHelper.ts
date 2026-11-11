/**
 * sortHelper.ts
 * Zentraler Sortier-Dienst für ausnahmslos alle Dropdowns, Auswahllisten und Tabellen.
 * Garantiert strikt alphabetische Ordnung mit deutscher Sprachsensitivität (ä, ö, ü, ß).
 */

const DE_COLLATOR = new Intl.Collator('de', {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true
});

/**
 * Sortiert ein beliebiges Array alphabetisch nach einem extrahierten Textschlüssel.
 */
export function sortAlphabetical<T>(
    items: readonly T[] | null | undefined,
    getText: (item: T) => string | null | undefined
): T[] {
    if (!items || !items.length) return [];
    return [...items].sort((a, b) => {
        const textA = (getText(a) ?? '').trim();
        const textB = (getText(b) ?? '').trim();
        return DE_COLLATOR.compare(textA, textB);
    });
}

/**
 * Sortiert ein einfaches String-Array alphabetisch.
 */
export function sortStrings(items: readonly string[] | null | undefined): string[] {
    if (!items || !items.length) return [];
    return [...items].sort((a, b) => DE_COLLATOR.compare(a ?? '', b ?? ''));
}

export interface PersonLike {
    name_last?: string | null;
    last_name?: string | null;
    name_first?: string | null;
    first_name?: string | null;
    title?: string | null;
    name?: string | null;
    company_name?: string | null;
    [key: string]: any;
}

/**
 * Sortiert Personen standardmäßig nach Nachname, dann Vorname.
 * Falls Firmenname existiert (z.B. bei Kontakten), wird dieser als Fallback genutzt.
 */
export function sortPersons<T extends PersonLike>(items: readonly T[] | null | undefined): T[] {
    if (!items || !items.length) return [];
    return [...items].sort((a, b) => {
        const lastA = (a.name_last || a.last_name || a.company_name || a.name || '').trim();
        const lastB = (b.name_last || b.last_name || b.company_name || b.name || '').trim();

        const cmpLast = DE_COLLATOR.compare(lastA, lastB);
        if (cmpLast !== 0) return cmpLast;

        const firstA = (a.name_first || a.first_name || '').trim();
        const firstB = (b.name_first || b.first_name || '').trim();
        return DE_COLLATOR.compare(firstA, firstB);
    });
}

export interface SelectOptionItem {
    value?: any;
    id?: any;
    label?: string;
    text?: string;
    name?: string;
    [key: string]: any;
}

/**
 * Sortiert HTML-Select Optionen oder Autocomplete-Einträge alphabetisch nach dem Anzeigetext.
 */
export function sortSelectOptions<T extends SelectOptionItem>(
    options: readonly T[] | null | undefined,
    labelAccessor?: keyof T | ((item: T) => string | null | undefined)
): T[] {
    if (!options || !options.length) return [];
    return [...options].sort((a, b) => {
        let labelA = '';
        let labelB = '';
        if (typeof labelAccessor === 'function') {
            labelA = (labelAccessor(a) ?? '').trim();
            labelB = (labelAccessor(b) ?? '').trim();
        } else if (labelAccessor) {
            labelA = String(a[labelAccessor] ?? '').trim();
            labelB = String(b[labelAccessor] ?? '').trim();
        } else {
            labelA = (a.label || a.text || a.name || String(a.value ?? '')).trim();
            labelB = (b.label || b.text || b.name || String(b.value ?? '')).trim();
        }
        return DE_COLLATOR.compare(labelA, labelB);
    });
}
