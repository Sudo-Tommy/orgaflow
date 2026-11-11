/**
 * tableOperationsHelper.ts
 * Operations for inserting, deleting, merging, splitting rows, columns, and tables.
 */

import type { WordBlock } from "./wordTypes";

export function ensureTableGrid(block: WordBlock) {
    if (!block.tableData) {
        block.tableData = {
            headers: ["Spalte 1", "Spalte 2", "Spalte 3"],
            rows: [["", "", ""], ["", "", ""]]
        };
    }
}

export function insertRow(block: WordBlock, atIndex: number, position: 'above' | 'below') {
    ensureTableGrid(block);
    const colCount = block.tableData!.headers.length || 1;
    const targetIdx = position === 'above' ? atIndex : atIndex + 1;
    const newRow = Array(colCount).fill("").map(() => ({ content: "", style: {} }));
    block.tableData!.rows.splice(targetIdx, 0, newRow as any);
}

export function insertColumn(block: WordBlock, atIndex: number, position: 'left' | 'right') {
    ensureTableGrid(block);
    const targetIdx = position === 'left' ? atIndex : atIndex + 1;
    block.tableData!.headers.splice(targetIdx, 0, `Spalte ${block.tableData!.headers.length + 1}`);
    for (const row of block.tableData!.rows) {
        row.splice(targetIdx, 0, { content: "", style: {} } as any);
    }
}

export function deleteRow(block: WordBlock, atIndex: number) {
    if (!block.tableData || block.tableData.rows.length <= 1) return;
    block.tableData.rows.splice(atIndex, 1);
}

export function deleteColumn(block: WordBlock, atIndex: number) {
    if (!block.tableData || block.tableData.headers.length <= 1) return;
    block.tableData.headers.splice(atIndex, 1);
    for (const row of block.tableData.rows) {
        row.splice(atIndex, 1);
    }
}

export function mergeCells(row: any[], startIdx: number, endIdx: number) {
    if (!row || startIdx >= endIdx || startIdx < 0 || endIdx >= row.length) return;
    const cellA = typeof row[startIdx] === 'object' ? row[startIdx] : { content: String(row[startIdx] || '') };
    const mergedTexts: string[] = [];

    for (let i = startIdx; i <= endIdx; i++) {
        const text = typeof row[i] === 'object' ? row[i]?.content : row[i];
        if (text) mergedTexts.push(text);
    }

    cellA.content = mergedTexts.join(" ");
    cellA.colspan = (cellA.colspan || 1) + (endIdx - startIdx);
    row[startIdx] = cellA;

    // Remove merged siblings
    row.splice(startIdx + 1, endIdx - startIdx);
}

export function splitCell(row: any[], cellIdx: number, splitCount = 2) {
    if (!row || cellIdx < 0 || cellIdx >= row.length || splitCount < 2) return;
    const cell = row[cellIdx];
    const content = typeof cell === 'object' ? cell.content : cell;

    const newCells: any[] = [];
    for (let i = 0; i < splitCount; i++) {
        newCells.push({ content: i === 0 ? content : '', style: {} });
    }
    row.splice(cellIdx, 1, ...newCells);
}

export function splitTableAtRow(blocks: WordBlock[], blockId: string, rowIndex: number): WordBlock | null {
    const tableBlock = blocks.find(b => b.id === blockId);
    if (!tableBlock || !tableBlock.tableData || rowIndex <= 0 || rowIndex >= tableBlock.tableData.rows.length) {
        return null;
    }

    const remainingRows = tableBlock.tableData.rows.splice(rowIndex);
    const newBlock: WordBlock = {
        id: 'table_' + Math.random().toString(36).substring(2, 9),
        type: 'table',
        content: '',
        style: { ...tableBlock.style },
        tableData: {
            headers: [...tableBlock.tableData.headers],
            rows: remainingRows
        }
    };

    const curIdx = blocks.findIndex(b => b.id === blockId);
    blocks.splice(curIdx + 1, 0, newBlock);
    return newBlock;
}

export function autoFitTable(block: WordBlock, mode: 'window' | 'content' | 'fixed') {
    if (!block.tableData) return;
    if (!block.style) block.style = {};
    if (mode === 'window') {
        block.style.widthPercent = 100;
    } else if (mode === 'content') {
        block.style.widthPercent = 75;
    } else {
        block.style.widthPercent = 50;
    }
}
