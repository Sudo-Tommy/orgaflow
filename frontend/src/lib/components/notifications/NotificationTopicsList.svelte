<script lang="ts">
    interface Props {
        prefs: {
            requests: boolean;
            emails: boolean;
            chats: boolean;
            updates: boolean;
        };
    }

    let { prefs = $bindable() }: Props = $props();
</script>

<h3 class="font-bold text-neutral-900 text-sm mb-3 border-b border-neutral-100 pb-2">Welche Ereignisse dürfen gemeldet werden?</h3>
<div class="space-y-2 mb-6">
    <label class="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-brand-300 transition-colors">
        <div>
            <p class="font-bold text-neutral-800 text-sm">📬 Terminanfragen</p>
            <p class="text-xs text-neutral-500 mt-0.5">Bei neuen Anfragen über die Webseite</p>
        </div>
        <input type="checkbox" bind:checked={prefs.requests} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-neutral-300">
    </label>
    <label class="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-brand-300 transition-colors">
        <div>
            <p class="font-bold text-neutral-800 text-sm">✉️ E-Mails</p>
            <p class="text-xs text-neutral-500 mt-0.5">Wenn neue E-Mails im Posteingang landen</p>
        </div>
        <input type="checkbox" bind:checked={prefs.emails} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-neutral-300">
    </label>
    <label class="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-brand-300 transition-colors">
        <div>
            <p class="font-bold text-neutral-800 text-sm">💬 Team-Chat</p>
            <p class="text-xs text-neutral-500 mt-0.5">Bei Erwähnungen oder im Flüstermodus</p>
        </div>
        <input type="checkbox" bind:checked={prefs.chats} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-neutral-300">
    </label>
    <label class="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-brand-300 transition-colors">
        <div>
            <p class="font-bold text-neutral-800 text-sm">✨ System-Updates</p>
            <p class="text-xs text-neutral-500 mt-0.5">Wenn neue OrgaFlow-Funktionen verfügbar sind</p>
        </div>
        <input type="checkbox" bind:checked={prefs.updates} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-neutral-300">
    </label>
</div>
