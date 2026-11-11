import type { WordBlock } from "./wordTypes";

/**
 * blockMigrationHelper.ts
 * Harmonizes and migrates legacy document blocks to the clean 1:1 flow layout.
 * Ensures logos are never floating (isFree: false) and legacy headers are merged into 2 columns.
 */
export function normalizeDocumentBlocks(rawBlocks: WordBlock[]): WordBlock[] {
    if (!Array.isArray(rawBlocks)) return [];
    const blocks: WordBlock[] = rawBlocks.map(b => {
        const copy = { ...b };
        if (copy.type === 'logo') {
            copy.logoConfig = {
                height: copy.logoConfig?.height || 85,
                align: copy.logoConfig?.align || (copy.style?.textAlign as any) || 'right',
                fit: copy.logoConfig?.fit || 'contain',
                isFree: false,
                repeatOnAllPages: copy.logoConfig?.repeatOnAllPages ?? false,
                imgOffsetX: copy.logoConfig?.imgOffsetX || 0,
                imgOffsetY: copy.logoConfig?.imgOffsetY || 0
            };
        }
        return copy;
    });

    const hasColumnsHeader = blocks.some(b => b.type === 'columns' && !b.columnsConfig?.repeatOnAllPages);
    const hasDin5008 = blocks.some(b => b.type === 'din5008_header');
    if (hasColumnsHeader || hasDin5008) return blocks;

    const retIdx = blocks.findIndex(b => b.type === 'paragraph' && (b.content?.includes('return_address') || b.id?.includes('return_address')));
    const recIdx = blocks.findIndex((b, i) => i !== retIdx && b.type === 'paragraph' && (b.content?.includes('client.name') || b.content?.includes('client.salutation') || b.content?.includes('Mustermann')) && !b.content?.includes('salutation_formal'));
    const compIdx = blocks.findIndex((b, i) => i !== retIdx && i !== recIdx && b.type === 'paragraph' && (b.content?.includes('company.name') || b.content?.includes('Pflegedienst')));

    if (recIdx !== -1 && compIdx !== -1) {
        const retContent = retIdx !== -1 ? (blocks[retIdx].content || '').trim() : '';
        const recContent = (blocks[recIdx].content || '').trim();
        const compContent = (blocks[compIdx].content || '').trim();

        const combinedLeft = retContent ? `${retContent}\n\n${recContent}` : recContent;
        const newColBlock: WordBlock = {
            id: 'b_head_cols_' + crypto.randomUUID().slice(0, 8),
            type: 'columns',
            content: '',
            style: { marginTop: 4, marginBottom: 16 },
            columnsConfig: {
                count: 2,
                repeatOnAllPages: false,
                borderTop: false,
                columns: [
                    { id: 'c_recipient', content: combinedLeft, widthPercent: 58, textAlign: 'left', fontSize: 9.5 },
                    { id: 'c_company', content: compContent, widthPercent: 42, textAlign: 'right', fontSize: 9 }
                ]
            }
        };

        const indicesToRemove = [retIdx, recIdx, compIdx].filter(i => i !== -1).sort((a, b) => b - a);
        const insertPosition = Math.min(...[retIdx, recIdx, compIdx].filter(i => i !== -1));
        indicesToRemove.forEach(i => blocks.splice(i, 1));
        blocks.splice(insertPosition, 0, newColBlock);
    }

    return blocks;
}
