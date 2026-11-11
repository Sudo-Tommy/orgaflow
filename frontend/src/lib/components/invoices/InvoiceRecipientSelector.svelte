<script lang="ts">
    interface Props {
        emailTo: string;
        cc: string;
        bcc: string;
        availableContacts: any[];
        selectedContactRefs: any[];
        disabled?: boolean;
        onRecipientToggled?: () => void;
    }

    let {
        emailTo = $bindable(""),
        cc = $bindable(""),
        bcc = $bindable(""),
        availableContacts = [],
        selectedContactRefs = $bindable([]),
        disabled = false,
        onRecipientToggled
    }: Props = $props();

    let showCcBcc = $state(false);
    let showContactDropdown = $state(false);

    function toggleRecipient(contact: any, isChecked: boolean) {
        let currentEmails = emailTo.split(",").map((e) => e.trim()).filter(Boolean);
        if (isChecked) {
            if (!currentEmails.includes(contact.email)) currentEmails.push(contact.email);
            if (!selectedContactRefs.find((c) => c.email === contact.email)) selectedContactRefs.push(contact);
        } else {
            currentEmails = currentEmails.filter((e) => e !== contact.email);
            selectedContactRefs = selectedContactRefs.filter((c) => c.email !== contact.email);
        }
        emailTo = currentEmails.join(", ");
        onRecipientToggled?.();
    }
</script>

<div>
    <div class="flex items-center justify-between mb-1.5">
        <label for="email-to" class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Empfänger (An)</label>
        <button type="button" onclick={() => (showCcBcc = !showCcBcc)} class="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 cursor-pointer">
            {showCcBcc ? "− CC / BCC ausblenden" : "+ CC / BCC hinzufügen"}
        </button>
    </div>
    <div class="flex flex-col sm:flex-row gap-2">
        <input id="email-to" type="email" bind:value={emailTo} class="orga-input-clear py-3 sm:py-2.5 text-sm flex-1" required {disabled} />
        <div class="relative">
            <button
                type="button"
                onclick={() => (showContactDropdown = !showContactDropdown)}
                class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer text-sm font-medium py-3 sm:py-2.5 flex justify-between items-center"
                {disabled}
            >
                <span>+ Adressbuch</span><span class="text-[10px] ml-2">▼</span>
            </button>
            {#if showContactDropdown}
                <button type="button" aria-label="Schließen" class="fixed inset-0 z-40 w-full h-full cursor-default" onclick={() => (showContactDropdown = false)} tabindex="-1"></button>
                <div class="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl z-50 p-1.5">
                    {#each availableContacts as c}
                        <label class="flex items-center gap-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs">
                            <input
                                type="checkbox"
                                checked={emailTo.includes(c.email)}
                                onchange={(e) => toggleRecipient(c, e.currentTarget.checked)}
                                class="w-4 h-4 text-violet-600 rounded"
                            />
                            <div class="min-w-0 flex-1">
                                <p class="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                                <p class="text-[10px] text-slate-500 truncate">{c.email}</p>
                            </div>
                        </label>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

{#if showCcBcc}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label for="email-cc" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">CC</label>
            <input id="email-cc" type="text" bind:value={cc} class="orga-input-clear py-2.5 text-sm" {disabled} />
        </div>
        <div>
            <label for="email-bcc" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">BCC</label>
            <input id="email-bcc" type="text" bind:value={bcc} class="orga-input-clear py-2.5 text-sm" {disabled} />
        </div>
    </div>
{/if}

