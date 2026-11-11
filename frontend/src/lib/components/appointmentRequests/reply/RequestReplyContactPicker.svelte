<script lang="ts">
    import { sortAlphabetical } from "$lib/utils/sortHelper";

    let {
        emailTo = $bindable(""),
        availableContacts = [],
        disabled = false
    }: {
        emailTo: string;
        availableContacts: any[];
        disabled?: boolean;
    } = $props();

    let showDropdown = $state(false);

    function toggleRecipient(email: string, isChecked: boolean) {
        let currentEmails = emailTo.split(',').map(e => e.trim()).filter(Boolean);
        if (isChecked) {
            if (!currentEmails.includes(email)) currentEmails.push(email);
        } else {
            currentEmails = currentEmails.filter(e => e !== email);
        }
        emailTo = currentEmails.join(', ');
    }

    let directContacts = $derived.by(() => {
        const direct = availableContacts.filter(c => c.isDirect && c.email);
        return sortAlphabetical(direct, c => c.name);
    });

    let otherContacts = $derived.by(() => {
        const others = availableContacts.filter(c => !c.isDirect && c.email);
        return sortAlphabetical(others, c => c.name);
    });
</script>

<div>
    <label for="reply-to" class="block text-sm font-bold text-neutral-700 mb-1.5">Empfänger (An)</label>
    <div class="flex flex-col sm:flex-row gap-2">
        <input
            id="reply-to"
            type="text"
            bind:value={emailTo}
            class="orga-input-clear w-full flex-1 min-h-[44px] py-2.5 text-sm touch-manipulation"
            placeholder="mail@beispiel.de, zweite@mail.de"
            required
            {disabled}
        />
        
        <div class="relative flex-1 sm:flex-none sm:w-auto">
            <button
                type="button"
                onclick={() => (showDropdown = !showDropdown)}
                class="orga-input-clear w-full bg-white border-neutral-200 shadow-sm cursor-pointer text-sm font-medium min-h-[44px] py-2.5 px-4 flex justify-between items-center touch-manipulation"
                {disabled}
            >
                <span>+ Adressbuch</span>
                <span class="text-[10px] ml-2">▼</span>
            </button>

            {#if showDropdown}
                <button
                    type="button"
                    class="fixed inset-0 z-40 w-full h-full cursor-default"
                    onclick={() => (showDropdown = false)}
                    tabindex="-1"
                    aria-label="Schließen"
                ></button>
                <div class="absolute top-full right-0 mt-1 w-72 bg-white border border-neutral-200 shadow-xl rounded-xl z-50 p-2">
                    {#if directContacts.length > 0}
                        <div class="px-2 py-1 text-[11px] font-black text-brand-700 bg-brand-50 rounded-md mb-1 uppercase tracking-wider flex items-center justify-between">
                            <span>⭐ Direkte Klienten-Kontakte</span>
                        </div>
                        {#each directContacts as c}
                            <label class="flex items-center gap-2.5 p-2 hover:bg-brand-50/60 bg-brand-50/25 rounded-lg cursor-pointer transition-colors mb-0.5 border border-brand-100/70 min-h-[44px] touch-manipulation">
                                <input
                                    type="checkbox"
                                    checked={emailTo.includes(c.email)}
                                    onchange={(e) => toggleRecipient(c.email, e.currentTarget.checked)}
                                    class="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500"
                                />
                                <div class="min-w-0 flex-1">
                                    <p class="text-xs font-bold text-neutral-900 truncate">{c.name}</p>
                                    <p class="text-[10px] text-brand-600 font-semibold truncate">{c.email}</p>
                                </div>
                            </label>
                        {/each}
                        <div class="border-t border-neutral-200 my-1.5"></div>
                    {/if}

                    {#if otherContacts.length > 0}
                        <div class="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            <span>Weitere Adressbuch-Kontakte</span>
                        </div>
                        {#each otherContacts as c}
                            <label class="flex items-center gap-2.5 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors min-h-[44px] touch-manipulation">
                                <input
                                    type="checkbox"
                                    checked={emailTo.includes(c.email)}
                                    onchange={(e) => toggleRecipient(c.email, e.currentTarget.checked)}
                                    class="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500"
                                />
                                <div class="min-w-0 flex-1">
                                    <p class="text-xs font-medium text-neutral-800 truncate">{c.name}</p>
                                    <p class="text-[10px] text-neutral-500 truncate">{c.email}</p>
                                </div>
                            </label>
                        {/each}
                    {/if}

                    {#if directContacts.length === 0 && otherContacts.length === 0}
                        <p class="text-xs text-neutral-500 p-2 text-center">Keine E-Mails gefunden</p>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>
