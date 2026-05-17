<script lang="ts">
    import { getTeamMembers } from "$lib/services/landingContentService";
    import { callPhone } from "$lib/services/navigationService";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";

    let team = $state(getTeamMembers());

    onMount(async () => {
        try {
            // Lade die registrierten Benutzer aus der Datenbank
            const users = await pb.collection('users').getFullList({ requestKey: null });
            
            // Gleiche die statischen Landingpage-Texte mit den echten Datenbank-Bildern ab
            team = team.map(member => {
                const dbUser = users.find(u => {
                    // Puffer mit Leerzeichen und Sonderzeichen entfernen für exakten Wort-Abgleich
                    const cleanMemberName = " " + member.name.toLowerCase().replace(/[(),.-]/g, ' ').replace(/\s+/g, ' ') + " ";
                    const f = (u.name_first || '').toLowerCase().replace(/[(),.-]/g, ' ').replace(/\s+/g, ' ').trim();
                    const l = (u.name_last || '').toLowerCase().replace(/[(),.-]/g, ' ').replace(/\s+/g, ' ').trim();
                    
                    if (!f && !l) return false;
                    
                    const hasF = f ? cleanMemberName.includes(` ${f} `) : false;
                    const hasL = l ? cleanMemberName.includes(` ${l} `) : false;
                    
                    // Wenn Vor- und Nachname in der DB existieren, MÜSSEN beide auf der Landingpage auftauchen
                    if (f && l) return hasF && hasL;
                    return hasF || hasL;
                });
                
                if (dbUser && dbUser.avatar) {
                    return {
                        ...member,
                        id: dbUser.id,
                        collectionId: dbUser.collectionId,
                        avatar: dbUser.avatar
                    };
                }
                return member;
            });
        } catch (err) {
            console.log("Hinweis: Bilder konnten nicht geladen werden. Bitte PocketBase API-Regeln prüfen.");
        }
    });
</script>

<div class="w-full bg-orange-50/30 py-20 px-4 border-y border-orange-100/50">
    <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Die Gesichter hinter der Hilfe</h2>
            <p class="text-lg text-brand-700/80">Kein unpersönliches Callcenter, keine nervige Warteschleifen-Musik. Bei uns landen Sie direkt bei Menschen, die Ihnen wirklich zuhören. Rufen Sie einfach an!</p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {#each team as member}
                <div class="orga-card-white p-8 text-center flex flex-col items-center group hover:-translate-y-2 transition-all duration-300 relative overflow-visible! border border-amber-50 hover:shadow-2xl hover:border-amber-200 z-10 hover:z-50">
                    <!-- Background blob -->
                    <div class="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none z-0">
                        <div class="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-100 rounded-full blur-3xl group-hover:bg-amber-200 transition-colors duration-700"></div>
                    </div>
                    <div class="relative z-10 w-full flex flex-col items-center">
                        <div class="relative z-20 w-24 h-24 bg-linear-to-br from-amber-100 to-amber-50 text-brand-800 rounded-full flex items-center justify-center text-4xl font-bold mb-5 shadow-md border-2 border-white overflow-hidden transition-all duration-500 group-hover:scale-[2] group-hover:-translate-y-6 group-hover:shadow-2xl group-hover:z-50">
                            {#if (member as any).avatar && ((member as any).avatar.startsWith('http') || (member as any).avatar.startsWith('/'))}
                                <img src={(member as any).avatar} alt={member.name} class="w-full h-full object-cover" style="image-rendering: high-quality;" />
                            {:else if (member as any).avatar && (member as any).collectionId && (member as any).id}
                                <img src={pb.files.getURL(member as any, (member as any).avatar, { thumb: '500x500' })} alt={member.name} class="w-full h-full object-cover" style="image-rendering: high-quality;" />
                            {:else if (member as any).avatarUrl}
                                <img src={(member as any).avatarUrl} alt={member.name} class="w-full h-full object-cover" style="image-rendering: high-quality;" />
                            {:else}
                                {member.initial}
                            {/if}
                        </div>
                        <h3 class="text-2xl font-bold mb-1 text-neutral-900">{member.name}</h3>
                        <p class="text-neutral-500 font-medium mb-8 text-sm uppercase tracking-wider">{member.region}</p>
                        <button onclick={() => callPhone(member.phone)} class="w-full flex justify-center items-center gap-2 bg-brand-800 hover:bg-brand-700 text-white font-bold py-3 px-6 md:px-8 rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg shadow-brand-800/30 group-hover:shadow-brand-800/50 hover:-translate-y-0.5 active:scale-95 text-lg">
                            <span class="mr-2">📞</span> {member.phone}
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>