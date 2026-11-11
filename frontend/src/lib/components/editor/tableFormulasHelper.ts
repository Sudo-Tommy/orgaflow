/**
 * tableFormulasHelper.ts
 * Formula calculation (=SUM, =AVERAGE, =COUNT), sorting, and text conversion.
 */

export function parseNumber(val: any): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const cleaned = String(val).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

export function evaluateFormula(formula: string, rIdx: number, cIdx: number, grid: any[][]): string {
    const f = formula.trim().toUpperCase();
    if (!f.startsWith('=')) return formula;

    const isAbove = f.includes('ABOVE');
    const isLeft = f.includes('LEFT');
    const numbers: number[] = [];

    if (isAbove) {
        for (let r = 0; r < rIdx; r++) {
            const cell = grid[r]?.[cIdx];
            const text = typeof cell === 'object' ? cell?.content : cell;
            const n = parseNumber(text);
            if (n !== null) numbers.push(n);
        }
    } else if (isLeft) {
        for (let c = 0; c < cIdx; c++) {
            const cell = grid[rIdx]?.[c];
            const text = typeof cell === 'object' ? cell?.content : cell;
            const n = parseNumber(text);
            if (n !== null) numbers.push(n);
        }
    }

    if (f.startsWith('=SUM')) {
        const sum = numbers.reduce((acc, curr) => acc + curr, 0);
        return sum.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    }
    if (f.startsWith('=AVERAGE')) {
        if (numbers.length === 0) return '0,00';
        const avg = numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;
        return avg.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (f.startsWith('=COUNT')) {
        return String(numbers.length);
    }

    return formula;
}

export function sortTableRows(rows: any[][], colIdx: number, ascending = true): any[][] {
    const sorted = [...rows];
    sorted.sort((rowA, rowB) => {
        const valA = typeof rowA[colIdx] === 'object' ? rowA[colIdx]?.content : rowA[colIdx];
        const valB = typeof rowB[colIdx] === 'object' ? rowB[colIdx]?.content : rowB[colIdx];
        const numA = parseNumber(valA);
        const numB = parseNumber(valB);

        let cmp = 0;
        if (numA !== null && numB !== null) {
            cmp = numA - numB;
        } else {
            cmp = String(valA || '').localeCompare(String(valB || ''), 'de');
        }
        return ascending ? cmp : -cmp;
    });
    return sorted;
}

export function convertTableToText(headers: string[], rows: any[][], separator: '\t' | ';' | '\n' = '\t'): string {
    const lines: string[] = [];
    if (headers && headers.length > 0) {
        lines.push(headers.join(separator));
    }
    for (const row of rows) {
        const rowTexts = row.map(cell => typeof cell === 'object' ? cell?.content || '' : String(cell || ''));
        lines.push(rowTexts.join(separator));
    }
    return lines.join('\n');
}
