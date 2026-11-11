/**
 * tableStylesHelper.ts
 * Helper functions and presets for Word-style table formatting, shading, and alignment.
 */

export interface TablePreset {
    id: string;
    name: string;
    headerBg: string;
    headerText: string;
    borderColor: string;
    isZebra: boolean;
    zebraColor: string;
    accentColor: string;
}

export const TABLE_PRESETS: TablePreset[] = [
    {
        id: 'orgaflow_cyan',
        name: 'OrgaFlow Türkis',
        headerBg: '#46b4c8',
        headerText: '#ffffff',
        borderColor: '#cbd5e1',
        isZebra: false,
        zebraColor: 'transparent',
        accentColor: '#0891b2'
    },
    {
        id: 'orgaflow_violet',
        name: 'Modern Violett',
        headerBg: '#7c3aed',
        headerText: '#ffffff',
        borderColor: '#e9d5ff',
        isZebra: false,
        zebraColor: 'transparent',
        accentColor: '#6d28d9'
    },
    {
        id: 'slate_dark',
        name: 'Klassisch Anthrazit',
        headerBg: '#1e293b',
        headerText: '#f8fafc',
        borderColor: '#cbd5e1',
        isZebra: false,
        zebraColor: 'transparent',
        accentColor: '#0f172a'
    },
    {
        id: 'minimal_gray',
        name: 'Dezent Hellgrau',
        headerBg: '#f4f4f5',
        headerText: '#18181b',
        borderColor: '#e4e4e7',
        isZebra: false,
        zebraColor: 'transparent',
        accentColor: '#71717a'
    },
    {
        id: 'emerald_green',
        name: 'Smaragd Grün',
        headerBg: '#059669',
        headerText: '#ffffff',
        borderColor: '#a7f3d0',
        isZebra: false,
        zebraColor: 'transparent',
        accentColor: '#047857'
    },
    {
        id: 'clean_borderless',
        name: 'Minimal Rahmen',
        headerBg: 'transparent',
        headerText: '#111827',
        borderColor: '#e5e7eb',
        isZebra: false,
        zebraColor: 'transparent',
        accentColor: '#374151'
    }
];

export const AVAILABLE_COLUMNS = [
    { id: "pos", name: "Pos", type: "pos", defaultWidth: 8, align: "left" },
    { id: "date", name: "Datum", type: "date", defaultWidth: 14, align: "left" },
    { id: "duration", name: "Menge / Dauer", type: "duration", defaultWidth: 14, align: "left" },
    { id: "title", name: "Leistungsbeschreibung", type: "title", defaultWidth: 36, align: "left" },
    { id: "price", name: "Einzelpreis", type: "price", defaultWidth: 14, align: "right" },
    { id: "total", name: "Gesamtbetrag", type: "total", defaultWidth: 14, align: "right" }
];

export const NINE_POINT_ALIGNMENTS = [
    { id: 'top-left', label: 'Oben Links', icon: '↖', hAlign: 'left', vAlign: 'top' },
    { id: 'top-center', label: 'Oben Zentriert', icon: '↑', hAlign: 'center', vAlign: 'top' },
    { id: 'top-right', label: 'Oben Rechts', icon: '↗', hAlign: 'right', vAlign: 'top' },
    { id: 'middle-left', label: 'Mitte Links', icon: '←', hAlign: 'left', vAlign: 'middle' },
    { id: 'middle-center', label: 'Zentriert', icon: '•', hAlign: 'center', vAlign: 'middle' },
    { id: 'middle-right', label: 'Mitte Rechts', icon: '→', hAlign: 'right', vAlign: 'middle' },
    { id: 'bottom-left', label: 'Unten Links', icon: '↙', hAlign: 'left', vAlign: 'bottom' },
    { id: 'bottom-center', label: 'Unten Zentriert', icon: '↓', hAlign: 'center', vAlign: 'bottom' },
    { id: 'bottom-right', label: 'Unten Rechts', icon: '↘', hAlign: 'right', vAlign: 'bottom' }
];

export function getAlignmentCss(alignId: string): string {
    const item = NINE_POINT_ALIGNMENTS.find(a => a.id === alignId);
    if (!item) return 'text-align: left; vertical-align: middle;';
    return `text-align: ${item.hAlign}; vertical-align: ${item.vAlign};`;
}

export function getTextDirectionCss(direction?: string): string {
    if (direction === 'vertical-lr') return 'writing-mode: vertical-lr; transform: rotate(180deg);';
    if (direction === 'vertical-rl') return 'writing-mode: vertical-rl;';
    return '';
}

export function applyTablePreset(tableConfig: any, preset: TablePreset) {
    if (!tableConfig) return;
    tableConfig.headerBackgroundColor = preset.headerBg;
    tableConfig.headerTextColor = preset.headerText;
    tableConfig.borderColor = preset.borderColor;
    tableConfig.isZebra = preset.isZebra;
    tableConfig.zebraColor = preset.zebraColor;
}

export function distributeEvenly(columns: any[]) {
    if (!columns || columns.length === 0) return;
    const count = columns.length;
    const baseWidth = Math.floor(100 / count);
    const remainder = 100 - (baseWidth * count);
    columns.forEach((col, idx) => {
        col.width = baseWidth + (idx === 0 ? remainder : 0);
    });
}

export function resizeColumnPair(columns: any[], index: number, deltaPct: number, minWidth = 3) {
    if (!columns || index < 0 || index >= columns.length - 1) return;
    const colA = columns[index];
    const colB = columns[index + 1];
    const totalPair = (colA.width || 10) + (colB.width || 10);

    let newWidthA = Math.round((colA.width || 10) + deltaPct);
    newWidthA = Math.max(minWidth, Math.min(totalPair - minWidth, newWidthA));
    const newWidthB = totalPair - newWidthA;

    colA.width = newWidthA;
    colB.width = newWidthB;
}

export function autoFitBillingColumns(columns: any[]) {
    if (!columns || columns.length === 0) return;
    const standardWeights: Record<string, number> = {
        pos: 5,
        date: 14,
        duration: 12,
        price: 13,
        total: 14
    };
    let fixedTotal = 0;
    const flexCols: any[] = [];
    columns.forEach(col => {
        if (standardWeights[col.type]) {
            fixedTotal += standardWeights[col.type];
        } else {
            flexCols.push(col);
        }
    });

    if (flexCols.length > 0 && fixedTotal < 90) {
        const flexShare = Math.floor((100 - fixedTotal) / flexCols.length);
        const remainder = (100 - fixedTotal) - (flexShare * flexCols.length);
        columns.forEach(col => {
            if (standardWeights[col.type]) {
                col.width = standardWeights[col.type];
            } else {
                col.width = flexShare;
            }
        });
        if (flexCols[0]) flexCols[0].width += remainder;
    } else {
        distributeEvenly(columns);
    }
}

export function toggleColumn(tableConfig: any, colType: string) {
    if (!tableConfig) return;
    const cols = tableConfig.columns || [];
    const exists = cols.some((c: any) => c.type === colType);
    if (exists) {
        if (cols.length <= 1) return;
        tableConfig.columns = cols.filter((c: any) => c.type !== colType);
        distributeEvenly(tableConfig.columns);
    } else {
        const template = AVAILABLE_COLUMNS.find(c => c.id === colType);
        if (template) {
            tableConfig.columns = [...cols, {
                id: String(Date.now()),
                name: template.name,
                type: template.type,
                width: template.defaultWidth,
                align: template.align
            }];
            distributeEvenly(tableConfig.columns);
        }
    }
}
