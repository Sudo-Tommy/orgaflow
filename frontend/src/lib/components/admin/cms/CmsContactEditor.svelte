<script lang="ts">
    import { landingCmsStore } from '$lib/services/landingCmsStore.svelte';
    import { Phone, Mail, MapPin, Clock, Calendar } from 'lucide-svelte';

    let contact = $derived(landingCmsStore.content.contact);
    let appt = $derived(landingCmsStore.content.appointment);
</script>

<div class="space-y-6">
    <div class="pb-3 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
        <div>
            <h3 class="font-bold text-neutral-900 dark:text-white text-base">Kontaktdaten, Standorte & Erreichbarkeit</h3>
            <p class="text-xs text-neutral-500 dark:text-slate-400">Verwalten Sie Adressen, Öffnungszeiten, Telefonnummern und die Terminanfrage-Box</p>
        </div>
        <span class="text-xl">📞</span>
    </div>

    <!-- Zentrale Kontaktdaten -->
    <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-4">
        <h4 class="text-xs font-bold text-neutral-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <Phone class="w-3.5 h-3.5 text-indigo-600" />
            <span>Zentrale Erreichbarkeit</span>
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="cms-contact-phone" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                    Zentrale Telefonnummer
                </label>
                <input id="cms-contact-phone" type="text" bind:value={contact.phone_central} class="orga-input-clear min-h-[44px] w-full" placeholder="0345 / 213 895 20" />
            </div>
            <div>
                <label for="cms-contact-email" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                    Zentrale E-Mail-Adresse
                </label>
                <input id="cms-contact-email" type="email" bind:value={contact.email_central} class="orga-input-clear min-h-[44px] w-full" placeholder="info@ihre-seniorenassistenz.com" />
            </div>
        </div>
    </div>

    <!-- Standorte & Adressen -->
    <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-4">
        <h4 class="text-xs font-bold text-neutral-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <MapPin class="w-3.5 h-3.5 text-pink-600" />
            <span>Standorte & Anschriften</span>
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="cms-contact-halle" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                    Standort Halle (Saale)
                </label>
                <input id="cms-contact-halle" type="text" bind:value={contact.address_halle} class="orga-input-clear min-h-[44px] w-full" placeholder="Dreyhauptstr. 2, 06108 Halle (Saale)" />
            </div>
            <div>
                <label for="cms-contact-wb" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                    Standort Lutherstadt Wittenberg
                </label>
                <input id="cms-contact-wb" type="text" bind:value={contact.address_wittenberg} class="orga-input-clear min-h-[44px] w-full" placeholder="Lutherstadt Wittenberg & Umgebung" />
            </div>
        </div>
    </div>

    <!-- Öffnungszeiten -->
    <div class="p-4 bg-neutral-50 dark:bg-slate-900/60 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-4">
        <h4 class="text-xs font-bold text-neutral-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <Clock class="w-3.5 h-3.5 text-amber-500" />
            <span>Öffnungszeiten & Sprechzeiten</span>
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="cms-hours-halle" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                    Zeiten Halle (Saale)
                </label>
                <input id="cms-hours-halle" type="text" bind:value={contact.opening_hours_halle} class="orga-input-clear min-h-[44px] w-full" placeholder="Mo - Fr: 08:00 - 18:00 Uhr" />
            </div>
            <div>
                <label for="cms-hours-wb" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                    Zeiten Lutherstadt Wittenberg
                </label>
                <input id="cms-hours-wb" type="text" bind:value={contact.opening_hours_wittenberg} class="orga-input-clear min-h-[44px] w-full" placeholder="Mo - Fr: 08:00 - 18:00 Uhr" />
            </div>
        </div>
        <div>
            <label for="cms-hours-note" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                Zusätzlicher Hinweis zur Erreichbarkeit
            </label>
            <input id="cms-hours-note" type="text" bind:value={contact.note} class="orga-input-clear min-h-[40px] text-xs w-full" placeholder="Termine an Wochenenden nach vorheriger Absprache..." />
        </div>
    </div>

    <!-- Terminanfrage-Banner Box -->
    <div class="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/40 space-y-4">
        <h4 class="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-indigo-600" />
            <span>Terminanfrage-Box (Aufruf vor dem Footer)</span>
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="cms-appt-head" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                    Überschrift
                </label>
                <input id="cms-appt-head" type="text" bind:value={appt.headline} class="orga-input-clear min-h-[44px] w-full font-bold" />
            </div>
            <div>
                <label for="cms-appt-btn" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                    Button-Text
                </label>
                <input id="cms-appt-btn" type="text" bind:value={appt.button_text} class="orga-input-clear min-h-[44px] w-full" />
            </div>
        </div>
        <div>
            <label for="cms-appt-sub" class="block text-[11px] font-bold text-neutral-600 dark:text-slate-400 mb-1">
                Einladungstext / Untertitel
            </label>
            <textarea id="cms-appt-sub" rows="2" bind:value={appt.subtitle} class="orga-input-clear w-full text-xs"></textarea>
        </div>
    </div>
</div>
