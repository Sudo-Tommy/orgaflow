<script lang="ts">
    import { slide } from "svelte/transition";
    import { 
        User, PhoneCall, Mail, MapPin, 
        AlertCircle, FileSignature, Heart, Shield, MessageSquare, Cake
    } from "lucide-svelte";

    import AppointmentClientPicker from "./AppointmentClientPicker.svelte";

    interface Props {
        client: any;
        onOpenClientModal: (clientId: string) => void;
        onOpenReminder?: () => void;
        onSaveClient?: (clientId: string) => Promise<boolean>;
    }

    let { client, onOpenClientModal, onOpenReminder, onSaveClient }: Props = $props();

    let isChangingClient = $state(false);

    let clientName = $derived(
        client 
            ? `${client.salutation ? client.salutation + ' ' : ''}${client.name_first || ''} ${client.name_last || ''}`.trim()
            : ''
    );
    let careLevel = $derived(client?.level_of_care || client?.care_level || '');
    let clientAddress = $derived.by(() => {
        if (!client) return '';
        const parts = [
            client.street ? `${client.street} ${client.housenr || ''}`.trim() : '',
            client.city ? `${client.zip || ''} ${client.city}`.trim() : ''
        ].filter(Boolean);
        return parts.join(', ');
    });

    let googleMapsAddressUrl = $derived(
        clientAddress 
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientAddress)}`
            : ''
    );

    let clientAgeInfo = $derived.by(() => {
        if (!client?.birthdate) return '';
        try {
            const d = new Date(client.birthdate);
            if (isNaN(d.getTime())) return client.birthdate;
            const now = new Date();
            let age = now.getFullYear() - d.getFullYear();
            const m = now.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
            const formatted = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `${formatted} (${age} Jahre)`;
        } catch {
            return client.birthdate;
        }
    });
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs space-y-4">
    <!-- Header: Titel + Badges -->
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                <User class="w-4 h-4" />
            </span>
            <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Klienten-Details
            </h3>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
            {#if careLevel}
                <span class="px-2.5 py-1 text-xs font-black rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1">
                    <Heart class="w-3 h-3 text-purple-500 fill-purple-500/20" />
                    {careLevel}
                </span>
            {/if}
            {#if client.status}
                <span class="px-2 py-0.5 text-[10px] font-black rounded-lg {client.status === 'Aktiv' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">
                    {client.status}
                </span>
            {/if}
            {#if onSaveClient}
                <button
                    type="button"
                    onclick={() => isChangingClient = !isChangingClient}
                    class="px-2 py-0.5 text-[10px] font-bold rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                    {isChangingClient ? 'Schließen' : 'Wechseln'}
                </button>
            {/if}
        </div>
    </div>

    {#if isChangingClient && onSaveClient}
        <AppointmentClientPicker
            currentClientId={client?.id}
            onSelect={async (cid) => {
                const ok = await onSaveClient(cid);
                if (ok) isChangingClient = false;
            }}
            onClose={() => isChangingClient = false}
        />
    {/if}

    <!-- Hauptprofil-Zeile -->
    <div class="flex items-start gap-3.5">
        <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black flex items-center justify-center text-lg shrink-0 shadow-xs border border-emerald-400/30">
            {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
        </div>
        <div class="min-w-0 flex-1">
            <p class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
                {clientName}
            </p>
            {#if clientAgeInfo}
                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 mt-1">
                    <Cake class="w-3.5 h-3.5 text-pink-500 shrink-0" />
                    <span>{clientAgeInfo}</span>
                </p>
            {/if}
            {#if clientAddress}
                <div class="mt-1 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <MapPin class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <a 
                        href={googleMapsAddressUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline leading-relaxed"
                        title="In Google Maps öffnen"
                    >
                        {clientAddress}
                    </a>
                </div>
            {/if}
        </div>
    </div>

    <!-- Zusätzliche Meta-Infos -->
    {#if client.insurance_nr || client.marital_status}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            {#if client.insurance_nr}
                <div class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Shield class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span class="text-slate-400 text-[10px]">Vers.-Nr:</span>
                    <span class="font-bold truncate">{client.insurance_nr}</span>
                </div>
            {/if}
            {#if client.marital_status}
                <div class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span class="text-slate-400 text-[10px]">Familienstand:</span>
                    <span class="font-bold truncate">{client.marital_status}</span>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Betreuungshinweise -->
    {#if client.notes}
        <div transition:slide class="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-3 rounded-2xl text-xs space-y-1">
            <p class="font-black text-amber-900 dark:text-amber-300 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <AlertCircle class="w-3.5 h-3.5 text-amber-600" />
                Wichtige Betreuungshinweise
            </p>
            <p class="text-amber-950 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">
                {client.notes}
            </p>
        </div>
    {/if}

    <!-- Schnell-Kommunikation -->
    <div class="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {#if client.handy || client.phone}
                <a 
                    href="tel:{client.handy || client.phone}" 
                    class="min-h-10 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-xs transition-colors"
                >
                    <PhoneCall class="w-3.5 h-3.5" />
                    <span class="truncate">Anrufen ({client.handy || client.phone})</span>
                </a>
            {/if}
            {#if client.handy}
                <a 
                    href="https://wa.me/{client.handy.replace(/[^0-9+]/g, '')}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="min-h-10 px-3 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                >
                    <MessageSquare class="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>WhatsApp</span>
                </a>
            {:else if client.email}
                <a 
                    href="mailto:{client.email}" 
                    class="min-h-10 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors truncate"
                >
                    <Mail class="w-3.5 h-3.5 text-slate-500" />
                    <span class="truncate">{client.email}</span>
                </a>
            {/if}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button 
                type="button" 
                onclick={() => onOpenClientModal(client.id)} 
                class="min-h-10 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
                <FileSignature class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Klienten-Akte öffnen</span>
            </button>
            {#if onOpenReminder}
                <button 
                    type="button" 
                    onclick={onOpenReminder} 
                    class="min-h-10 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl flex items-center justify-center gap-2 text-xs border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                >
                    <MessageSquare class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Nachricht senden</span>
                </button>
            {/if}
        </div>
    </div>
</div>
