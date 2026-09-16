<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { themeService } from '$lib/services/themeService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        User, Award, Phone, ShieldAlert, LogOut, Sun, Moon, 
        Clock, CheckCircle2, MapPin, Briefcase, Mail
    } from 'lucide-svelte';

    let { onLogout } = $props<{ onLogout?: () => void }>();

    const user = $derived(pb.authStore.model);
    let isDarkMode = $derived(themeService.isDark);

    function toggleTheme() {
        themeService.toggle();
    }
</script>

<div class="space-y-4 pb-24">
    
    <!-- Profil Header Card -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                {user?.name_first ? user.name_first[0] : 'M'}{user?.name_last ? user.name_last[0] : ''}
            </div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <h2 class="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                        {user?.name_first || 'Mitarbeiter'} {user?.name_last || ''}
                    </h2>
                    <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {user?.status || 'Aktiv im Dienst'}
                    </span>
                </div>
                <p class="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                <div class="flex items-center gap-2 mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <Briefcase class="w-3.5 h-3.5" />
                    <span>{user?.employment_type || 'Vollzeit'} • Rolle: {user?.role || 'Pflegekraft'}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Notfallkontakt Box (Sehr wichtig für den Außendienst!) -->
    {#if user?.emergency_contacts}
        <div class="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-5 shadow-xs space-y-2">
            <div class="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                <ShieldAlert class="w-4 h-4" />
                <span>Notfallkontakt für den Außendienst</span>
            </div>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
                {user.emergency_contacts}
            </p>
        </div>
    {/if}

    <!-- Qualifikationen -->
    {#if user?.qualifications}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2.5">
            <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Award class="w-4 h-4" />
                <span>Hinterlegte Qualifikationen & Zertifikate</span>
            </div>
            <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {user.qualifications}
            </div>
        </div>
    {/if}

    <!-- Kontaktdaten & Anschrift -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Erreichbarkeit & Adresse</h3>
        
        <div class="space-y-2 text-xs sm:text-sm">
            <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <Phone class="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                    <span class="text-[11px] text-slate-400 block">Diensthandy / Telefon</span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">{user?.handy || user?.tel || 'Nicht hinterlegt'}</span>
                </div>
            </div>

            <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <Mail class="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                    <span class="text-[11px] text-slate-400 block">E-Mail-Adresse</span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">{user?.email || 'Nicht hinterlegt'}</span>
                </div>
            </div>

            {#if user?.street || user?.city}
                <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    <MapPin class="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                        <span class="text-[11px] text-slate-400 block">Wohnanschrift</span>
                        <span class="font-bold text-slate-800 dark:text-slate-200">{user?.street || ''} {user?.housenr || ''}, {user?.zip || ''} {user?.city || ''}</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- QR-Zugangs-Gültigkeit -->
    {#if user?.token_expires_at}
        <div class="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-3xl p-4 flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                <Clock class="w-4 h-4 shrink-0" />
                <span>QR-Zugang gültig bis: <strong>{new Date(user.token_expires_at).toLocaleString('de-DE')}</strong></span>
            </div>
            <span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 rounded font-bold shrink-0">Aktiv</span>
        </div>
    {/if}

    <!-- App-Einstellungen (Dark Mode / Abmelden) -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">App-Einstellungen</h3>
        
        <div class="grid grid-cols-2 gap-3">
            <button
                type="button"
                onclick={toggleTheme}
                class="min-h-12 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
                {#if isDarkMode}
                    <Sun class="w-4 h-4 text-amber-400" />
                    <span>Heller Modus</span>
                {:else}
                    <Moon class="w-4 h-4 text-slate-600" />
                    <span>Dunkler Modus</span>
                {/if}
            </button>

            <button
                type="button"
                onclick={onLogout}
                class="min-h-12 px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
                <LogOut class="w-4 h-4" />
                <span>Abmelden</span>
            </button>
        </div>
    </div>

</div>
