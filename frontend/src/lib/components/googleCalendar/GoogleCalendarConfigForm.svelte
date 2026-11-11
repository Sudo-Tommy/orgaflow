<script lang="ts">
    import { slide } from "svelte/transition";
    import { Settings, ChevronDown, HelpCircle } from "lucide-svelte";

    interface Props {
        showConfigForm: boolean;
        clientIdInput: string;
        clientSecretInput: string;
        onToggleConfig: () => void;
        onSave: () => void;
    }

    let {
        showConfigForm,
        clientIdInput = $bindable(''),
        clientSecretInput = $bindable(''),
        onToggleConfig,
        onSave
    }: Props = $props();

    let showGuide = $state(false);
</script>

<div class="border-t border-neutral-100 pt-4">
    <button 
        type="button" 
        onclick={onToggleConfig}
        class="flex items-center justify-between w-full text-xs font-bold text-neutral-500 hover:text-neutral-800 py-2 transition-colors cursor-pointer min-h-[44px] touch-manipulation"
    >
        <span class="flex items-center gap-1.5">
            <Settings class="w-3.5 h-3.5" />
            <span>Google Cloud OAuth-Anmeldedaten konfigurieren</span>
        </span>
        <ChevronDown class="w-4 h-4 transition-transform duration-200 {showConfigForm ? 'rotate-180' : ''}" />
    </button>

    {#if showConfigForm}
        <form onsubmit={(e) => { e.preventDefault(); onSave(); }} autocomplete="off" class="mt-4 space-y-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200 animate-enter">
            <div>
                <label for="g-client-id" class="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Google Client-ID
                </label>
                <input 
                    id="g-client-id" 
                    type="text"
                    autocomplete="off"
                    bind:value={clientIdInput} 
                    placeholder="z.B. 123456789-abc.apps.googleusercontent.com" 
                    class="orga-input-clear py-2.5 px-3 text-xs font-mono min-h-[44px]"
                />
            </div>

            <div>
                <label for="g-client-secret" class="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Google Client-Secret
                </label>
                <input 
                    id="g-client-secret" 
                    type="password" 
                    autocomplete="new-password"
                    bind:value={clientSecretInput} 
                    placeholder="GOCSPX-..." 
                    class="orga-input-clear py-2.5 px-3 text-xs font-mono min-h-[44px]"
                />
            </div>

            <div class="flex items-center justify-between pt-1">
                <button 
                    type="button" 
                    onclick={() => showGuide = !showGuide}
                    class="text-xs text-brand-600 hover:text-brand-800 font-bold inline-flex items-center gap-1 cursor-pointer min-h-[44px] touch-manipulation"
                >
                    <HelpCircle class="w-3.5 h-3.5" />
                    <span>Woher erhalte ich diese Daten?</span>
                </button>

                <button 
                    type="submit"
                    class="orga-button-primary py-2.5 px-4 text-xs cursor-pointer min-h-[44px] touch-manipulation"
                >
                    Speichern
                </button>
            </div>

            {#if showGuide}
                <div transition:slide={{ duration: 150 }} class="text-[11px] text-neutral-600 space-y-1.5 p-3 rounded-xl bg-white border border-neutral-200/80 mt-2">
                    <p class="font-bold text-neutral-900 mb-1">Kurzanleitung Google Cloud Console:</p>
                    <p>1. Öffne die <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" class="text-brand-600 font-bold underline">Google Cloud Console</a> und wähle dein Projekt.</p>
                    <p>2. Aktiviere unter <em>APIs &amp; Dienste &rarr; Bibliothek</em>:
                       <br>&bull; <strong>Google Calendar API</strong> (für Termine)
                       <br>&bull; <strong>Gmail API</strong> (für Rechnungs- &amp; Mail-Versand)
                    </p>
                    <p>3. Erstelle Anmeldedaten &rarr; <strong>OAuth-Client-ID</strong> &rarr; Anwendungstyp: <strong>Webanwendung</strong>.</p>
                    <p>4. Trage als <strong>Autorisierte Weiterleitungs-URI</strong> ein:<br>
                       <code class="bg-neutral-100 px-1 py-0.5 rounded font-mono text-[10px] text-neutral-800">https://ihre-seniorenassistenz.com/api/google-calendar/callback</code>
                    </p>
                    <p>5. Kopiere Client-ID und Client-Secret in die obigen Felder.</p>
                </div>
            {/if}
        </form>
    {/if}
</div>
