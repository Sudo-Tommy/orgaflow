<script lang="ts">
    import { onMount } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { landingCmsStore, type CmsTeamMember } from '$lib/services/landingCmsStore.svelte';
    import { Plus, Trash2, ArrowUp, ArrowDown, User, Image } from 'lucide-svelte';

    let team = $derived(landingCmsStore.content.team);

    let pbUsers = $state<any[]>([]);

    onMount(async () => {
        try {
            const list = await pb.collection('users').getFullList({ requestKey: null });
            // Regel: Alphabetische Sortierung aller Dropdown-Listen nach Anzeigenamen
            pbUsers = list.sort((a, b) => {
                const nameA = `${a.name_first || ''} ${a.name_last || ''}`.trim().toLowerCase();
                const nameB = `${b.name_first || ''} ${b.name_last || ''}`.trim().toLowerCase();
                return nameA.localeCompare(nameB, 'de');
            });
        } catch (e) {
            console.warn('[CmsTeamEditor] PocketBase Nutzer konnten nicht geladen werden:', e);
        }
    });

    function addMember() {
        team.members.push({
            id: String(Date.now()),
            name: 'Neues Teammitglied',
            role: 'Seniorenassistent/in',
            location: 'Standort Halle (Saale)',
            phone: '0345 / 213 895 20',
            email: 'info@ihre-seniorenassistenz.com',
            desc: 'Herzliche Unterstützung und Begleitung im Alltag.',
            avatarUrl: ''
        });
    }

    function removeMember(index: number) {
        if (confirm('Dieses Teammitglied wirklich entfernen?')) {
            team.members.splice(index, 1);
        }
    }

    function moveMember(index: number, direction: 'up' | 'down') {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= team.members.length) return;
        const item = team.members.splice(index, 1)[0];
        team.members.splice(target, 0, item);
    }

    function onSelectUser(member: CmsTeamMember, userId: string) {
        member.userId = userId;
        const found = pbUsers.find(u => u.id === userId);
        if (found) {
            if (!member.name || member.name === 'Neues Teammitglied') {
                member.name = `${found.name_first || ''} ${found.name_last || ''}`.trim() || found.username;
            }
            if (found.email && !member.email) {
                member.email = found.email;
            }
            if (found.avatar) {
                member.avatar = found.avatar;
                member.avatarUrl = pb.files.getURL(found, found.avatar);
            }
        }
    }
</script>

<div class="space-y-6">
    <div class="pb-3 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
        <div>
            <h3 class="font-bold text-neutral-900 dark:text-white text-base">Team & Standorte</h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400">Verwalten Sie Ansprechpartner, Standorte, Profilfotos und Kontaktdaten</p>
        </div>
        <span class="text-xl">👥</span>
    </div>

    <!-- Sektions-Header -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label for="cms-team-head" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Bereichs-Überschrift
            </label>
            <input id="cms-team-head" type="text" bind:value={team.headline} class="orga-input-clear min-h-[44px] w-full" />
        </div>
        <div>
            <label for="cms-team-sub" class="block text-xs font-bold text-neutral-600 dark:text-slate-400 uppercase mb-1">
                Bereichs-Untertitel
            </label>
            <input id="cms-team-sub" type="text" bind:value={team.subtitle} class="orga-input-clear min-h-[44px] w-full" />
        </div>
    </div>

    <!-- Teammitglieder Liste -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase">
                Aktive Teammitglieder ({team.members.length})
            </span>
            <button 
                type="button" 
                onclick={addMember} 
                class="orga-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
                <Plus class="w-4 h-4" />
                <span>Teammitglied hinzufügen</span>
            </button>
        </div>

        {#each team.members as member, idx}
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-4 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                <div class="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-slate-800 pb-2">
                    <span class="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <User class="w-3.5 h-3.5" />
                        <span>{member.name || `Mitglied ${idx + 1}`}</span>
                    </span>
                    <div class="flex items-center gap-1">
                        <button 
                            type="button" 
                            onclick={() => moveMember(idx, 'up')} 
                            disabled={idx === 0}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach oben"
                        >
                            <ArrowUp class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => moveMember(idx, 'down')} 
                            disabled={idx === team.members.length - 1}
                            class="p-1.5 text-neutral-500 hover:text-indigo-600 disabled:opacity-30 rounded cursor-pointer"
                            title="Nach unten"
                        >
                            <ArrowDown class="w-3.5 h-3.5" />
                        </button>
                        <button 
                            type="button" 
                            onclick={() => removeMember(idx)} 
                            class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer ml-1"
                            title="Mitglied entfernen"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Verknüpfung zu PocketBase Nutzer & Foto -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="cms-user-select-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">
                            Verknüpfter PocketBase-Nutzer (optional)
                        </label>
                        <select 
                            id="cms-user-select-{idx}"
                            value={member.userId || ''} 
                            onchange={(e) => onSelectUser(member, (e.target as HTMLSelectElement).value)}
                            class="w-full text-xs bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg p-2 min-h-[44px] text-neutral-900 dark:text-white"
                        >
                            <option value="">-- Kein Nutzer verknüpft (Manuell) --</option>
                            {#each pbUsers as u}
                                <option value={u.id}>
                                    {u.name_first || ''} {u.name_last || ''} ({u.email || u.username})
                                </option>
                            {/each}
                        </select>
                    </div>

                    <div>
                        <label for="cms-avatar-url-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">
                            Bild-URL oder lokaler Pfad
                        </label>
                        <div class="flex items-center gap-2">
                            <input 
                                id="cms-avatar-url-{idx}"
                                type="text" 
                                bind:value={member.avatarUrl} 
                                placeholder="/team/tommy.jpg oder https://..." 
                                class="w-full text-xs bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 rounded-lg p-2 min-h-[44px] text-neutral-900 dark:text-white" 
                            />
                            {#if member.avatarUrl}
                                <img src={member.avatarUrl} alt="Vorschau" class="w-9 h-9 rounded-full object-cover border border-neutral-300 shrink-0" />
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Stammdaten -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label for="cms-name-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Vollständiger Name</label>
                        <input id="cms-name-{idx}" type="text" bind:value={member.name} class="w-full text-xs font-bold p-2 bg-white dark:bg-slate-800 border rounded-lg min-h-[44px] text-neutral-900 dark:text-white" />
                    </div>
                    <div>
                        <label for="cms-role-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Rolle / Funktion</label>
                        <input id="cms-role-{idx}" type="text" bind:value={member.role} class="w-full text-xs p-2 bg-white dark:bg-slate-800 border rounded-lg min-h-[44px] text-neutral-900 dark:text-white" />
                    </div>
                    <div>
                        <label for="cms-location-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Standort / Region</label>
                        <input id="cms-location-{idx}" type="text" bind:value={member.location} class="w-full text-xs p-2 bg-white dark:bg-slate-800 border rounded-lg min-h-[44px] text-neutral-900 dark:text-white" />
                    </div>
                </div>

                <!-- Kontakt -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="cms-phone-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Direkte Telefonnummer</label>
                        <input id="cms-phone-{idx}" type="text" bind:value={member.phone} class="w-full text-xs p-2 bg-white dark:bg-slate-800 border rounded-lg min-h-[44px] text-neutral-900 dark:text-white" />
                    </div>
                    <div>
                        <label for="cms-email-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Direkte E-Mail</label>
                        <input id="cms-email-{idx}" type="email" bind:value={member.email} class="w-full text-xs p-2 bg-white dark:bg-slate-800 border rounded-lg min-h-[44px] text-neutral-900 dark:text-white" />
                    </div>
                </div>

                <div>
                    <label for="cms-desc-{idx}" class="block text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase mb-1">Persönliche Vorstellung / Kurzprofil</label>
                    <textarea id="cms-desc-{idx}" rows="2" bind:value={member.desc} class="w-full text-xs p-2 bg-white dark:bg-slate-800 border rounded-lg text-neutral-900 dark:text-white leading-relaxed"></textarea>
                </div>
            </div>
        {/each}
    </div>
</div>
