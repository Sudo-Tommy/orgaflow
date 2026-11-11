<script lang="ts">
    import { onMount } from 'svelte';
    import { landingCmsStore, type CmsData } from '$lib/services/landingCmsStore.svelte';
    import CmsHeaderBar from './cms/CmsHeaderBar.svelte';
    import CmsNavTabs from './cms/CmsNavTabs.svelte';
    import CmsHeroEditor from './cms/CmsHeroEditor.svelte';
    import CmsServicesEditor from './cms/CmsServicesEditor.svelte';
    import CmsProcessEditor from './cms/CmsProcessEditor.svelte';
    import CmsTeamEditor from './cms/CmsTeamEditor.svelte';
    import CmsCooperationEditor from './cms/CmsCooperationEditor.svelte';
    import CmsQualityEditor from './cms/CmsQualityEditor.svelte';
    import CmsFaqEditor from './cms/CmsFaqEditor.svelte';
    import CmsContactEditor from './cms/CmsContactEditor.svelte';
    import CmsLivePreview from './cms/CmsLivePreview.svelte';

    let activeSection = $state<keyof CmsData>('hero');
    let showLivePreview = $state(false);

    onMount(async () => {
        await landingCmsStore.init();
    });

    async function handleSaveSection(key: keyof CmsData) {
        try {
            await landingCmsStore.saveSection(key);
        } catch (e: any) {
            console.error("Speichern fehlgeschlagen:", e);
        }
    }
</script>

<div class="space-y-6">
    <!-- Header Toolbar & Bereichsstatus -->
    <CmsHeaderBar 
        {activeSection} 
        {showLivePreview} 
        onTogglePreview={() => showLivePreview = !showLivePreview}
        onSaveSection={handleSaveSection}
    />

    <!-- Navigation Tabs -->
    <CmsNavTabs 
        {activeSection} 
        onSelect={(key) => activeSection = key} 
    />

    <!-- Live-Vorschau (wenn aktiviert) -->
    {#if showLivePreview}
        <CmsLivePreview {activeSection} />
    {/if}

    <!-- Content Sections Editoren -->
    <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm transition-colors">
        {#if activeSection === 'hero'}
            <CmsHeroEditor />
        {:else if activeSection === 'services'}
            <CmsServicesEditor />
        {:else if activeSection === 'process'}
            <CmsProcessEditor />
        {:else if activeSection === 'team'}
            <CmsTeamEditor />
        {:else if activeSection === 'cooperation'}
            <CmsCooperationEditor />
        {:else if activeSection === 'quality'}
            <CmsQualityEditor />
        {:else if activeSection === 'faq'}
            <CmsFaqEditor />
        {:else if activeSection === 'appointment' || activeSection === 'contact'}
            <CmsContactEditor />
        {/if}
    </div>
</div>
