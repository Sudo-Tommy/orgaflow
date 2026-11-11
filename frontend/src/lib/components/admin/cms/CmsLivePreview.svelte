<script lang="ts">
    import { landingCmsStore, type CmsData } from '$lib/services/landingCmsStore.svelte';
    import { Eye, ExternalLink } from 'lucide-svelte';

    interface Props {
        activeSection: keyof CmsData;
    }

    let { activeSection }: Props = $props();

    let content = $derived(landingCmsStore.content);
</script>

<div class="bg-amber-50/50 dark:bg-slate-900/60 p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 shadow-inner space-y-3">
    <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
            <Eye class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Sofort-Vorschau: {activeSection.toUpperCase()}</span>
        </h4>
        <a href="/" target="_blank" class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold flex items-center gap-1">
            <span>Echte Startseite öffnen</span>
            <ExternalLink class="w-3 h-3" />
        </a>
    </div>

    <div class="bg-white dark:bg-slate-950 p-6 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-sm text-neutral-900 dark:text-slate-100">
        {#if activeSection === 'hero'}
            <div class="text-center py-6 space-y-4">
                <span class="bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-xs px-3.5 py-1 rounded-full">
                    {content.hero.badge}
                </span>
                <h1 class="text-3xl font-extrabold tracking-tight">{content.hero.title}</h1>
                <p class="text-sm text-neutral-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">{content.hero.subtitle}</p>
                <div class="flex gap-3 justify-center flex-wrap pt-2">
                    <button type="button" class="orga-button-primary text-xs py-2 px-4">{content.hero.cta_primary}</button>
                    <button type="button" class="orga-button-ghost text-xs py-2 px-4 border border-neutral-300 dark:border-slate-700">{content.hero.cta_secondary}</button>
                </div>
                {#if content.hero.trust_points?.length}
                    <div class="flex gap-4 justify-center text-xs font-bold text-neutral-700 dark:text-slate-300 pt-2 flex-wrap">
                        {#each content.hero.trust_points as tp}
                            <span class="flex items-center gap-1"><span class="text-emerald-500">✓</span> {tp}</span>
                        {/each}
                    </div>
                {/if}
            </div>

        {:else if activeSection === 'services'}
            <div class="space-y-4">
                <div class="text-center">
                    <h3 class="text-xl font-bold">{content.services.headline}</h3>
                    <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1">{content.services.subtitle}</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {#each content.services.items as s}
                        <div class="p-3 bg-neutral-50 dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800">
                            <span class="text-xl">{s.icon}</span>
                            <h5 class="font-bold text-xs mt-1">{s.title}</h5>
                            <p class="text-[11px] text-neutral-600 dark:text-slate-300 mt-0.5">{s.desc}</p>
                        </div>
                    {/each}
                </div>
            </div>

        {:else if activeSection === 'process'}
            <div class="space-y-4">
                <div class="text-center">
                    <h3 class="text-xl font-bold">{content.process.headline}</h3>
                    <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1">{content.process.subtitle}</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {#each content.process.steps as st}
                        <div class="p-3 bg-neutral-50 dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800">
                            <span class="text-[10px] font-bold text-amber-600 uppercase">{st.step}</span>
                            <h5 class="font-bold text-xs mt-0.5">{st.title}</h5>
                            <p class="text-[11px] text-neutral-600 dark:text-slate-300 mt-1">{st.text}</p>
                        </div>
                    {/each}
                </div>
            </div>

        {:else if activeSection === 'team'}
            <div class="space-y-4">
                <div class="text-center">
                    <h3 class="text-xl font-bold">{content.team.headline}</h3>
                    <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1">{content.team.subtitle}</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {#each content.team.members as m}
                        <div class="p-4 bg-neutral-50 dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 flex items-center gap-3">
                            <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                                {#if m.avatarUrl}
                                    <img src={m.avatarUrl} alt={m.name} class="w-full h-full object-cover" />
                                {:else}
                                    {m.name.charAt(0)}
                                {/if}
                            </div>
                            <div>
                                <h5 class="font-bold text-xs">{m.name}</h5>
                                <p class="text-[10px] text-indigo-600 font-semibold">{m.role} • {m.location}</p>
                                <p class="text-[11px] text-neutral-600 dark:text-slate-300 mt-0.5 line-clamp-2">{m.desc}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

        {:else if activeSection === 'cooperation'}
            <div class="space-y-3">
                <h4 class="font-bold text-base text-amber-900 dark:text-amber-400">{content.cooperation.headline}</h4>
                <p class="text-xs text-neutral-700 dark:text-slate-300 leading-relaxed">{content.cooperation.text}</p>
                <div class="flex flex-wrap gap-1.5 pt-2">
                    {#each content.cooperation.partner_badges as pb}
                        <span class="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 dark:bg-slate-800 rounded-md border border-neutral-200 dark:border-slate-700">{pb}</span>
                    {/each}
                </div>
            </div>

        {:else if activeSection === 'quality'}
            <div class="space-y-4">
                <div class="text-center">
                    <h3 class="text-xl font-bold">{content.quality.headline}</h3>
                    <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1">{content.quality.subtitle}</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {#each content.quality.features as q}
                        <div class="p-3 bg-neutral-50 dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800">
                            <h5 class="font-bold text-xs text-amber-700 dark:text-amber-400">{q.title}</h5>
                            <p class="text-[11px] text-neutral-600 dark:text-slate-300 mt-1">{q.text}</p>
                        </div>
                    {/each}
                </div>
            </div>

        {:else if activeSection === 'faq'}
            <div class="space-y-3">
                <div class="text-center">
                    <h3 class="text-xl font-bold">{content.faq.headline}</h3>
                    <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1">{content.faq.subtitle}</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {#each content.faq.items as item}
                        <div class="p-3 bg-neutral-50 dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800">
                            <h5 class="font-bold text-xs">{item.q}</h5>
                            <p class="text-[11px] text-neutral-600 dark:text-slate-300 mt-1">{item.a}</p>
                        </div>
                    {/each}
                </div>
            </div>

        {:else if activeSection === 'appointment'}
            <div class="text-center p-6 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <h4 class="font-bold text-base text-indigo-950 dark:text-indigo-200">{content.appointment.headline}</h4>
                <p class="text-xs text-neutral-600 dark:text-slate-400 max-w-md mx-auto my-3">{content.appointment.subtitle}</p>
                <button type="button" class="orga-button-primary text-xs py-2 px-5">{content.appointment.button_text}</button>
            </div>

        {:else if activeSection === 'contact'}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <p><strong>Telefon:</strong> {content.contact.phone_central}</p>
                <p><strong>E-Mail:</strong> {content.contact.email_central}</p>
                <p><strong>Halle (Saale):</strong> {content.contact.address_halle}</p>
                <p><strong>Wittenberg:</strong> {content.contact.address_wittenberg}</p>
                <p><strong>Öffnungszeiten Halle:</strong> {content.contact.opening_hours_halle}</p>
                <p><strong>Öffnungszeiten Wittenberg:</strong> {content.contact.opening_hours_wittenberg}</p>
            </div>
        {/if}
    </div>
</div>
