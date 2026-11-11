<script lang="ts">
    import { goto } from '$app/navigation';
    import { themeService } from '$lib/services/themeService.svelte';
    import { caregiverPortal } from '$lib/services/caregiverPortalService.svelte';
    import { timeTrackingStore } from '$lib/stores/timeTracking.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { Sun, Moon, User, LogOut, Play, Square, LayoutDashboard } from 'lucide-svelte';

    interface Props {
        currentUser: any;
        onLogout?: () => void;
    }

    let { currentUser, onLogout }: Props = $props();
    let isDark = $derived(themeService.isDark);
    let isTracking = $derived(timeTrackingStore.isActive);
    let formattedTime = $derived(timeTrackingStore.formattedTime);

    async function handleQuickTimeToggle() {
        if (timeTrackingStore.isActive) {
            await timeTrackingStore.stop();
            return;
        }
        const uid = currentUser?.id;
        const todayIso = new Date().toISOString().slice(0, 10);
        const appts = (orgaStore.appointments?.data || []).filter((a: any) => {
            const isMine = a.user === uid || (Array.isArray(a.user) && a.user.includes(uid)) || a.assigned_to === uid;
            return isMine && !a.settled && a.status !== 'abgesagt' && String(a.appointment || '').startsWith(todayIso);
        });

        const nextAppt = appts[0];
        if (nextAppt) {
            const rawClient: any = Array.isArray(nextAppt.client) ? nextAppt.client[0] : nextAppt.client;
            const cObj: any = typeof rawClient === 'string' ? orgaStore.clients.getById(rawClient) : rawClient;
            const cId = typeof rawClient === 'string' ? rawClient : (rawClient?.id || '');
            const cName = cObj ? `${cObj.name_first || ''} ${cObj.name_last || ''}`.trim() : 'Einsatz';
            await timeTrackingStore.start({
                clientId: cId,
                clientName: cName,
                serviceType: nextAppt.description || 'Betreuung',
                appointmentId: nextAppt.id
            });
            return;
        }

        const firstClientId = Array.from(caregiverPortal.assignedClientIds)[0] || orgaStore.clients?.data?.[0]?.id;
        if (firstClientId) {
            const cObj = orgaStore.clients.getById(firstClientId);
            const cName = cObj ? `${cObj.name_first || ''} ${cObj.name_last || ''}`.trim() : 'Klient';
            await timeTrackingStore.start({ clientId: firstClientId, clientName: cName, serviceType: 'Einsatz' });
        } else {
            toastStore.info('Bitte wähle einen Termin aus, um die Zeiterfassung zu starten.');
        }
    }
</script>

<header class="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-2.5 shrink-0 shadow-2xs">
    <div class="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        <!-- Mitarbeiter Kurzinfo -->
        <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                {currentUser?.name_first ? currentUser.name_first[0] : 'M'}{currentUser?.name_last ? currentUser.name_last[0] : ''}
            </div>
            <div class="min-w-0">
                <span class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate block">
                    {currentUser?.name_first || 'Mitarbeiter'} {currentUser?.name_last || ''}
                </span>
                <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Aktiv im Dienst · Betreuer</span>
                </span>
            </div>
        </div>

        <!-- Schnellaktionen im Header: Live-Zeiterfassung (Start/Stopp, A11), Dashboard-Wechsel (A10), Theme, Profil & Abmelden -->
        <div class="flex items-center gap-1.5 shrink-0">
            <button
                type="button"
                onclick={handleQuickTimeToggle}
                disabled={timeTrackingStore.isSubmitting}
                class="min-h-9 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 {isTracking
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'}"
                title={isTracking ? 'Laufende Zeiterfassung beenden' : 'Zeiterfassung für heutigen Einsatz direkt starten'}
            >
                {#if isTracking}
                    <Square class="w-3.5 h-3.5 fill-current" />
                    <span class="font-mono">{formattedTime}</span>
                    <span class="hidden sm:inline">Stopp</span>
                {:else}
                    <Play class="w-3.5 h-3.5 fill-current" />
                    <span>Zeit starten</span>
                {/if}
            </button>

            <button
                type="button"
                onclick={() => goto('/dashboard')}
                title="Zur Standard-Ansicht (Dashboard) wechseln"
                class="min-h-9 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
                <LayoutDashboard class="w-3.5 h-3.5" />
                <span class="hidden md:inline">Dashboard</span>
            </button>

            <button
                type="button"
                onclick={() => themeService.toggle()}
                aria-label="Design umschalten"
                class="min-h-9 min-w-9 p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
            >
                {#if isDark}
                    <Sun class="w-4 h-4 text-amber-400" />
                {:else}
                    <Moon class="w-4 h-4 text-slate-600" />
                {/if}
            </button>

            <button
                type="button"
                onclick={() => caregiverPortal.activeTab = 'profile'}
                title="Mein Profil"
                class="min-h-9 min-w-9 p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer {caregiverPortal.activeTab === 'profile' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50' : ''}"
            >
                <User class="w-4 h-4" />
            </button>

            {#if onLogout}
                <button
                    type="button"
                    onclick={onLogout}
                    title="Abmelden"
                    class="min-h-9 min-w-9 p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center cursor-pointer"
                >
                    <LogOut class="w-4 h-4" />
                </button>
            {/if}
        </div>
    </div>
</header>
