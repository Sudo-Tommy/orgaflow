<script lang="ts">
    import { getTeamMembers } from "$lib/services/landingContentService";
    import { callPhone } from "$lib/services/navigationService";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";

    const localAvatarsGlob = import.meta.glob('$lib/assets/team/*.{jpg,jpeg,png,webp}', { 
        eager: true, 
        query: { enhanced: true } 
    });

    let headline = $derived(landingCmsStore.content.team?.headline || "Die Gesichter hinter der Hilfe");
    let subtitle = $derived(landingCmsStore.content.team?.subtitle || "Kein unpersönliches Callcenter, keine nervige Warteschleifen-Musik. Bei uns landen Sie direkt bei Menschen, die Ihnen wirklich zuhören. Rufen Sie einfach an!");

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
            const cmsMembers = landingCmsStore.content.team?.members;
            if (Array.isArray(cmsMembers) && cmsMembers.length > 0) {
                team = cmsMembers.map(m => {
                    const firstName = m.name.split(' ')[0].toLowerCase();
                    let enhancedAvatar = null;
                    for (const path in localAvatarsGlob) {
                        if (path.toLowerCase().includes(`/${firstName}.`)) {
                            enhancedAvatar = (localAvatarsGlob[path] as any).default;
                            break;
                        }
                    }
                    return {
                        id: m.id,
                        name: m.name,
                        initial: m.name.charAt(0),
                        region: m.location || m.role,
                        phone: m.phone,
                        avatar: m.avatar || '',
                        avatarUrl: m.avatarUrl || '',
                        enhancedAvatar
                    };
                });
            }

            const users = await pb.collection('users').getFullList({ requestKey: null });
            team = team.map(member => {
                const dbUser = users.find(u => {
                    const cleanMemberName = " " + member.name.toLowerCase().replace(/[(),.-]/g, ' ').replace(/\s+/g, ' ') + " ";
                    const f = (u.name_first || '').toLowerCase().replace(/[(),.-]/g, ' ').replace(/\s+/g, ' ').trim();
                    const l = (u.name_last || '').toLowerCase().replace(/[(),.-]/g, ' ').replace(/\s+/g, ' ').trim();
                    if (!f && !l) return false;
                    const hasF = f ? cleanMemberName.includes(` ${f} `) : false;
                    const hasL = l ? cleanMemberName.includes(` ${l} `) : false;
                    if (f && l) return hasF && hasL;
                    return hasF || hasL;
                });
                
                if (dbUser && dbUser.avatar && !member.avatarUrl) {
                    return {
                        ...member,
                        ...dbUser,
                        avatar: dbUser.avatar
                    };
                }
                return member;
            });
        } catch (err) {
            console.log("Hinweis: Live-Profilbilder aus der Datenbank wurden übersprungen.");
        }
    });
</script>

<div class="w-full bg-orange-50/30 dark:bg-slate-900/30 py-20 px-4 border-y border-orange-100/50 dark:border-slate-800 transition-colors">
    <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">{headline}</h2>
            <p class="text-lg text-brand-700/80 dark:text-amber-300/90">{subtitle}</p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {#each team as member}
                <div class="orga-card-white p-8 text-center flex flex-col items-center group hover:-translate-y-2 transition-all duration-300 relative overflow-visible! border border-amber-50 dark:border-slate-800 hover:shadow-2xl hover:border-amber-200 dark:hover:border-slate-700 z-10 hover:z-50">
                    <div class="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none z-0">
                        <div class="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-100 dark:bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-colors duration-700"></div>
                    </div>
                    <div class="relative z-10 w-full flex flex-col items-center">
                        <div class="relative z-20 w-24 h-24 mb-5 flex items-center justify-center">
                            <div class="absolute -inset-12 scale-50 group-hover:scale-100 group-hover:-translate-y-6 transition-transform duration-500 ease-out z-50 origin-center" style="will-change: transform;">
                                <div class="w-full h-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-slate-800 dark:to-slate-700 text-brand-800 dark:text-amber-300 rounded-full flex items-center justify-center text-[72px] font-bold shadow-[0_10px_30px_rgba(0,0,0,0.15)] group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] border-4 border-white dark:border-slate-800 overflow-hidden transition-shadow duration-500">
                                {#if (member as any).enhancedAvatar}
                                    <enhanced:img src={(member as any).enhancedAvatar} alt={member.name} class="w-full h-full object-cover" />
                                {:else if (member as any).avatarUrl}
                                    <img src={(member as any).avatarUrl} alt={member.name} class="w-full h-full object-cover" />
                                {:else if (member as any).avatar && (member as any).collectionId && (member as any).id}
                                    <img src={pb.files.getURL(member as any, (member as any).avatar)} alt={member.name} class="w-full h-full object-cover" />
                                {:else}
                                    {member.initial}
                                {/if}
                                </div>
                            </div>
                        </div>
                        <h3 class="text-2xl font-bold mb-1 text-neutral-900 dark:text-white">{member.name}</h3>
                        <p class="text-neutral-500 dark:text-slate-400 font-medium mb-8 text-sm uppercase tracking-wider">{member.region}</p>
                        <button onclick={() => callPhone(member.phone)} class="w-full min-h-[44px] flex justify-center items-center gap-2 bg-brand-800 hover:bg-brand-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-bold py-3 px-6 md:px-8 rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg shadow-brand-800/30 dark:shadow-amber-600/30 group-hover:shadow-brand-800/50 hover:-translate-y-0.5 active:scale-95 text-lg cursor-pointer">
                            <span class="mr-2">📞</span> {member.phone}
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>