<script lang="ts">
    import { scrollToSection, callPhone } from "$lib/services/navigationService";
    import LandingAppointmentModal from "./LandingAppointmentModal.svelte";
    import LandingKostenModal from "./LandingKostenModal.svelte";
    import LandingLeistungenModal from "./LandingLeistungenModal.svelte";
    import LoginLogout from "$lib/components/LoginLogout.svelte";
    import { onMount } from "svelte";

    // svelte-ignore non_reactive_update
    let appModal: ReturnType<typeof LandingAppointmentModal>;
    // svelte-ignore non_reactive_update
    let kostenModal: ReturnType<typeof LandingKostenModal>;
    // svelte-ignore non_reactive_update
    let leistungenModal: ReturnType<typeof LandingLeistungenModal>;

    import { themeService } from "$lib/services/themeService.svelte";

    let isDarkMode = $derived(themeService.isDark);

    function toggleTheme() {
        themeService.toggle();
    }
</script>

<header class="w-full flex flex-col sticky top-0 z-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] transition-all">
    
    <!-- Haupt-Navigation -->
    <div class="w-full px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-100 dark:border-slate-800">
        <button onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} class="flex items-center gap-2 sm:gap-3 group text-left cursor-pointer">
            <img src="/favicon.png" alt="Logo" class="w-8 h-8 sm:w-10 sm:h-10 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm" />
            <span class="text-lg sm:text-xl font-black tracking-tight text-neutral-900 dark:text-slate-100 group-hover:text-brand-800 dark:group-hover:text-brand-400 transition-colors">Ihre Seniorenassistenz</span>
        </button>

        <nav class="hidden lg:flex items-center gap-8 font-semibold text-sm text-neutral-600 dark:text-slate-300">
            <a href="#leistungen" onclick={(e) => { e.preventDefault(); leistungenModal?.open(); }} class="hover:text-brand-800 dark:hover:text-brand-400 transition-colors">Leistungen</a>
            <a href="#kosten" onclick={(e) => { e.preventDefault(); kostenModal?.open(); }} class="hover:text-brand-800 dark:hover:text-brand-400 transition-colors">Kostenübernahme</a>
            <a href="#kontakt" onclick={(e) => { e.preventDefault(); scrollToSection('kontakt'); }} class="hover:text-brand-800 dark:hover:text-brand-400 transition-colors">Kontakt</a>
        </nav>

        <div class="flex items-center gap-2 sm:gap-3">
            <button 
                onclick={toggleTheme} 
                class="w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center text-neutral-500 hover:text-brand-800 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 outline-none" 
                aria-label="Tag- und Nachtmodus umschalten" 
                title="Tag/Nacht Modus umschalten"
            >
                {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button 
                onclick={() => kostenModal?.open()} 
                class="orga-button-ghost py-2 px-4 min-h-[40px] text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 dark:border dark:border-amber-800/60 shadow-xs hidden xl:flex font-bold rounded-xl cursor-pointer"
            >
                Zahlt die Pflegekasse?
            </button>
            
            <button 
                onclick={() => appModal?.open()} 
                class="orga-button-ghost py-2 px-4 min-h-[40px] text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 dark:border dark:border-amber-800/60 shadow-xs hidden xl:flex font-bold rounded-xl cursor-pointer"
            >
                Kostenloses Kennenlernen
            </button>

            <div class="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                <LoginLogout iconOnly={true} />
            </div>
        </div>
    </div>
</header>

<LandingAppointmentModal bind:this={appModal} />
<LandingKostenModal bind:this={kostenModal} />
<LandingLeistungenModal bind:this={leistungenModal} />