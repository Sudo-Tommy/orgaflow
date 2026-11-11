import type { WordBlock, WordColumnItem } from "./wordTypes";
import { renderWithSampleData } from "./wordVariables";

export function distributeColumnsEvenly(columns: WordColumnItem[]): void {
    if (!columns || columns.length === 0) return;
    const len = columns.length;
    const pct = Math.round((100 / len) * 10) / 10;
    for (let i = 0; i < len - 1; i++) {
        columns[i].widthPercent = pct;
    }
    columns[len - 1].widthPercent = Math.round((100 - pct * (len - 1)) * 10) / 10;
}

export function setColumnsCount(block: WordBlock, targetCount: 2 | 3 | 4): void {
    if (!block.columnsConfig) {
        block.columnsConfig = { count: targetCount, columns: [] };
    }
    const cols = block.columnsConfig.columns || [];
    while (cols.length < targetCount) {
        cols.push({
            id: 'c_' + crypto.randomUUID().slice(0, 6),
            content: '',
            widthPercent: 0,
            textAlign: cols.length === targetCount - 1 && targetCount === 2 ? 'right' : 'left'
        });
    }
    while (cols.length > targetCount) {
        const removed = cols.pop();
        if (removed?.content && cols.length > 0) {
            cols[cols.length - 1].content = (cols[cols.length - 1].content || '') + (cols[cols.length - 1].content ? '<br>' : '') + removed.content;
        }
    }
    block.columnsConfig.count = targetCount;
    block.columnsConfig.columns = cols;
    distributeColumnsEvenly(cols);
    if ((block.columnsConfig.selectedColIndex ?? 0) >= targetCount) {
        block.columnsConfig.selectedColIndex = targetCount - 1;
    }
}

export function addColumn(block: WordBlock): boolean {
    if (!block.columnsConfig) {
        block.columnsConfig = { count: 2, columns: [] };
    }
    const cols = block.columnsConfig.columns || [];
    if (cols.length >= 4) return false;
    cols.push({
        id: 'c_' + crypto.randomUUID().slice(0, 6),
        content: '',
        widthPercent: 0,
        textAlign: 'left'
    });
    block.columnsConfig.count = cols.length;
    block.columnsConfig.columns = cols;
    distributeColumnsEvenly(cols);
    block.columnsConfig.selectedColIndex = cols.length - 1;
    return true;
}

export function deleteColumn(block: WordBlock, colIndex: number): boolean {
    if (!block.columnsConfig?.columns || block.columnsConfig.columns.length === 0) return false;
    const cols = block.columnsConfig.columns;
    if (cols.length <= 2) {
        const remainingIdx = colIndex === 0 ? 1 : 0;
        const remainingCol = cols[remainingIdx];
        block.type = 'paragraph';
        block.content = remainingCol?.content || '';
        delete block.columnsConfig;
        return true;
    }
    cols.splice(colIndex, 1);
    block.columnsConfig.count = cols.length;
    distributeColumnsEvenly(cols);
    block.columnsConfig.selectedColIndex = Math.min(cols.length - 1, Math.max(0, colIndex - 1));
    return false;
}

export function applyColumnsPreset(block: WordBlock, preset: string): void {
    if (!block.columnsConfig?.columns) return;
    const cols = block.columnsConfig.columns;
    const count = block.columnsConfig.count || cols.length;

    if (count === 2 && cols.length === 2) {
        if (preset === '50/50') { cols[0].widthPercent = 50; cols[1].widthPercent = 50; }
        else if (preset === '40/60') { cols[0].widthPercent = 40; cols[1].widthPercent = 60; }
        else if (preset === '60/40') { cols[0].widthPercent = 60; cols[1].widthPercent = 40; }
        else if (preset === '30/70') { cols[0].widthPercent = 30; cols[1].widthPercent = 70; }
    } else if (count === 3 && cols.length === 3) {
        if (preset === 'equal') { cols[0].widthPercent = 33.3; cols[1].widthPercent = 33.3; cols[2].widthPercent = 33.4; }
        else if (preset === 'wide-left') { cols[0].widthPercent = 40; cols[1].widthPercent = 30; cols[2].widthPercent = 30; }
        else if (preset === 'wide-center') { cols[0].widthPercent = 25; cols[1].widthPercent = 50; cols[2].widthPercent = 25; }
    } else if (count === 4 && cols.length === 4) {
        if (preset === 'equal') { cols[0].widthPercent = 25; cols[1].widthPercent = 25; cols[2].widthPercent = 25; cols[3].widthPercent = 25; }
        else if (preset === 'wide-left') { cols[0].widthPercent = 40; cols[1].widthPercent = 20; cols[2].widthPercent = 20; cols[3].widthPercent = 20; }
    }
}

export function startSplitterDrag(
    e: PointerEvent,
    block: WordBlock,
    colIndex: number,
    containerRef: HTMLElement | null
): void {
    if (!containerRef || !block.columnsConfig?.columns) return;
    const cols = block.columnsConfig.columns;
    if (colIndex < 0 || colIndex >= cols.length - 1) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.getBoundingClientRect();
    const startMouseX = e.clientX;
    const startW1 = cols[colIndex].widthPercent ?? (100 / cols.length);
    const startW2 = cols[colIndex + 1].widthPercent ?? (100 / cols.length);
    const combinedPct = startW1 + startW2;

    function onPointerMove(ev: PointerEvent) {
        const deltaPx = ev.clientX - startMouseX;
        const deltaPct = (deltaPx / rect.width) * 100;
        const minW = 10;
        const maxW = combinedPct - minW;
        const newW1 = Math.round(Math.max(minW, Math.min(maxW, startW1 + deltaPct)) * 10) / 10;
        const newW2 = Math.round((combinedPct - newW1) * 10) / 10;

        cols[colIndex].widthPercent = newW1;
        cols[colIndex + 1].widthPercent = newW2;
    }

    function onPointerUp() {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
}

export function renderColumnPreview(content: string, retSize: number): string {
    let rendered = renderWithSampleData(content || '');
    const sample = "Muster Pflege • Musterstr. 1 • 12345 Berlin";
    if (rendered.includes(sample)) {
        rendered = rendered.replace(
            sample,
            `<span class="underline text-neutral-500 dark:text-neutral-400 block mb-1 font-normal" style="font-size: ${retSize}pt;">${sample}</span>`
        );
    }
    return rendered;
}
