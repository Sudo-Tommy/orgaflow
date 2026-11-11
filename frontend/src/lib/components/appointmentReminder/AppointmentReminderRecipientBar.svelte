<script lang="ts">
    import { ChevronDown, Plus, Minus } from 'lucide-svelte';
    import { hapticFeedback } from '$lib/services/hapticFeedback';

    interface Props {
        method: 'email' | 'whatsapp';
        recipient: string;
        cc: string;
        bcc: string;
        showCcBcc: boolean;
        isSending: boolean;
        availableContacts: any[];
        showContactDropdown: boolean;
        onChangeMethod: (m: 'email' | 'whatsapp') => void;
        onToggleRecipient: (c: any, checked: boolean) => void;
    }

    let {
        method = $bindable(),
        recipient = $bindable(),
        cc = $bindable(),
        bcc = $bindable(),
        showCcBcc = $bindable(),
        isSending,
        availableContacts,
        showContactDropdown = $bindable(),
        onChangeMethod,
        onToggleRecipient
    }: Props = $props();

    let filteredContacts = $derived.by(() => {
        const list = availableContacts.filter(c => method === 'email' ? c.email : c.phone);
        return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' }));
    });
</script>

<div class="space-y-4">
    <!-- Methode Umschalter -->
    <div class="flex gap-2 p-1 bg-neutral-100 dark:bg-slate-800 rounded-xl">
        <button 
            type="button" 
            onclick={() => onChangeMethod('email')} 
            class="flex-1 min-h-11 sm:min-h-10 py-2 text-sm font-bold rounded-lg transition-colors touch-manipulation cursor-pointer {method === 'email' ? 'bg-white dark:bg-slate-900 shadow-sm text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}"
        >
            ✉️ E-Mail
        </button>
        <button 
            type="button" 
            onclick={() => onChangeMethod('whatsapp')} 
            class="flex-1 min-h-11 sm:min-h-10 py-2 text-sm font-bold rounded-lg transition-colors touch-manipulation cursor-pointer {method === 'whatsapp' ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}"
        >
            💬 WhatsApp
        </button>
    </div>

    <!-- Empfänger Zeile -->
    <div>
        <div class="flex items-center justify-between mb-1">
            <label for="rem-recipient" class="block text-[11px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                {method === 'email' ? 'E-Mail Adresse *' : 'Handynummer *'}
            </label>
            {#if method === 'email'}
                <button 
                    type="button" 
                    onclick={() => { hapticFeedback.tap(); showCcBcc = !showCcBcc; }} 
                    class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 transition-colors flex items-center gap-1 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 rounded-lg touch-manipulation cursor-pointer"
                >
                    {#if showCcBcc}
                        <Minus class="w-3.5 h-3.5" />
                        <span>CC / BCC ausblenden</span>
                    {:else}
                        <Plus class="w-3.5 h-3.5" />
                        <span>CC / BCC hinzufügen</span>
                    {/if}
                </button>
            {/if}
        </div>
        <div class="flex flex-col sm:flex-row gap-2 mt-1.5">
            <input 
                id="rem-recipient" 
                type="text" 
                bind:value={recipient} 
                class="orga-input-clear min-h-12 flex-1 touch-manipulation" 
                required 
                disabled={isSending} 
            />
            <div class="relative flex-1 sm:flex-none sm:w-64 z-50">
                <button 
                    type="button" 
                    aria-expanded={showContactDropdown} 
                    onclick={() => { hapticFeedback.tap(); showContactDropdown = !showContactDropdown; }} 
                    disabled={isSending} 
                    class="w-full bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 hover:border-brand-300 rounded-xl px-4 min-h-12 text-sm flex items-center justify-between cursor-pointer transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 touch-manipulation"
                >
                    <span class="font-bold text-neutral-800 dark:text-slate-200 truncate">Adressbuch</span>
                    <ChevronDown class="w-4 h-4 text-neutral-400 transition-transform duration-300 {showContactDropdown ? 'rotate-180' : ''}" />
                </button>
                {#if showContactDropdown}
                    <button 
                        type="button" 
                        class="fixed inset-0 z-40 cursor-default outline-none w-full h-full" 
                        aria-label="Dropdown schließen" 
                        onclick={() => showContactDropdown = false} 
                        tabindex="-1"
                    ></button>
                    <div class="absolute right-0 sm:left-0 mt-2 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar w-72 sm:w-full z-50 p-1.5">
                        {#each filteredContacts as c}
                            <label class="w-full text-left px-3 py-2 min-h-11 hover:bg-brand-50/60 dark:hover:bg-slate-700/60 transition-colors rounded-xl flex flex-col cursor-pointer mb-1 border border-transparent hover:border-brand-100 touch-manipulation">
                                <div class="flex items-center justify-between">
                                    <span class="font-bold text-xs text-neutral-900 dark:text-white truncate">{c.name}</span>
                                    <input 
                                        type="checkbox" 
                                        checked={recipient.includes(method === 'email' ? c.email : c.phone)} 
                                        onchange={(e) => onToggleRecipient(c, e.currentTarget.checked)} 
                                        class="w-5 h-5 text-brand-600 border-neutral-300 rounded focus:ring-brand-500" 
                                    />
                                </div>
                                <span class="text-[10px] text-brand-600 dark:text-brand-400 font-semibold truncate mt-0.5">{method === 'email' ? c.email : c.phone}</span>
                            </label>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
    
    <!-- CC / BCC Felder -->
    {#if method === 'email' && showCcBcc}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-enter">
            <div>
                <label for="rem-cc" class="block text-[11px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">CC (Kopie)</label>
                <input id="rem-cc" type="text" bind:value={cc} class="orga-input-clear min-h-12 touch-manipulation" disabled={isSending} placeholder="z.B. angehoeriger@mail.de" />
            </div>
            <div>
                <label for="rem-bcc" class="block text-[11px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">BCC (Blindkopie)</label>
                <input id="rem-bcc" type="text" bind:value={bcc} class="orga-input-clear min-h-12 touch-manipulation" disabled={isSending} placeholder="z.B. info@mail.de" />
            </div>
        </div>
    {/if}
</div>
