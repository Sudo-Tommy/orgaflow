<script lang="ts">
    import { autoGrow } from '$lib/actions/autoGrow';

    interface Props {
        subject: string;
        salutationLine: string;
        letterBody: string;
        closingLine: string;
        senderName: string;
        includeFooter: boolean;
        includeContactUnderLogo: boolean;
    }

    let {
        subject = $bindable(),
        salutationLine = $bindable(),
        letterBody = $bindable(),
        closingLine = $bindable(),
        senderName = $bindable(),
        includeFooter = $bindable(),
        includeContactUnderLogo = $bindable()
    }: Props = $props();

    let wordCount = $derived(letterBody.trim() ? letterBody.trim().split(/\s+/).length : 0);
</script>

<div class="bg-neutral-800/80 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-sm">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">3</div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-200">Betreff, Brieftext & Layout-Optionen</h3>
        </div>
        <span class="text-[10px] text-neutral-400">{wordCount} Wörter</span>
    </div>

    <!-- Betreffzeile (DIN 5008 fett) -->
    <div>
        <label for="subject-input" class="block text-xs font-semibold text-neutral-300 mb-1">Betreffzeile (DIN 5008 fett):</label>
        <input
            id="subject-input"
            type="text"
            bind:value={subject}
            placeholder="Betreff..."
            class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
        />
    </div>

    <!-- Anrede, Grußformel & Unterzeichner -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
            <label for="salutation-input" class="block text-xs font-semibold text-neutral-300 mb-1">Anrede im Text:</label>
            <input
                id="salutation-input"
                type="text"
                bind:value={salutationLine}
                placeholder="Sehr geehrte Damen und Herren,"
                class="w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
            />
        </div>
        <div>
            <label for="closing-input" class="block text-xs font-semibold text-neutral-300 mb-1">Grußformel & Unterzeichner:</label>
            <div class="flex gap-2">
                <input
                    id="closing-input"
                    type="text"
                    bind:value={closingLine}
                    class="w-1/2 bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none"
                />
                <input
                    type="text"
                    bind:value={senderName}
                    class="w-1/2 bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 outline-none placeholder:text-neutral-500"
                    placeholder="Ihr Name"
                />
            </div>
        </div>
    </div>

    <!-- Brieftext mit autoGrow -->
    <div>
        <label for="body-input" class="block text-xs font-semibold text-neutral-300 mb-1">Brieftext:</label>
        <textarea
            id="body-input"
            use:autoGrow
            bind:value={letterBody}
            placeholder="Schreiben Sie hier Ihren Brief..."
            class="auto-grow w-full bg-neutral-900 border border-neutral-700/80 focus:border-sky-500 text-neutral-100 text-xs sm:text-sm leading-relaxed rounded-xl p-3.5 outline-none placeholder:text-neutral-500 resize-none overflow-hidden min-h-[140px]"
        ></textarea>
    </div>

    <!-- DIN 5008 Layout-Optionen (Fußzeile & Kontakt unter Logo laut Ticket) -->
    <div class="pt-2 border-t border-white/5 space-y-2">
        <label class="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-300 hover:text-white select-none">
            <input
                type="checkbox"
                bind:checked={includeFooter}
                class="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-sky-500 focus:ring-sky-500 focus:ring-offset-0 cursor-pointer"
            />
            <span class="font-medium">3-spaltige Geschäftsfußzeile am Seitenende einfügen</span>
            <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Ticket Wunsch</span>
        </label>

        <label class="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-300 hover:text-white select-none">
            <input
                type="checkbox"
                bind:checked={includeContactUnderLogo}
                class="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-sky-500 focus:ring-sky-500 focus:ring-offset-0 cursor-pointer"
            />
            <span class="font-medium">Kontaktdaten (Tel / Mail / Web) unter dem Logo anzeigen</span>
            <span class="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">8 pt Infoblock</span>
        </label>
    </div>
</div>
