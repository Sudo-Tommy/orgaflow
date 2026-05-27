<script lang="ts">
    import { getTeamMembers } from "$lib/services/landingContentService";
    import { callPhone } from "$lib/services/navigationService";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";

    // Dynamischer Import aller lokalen Bilder (falls vorhanden), ansonsten kein Fehler!
    const localAvatarsGlob = import.meta.glob('$lib/assets/team/*.{jpg,jpeg,png,webp}', { 
        eager: true, 
        query: { enhanced: true } 
    });

    // 1. Lokale Bilder SOFORT beim Start zuweisen, falls sie gefunden wurden
    let team = $state(getTeamMembers().map(member => {
        const firstName = member.name.split(' ')[0].toLowerCase();
        let enhancedAvatar = null;
        for (const path in localAvatarsGlob) {
            if (path.toLowerCase().includes(`/${firstName}.`)) {
                enhancedAvatar = (localAvatarsGlob[path] as any).default;
                break;
            }
        }
        return { ...member, enhancedAvatar };
    }));

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
                        ...dbUser,
                        id: dbUser.id,
                        collectionId: dbUser.collectionId,
                        avatar: dbUser.avatar
                    };
                }
                return member;
            });
        } catch (err) {
            console.log("Hinweis: Live-Profilbilder aus der Datenbank wurden aufgrund von Gast-Rechten übersprungen.");
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
                        <!-- Statischer Platzhalter, damit das Layout nicht springt -->
                        <div class="relative z-20 w-24 h-24 mb-5 flex items-center justify-center">
                            <!-- Hardwarebeschleunigter Container: Wird in max. Größe (192x192px) gerendert und per CSS-Transform herunterskaliert. Garantiert 100% scharfe Bilder ohne Artefakte beim Vergrößern! -->
                            <div class="absolute -inset-12 scale-50 group-hover:scale-100 group-hover:-translate-y-6 transition-transform duration-500 ease-out z-50 origin-center" style="will-change: transform;">
                                <div class="w-full h-full bg-linear-to-br from-amber-100 to-amber-50 text-brand-800 rounded-full flex items-center justify-center text-[72px] font-bold shadow-[0_10px_30px_rgba(0,0,0,0.15)] group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] border-4 border-white overflow-hidden transition-shadow duration-500">
                                {#if (member as any).enhancedAvatar}
                                    <enhanced:img src={(member as any).enhancedAvatar} alt={member.name} class="w-full h-full object-cover" />
                                {:else if (member as any).avatar && ((member as any).avatar.startsWith('http') || (member as any).avatar.startsWith('/'))}
                                    <img src={(member as any).avatar} alt={member.name} class="w-full h-full object-cover" />
                                {:else if (member as any).avatar && (member as any).collectionId && (member as any).id}
                                    <img src={pb.files.getURL(member as any, (member as any).avatar)} alt={member.name} class="w-full h-full object-cover" />
                                {:else if (member as any).avatarUrl}
                                    <img src={(member as any).avatarUrl} alt={member.name} class="w-full h-full object-cover" />
                                {:else}
                                    {member.initial}
                                {/if}
                                </div>
                            </div>
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