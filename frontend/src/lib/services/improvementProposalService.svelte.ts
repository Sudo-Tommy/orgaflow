/**
 * improvementProposalService.svelte.ts
 *
 * Superadmin-Service zur Verwaltung einzelner Verbesserungsvorschläge (Proposals).
 * Ermöglicht das Erstellen, Status-Tracking via Buttons und die individuelle Verwertung
 * (z. B. Generierung maßgeschneiderter KI-Entwicklerprompts & Team-Briefings).
 */

import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';

class ImprovementProposalService {
    proposals = $state<ImprovementProposalRecord[]>([]);
    isLoading = $state(false);
    isSubscribed = false;

    // Lokaler Cache Key für offline / Fallback
    private readonly STORAGE_KEY = 'orgaflow_improvement_proposals_cache';

    constructor() {
        this.loadLocalCache();
    }

    private loadLocalCache() {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                this.proposals = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[ProposalService] Local cache load error:', e);
        }
    }

    private saveLocalCache() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.proposals));
        } catch (e) {
            console.warn('[ProposalService] Local cache save error:', e);
        }
    }

    async init() {
        await this.loadProposals();
        this.subscribeRealtime();
    }

    async loadProposals() {
        this.isLoading = true;
        try {
            // 1. Primär: Direkte PocketBase-Collection
            try {
                const list = await pb.collection('improvement_proposals').getFullList<ImprovementProposalRecord>({
                    sort: '-created',
                    requestKey: null
                });
                this.proposals = list;
                this.saveLocalCache();
                return;
            } catch (err: any) {
                // Falls Collection noch nicht existiert (z.B. vor PB-Neustart), Fallback auf system_prompts mit metadata
                if (err.status === 404) {
                    console.info('[ProposalService] Collection improvement_proposals not yet initialized, using fallback storage.');
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
                        this.saveLocalCache();
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
                this.saveLocalCache();
            }).then(() => {
                this.isSubscribed = true;
            }).catch(() => {
                // Silent fallback
            });
        } catch (err) {
            console.warn('[ProposalService] Subscribe error:', err);
        }
    }

    async createProposal(data: Partial<ImprovementProposalRecord>): Promise<ImprovementProposalRecord> {
        const userModel = pb.authStore.model as any;
        const defaultAuthor = userModel?.name_first 
            ? `${userModel.name_first} ${userModel.name_last || ''}`.trim() 
            : 'Superadmin';

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
        } catch (err: any) {
            // Fallback: In system_prompts speichern
            console.warn('[ProposalService] Fallback to system_prompts for create:', err.message);
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

            created = {
                id: fallbackRecord.id,
                collectionId: 'improvement_proposals',
                collectionName: 'improvement_proposals',
                ...payload,
                created: fallbackRecord.created,
                updated: fallbackRecord.updated
            } as ImprovementProposalRecord;
        }

        this.proposals = [created, ...this.proposals.filter(p => p.id !== created.id)];
        this.saveLocalCache();
        toastStore.success(`Verbesserungsvorschlag "${created.title}" erfolgreich angelegt! 💡`);
        return created;
    }

    async updateProposal(id: string, updates: Partial<ImprovementProposalRecord>): Promise<ImprovementProposalRecord> {
        let updated: ImprovementProposalRecord;

        try {
            updated = await pb.collection('improvement_proposals').update<ImprovementProposalRecord>(id, updates);
        } catch (err: any) {
            // Fallback auf system_prompts
            const existing = this.proposals.find(p => p.id === id);
            const merged = { ...existing, ...updates };
            await pb.collection('system_prompts').update(id, {
                title: `💡 [Vorschlag] ${merged.title}`,
                prompt_content: merged.description,
                metadata: {
                    is_proposal: true,
                    category: merged.category,
                    priority: merged.priority,
                    proposal_status: merged.status,
                    solution_concept: merged.solution_concept,
                    tags: merged.tags,
                    source_type: merged.source_type,
                    author_name: merged.author_name
                }
            }).catch(() => {});

            updated = merged as ImprovementProposalRecord;
        }

        this.proposals = this.proposals.map(p => p.id === id ? updated : p);
        this.saveLocalCache();
        toastStore.success(`Vorschlag "${updated.title}" aktualisiert! ✅`);
        return updated;
    }

    async updateProposalStatus(id: string, newStatus: 'idea' | 'planned' | 'in_progress' | 'implemented') {
        const item = this.proposals.find(p => p.id === id);
        if (!item || item.status === newStatus) return;

        // Optimistic UI Update
        const oldStatus = item.status;
        this.proposals = this.proposals.map(p => p.id === id ? { ...p, status: newStatus } : p);

        try {
            await this.updateProposal(id, { status: newStatus });
            const statusLabel = {
                'idea': '💡 Idee',
                'planned': '📋 Geplant',
                'in_progress': '⚙️ In Arbeit',
                'implemented': '✅ Umgesetzt'
            }[newStatus];
            toastStore.info(`Status auf "${statusLabel}" gesetzt.`);
        } catch (err: any) {
            // Rollback
            this.proposals = this.proposals.map(p => p.id === id ? { ...p, status: oldStatus } : p);
            toastStore.error(`Fehler beim Statuswechsel: ${err.message}`);
        }
    }

    async deleteProposal(id: string) {
        const item = this.proposals.find(p => p.id === id);
        try {
            try {
                await pb.collection('improvement_proposals').delete(id);
            } catch {
                await pb.collection('system_prompts').delete(id).catch(() => {});
            }
            this.proposals = this.proposals.filter(p => p.id !== id);
            this.saveLocalCache();
            toastStore.info(`Vorschlag "${item?.title || 'Vorschlag'}" gelöscht. 🗑️`);
        } catch (err: any) {
            toastStore.error(`Fehler beim Löschen: ${err.message}`);
        }
    }
}

export const proposalService = new ImprovementProposalService();
