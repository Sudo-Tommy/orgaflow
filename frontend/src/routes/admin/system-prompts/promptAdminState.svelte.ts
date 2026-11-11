import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import { confirmStore } from '$lib/services/confirmService.svelte';
import { proposalService } from '$lib/services/improvementProposalService.svelte';
import type { SystemPromptRecord } from '$lib/types/orgaTypes';
import { 
    mapRawItemsToUnified, updateUnifiedItemStatus, 
    generateWeeklyPromptApi, fetchPromptsList, fetchInboxCollections 
} from './promptAdminService';
import { getISOWeekString, formatKW } from './types';

class PromptAdminState {
    mainTab = $state<'prompts' | 'feedbacks' | 'proposals'>('prompts');
    mobileView = $state<'list' | 'detail'>('list');

    localPrompts = $state<SystemPromptRecord[]>([]);
    isLoading = $state(true);
    isRefreshing = $state(false);
    isGenerating = $state(false);
    selectedPromptId = $state('');

    rawFeedbacks = $state<any[]>([]);
    rawInquiries = $state<any[]>([]);
    rawChatMessages = $state<any[]>([]);
    isLoadingInbox = $state(false);

    selectedProposalIds = $state<string[]>([]);
    isEditModalOpen = $state(false);
    editModalMode = $state<'create' | 'edit'>('create');
    editingPrompt = $state<SystemPromptRecord | null>(null);

    currentKWString = getISOWeekString();

    prompts = $derived<SystemPromptRecord[]>(
        (orgaStore.system_prompts?.data && orgaStore.system_prompts.data.length > 0)
            ? orgaStore.system_prompts.data : this.localPrompts
    );

    selectedPrompt = $derived.by(() => {
        if (!this.selectedPromptId && this.prompts.length > 0) return this.prompts[0];
        return this.prompts.find(p => p.id === this.selectedPromptId) || this.prompts[0] || null;
    });

    unifiedInboxItems = $derived.by(() => 
        mapRawItemsToUnified(this.rawFeedbacks, this.rawInquiries, this.rawChatMessages)
    );

    newFeedbacksCount = $derived.by(() => {
        const fb = this.rawFeedbacks.filter(f => !f.status || f.status === 'Neu').length;
        const inq = this.rawInquiries.filter(i => !i.status || i.status === 'new').length;
        const chat = this.rawChatMessages.filter(c => !c.status || c.status === 'Neu' || c.text?.includes('🚨 [BUG REPORT]')).length;
        return fb + inq + chat;
    });

    async loadPrompts() {
        this.isLoading = true;
        try {
            const list = await fetchPromptsList();
            this.localPrompts = list;
            if (!this.selectedPromptId && list.length > 0) this.selectedPromptId = list[0].id;
        } catch (err: any) {
            console.warn("[Prompts Load Error]:", err);
        } finally {
            this.isLoading = false;
        }
    }

    async loadInboxItems() {
        this.isLoadingInbox = true;
        try {
            const data = await fetchInboxCollections();
            this.rawFeedbacks = data.feedbacks;
            this.rawInquiries = data.inquiries;
            this.rawChatMessages = data.chat;
        } catch (e) {
            console.warn("[Inbox Load Error]:", e);
        } finally {
            this.isLoadingInbox = false;
        }
    }

    async refresh() {
        this.isRefreshing = true;
        try {
            if (this.mainTab === 'prompts') await this.loadPrompts();
            else if (this.mainTab === 'feedbacks') await this.loadInboxItems();
            else await proposalService.init();
            toastStore.success('Synchronisiert! 🔄');
        } catch {
            toastStore.error('Aktualisierung fehlgeschlagen.');
        } finally {
            this.isRefreshing = false;
        }
    }

    async generatePrompt(options: any) {
        this.isGenerating = true;
        try {
            const res = await generateWeeklyPromptApi(options);
            toastStore.success(`Prompt ${res.action === 'updated' ? 'aktualisiert' : 'generiert'}! 📝`);
            await this.loadPrompts();
            if (res.record?.id) {
                this.selectedPromptId = res.record.id;
                this.mobileView = 'detail';
            }
        } catch (err: any) {
            toastStore.error(`Generierung fehlgeschlagen: ${err.message}`);
        } finally {
            this.isGenerating = false;
        }
    }

    async savePrompt(data: any) {
        if (this.editModalMode === 'create') {
            const created = await pb.collection('system_prompts').create<SystemPromptRecord>(data);
            this.localPrompts = [created, ...this.localPrompts.filter(p => p.id !== created.id)];
            this.selectedPromptId = created.id;
            this.mobileView = 'detail';
            toastStore.success(`Prompt für ${formatKW(created.calendar_week)} angelegt! ✅`);
        } else if (this.editingPrompt) {
            const updated = await pb.collection('system_prompts').update<SystemPromptRecord>(this.editingPrompt.id, data);
            this.localPrompts = this.localPrompts.map(p => p.id === this.editingPrompt!.id ? updated : p);
            this.selectedPromptId = updated.id;
            toastStore.success(`Prompt gespeichert! ✅`);
        }
    }

    async deletePrompt(id: string) {
        const p = this.prompts.find(x => x.id === id);
        if (await confirmStore.ask(`Prompt "${p?.title || id}" löschen?`, "Prompt löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('system_prompts').delete(id);
                this.localPrompts = this.localPrompts.filter(x => x.id !== id);
                toastStore.info("Prompt gelöscht. 🗑️");
                if (this.selectedPromptId === id) {
                    this.selectedPromptId = this.localPrompts[0]?.id || '';
                    this.mobileView = 'list';
                }
            } catch (err: any) {
                toastStore.error(`Löschen fehlgeschlagen: ${err.message}`);
            }
        }
    }

    async updatePromptStatus(id: string, status: 'open' | 'applied' | 'archived') {
        try {
            await pb.collection('system_prompts').update(id, { status });
            this.localPrompts = this.localPrompts.map(p => p.id === id ? { ...p, status } : p);
            toastStore.success(`Status auf "${status}" aktualisiert!`);
        } catch (err: any) {
            toastStore.error(`Statusänderung fehlgeschlagen: ${err.message}`);
        }
    }

    openCreatePrompt() {
        this.editModalMode = 'create';
        this.editingPrompt = null;
        this.isEditModalOpen = true;
    }

    openEditPrompt(p: SystemPromptRecord) {
        this.editModalMode = 'edit';
        this.editingPrompt = p;
        this.isEditModalOpen = true;
    }
}

export const promptAdminState = new PromptAdminState();
