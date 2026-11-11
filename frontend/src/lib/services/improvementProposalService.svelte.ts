/**
 * improvementProposalService.svelte.ts
 *
 * Superadmin-Service zur Verwaltung einzelner Verbesserungsvorschläge (Proposals).
 * Unterstützt Status-Tracking, Realtime-Sync und Gelesen-Status für Benachrichtigungen.
 */

import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';
import {
    loadCachedProposals,
    saveCachedProposals,
    loadReadProposalIds,
    saveReadProposalIds
} from './proposalStorageHelpers';

class ImprovementProposalService {
    proposals = $state<ImprovementProposalRecord[]>([]);
    readProposalIds = $state<string[]>([]);
    isLoading = $state(false);
    isSubscribed = false;

    constructor() {
        this.proposals = loadCachedProposals();
        this.readProposalIds = loadReadProposalIds(this.proposals);
    }

    get unreadCount(): number {
        return this.proposals.filter(p => !this.readProposalIds.includes(p.id)).length;
    }

    isProposalUnread(id: string): boolean {
        return !this.readProposalIds.includes(id);
    }

    markAsRead(id: string) {
        if (!this.readProposalIds.includes(id)) {
            this.readProposalIds = [...this.readProposalIds, id];
            saveReadProposalIds(this.readProposalIds);
        }
    }

    markAllAsRead() {
        const allIds = this.proposals.map(p => p.id);
        this.readProposalIds = Array.from(new Set([...this.readProposalIds, ...allIds]));
        saveReadProposalIds(this.readProposalIds);
    }

    async init() {
        await this.loadProposals();
        this.subscribeRealtime();
    }

    async loadProposals() {
        this.isLoading = true;
        try {
            try {
                const list = await pb.collection('improvement_proposals').getFullList<ImprovementProposalRecord>({
                    sort: '-created',
                    requestKey: null
                });
                this.proposals = list;
                this.readProposalIds = loadReadProposalIds(this.proposals);
                saveCachedProposals(this.proposals);
                return;
            } catch (err: any) {
                if (err.status === 404) {
                    const fallbackList = await pb.collection('system_prompts').getFullList<any>({
                        filter: 'metadata.is_proposal = true',
                        sort: '-created',
                        requestKey: null
                    }).catch(() => []);

                    if (fallbackList.length > 0) {
                        this.proposals = fallbackList.map(p => ({
                            id: p.id,
                            collectionId: 'improvement_proposals',
                            collectionName: 'improvement_proposals',
                            title: p.title,
                            category: p.metadata?.category || 'Core Engine & API',
                            priority: p.metadata?.priority || 'medium',
                            status: p.metadata?.proposal_status || (p.status === 'applied' ? 'implemented' : p.status === 'open' ? 'in_progress' : 'idea'),
                            description: p.prompt_content,
                            solution_concept: p.metadata?.solution_concept || '',
                            ai_prompt: p.metadata?.ai_prompt || '',
                            team_briefing: p.metadata?.team_briefing || '',
                            tags: p.metadata?.tags || '',
                            source_type: p.metadata?.source_type || 'manual',
                            author_name: p.metadata?.author_name || 'Superadmin',
                            created: p.created,
                            updated: p.updated
                        }));
                        this.readProposalIds = loadReadProposalIds(this.proposals);
                        saveCachedProposals(this.proposals);
                        return;
                    }
                }
            }
        } catch (err: any) {
            console.warn('[ProposalService] Error fetching proposals:', err);
        } finally {
            this.isLoading = false;
        }
    }

    private subscribeRealtime() {
        if (this.isSubscribed || typeof window === 'undefined') return;
        try {
            pb.collection('improvement_proposals').subscribe<ImprovementProposalRecord>('*', (e) => {
                if (e.action === 'create') {
                    this.proposals = [e.record, ...this.proposals.filter(p => p.id !== e.record.id)];
                    toastStore.info(`Neuer Verbesserungsvorschlag: "${e.record.title}" 💡`);
                } else if (e.action === 'update') {
                    this.proposals = this.proposals.map(p => p.id === e.record.id ? e.record : p);
                } else if (e.action === 'delete') {
                    this.proposals = this.proposals.filter(p => p.id !== e.record.id);
                }
                saveCachedProposals(this.proposals);
            }).then(() => { this.isSubscribed = true; }).catch(() => {});
        } catch (err) {
            console.warn('[ProposalService] Subscribe error:', err);
        }
    }

    async createProposal(data: Partial<ImprovementProposalRecord>): Promise<ImprovementProposalRecord> {
        const userModel = pb.authStore.model as any;
        const defaultAuthor = userModel?.name_first ? `${userModel.name_first} ${userModel.name_last || ''}`.trim() : 'Superadmin';
        const payload = {
            title: data.title?.trim() || 'Neuer Verbesserungsvorschlag',
            category: data.category || 'Core Engine & API',
            priority: data.priority || 'medium',
            status: data.status || 'idea',
            description: data.description?.trim() || '',
            solution_concept: data.solution_concept?.trim() || data.expected_behavior?.trim() || '',
            expected_behavior: data.expected_behavior?.trim() || data.solution_concept?.trim() || '',
            ai_prompt: data.ai_prompt || '',
            team_briefing: data.team_briefing || '',
            tags: data.tags?.trim() || '',
            source_type: data.source_type || 'manual',
            source_id: data.source_id || '',
            author_name: data.author_name || data.author || defaultAuthor
        };

        let created: ImprovementProposalRecord;
        try {
            created = await pb.collection('improvement_proposals').create<ImprovementProposalRecord>(payload);
        } catch {
            const fallbackRecord = await pb.collection('system_prompts').create({
                title: `💡 [Vorschlag] ${payload.title}`,
                prompt_content: payload.description,
                status: payload.status === 'implemented' ? 'applied' : 'open',
                metadata: {
                    is_proposal: true,
                    category: payload.category,
                    priority: payload.priority,
                    proposal_status: payload.status,
                    solution_concept: payload.solution_concept,
                    tags: payload.tags,
                    source_type: payload.source_type,
                    author_name: payload.author_name
                }
            });
            created = { id: fallbackRecord.id, collectionId: 'improvement_proposals', collectionName: 'improvement_proposals', ...payload, created: fallbackRecord.created, updated: fallbackRecord.updated } as ImprovementProposalRecord;
        }

        this.proposals = [created, ...this.proposals.filter(p => p.id !== created.id)];
        saveCachedProposals(this.proposals);
        toastStore.success(`Verbesserungsvorschlag "${created.title}" angelegt! 💡`);
        return created;
    }

    async updateProposal(id: string, updates: Partial<ImprovementProposalRecord>): Promise<ImprovementProposalRecord> {
        let updated: ImprovementProposalRecord;
        try {
            updated = await pb.collection('improvement_proposals').update<ImprovementProposalRecord>(id, updates);
        } catch {
            const existing = this.proposals.find(p => p.id === id);
            const merged = { ...existing, ...updates };
            await pb.collection('system_prompts').update(id, {
                title: `💡 [Vorschlag] ${merged.title}`,
                prompt_content: merged.description,
                metadata: { is_proposal: true, category: merged.category, priority: merged.priority, proposal_status: merged.status, solution_concept: merged.solution_concept, tags: merged.tags, source_type: merged.source_type, author_name: merged.author_name }
            }).catch(() => {});
            updated = merged as ImprovementProposalRecord;
        }

        this.proposals = this.proposals.map(p => p.id === id ? updated : p);
        saveCachedProposals(this.proposals);
        toastStore.success(`Vorschlag "${updated.title}" aktualisiert! ✅`);
        return updated;
    }

    async updateProposalStatus(id: string, newStatus: 'idea' | 'planned' | 'in_progress' | 'implemented') {
        const item = this.proposals.find(p => p.id === id);
        if (!item || item.status === newStatus) return;
        const oldStatus = item.status;
        this.proposals = this.proposals.map(p => p.id === id ? { ...p, status: newStatus } : p);

        try {
            await this.updateProposal(id, { status: newStatus });
            this.markAsRead(id);
        } catch (err: any) {
            this.proposals = this.proposals.map(p => p.id === id ? { ...p, status: oldStatus } : p);
            toastStore.error(`Fehler beim Statuswechsel: ${err.message}`);
        }
    }

    async deleteProposal(id: string) {
        const item = this.proposals.find(p => p.id === id);
        try {
            try { await pb.collection('improvement_proposals').delete(id); } catch { await pb.collection('system_prompts').delete(id).catch(() => {}); }
            this.proposals = this.proposals.filter(p => p.id !== id);
            saveCachedProposals(this.proposals);
            toastStore.info(`Vorschlag "${item?.title || 'Vorschlag'}" gelöscht. 🗑️`);
        } catch (err: any) {
            toastStore.error(`Fehler beim Löschen: ${err.message}`);
        }
    }

    create(data: Partial<ImprovementProposalRecord>) {
        return this.createProposal(data);
    }

    update(id: string, updates: Partial<ImprovementProposalRecord>) {
        return this.updateProposal(id, updates);
    }
}

export const proposalService = new ImprovementProposalService();
