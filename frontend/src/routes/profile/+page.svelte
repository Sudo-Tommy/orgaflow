<script lang="ts">
    import { useProfileService } from "$lib/services/profileService.svelte";
    import ProfileDataCard from "$lib/components/profile/ProfileDataCard.svelte";
    import ProfileSecurityCard from "$lib/components/profile/ProfileSecurityCard.svelte";
    import ProfileInfoCard from "$lib/components/profile/ProfileInfoCard.svelte";
    import ProfileSignatureCard from "$lib/components/profile/ProfileSignatureCard.svelte";
    import ReminderSettings from "$lib/components/settings/ReminderSettings.svelte";
    import LockSettings from "$lib/components/settings/LockSettings.svelte";
    import BackgroundLocationSetup from "$lib/components/settings/BackgroundLocationSetup.svelte";
    import { onMount } from "svelte";

    const profileService = useProfileService();

    onMount(() => {
        profileService.load();
    });
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Mein Profil</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier Ihre persönlichen Daten und Sicherheitseinstellungen.</p>
    </div>
</div>

{#if !profileService.isLoaded}
    <div class="text-center py-12 text-neutral-500 font-medium animate-pulse animate-enter delay-100">Lade Profil...</div>
{:else}
    {#if profileService.successMsg}
        <div class="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-sm font-medium border border-emerald-100 animate-enter">{profileService.successMsg}</div>
    {/if}
    {#if profileService.errorMsg}
        <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 animate-enter">{profileService.errorMsg}</div>
    {/if}

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-12 animate-enter delay-100">
        <div class="xl:col-span-2 space-y-8">
            <ProfileDataCard bind:avatarFile={profileService.avatarFile} bind:deleteAvatar={profileService.deleteAvatar} formData={profileService.formData} existingAvatarUrl={profileService.existingAvatarUrl} isLoading={profileService.isLoading} onSave={profileService.saveProfile} />
            <ProfileSignatureCard bind:signFile={profileService.signFile} bind:deleteSign={profileService.deleteSign} existingSignUrl={profileService.existingSignUrl} isLoading={profileService.isLoading} onSave={profileService.saveProfile} />
            <ReminderSettings />
        </div>
        <div class="xl:col-span-1 space-y-8">
            <ProfileInfoCard record={profileService.recordData} />
            <LockSettings />
            <BackgroundLocationSetup />
            <ProfileSecurityCard passwordData={profileService.passwordData} isLoading={profileService.isLoading} onSave={profileService.savePassword} />
        </div>
    </div>
{/if}