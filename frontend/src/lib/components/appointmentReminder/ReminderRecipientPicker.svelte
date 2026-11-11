<script lang="ts">
    import { ChevronDown, Plus, Minus } from 'lucide-svelte';

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
        onToggleCcBcc: () => void;
        onToggleContactDropdown: () => void;
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
        onToggleRecipient,
        onToggleCcBcc,
        onToggleContactDropdown
    }: Props = $props();
</script>

<div class="space-y-4">
    <!-- Versandart Umschalter -->
    <div class="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-slate-800 rounded-xl w-fit">
        <button type="button" onclick={() => onChangeMethod('email')} class="px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer {method === 'email' ? 'bg-white dark:bg-slate-900 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}">
            ✉️ E-Mail
        </button>
        <button type="button" onclick={() => onChangeMethod('whatsapp')} class="px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer {method === 'whatsapp' ? 'bg-emerald-600 shadow-sm text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}">
            💬 WhatsApp
        </button>
    </div>

    <!-- Empfänger Input & Adressbuch -->
    <div>
        <div class="flex items-center justify-between mb-1">
            <label for="multi-rem-recipient" class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {method === 'email' ? 'Empfänger-E-Mail (Kommagetrennt für mehrere)' : 'Mobilnummer (WhatsApp)'} *
            </label>
            {#if method === 'email'}
                <button type="button" onclick={onToggleCcBcc} class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 transition-colors flex items-center gap-1 cursor-pointer">
                    {#if showCcBcc}<Minus class="w-3 h-3" /> CC/BCC verbergen{:else}<Plus class="w-3 h-3" /> CC/BCC hinzufügen{/if}
                </button>
            {/if}
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
            <input 
                id="multi-rem-recipient"
                type="text" 
                bind:value={recipient} 
                class="orga-input-clear flex-1 py-3 text-sm" 
                placeholder={method === 'email' ? 'empfaenger@beispiel.de, weiter@beispiel.de' : '+491701234567'} 
                required 
                disabled={isSending} 
            />
            <div class="relative">
                <button 
                    type="button" 
                    onclick={onToggleContactDropdown} 
                    class="orga-input-clear w-full sm:w-auto bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-sm cursor-pointer text-sm font-medium py-3 flex justify-between items-center gap-2" 
                    disabled={isSending}
                >
                    <span>+ Adressbuch</span>
                    <ChevronDown class="w-3.5 h-3.5 text-neutral-400 dark:text-slate-400" />
                </button>
                {#if showContactDropdown}
                    <button type="button" class="fixed inset-0 z-40 w-full h-full cursor-default" onclick={onToggleContactDropdown} tabindex="-1" aria-label="Schließen"></button>
                    <div class="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 shadow-xl rounded-xl z-50 p-2 space-y-1">
                        {#each availableContacts as c}
                            <label class="flex items-center gap-2 p-1.5 hover:bg-neutral-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer text-xs">
                                <input 
                                    type="checkbox" 
                                    checked={recipient.includes(method === 'email' ? c.email : c.phone)} 
                                    onchange={(e) => onToggleRecipient(c, e.currentTarget.checked)} 
                                    class="w-4 h-4 text-brand-600 rounded" 
                                />
                                <div class="truncate">
                                    <p class="font-bold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                                    <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{method === 'email' ? c.email : c.phone}</p>
                                </div>
                            </label>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- CC & BCC -->
    {#if method === 'email' && showCcBcc}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
                <label for="multi-rem-cc" class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Kopie (CC)</label>
                <input id="multi-rem-cc" type="text" bind:value={cc} class="orga-input-clear py-2 text-sm" placeholder="kopie@beispiel.de" disabled={isSending} />
            </div>
            <div>
                <label for="multi-rem-bcc" class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Blindkopie (BCC)</label>
                <input id="multi-rem-bcc" type="text" bind:value={bcc} class="orga-input-clear py-2 text-sm" placeholder="blindkopie@beispiel.de" disabled={isSending} />
            </div>
        </div>
    {/if}
</div>
