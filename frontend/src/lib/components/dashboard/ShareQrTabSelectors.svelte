<script lang="ts">
    import type { TabType } from './shareQrUtils';

    let {
        activeTab,
        availableClients,
        selectedClientId = $bindable(''),
        availableContacts,
        selectedContactId = $bindable(''),
        vcardSource = $bindable<'me' | 'contact'>('me'),
        selectedVcardContactId = $bindable(''),
        todaysAppointments,
        selectedAppointmentId = $bindable('')
    }: {
        activeTab: TabType;
        availableClients: any[];
        selectedClientId: string;
        availableContacts: any[];
        selectedContactId: string;
        vcardSource: 'me' | 'contact';
        selectedVcardContactId: string;
        todaysAppointments: any[];
        selectedAppointmentId: string;
    } = $props();

    let sortedClients = $derived(
        [...availableClients].sort((a, b) => {
            const nameA = `${a.name_last || ''} ${a.name_first || ''}`.trim();
            const nameB = `${b.name_last || ''} ${b.name_first || ''}`.trim();
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        })
    );

    let sortedContacts = $derived(
        [...availableContacts].sort((a, b) => {
            const nameA = (a.name_last ? `${a.name_last} ${a.name_first || ''}` : a.company_name || a.email || '').trim();
            const nameB = (b.name_last ? `${b.name_last} ${b.name_first || ''}` : b.company_name || b.email || '').trim();
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        })
    );
</script>

{#if activeTab === 'client-portal' || activeTab === 'portal'}
    <div class="space-y-1.5">
        <label for="qr-client-select" class="block text-xs font-bold text-neutral-700 dark:text-slate-300">
            Klienten auswählen:
        </label>
        {#if sortedClients.length > 0}
            <select
                id="qr-client-select"
                bind:value={selectedClientId}
                class="w-full h-11 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
                {#each sortedClients as c}
                    <option value={c.id}>
                        {c.name_last ? `${c.name_last}, ${c.name_first || ''}` : (c.name_first || 'Klient')} {c.city ? `(${c.city})` : ''}
                    </option>
                {/each}
            </select>
        {:else}
            <p class="text-xs text-neutral-400 p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl">
                Keine Klienten in Ihrer Übersicht verfügbar.
            </p>
        {/if}
    </div>
{:else if activeTab === 'contact-portal'}
    <div class="space-y-1.5">
        <div class="flex items-center justify-between">
            <label for="qr-contact-select" class="block text-xs font-bold text-neutral-700 dark:text-slate-300">
                Kontakt / Angehörige(n) auswählen:
            </label>
            <span class="text-[11px] text-neutral-400 font-medium">
                {sortedContacts.length} Kontakte
            </span>
        </div>
        {#if sortedContacts.length > 0}
            <select
                id="qr-contact-select"
                bind:value={selectedContactId}
                class="w-full h-11 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
                {#each sortedContacts as c}
                    <option value={c.id}>
                        {#if c.name_last || c.name_first}
                            {c.name_last ? `${c.name_last}, ${c.name_first || ''}` : c.name_first} {c.company_name ? `(${c.company_name})` : ''} {c.city ? `· ${c.city}` : ''}
                        {:else if c.company_name}
                            {c.company_name} {c.city ? `· ${c.city}` : ''}
                        {:else}
                            {c.email || 'Kontakt ohne Namen'}
                        {/if}
                    </option>
                {/each}
            </select>
        {:else}
            <p class="text-xs text-neutral-400 p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl">
                Keine Kontakte im Adressbuch hinterlegt.
            </p>
        {/if}
    </div>
{:else if activeTab === 'vcard'}
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-slate-300">Visitenkarte erstellen für:</span>
            <div class="inline-flex bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
                <button 
                    type="button" 
                    onclick={() => vcardSource = 'me'}
                    class="px-2.5 py-1 rounded-md transition-all cursor-pointer {vcardSource === 'me' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-slate-200'}"
                >
                    Mein Profil
                </button>
                <button 
                    type="button" 
                    onclick={() => vcardSource = 'contact'}
                    class="px-2.5 py-1 rounded-md transition-all cursor-pointer {vcardSource === 'contact' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-slate-200'}"
                >
                    Kontakt weitergeben
                </button>
            </div>
        </div>

        {#if vcardSource === 'contact'}
            <div class="space-y-1">
                <label for="qr-vcard-contact-select" class="block text-[11px] font-semibold text-neutral-600 dark:text-slate-400">
                    Zu teilenden Kontakt wählen:
                </label>
                {#if sortedContacts.length > 0}
                    <select
                        id="qr-vcard-contact-select"
                        bind:value={selectedVcardContactId}
                        class="w-full h-11 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {#each sortedContacts as c}
                            <option value={c.id}>
                                {#if c.name_last || c.name_first}
                                    {c.name_last ? `${c.name_last}, ${c.name_first || ''}` : c.name_first} {c.company_name ? `(${c.company_name})` : ''}
                                {:else}
                                    {c.company_name || c.email || 'Kontakt'}
                                {/if}
                            </option>
                        {/each}
                    </select>
                {:else}
                    <p class="text-xs text-neutral-400 p-2.5 bg-neutral-50 dark:bg-slate-800 rounded-xl">Keine Kontakte vorhanden.</p>
                {/if}
            </div>
        {:else}
            <div class="p-3 bg-neutral-50 dark:bg-slate-800/80 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs text-neutral-600 dark:text-slate-300">
                <p class="font-bold text-neutral-900 dark:text-white mb-0.5">Ihre persönliche Mitarbeiter-Visitenkarte</p>
                <p>Beim Scannen öffnet sich direkt der Dialog „Neuen Kontakt anlegen“ mit Ihren hinterlegten Firmendaten und Rufnummern.</p>
            </div>
        {/if}
    </div>
{:else if activeTab === 'appointment'}
    <div class="space-y-1.5">
        <label for="qr-app-select" class="block text-xs font-bold text-neutral-700 dark:text-slate-300">
            Heutigen Termin auswählen:
        </label>
        {#if todaysAppointments.length > 0}
            <select
                id="qr-app-select"
                bind:value={selectedAppointmentId}
                class="w-full h-11 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
                {#each todaysAppointments as app}
                    <option value={app.id}>
                        {new Date(app.appointment || '').toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr · {app.title || 'Termin'}
                    </option>
                {/each}
            </select>
        {:else}
            <p class="text-xs text-neutral-400 p-2.5 bg-neutral-50 dark:bg-slate-800 rounded-xl">
                Heute sind keine Termine in Ihrem Kalender hinterlegt.
            </p>
        {/if}
    </div>
{/if}
