<script lang="ts">
    import LandingLegalModal from "$lib/components/LandingLegalModal.svelte";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";
    
    const year = new Date().getFullYear();
    // svelte-ignore non_reactive_update
    let legalModal: ReturnType<typeof LandingLegalModal>;

    let contact = $derived(landingCmsStore.content.contact);

    // Öffnungszeiten dynamisch aus CMS oder Standard
    let openingHoursHalle = $derived(contact?.opening_hours_halle ? [
        { days: 'Mo - Fr', times: contact.opening_hours_halle },
        { days: 'Sa - So', times: 'Nach Vereinbarung' }
    ] : [
        { days: 'Mo - Fr', times: '08:00 - 18:00 Uhr' },
        { days: 'Sa - So', times: 'Geschlossen' }
    ]);

    let openingHoursWittenberg = $derived(contact?.opening_hours_wittenberg ? [
        { days: 'Mo - Fr', times: contact.opening_hours_wittenberg },
        { days: 'Sa - So', times: 'Nach Vereinbarung' }
    ] : [
        { days: 'Mo - Fr', times: '08:00 - 18:00 Uhr' },
        { days: 'Sa - So', times: 'Geschlossen' }
    ]);
</script>

<footer id="kontakt" class="bg-brand-900 dark:bg-slate-950 text-brand-100/90 dark:text-slate-300 pt-20 pb-10 mt-auto border-t border-brand-800 dark:border-slate-800/80 relative overflow-hidden transition-colors">
    <!-- Subtiler Leuchteffekt am oberen Rand -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-32 bg-white/10 dark:bg-amber-500/5 blur-[100px] pointer-events-none z-0"></div>
    
    <div class="relative z-10 max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12 border-b border-brand-800/50 dark:border-slate-800/80 pb-12">
        <!-- Adresse -->
        <div>
            <h4 class="text-white font-bold text-lg mb-4">Ihre Seniorenassistenz</h4>
            <p class="text-brand-100/80 dark:text-slate-400 leading-relaxed mb-4">Ihre guten Helfer für den Alltag. Wir jonglieren Termine, unterstützen Sie im Formular-Dschungel und haben immer ein offenes Ohr – professionell, transparent und absolut menschlich.</p>
            {#if contact?.address_halle}
                <p class="text-xs text-brand-200/90 dark:text-amber-300/90 font-medium">📍 {contact.address_halle}</p>
            {/if}
            {#if contact?.address_wittenberg}
                <p class="text-xs text-brand-200/90 dark:text-amber-300/90 font-medium mt-1">📍 {contact.address_wittenberg}</p>
            {/if}
        </div>
        
        <!-- Kontakt -->
        <div>
            <h4 class="text-white font-bold text-lg mb-4">Schnellkontakt</h4>
            <ul class="space-y-3">
                <li class="flex items-start gap-3">
                    <span class="mt-1">📞</span>
                    <div>
                        <p class="text-white">Zentrale Rufnummer:</p>
                        <a href="tel:{contact?.phone_central?.replace(/\s+/g, '') || '034521389520'}" class="hover:text-brand-400 dark:hover:text-amber-400 transition-colors font-bold">{contact?.phone_central || '0345 / 213 895 20'}</a>
                    </div>
                </li>
                <li class="flex items-center gap-3 mt-2">
                    <span>✉️</span>
                    <a href="mailto:{contact?.email_central || 'info@ihre-seniorenassistenz.com'}" class="hover:text-brand-400 dark:hover:text-amber-400 transition-colors">{contact?.email_central || 'info@ihre-seniorenassistenz.com'}</a>
                </li>
            </ul>
        </div>
        
        <!-- Öffnungszeiten -->
        <div>
            <h4 class="text-white font-bold text-lg mb-4">Öffnungszeiten</h4>
            
            <div class="mb-5">
                <p class="text-white font-semibold mb-2">Halle (Saale)</p>
                <ul class="space-y-1 text-sm text-brand-100/80 dark:text-slate-300">
                    {#each openingHoursHalle as oh}
                        <li class="flex justify-between gap-4">
                            <span>{oh.days}:</span>
                            <span class="text-right">{oh.times}</span>
                        </li>
                    {/each}
                </ul>
            </div>
            
            <div>
                <p class="text-white font-semibold mb-2">Wittenberg</p>
                <ul class="space-y-1 text-sm text-brand-100/80 dark:text-slate-300">
                    {#each openingHoursWittenberg as oh}
                        <li class="flex justify-between gap-4">
                            <span>{oh.days}:</span>
                            <span class="text-right">{oh.times}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>

        <!-- Links -->
        <div>
            <h4 class="text-white font-bold text-lg mb-4">Rechtliches</h4>
            <ul class="space-y-3">
                <li>
                    <a href="/impressum" class="hover:text-white dark:text-slate-300 dark:hover:text-white transition-colors">Impressum</a>
                </li>
                <li>
                    <a href="/datenschutz" class="hover:text-white dark:text-slate-300 dark:hover:text-white transition-colors">Datenschutzerklärung</a>
                </li>
                <li>
                    <a href="/portal" class="hover:text-white dark:text-slate-300 dark:hover:text-white transition-colors">Zum Klienten-Portal 🔐</a>
                </li>
            </ul>
        </div>
    </div>
    
    <div class="relative z-10 max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-brand-200/70 dark:text-slate-400">
        <p>&copy; {year} Ihre Seniorenassistenz. Alle Rechte vorbehalten.</p>
    </div>

    <!-- Das eingebundene Modalfenster -->
    <LandingLegalModal bind:this={legalModal} />
</footer>