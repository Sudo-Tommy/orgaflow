<script lang="ts">
    import { onMount } from 'svelte';
    import { landingCmsStore, type CmsData } from '$lib/services/landingCmsStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { Save, RefreshCw, Eye, EyeOff, CheckCircle2, Sliders, ExternalLink, Check } from 'lucide-svelte';

    let activeSection = $state<keyof CmsData>('hero');
    let showLivePreview = $state(false);

    onMount(async () => {
        await landingCmsStore.init();
    });

    async function handleSaveSection(key: keyof CmsData) {
        try {
            await landingCmsStore.saveSection(key);
        } catch (e: any) {
            console.error("Speichern fehlgeschlagen:", e);
        }
    }

    async function handleSaveAll() {
        try {
            await landingCmsStore.saveAll();
        } catch (e: any) {
            console.error("Alles speichern fehlgeschlagen:", e);
        }
    }
</script>

<div class="space-y-6">
    <!-- Header Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm">
        <div>
            <h2 class="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <span>🌐</span> Landing-Page CMS
            </h2>
            <p class="text-xs text-neutral-500">Zentrale Verwaltung der Texte für Website, Werbemittel und KI-Generierung</p>
        </div>
        
        <div class="flex items-center gap-3 flex-wrap">
            <button 
                type="button" 
                onclick={() => landingCmsStore.load()} 
                class="orga-button-ghost text-xs py-2 px-3 flex items-center gap-1.5 min-h-[44px]"
                disabled={landingCmsStore.isLoading || landingCmsStore.isSaving}
                title="Aktuelle Inhalte aus PocketBase neu laden"
            >
                <RefreshCw class="w-3.5 h-3.5 {landingCmsStore.isLoading ? 'animate-spin' : ''}" />
                <span>Neu laden</span>
            </button>

            <button 
                type="button" 
                onclick={() => showLivePreview = !showLivePreview} 
                class="orga-button-ghost text-xs py-2 px-3.5 flex items-center gap-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 min-h-[44px]"
                title="Live-Vorschau der bearbeiteten Sektion umschalten"
            >
                <Eye class="w-4 h-4 text-indigo-600" />
                <span>{showLivePreview ? 'Vorschau schließen' : 'Live-Vorschau'}</span>
            </button>

            <button 
                type="button" 
                onclick={handleSaveAll} 
                class="orga-button-primary text-xs py-2.5 px-5 flex items-center gap-1.5 shadow-brand-600/20 min-h-[44px]"
                disabled={landingCmsStore.isSaving}
            >
                <Save class="w-4 h-4" />
                <span>{landingCmsStore.isSaving ? "Speichert..." : "Alle Sektionen speichern"}</span>
            </button>
        </div>
    </div>

    <!-- Navigation Tabs mit Aktivitäts-Badge -->
    <div class="flex gap-2 overflow-x-auto pb-2 border-b border-neutral-200 custom-scrollbar">
        {#each [
            { key: 'hero', label: '🚀 Hero & Start', desc: 'Hauptüberschrift & Call-To-Action' },
            { key: 'services', label: '🛠️ Leistungen', desc: 'Leistungsbausteine' },
            { key: 'team', label: '👥 Team & Standorte', desc: 'Steckbriefe Halle & Wittenberg' },
            { key: 'cooperation', label: '💶 Kassen & Pflegegrade', desc: '§45b Entlastungsbetrag' },
            { key: 'faq', label: '❓ FAQ', desc: 'Häufige Fragen' },
            { key: 'contact', label: '📞 Kontaktdaten', desc: 'Zentrale & Standorte' }
        ] as tab}
            {@const isAct = landingCmsStore.meta[tab.key as keyof CmsData]?.is_active ?? true}
            <button 
                type="button"
                onclick={() => activeSection = tab.key as keyof CmsData}
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex flex-col items-start relative min-h-[48px]
                {activeSection === tab.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
            >
                <div class="flex items-center gap-1.5 w-full">
                    <span>{tab.label}</span>
                    {#if !isAct}
                        <span class="w-2 h-2 rounded-full bg-rose-400" title="Sektion deaktiviert"></span>
                    {/if}
                </div>
                <span class="text-[10px] font-normal opacity-80">{tab.desc}</span>
            </button>
        {/each}
    </div>

    <!-- Section Control & Status Bar -->
    <div class="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-4 flex-wrap">
            <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 select-none">
                <input 
                    type="checkbox" 
                    bind:checked={landingCmsStore.meta[activeSection].is_active}
                    class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
                />
                <span>Auf Landing-Page anzeigen (Aktiv)</span>
            </label>

            <div class="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                <label for="section-order" class="font-bold">Reihenfolge:</label>
                <input 
                    id="section-order"
                    type="number" 
                    bind:value={landingCmsStore.meta[activeSection].order} 
                    min="1" 
                    max="10" 
                    class="w-16 px-2 py-1 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-center" 
                />
            </div>
        </div>

        <button 
            type="button" 
            onclick={() => handleSaveSection(activeSection)} 
            class="orga-button-primary text-xs py-2 px-4 shadow-sm min-h-[44px]"
            disabled={landingCmsStore.isSaving}
        >
            <Save class="w-3.5 h-3.5 mr-1" />
            <span>Bereich "{activeSection.toUpperCase()}" speichern</span>
        </button>
    </div>

    <!-- Live Preview Split Container (wenn aktiv) -->
    {#if showLivePreview}
        <div class="bg-amber-50/50 p-5 rounded-2xl border-2 border-indigo-200 shadow-inner space-y-3">
            <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Eye class="w-4 h-4 text-indigo-600" />
                    <span>Sofort-Vorschau: {activeSection.toUpperCase()}</span>
                </h4>
                <a href="/" target="_blank" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                    <span>Echte Startseite öffnen</span>
                    <ExternalLink class="w-3 h-3" />
                </a>
            </div>

            <div class="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                {#if activeSection === 'hero'}
                    <div class="text-center py-6">
                        <span class="bg-brand-100 text-brand-800 font-bold text-xs px-3 py-1 rounded-full">{landingCmsStore.content.hero.badge}</span>
                        <h1 class="text-3xl font-extrabold text-neutral-900 mt-4 mb-3">{landingCmsStore.content.hero.title}</h1>
                        <p class="text-sm text-neutral-600 max-w-xl mx-auto mb-6">{landingCmsStore.content.hero.subtitle}</p>
                        <div class="flex gap-3 justify-center">
                            <button type="button" class="orga-button-primary text-xs py-2 px-4">{landingCmsStore.content.hero.cta_primary}</button>
                            <button type="button" class="orga-button-ghost text-xs py-2 px-4">{landingCmsStore.content.hero.cta_secondary}</button>
                        </div>
                    </div>
                {:else if activeSection === 'services'}
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {#each landingCmsStore.content.services as s}
                            <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                                <span class="text-2xl">{s.icon}</span>
                                <h4 class="font-bold text-neutral-900 text-sm mt-2">{s.title}</h4>
                                <p class="text-xs text-neutral-600 mt-1">{s.desc}</p>
                            </div>
                        {/each}
                    </div>
                {:else if activeSection === 'cooperation'}
                    <div class="p-4 bg-amber-50/70 rounded-xl border border-amber-200">
                        <h4 class="font-bold text-brand-900 text-base">{landingCmsStore.content.cooperation.headline}</h4>
                        <p class="text-xs text-neutral-700 mt-2 leading-relaxed">{landingCmsStore.content.cooperation.text}</p>
                    </div>
                {:else if activeSection === 'contact'}
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <p><strong>Telefon:</strong> {landingCmsStore.content.contact.phone_central}</p>
                        <p><strong>E-Mail:</strong> {landingCmsStore.content.contact.email_central}</p>
                        <p><strong>Halle:</strong> {landingCmsStore.content.contact.address_halle}</p>
                        <p><strong>Wittenberg:</strong> {landingCmsStore.content.contact.address_wittenberg}</p>
                    </div>
                {:else}
                    <p class="text-xs text-neutral-500 italic">Vorschau für diesen Bereich wird im Standard-Layout angezeigt.</p>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Content Sections Editoren -->
    <div class="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        {#if activeSection === 'hero'}
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 class="font-bold text-neutral-900 text-base">Hero-Bereich (Startseite)</h3>
                </div>
                <div>
                    <label for="cms-hero-title" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Hauptüberschrift (H1)</label>
                    <input id="cms-hero-title" type="text" bind:value={landingCmsStore.content.hero.title} class="orga-input-clear min-h-[44px]" />
                </div>
                <div>
                    <label for="cms-hero-subtitle" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Untertitel / Einleitungstext</label>
                    <textarea id="cms-hero-subtitle" rows="3" bind:value={landingCmsStore.content.hero.subtitle} class="orga-input-clear"></textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="cms-hero-cta1" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Button 1 (Primär)</label>
                        <input id="cms-hero-cta1" type="text" bind:value={landingCmsStore.content.hero.cta_primary} class="orga-input-clear min-h-[44px]" />
                    </div>
                    <div>
                        <label for="cms-hero-cta2" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Button 2 (Sekundär)</label>
                        <input id="cms-hero-cta2" type="text" bind:value={landingCmsStore.content.hero.cta_secondary} class="orga-input-clear min-h-[44px]" />
                    </div>
                </div>
                <div>
                    <label for="cms-hero-badge" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Vertrauens-Badge / Hinweis</label>
                    <input id="cms-hero-badge" type="text" bind:value={landingCmsStore.content.hero.badge} class="orga-input-clear min-h-[44px]" />
                </div>
            </div>

        {:else if activeSection === 'services'}
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 class="font-bold text-neutral-900 text-base">Leistungen (4 Bausteine)</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each landingCmsStore.content.services as s, idx}
                        <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                            <div class="flex items-center gap-2">
                                <input type="text" bind:value={s.icon} class="w-12 text-center text-xl bg-white border border-neutral-300 rounded-lg p-1 min-h-[44px]" placeholder="Icon" aria-label="Icon {idx + 1}" />
                                <input type="text" bind:value={s.title} class="font-bold text-sm bg-white border border-neutral-300 rounded-lg px-2.5 py-1 w-full min-h-[44px]" placeholder="Titel" aria-label="Titel {idx + 1}" />
                            </div>
                            <textarea rows="3" bind:value={s.desc} class="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5" placeholder="Beschreibung"></textarea>
                        </div>
                    {/each}
                </div>
            </div>

        {:else if activeSection === 'team'}
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 class="font-bold text-neutral-900 text-base">Team-Profile (Standortleitung)</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Tommy -->
                    <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                        <h4 class="font-bold text-sm text-indigo-700">Standort Halle (Saale)</h4>
                        <div>
                            <span class="text-[10px] font-bold text-neutral-500 uppercase block mb-0.5">Name & Rolle</span>
                            <input type="text" bind:value={landingCmsStore.content.team.tommy.name} class="w-full text-xs font-bold p-2 bg-white border rounded-lg mb-1.5 min-h-[44px]" />
                            <input type="text" bind:value={landingCmsStore.content.team.tommy.role} class="w-full text-xs p-2 bg-white border rounded-lg min-h-[44px]" />
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <span class="text-[10px] font-bold text-neutral-500 uppercase block mb-0.5">Telefon</span>
                                <input type="text" bind:value={landingCmsStore.content.team.tommy.phone} class="w-full text-xs p-2 bg-white border rounded-lg min-h-[44px]" />
                            </div>
                            <div>
                                <span class="text-[10px] font-bold text-neutral-500 uppercase block mb-0.5">E-Mail</span>
                                <input type="email" bind:value={landingCmsStore.content.team.tommy.email} class="w-full text-xs p-2 bg-white border rounded-lg min-h-[44px]" />
                            </div>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-neutral-500 uppercase block mb-0.5">Kurzbeschreibung</span>
                            <textarea rows="3" bind:value={landingCmsStore.content.team.tommy.desc} class="w-full text-xs p-2 bg-white border rounded-lg"></textarea>
                        </div>
                    </div>

                    <!-- Doreen -->
                    <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                        <h4 class="font-bold text-sm text-pink-700">Standort Wittenberg</h4>
                        <div>
                            <span class="text-[10px] font-bold text-neutral-500 uppercase block mb-0.5">Name & Rolle</span>
                            <input type="text" bind:value={landingCmsStore.content.team.doreen.name} class="w-full text-xs font-bold p-2 bg-white border rounded-lg mb-1.5 min-h-[44px]" />
                            <input type="text" bind:value={landingCmsStore.content.team.doreen.role} class="w-full text-xs p-2 bg-white border rounded-lg min-h-[44px]" />
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <span class="text-[10px] font-bold text-neutral-500 uppercase block mb-0.5">Telefon</span>
                                <input type="text" bind:value={landingCmsStore.content.team.doreen.phone} class="w-full text-xs p-2 bg-white border rounded-lg min-h-[44px]" />
                            </div>
                            <div>
                                <span class="text-[10px] font-bold text-neutral-500 uppercase block mb-0.5">E-Mail</span>
                                <input type="email" bind:value={landingCmsStore.content.team.doreen.email} class="w-full text-xs p-2 bg-white border rounded-lg min-h-[44px]" />
                            </div>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-neutral-500 uppercase block mb-0.5">Kurzbeschreibung</span>
                            <textarea rows="3" bind:value={landingCmsStore.content.team.doreen.desc} class="w-full text-xs p-2 bg-white border rounded-lg"></textarea>
                        </div>
                    </div>
                </div>
            </div>

        {:else if activeSection === 'cooperation'}
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 class="font-bold text-neutral-900 text-base">Kassenabrechnung & Pflegegrade</h3>
                </div>
                <div>
                    <label for="cms-coop-headline" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Überschrift</label>
                    <input id="cms-coop-headline" type="text" bind:value={landingCmsStore.content.cooperation.headline} class="orga-input-clear min-h-[44px]" />
                </div>
                <div>
                    <label for="cms-coop-text" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Erklärungstext (SGB XI & 131 €)</label>
                    <textarea id="cms-coop-text" rows="4" bind:value={landingCmsStore.content.cooperation.text} class="orga-input-clear"></textarea>
                </div>
            </div>

        {:else if activeSection === 'faq'}
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 class="font-bold text-neutral-900 text-base">Häufig gestellte Fragen (FAQ)</h3>
                </div>
                <div class="space-y-3">
                    {#each landingCmsStore.content.faq as item, idx}
                        <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                            <input type="text" bind:value={item.q} class="w-full font-bold text-xs bg-white border border-neutral-300 rounded-lg p-2 min-h-[44px]" placeholder="Frage" aria-label="Frage {idx + 1}" />
                            <textarea rows="2" bind:value={item.a} class="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2" placeholder="Antwort" aria-label="Antwort {idx + 1}"></textarea>
                        </div>
                    {/each}
                </div>
            </div>

        {:else if activeSection === 'contact'}
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 class="font-bold text-neutral-900 text-base">Kontaktdaten & Anschriften</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="cms-contact-phone" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Zentrale Rufnummer</label>
                        <input id="cms-contact-phone" type="text" bind:value={landingCmsStore.content.contact.phone_central} class="orga-input-clear min-h-[44px]" />
                    </div>
                    <div>
                        <label for="cms-contact-email" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Zentrale E-Mail</label>
                        <input id="cms-contact-email" type="email" bind:value={landingCmsStore.content.contact.email_central} class="orga-input-clear min-h-[44px]" />
                    </div>
                    <div>
                        <label for="cms-contact-halle" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Standort Halle (Saale)</label>
                        <input id="cms-contact-halle" type="text" bind:value={landingCmsStore.content.contact.address_halle} class="orga-input-clear min-h-[44px]" />
                    </div>
                    <div>
                        <label for="cms-contact-wb" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Standort Wittenberg</label>
                        <input id="cms-contact-wb" type="text" bind:value={landingCmsStore.content.contact.address_wittenberg} class="orga-input-clear min-h-[44px]" />
                    </div>
                </div>
                <div>
                    <label for="cms-contact-hours" class="block text-xs font-bold text-neutral-600 uppercase mb-1">Erreichbarkeit & Öffnungszeiten</label>
                    <input id="cms-contact-hours" type="text" bind:value={landingCmsStore.content.contact.opening_hours} class="orga-input-clear min-h-[44px]" />
                </div>
            </div>
        {/if}
    </div>
</div>
