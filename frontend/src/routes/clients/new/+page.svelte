<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { formDraftService } from "$lib/services/formDraftService";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { ArrowLeft, ArrowRight, Check, AlertCircle, Sparkles } from "lucide-svelte";
    import { createDefaultClientFormData, type WizardStepId } from "./types";
    import { submitClientRecord, scrollToTop, populateFromUrlParams } from "./clientCreateService";
    import ClientWizardStepper from "./components/ClientWizardStepper.svelte";
    import ClientMasterTab from "./components/ClientMasterTab.svelte";
    import ClientCareTab from "./components/ClientCareTab.svelte";
    import ClientInheritorTab from "./components/ClientInheritorTab.svelte";
    import ClientBillingTab from "./components/ClientBillingTab.svelte";
    import ClientSignatureModal from "./components/ClientSignatureModal.svelte";

    const DRAFT_KEY = "client_create_draft";
    let isLoading = $state(false);
    let errorMsg = $state("");
    let activeTab = $state<WizardStepId>("master");
    let inheritorMode = $state<"contact" | "direct">("direct");
    let formData = $state(createDefaultClientFormData());
    let assignedUserId = $state("");
    let signatureBlob = $state<Blob | null>(null);
    let signatureDataUrl = $state<string>("");
    let signatureFile = $state<File | null>(null);
    let isSignatureModalOpen = $state(false);

    let isOwner = $derived(rbacService.isOwner);
    let availableCaregivers = $derived.by(() => {
        const allUsers = orgaStore.users?.data || [];
        if (!formData.company) return allUsers;
        return allUsers.filter((u: any) => (Array.isArray(u.company) ? u.company[0] : u.company) === formData.company);
    });

    let hasMasterData = $derived(Boolean(formData.name_first.trim() || formData.name_last.trim()));
    let hasCareData = $derived(Boolean(formData.level_of_care || formData.insurance || assignedUserId));
    let hasInheritorData = $derived(Boolean(formData.contacts.length > 0));
    let hasBillingData = $derived(
        rbacService.canAccessFinances
            ? Boolean(formData.hourly_wage > 0 && formData.company)
            : Boolean(formData.notes.trim() || signatureBlob || signatureFile)
    );

    onMount(async () => {
        await Promise.all([
            orgaStore.company?.init().catch(() => {}),
            orgaStore.insurancies?.init().catch(() => {}),
            orgaStore.users?.init().catch(() => {}),
            orgaStore.retirement_homes?.init().catch(() => {}),
            orgaStore.contacts?.init().catch(() => {}),
            orgaStore.document_templates?.init().catch(() => {})
        ]);
        const draft = formDraftService.loadDraftData<typeof formData>(DRAFT_KEY);
        if (draft && !formData.name_first && !formData.name_last) {
            Object.assign(formData, draft);
            toastStore.info("Gespeicherter Formular-Entwurf wiederhergestellt.");
        }
        populateFromUrlParams(formData, $page.url.searchParams);
    });

    $effect(() => {
        if (hasMasterData) formDraftService.saveDraft(DRAFT_KEY, formData);
    });

    function selectTab(tab: WizardStepId) {
        hapticFeedback.tap();
        errorMsg = "";
        activeTab = tab;
        scrollToTop();
    }

    function nextTab() {
        hapticFeedback.tap();
        errorMsg = "";
        const order: WizardStepId[] = ["master", "care", "inheritor", "billing"];
        const idx = order.indexOf(activeTab);
        if (idx !== -1 && idx < order.length - 1) activeTab = order[idx + 1];
        scrollToTop();
    }

    function prevTab() {
        hapticFeedback.tap();
        errorMsg = "";
        const order: WizardStepId[] = ["master", "care", "inheritor", "billing"];
        const idx = order.indexOf(activeTab);
        if (idx > 0) activeTab = order[idx - 1];
        scrollToTop();
    }

    async function handleCancel() {
        hapticFeedback.tap();
        const isDirty = Boolean(formData.name_first || formData.name_last || formData.street || formData.phone);
        if (isDirty) {
            const confirmed = await formDraftService.confirmDiscard(DRAFT_KEY, () => goto("/clients"));
            if (!confirmed) return;
        }
        formDraftService.clearDraft(DRAFT_KEY);
        goto("/clients");
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        errorMsg = "";
        isLoading = true;
        try {
            const { firstName, lastName } = await submitClientRecord(
                formData, assignedUserId, inheritorMode, signatureBlob, signatureFile
            );
            formDraftService.clearDraft(DRAFT_KEY);
            hapticFeedback.success();
            toastStore.success(`Klient "${firstName} ${lastName}" erfolgreich angelegt!`);
            goto("/clients");
        } catch (err: any) {
            hapticFeedback.error();
            console.error("Fehler beim Anlegen des Klienten:", err);
            errorMsg = err.message || "Fehler beim Anlegen des Klienten.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="orga-page-header animate-enter">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <button type="button" onclick={handleCancel} class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 mb-2 transition-colors cursor-pointer touch-manipulation min-h-11 sm:min-h-0">
                <ArrowLeft class="w-4 h-4" />
                <span>Zurück zur Klientenübersicht</span>
            </button>
            <h1 class="orga-page-title flex items-center gap-3">
                <span>Neuer Klient</span>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 hidden sm:inline-block">Assistent</span>
            </h1>
            <p class="orga-page-subtitle">
                {rbacService.canAccessFinances
                    ? 'Erfassen Sie alle Stammdaten, Pflegeeinstufungen, Angehörigen-Vollmachten und Abrechnungskonditionen.'
                    : 'Erfassen Sie alle Stammdaten, Pflegeeinstufungen, Bezugspersonen und Betreuungshinweise.'}
            </p>
        </div>
    </div>
</div>

<div class="max-w-4xl mx-auto mb-12 animate-enter delay-100">
    <div class="mb-5 p-3.5 sm:p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 text-xs sm:text-sm flex items-center gap-3 shadow-2xs">
        <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-base shadow-sm">
            <Sparkles class="w-4 h-4 text-white" />
        </div>
        <div class="flex-1 min-w-0">
            <p class="font-bold text-indigo-950 dark:text-indigo-100">Flexible Schnellerfassung aktiv</p>
            <p class="text-xs text-indigo-700/90 dark:text-indigo-300 mt-0.5">Alle Eingaben sind optional und können jederzeit später ergänzt werden.</p>
        </div>
    </div>

    <ClientWizardStepper {activeTab} onSelectTab={selectTab} {hasMasterData} {hasCareData} {hasInheritorData} {hasBillingData} />

    {#if errorMsg}
        <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200 p-4 rounded-2xl mb-6 text-xs sm:text-sm font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-3 animate-enter">
            <AlertCircle class="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span class="flex-1">{errorMsg}</span>
        </div>
    {/if}

    <div class="orga-card-white p-5 sm:p-8 relative">
        <form onsubmit={onSubmit} class="space-y-6">
            {#if activeTab === "master"}
                <ClientMasterTab bind:formData {isLoading} />
            {:else if activeTab === "care"}
                <ClientCareTab bind:formData bind:assignedUserId {availableCaregivers} {isLoading} />
            {:else if activeTab === "inheritor"}
                <ClientInheritorTab bind:formData bind:inheritorMode {isLoading} />
            {:else if activeTab === "billing"}
                <ClientBillingTab 
                    bind:formData 
                    {isOwner} 
                    {isLoading}
                    {signatureBlob}
                    {signatureDataUrl}
                    {signatureFile}
                    onOpenFullscreenSignature={() => { hapticFeedback.tap(); isSignatureModalOpen = true; }}
                    onClearSignature={() => { hapticFeedback.tap(); signatureBlob = null; signatureDataUrl = ""; }}
                    onFileSelected={(file) => signatureFile = file}
                />
            {/if}

            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div>
                    {#if activeTab !== "master"}
                        <button type="button" onclick={prevTab} class="orga-button-ghost py-3 px-5 text-xs font-bold flex items-center gap-1.5 w-full sm:w-auto min-h-12 touch-manipulation" disabled={isLoading}>
                            <ArrowLeft class="w-4 h-4" />
                            <span>Zurück</span>
                        </button>
                    {:else}
                        <button type="button" onclick={handleCancel} class="orga-button-ghost py-3 px-5 text-xs font-bold text-slate-600 dark:text-slate-300 w-full sm:w-auto min-h-12 touch-manipulation">
                            <span>Abbrechen</span>
                        </button>
                    {/if}
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                    {#if activeTab !== "billing"}
                        <button type="button" onclick={nextTab} class="orga-button-primary py-3 px-6 text-xs font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-12 touch-manipulation">
                            <span>Weiter zu Schritt {activeTab === "master" ? "2" : activeTab === "care" ? "3" : "4"}</span>
                            <ArrowRight class="w-4 h-4" />
                        </button>
                    {:else}
                        <button type="submit" class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 py-3 px-8 text-xs font-bold flex items-center justify-center gap-2 w-full sm:w-auto min-h-12 touch-manipulation" disabled={isLoading}>
                            {#if isLoading}
                                <span class="animate-spin text-sm">⏳</span>
                                <span>Wird gespeichert...</span>
                            {:else}
                                <Check class="w-4 h-4" />
                                <span>Klient jetzt anlegen</span>
                            {/if}
                        </button>
                    {/if}
                </div>
            </div>
        </form>
    </div>
</div>

<ClientSignatureModal 
    isOpen={isSignatureModalOpen}
    initialImageDataUrl={signatureDataUrl}
    onClose={() => isSignatureModalOpen = false}
    onApply={(blob, dataUrl) => {
        signatureBlob = blob;
        signatureDataUrl = dataUrl;
        isSignatureModalOpen = false;
        if (blob) {
            hapticFeedback.success();
            toastStore.success("Unterschrift erfolgreich übernommen.");
        }
    }}
/>