<!-- src/lib/components/drive/GoogleDrivePickerModal.svelte -->
<script lang="ts">
    import { X, Search, HardDrive, RefreshCw, Loader2, Check } from 'lucide-svelte';
    import { googleDriveService, type DriveItem, type GoogleDriveStatus, type DriveListError } from '$lib/services/googleDriveService';
    import { toastStore } from '$lib/services/toastService.svelte';
    import GoogleDriveItemList from './GoogleDriveItemList.svelte';
    import GoogleDriveConnectPrompt from './GoogleDriveConnectPrompt.svelte';

    let {
        isOpen = false,
        title = "Google Drive Dateien auswählen",
        onclose,
        onselect
    } = $props<{
        isOpen: boolean;
        title?: string;
        onclose: () => void;
        onselect: (files: File[]) => Promise<void> | void;
    }>();

    let dialog = $state<HTMLDialogElement | null>(null);
    let status = $state<GoogleDriveStatus>({ connected: false, hasCredentials: false, googleEmail: '', appName: 'Seniorenassistenz OrgaFlow' });
    let items = $state<DriveItem[]>([]);
    let selectedIds = $state<Set<string>>(new Set());
    let currentFolderId = $state<string>('root');
    let breadcrumbs = $state<{ id: string; name: string }[]>([{ id: 'root', name: 'Mein Drive' }]);
    let searchQuery = $state('');
    let isLoading = $state(false);
    let isConnecting = $state(false);
    let isImporting = $state(false);
    let importProgressText = $state('');
    let needsDriveConsent = $state(false);
    let driveApiDisabled = $state(false);
    let activationUrl = $state<string | null>(null);
    let consentScreenUrl = $state<string | null>(null);

    $effect(() => {
        if (isOpen) {
            dialog?.showModal();
            initModal();
        } else {
            dialog?.close();
            selectedIds.clear();
            searchQuery = '';
        }
    });

    async function initModal() {
        isLoading = true;
        try {
            status = await googleDriveService.getStatus();
            activationUrl = status.activationUrl || null;
            consentScreenUrl = status.consentScreenUrl || null;
            if (status.connected) await fetchFolder('root', 'Mein Drive');
        } finally {
            isLoading = false;
        }
    }

    async function handleConnect() {
        isConnecting = true;
        try {
            const res = await googleDriveService.openOAuthPopup();
            status = await googleDriveService.getStatus();
            if (res.success || status.connected) {
                toastStore.success(`Mit Seniorenassistenz OrgaFlow verbunden (${res.email || status.googleEmail || 'Google-Konto'}).`);
                needsDriveConsent = false;
                driveApiDisabled = false;
                await fetchFolder('root', 'Mein Drive');
            } else {
                toastStore.error("Verbindung abgebrochen oder nicht abgeschlossen.");
            }
        } catch (err: any) {
            toastStore.error(err.message || "Google-Verknüpfung fehlgeschlagen.");
        } finally {
            isConnecting = false;
        }
    }

    async function fetchFolder(folderId: string, folderName?: string) {
        isLoading = true;
        try {
            currentFolderId = folderId;
            const res = await googleDriveService.listFiles(folderId === 'root' ? undefined : folderId);
            items = res.files;
            needsDriveConsent = false;
            driveApiDisabled = false;
            if (folderName && !breadcrumbs.some(b => b.id === folderId)) {
                breadcrumbs = [...breadcrumbs, { id: folderId, name: folderName }];
            }
        } catch (err: any) {
            const driveErr = err as DriveListError;
            const code = driveErr?.errorCode || driveErr?.message || '';
            if (code === 'GOOGLE_DRIVE_API_DISABLED') {
                driveApiDisabled = true;
                needsDriveConsent = false;
                if (driveErr.activationUrl) activationUrl = driveErr.activationUrl;
                if (driveErr.consentScreenUrl) consentScreenUrl = driveErr.consentScreenUrl;
            } else if (code.includes('GOOGLE_AUTH_EXPIRED') || code.includes('GOOGLE_SCOPE_MISSING') || code.includes('GOOGLE_NOT_CONNECTED') || code.includes('401')) {
                needsDriveConsent = true;
                driveApiDisabled = false;
            } else {
                toastStore.error(driveErr.message || "Dateien konnten nicht geladen werden.");
            }
        } finally {
            isLoading = false;
        }
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return fetchFolder(currentFolderId);
        isLoading = true;
        try {
            const res = await googleDriveService.listFiles(undefined, searchQuery.trim());
            items = res.files;
        } catch {
            toastStore.error("Suchanfrage fehlgeschlagen.");
        } finally {
            isLoading = false;
        }
    }

    function navigateBreadcrumb(index: number) {
        const target = breadcrumbs[index];
        breadcrumbs = breadcrumbs.slice(0, index + 1);
        fetchFolder(target.id);
    }

    function toggleSelect(item: DriveItem) {
        if (item.isFolder) { fetchFolder(item.id, item.name); return; }
        const next = new Set(selectedIds);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        selectedIds = next;
    }

    const sortedItems = $derived.by(() => [...items].sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
    }));

    async function submitSelection() {
        if (selectedIds.size === 0) return;
        isImporting = true;
        const selectedItems = items.filter(it => selectedIds.has(it.id));
        const downloadedFiles: File[] = [];
        try {
            for (let i = 0; i < selectedItems.length; i++) {
                const item = selectedItems[i];
                importProgressText = `Lade "${item.name}" herunter (${i + 1}/${selectedItems.length})...`;
                downloadedFiles.push(await googleDriveService.downloadAsFile(item));
            }
            importProgressText = 'Dateien werden hinzugefügt...';
            await onselect(downloadedFiles);
            onclose();
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Importieren.");
        } finally {
            isImporting = false;
            importProgressText = '';
        }
    }
</script>

{#if isOpen}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs w-full max-w-xl mx-auto my-auto rounded-3xl border-none outline-none animate-enter z-50"
        onclick={(e) => { if (e.target === dialog) onclose(); }}
        oncancel={(e) => { e.preventDefault(); onclose(); }}
    >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full h-auto flex flex-col shadow-2xl">
            <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-850/50 rounded-t-3xl">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <HardDrive class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">
                            {status.connected ? `Seniorenassistenz OrgaFlow · Verbunden als ${status.googleEmail}` : 'Seniorenassistenz OrgaFlow · Google-Konto verknüpfen'}
                        </p>
                    </div>
                </div>
                <button type="button" onclick={onclose} class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer touch-manipulation" aria-label="Schließen">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <div class="p-4 sm:p-5 flex-1 space-y-3.5">
                {#if !status.connected || needsDriveConsent || driveApiDisabled}
                    <GoogleDriveConnectPrompt {needsDriveConsent} {driveApiDisabled} googleEmail={status.googleEmail} {activationUrl} {consentScreenUrl} {isConnecting} {isLoading} onConnect={handleConnect} onRetry={() => fetchFolder('root', 'Mein Drive')} />
                {:else}
                    <div class="flex items-center gap-2">
                        <div class="relative flex-1">
                            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" bind:value={searchQuery} onkeydown={(e) => { if (e.key === 'Enter') handleSearch(); }} placeholder="In Google Drive suchen..." class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
                        </div>
                        <button type="button" onclick={() => fetchFolder(currentFolderId)} disabled={isLoading} class="p-2 min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 touch-manipulation" title="Aktualisieren">
                            <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" />
                        </button>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto pb-1 scrollbar-thin">
                        {#each breadcrumbs as b, i}
                            {#if i > 0}<span class="text-slate-300 dark:text-slate-600">/</span>{/if}
                            <button type="button" onclick={() => navigateBreadcrumb(i)} class="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium whitespace-nowrap cursor-pointer touch-manipulation {i === breadcrumbs.length - 1 ? 'text-slate-900 dark:text-white font-bold' : ''}">{b.name}</button>
                        {/each}
                    </div>
                    {#if isLoading}
                        <div class="py-12 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                            <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
                            <span>Dateien werden aus Google Drive geladen...</span>
                        </div>
                    {:else if sortedItems.length === 0}
                        <div class="py-12 text-center text-xs text-slate-400">Keine Dateien in diesem Ordner gefunden.</div>
                    {:else}
                        <GoogleDriveItemList items={sortedItems} {selectedIds} ontoggle={toggleSelect} />
                    {/if}
                {/if}
            </div>

            <div class="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-850/50">
                <span class="text-xs text-slate-500 font-medium">
                    {#if selectedIds.size > 0}
                        <span class="font-bold text-indigo-600 dark:text-indigo-400">{selectedIds.size}</span> Datei(en) ausgewählt
                    {:else}
                        Klicken zum Auswählen
                    {/if}
                </span>
                <div class="flex items-center gap-2">
                    <button type="button" onclick={onclose} disabled={isImporting} class="min-h-11 px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer touch-manipulation">Abbrechen</button>
                    {#if status.connected && !needsDriveConsent && !driveApiDisabled}
                        <button type="button" onclick={submitSelection} disabled={selectedIds.size === 0 || isImporting} class="orga-button-primary min-h-11 px-4 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 touch-manipulation">
                            {#if isImporting}
                                <Loader2 class="w-3.5 h-3.5 animate-spin" />
                                <span>{importProgressText || 'Importiere...'}</span>
                            {:else}
                                <Check class="w-4 h-4" />
                                <span>{selectedIds.size > 0 ? `${selectedIds.size} Datei(en) importieren` : 'Dateien importieren'}</span>
                            {/if}
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    </dialog>
{/if}
