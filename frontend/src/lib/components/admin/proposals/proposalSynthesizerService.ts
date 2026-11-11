import { pb } from '$lib/services/pocketbase';
import { proposalService } from '$lib/services/improvementProposalService.svelte';
import { generateSammelAuftragBriefing, type ProposalSynthesizerRecord } from '$lib/utils/synthesizer';

export async function fetchProposalsAndSynthesize(selectedIds: string[]): Promise<string> {
    if (!selectedIds || selectedIds.length === 0) return "";
    const filterQuery = selectedIds.map((id: string) => `id="${id}"`).join(' || ');
    let records: ProposalSynthesizerRecord[] = [];

    try {
        records = await pb.collection('improvement_proposals').getFullList<any>({
            filter: filterQuery,
            sort: '-created',
            requestKey: null
        });
    } catch {
        try {
            records = await pb.collection('proposals').getFullList<any>({
                filter: filterQuery,
                sort: '-created',
                requestKey: null
            });
        } catch {
            records = (proposalService.proposals || []).filter(p => selectedIds.includes(p.id)) as any[];
        }
    }

    if (records.length < selectedIds.length && proposalService.proposals.length > 0) {
        const existingIds = new Set(records.map(r => r.id));
        const missing = proposalService.proposals.filter(p => selectedIds.includes(p.id) && !existingIds.has(p.id));
        records = [...records, ...missing as any[]];
    }

    return generateSammelAuftragBriefing(records);
}

export async function saveProposalToSystemPrompts(synthesisResult: string, count: number): Promise<void> {
    if (!synthesisResult) return;
    const currentYear = new Date().getFullYear();
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const kwNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const kwTag = `${currentYear}-W${String(kwNo).padStart(2, '0')}-Sammel-${Date.now().toString().slice(-4)}`;
    const title = `Sammel-Arbeitsauftrag (${count} Vorgänge)`;

    await pb.collection('system_prompts').create({
        title,
        calendar_week: kwTag,
        status: 'open',
        prompt_content: synthesisResult,
        feedback_count: count,
        source_period_start: new Date().toISOString(),
        source_period_end: new Date().toISOString(),
        raw_summary: `Sammel-Arbeitsauftrag generiert aus ${count} ausgewählten Verbesserungsvorschlägen.`
    }, { requestKey: null });
}

export function downloadMarkdownBriefing(synthesisResult: string, count: number): void {
    if (!synthesisResult) return;
    const blob = new Blob([synthesisResult], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `Sammel-Arbeitsauftrag_${todayStr}_${count}-Vorgaenge.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
