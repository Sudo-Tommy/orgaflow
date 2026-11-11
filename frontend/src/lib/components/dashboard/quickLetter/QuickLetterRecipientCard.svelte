<script lang="ts">
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { ChevronDown, User } from 'lucide-svelte';
    import type { QuickLetterRecipient } from './quickLetterTypes';

    interface Props {
        recipient: QuickLetterRecipient;
        onSelectRecipient: (item: any, type: string) => void;
    }

    let { recipient = $bindable(), onSelectRecipient }: Props = $props();

    let selectedOptionId = $state('');

    // Alphabetisch sortierte Liste aller Klienten, Kontakte und Kassen nach DIN / German Locale
    let sortedRecipientOptions = $derived.by(() => {
        const list: { id: string; label: string; sortKey: string; type: string; raw: any }[] = [];

        (orgaStore.clients?.data || []).forEach((c: any) => {
            const lastName = c.name_last || '';
            const firstName = c.name_first || '';
            const displayName = [lastName, firstName].filter(Boolean).join(', ') || 'Unbekannt';
            list.push({
                id: `client_${c.id}`,
                label: `👤 Klient: ${displayName} (${c.city || 'Kein Ort'})`,
                sortKey: displayName.toLowerCase(),
                type: 'Klient',
                raw: c
            });
        });

        (orgaStore.contacts?.data || []).forEach((ct: any) => {
            const name = [ct.name_last, ct.name_first].filter(Boolean).join(', ') || ct.company_name || 'Kontakt';
            list.push({
                id: `contact_${ct.id}`,
                label: `👥 Kontakt: ${name} ${ct.category ? `[${ct.category}]` : ''}`,
                sortKey: name.toLowerCase(),
                type: 'Kontakt',
                raw: ct
            });
        });

        (orgaStore.insurancies?.data || []).forEach((ins: any) => {
            const name = ins.name || 'Pflegekasse';
            list.push({
                id: `ins_${ins.id}`,
                label: `🏥 Kasse: ${name} (${ins.city || ''})`,
                sortKey: name.toLowerCase(),
                type: 'Pflegekasse',
                raw: ins
            });
        });

        // Sprachsensitiv nach Deutschem Alphabet sortieren
        return list.sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'de', { sensitivity: 'base' }));
    });

    function handleSelectionChange(e: Event) {
        const val = (e.target as HTMLSelectElement).value;
        selectedOptionId = val;
        if (!val) return;
        const opt = sortedRecipientOptions.find(o => o.id === val);
        if (opt) onSelectRecipient(opt.raw, opt.type);
    }
</script>

<div class="bg-neutral-800/80 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-sm">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm font-bold">1</div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-200">Empfängerdaten (Anschrift)</h3>
        </div>
        <span class="text-[10px] text-neutral-400">1-Klick oder manuell</span>
    </div>

    <!-- Schnellauswahl Dropdown (alphabetisch sortiert) -->
    <div>
        <label for="recipient-picker" class="block text-xs font-semibold text-neutral-300 mb-1.5">
            Schnellauswahl aus Adressbuch:
        </label>
        <div class="relative">
            <select
                id="recipient-picker"
                class="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-neutral-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-neutral-100 text-xs sm:text-sm font-medium rounded-xl pl-3.5 pr-10 py-2.5 transition-all shadow-inner outline-none cursor-pointer appearance-none"
                onchange={handleSelectionChange}
                value={selectedOptionId}
            >
                <option value="">-- Empfänger aus Klienten, Kontakten & Kassen wählen --</option>
                {#each sortedRecipientOptions as opt}
                    <option value={opt.id}>{opt.label}</option>
                {/each}
            </select>
            <ChevronDown class="w-4 h-4 text-neutral-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
    </div>

    <!-- Anschriftfelder -->
    <div class="space-y-3 pt-1">
        <div>
            <label for="rec-company" class="block text-xs font-semibold text-neutral-300 mb-1">Firma / Institution / Kasse (optional):</label>
            <input
                id="rec-company"
                type="text"
                bind:value={recipient.company}
                placeholder="z. B. Pflegekasse / Hausarzt / Betreuungsbehörde"
                class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
            />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
                <label for="rec-salutation" class="block text-xs font-semibold text-neutral-300 mb-1">Anrede:</label>
                <div class="relative">
                    <select
                        id="rec-salutation"
                        bind:value={recipient.salutation}
                        class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl pl-3 pr-8 py-2.5 outline-none appearance-none cursor-pointer"
                    >
                        <option value="Herr">Herr</option>
                        <option value="Frau">Frau</option>
                        <option value="Familie">Familie</option>
                        <option value="">(Keine)</option>
                    </select>
                    <ChevronDown class="w-3.5 h-3.5 text-neutral-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
            </div>
            <div>
                <label for="rec-fname" class="block text-xs font-semibold text-neutral-300 mb-1">Vorname:</label>
                <input
                    id="rec-fname"
                    type="text"
                    bind:value={recipient.firstname}
                    placeholder="Vorname"
                    class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
                />
            </div>
            <div>
                <label for="rec-lname" class="block text-xs font-semibold text-neutral-300 mb-1">Nachname *:</label>
                <input
                    id="rec-lname"
                    type="text"
                    bind:value={recipient.lastname}
                    placeholder="Nachname *"
                    required
                    class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
                />
            </div>
        </div>

        <div class="grid grid-cols-4 gap-2.5">
            <div class="col-span-3">
                <label for="rec-street" class="block text-xs font-semibold text-neutral-300 mb-1">Straße:</label>
                <input
                    id="rec-street"
                    type="text"
                    bind:value={recipient.street}
                    placeholder="Straße"
                    class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
                />
            </div>
            <div>
                <label for="rec-housenr" class="block text-xs font-semibold text-neutral-300 mb-1">Haus-Nr.:</label>
                <input
                    id="rec-housenr"
                    type="text"
                    bind:value={recipient.housenr}
                    placeholder="Nr."
                    class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
                />
            </div>
        </div>

        <div class="grid grid-cols-3 gap-2.5">
            <div>
                <label for="rec-zip" class="block text-xs font-semibold text-neutral-300 mb-1">PLZ:</label>
                <input
                    id="rec-zip"
                    type="text"
                    bind:value={recipient.zip}
                    placeholder="PLZ"
                    class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
                />
            </div>
            <div class="col-span-2">
                <label for="rec-city" class="block text-xs font-semibold text-neutral-300 mb-1">Ort:</label>
                <input
                    id="rec-city"
                    type="text"
                    bind:value={recipient.city}
                    placeholder="Ort"
                    class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
                />
            </div>
        </div>
    </div>
</div>
