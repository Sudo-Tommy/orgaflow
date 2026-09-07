<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import SystemConfigForm, { type SystemConfigData } from '$lib/components/admin/SystemConfigForm.svelte';

    $effect(() => {
        if (!rbacService.canAccessSystemPrompts) {
            toastStore.warning("Nur für Inhaber zugänglich.");
            goto('/admin');
        }
    });

    let configData = $state<SystemConfigData>({
        instanceName: 'OrgaFlow Produktivinstanz',
        systemInstruction: 'Standard-Richtlinien für automatisierte Text-Optimierung und Berichterstellung gemäß DIN 5008 und GoBD.',
        contactEmail: 'admin@ihre-seniorenassistenz.com',
        enableAutoAudit: true,
        maintenanceMode: false,
        autoSyncIntervalMinutes: 15
    });

    let isLoading = $state(true);

    const STORAGE_KEY = 'orgaflow_system_config';

    onMount(async () => {
        try {
            // Versuche Konfiguration aus PocketBase oder lokalem Cache zu laden
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem(STORAGE_KEY);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        configData = { ...configData, ...parsed };
                    } catch (e) {
                        console.warn("Fehler beim Parsen der lokalen Konfiguration:", e);
                    }
                }
            }

            // Falls in PocketBase eine System-Konfiguration hinterlegt ist
            try {
                const record = await pb.collection('system_prompts').getFirstListItem('title = "System-Konfiguration"', {
                    requestKey: null
                });
                if (record && record.metadata) {
                    configData = {
                        ...configData,
                        instanceName: record.metadata.instanceName || configData.instanceName,
                        systemInstruction: record.prompt_content || configData.systemInstruction,
                        contactEmail: record.metadata.contactEmail || configData.contactEmail,
                        enableAutoAudit: record.metadata.enableAutoAudit ?? configData.enableAutoAudit,
                        maintenanceMode: record.metadata.maintenanceMode ?? configData.maintenanceMode,
                        autoSyncIntervalMinutes: record.metadata.autoSyncIntervalMinutes ?? configData.autoSyncIntervalMinutes
                    };
                }
            } catch {
                // Silent fallback auf Standard / Cache
            }
        } finally {
            isLoading = false;
        }
    });

    async function handleSave(payload: SystemConfigData) {
        try {
            configData = payload;
            
            // 1. Lokaler Speicher
            if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            }

            // 2. PocketBase Synchronisation (in system_prompts oder settings)
            try {
                const existing = await pb.collection('system_prompts').getFirstListItem('title = "System-Konfiguration"', {
                    requestKey: null
                }).catch(() => null);

                const dataToSave = {
                    title: 'System-Konfiguration',
                    prompt_content: payload.systemInstruction,
                    status: 'applied' as const,
                    metadata: {
                        is_system_config: true,
                        instanceName: payload.instanceName,
                        contactEmail: payload.contactEmail,
                        enableAutoAudit: payload.enableAutoAudit,
                        maintenanceMode: payload.maintenanceMode,
                        autoSyncIntervalMinutes: payload.autoSyncIntervalMinutes,
                        updatedAt: new Date().toISOString()
                    }
                };

                if (existing) {
                    await pb.collection('system_prompts').update(existing.id, dataToSave);
                } else {
                    await pb.collection('system_prompts').create(dataToSave);
                }
            } catch (err: any) {
                console.warn("[SystemConfig] PocketBase Update Fallback:", err.message);
            }

            toastStore.success("System-Konfiguration erfolgreich gespeichert und aktiviert! ✅");
        } catch (err: any) {
            console.error("[SystemConfig Save Error]:", err);
            toastStore.error("Fehler beim Speichern: " + err.message);
            throw err;
        }
    }

    function handleCancel() {
        goto('/admin');
    }
</script>

<svelte:head>
    <title>System-Administration & Konfiguration | OrgaFlow</title>
</svelte:head>

{#if isLoading}
    <div class="flex items-center justify-center min-h-screen bg-slate-50">
        <div class="text-center space-y-3">
            <div class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-xs text-slate-500 font-medium">Lade System-Konfiguration...</p>
        </div>
    </div>
{:else}
    <SystemConfigForm 
        data={configData} 
        onSave={handleSave} 
        onCancel={handleCancel} 
    />
{/if}
