<script lang="ts">
    import { Star, Phone, Mail, FileText, Maximize2, Mic, MailCheck, Plus, X, PenTool } from "lucide-svelte";
    import { autoGrow } from "$lib/actions/autoGrow";
    import ClientNotesMigrationNotice from "./ClientNotesMigrationNotice.svelte";
    import { getMissingSignaturePrompts } from "$lib/services/clientContactRoleHelper";

    interface Props {
        client: any;
        primaryContactInfo: any;
        contactsCount: number;
        notes: string;
        isNotesSaving: boolean;
        mailingList: string[];
        isMailingListSaving: boolean;
        contacts: any[];
        onOpenNetworkTab: () => void;
        onLinkContact: () => void;
        onOpenNotesEditor: () => void;
        onAiDictate: () => void;
        onSaveNotes: () => void;
        onAddEmail: (email: string) => void;
        onRemoveEmail: (email: string) => void;
        onOpenContactSignature?: (contact: any, role: "careperson" | "inheritor" | "both") => void;
    }

    let {
        client,
        primaryContactInfo,
        contactsCount,
        notes = $bindable(),
        isNotesSaving,
        mailingList,
        isMailingListSaving,
        contacts,
        onOpenNetworkTab,
        onLinkContact,
        onOpenNotesEditor,
        onAiDictate,
        onSaveNotes,
        onAddEmail,
        onRemoveEmail,
        onOpenContactSignature
    }: Props = $props();

    let newEmailInput = $state("");

    let missingSignaturePrompts = $derived(getMissingSignaturePrompts(client, contacts));

    function submitEmail() {
        if (!newEmailInput.trim()) return;
        onAddEmail(newEmailInput.trim());
        newEmailInput = "";
    }
</script>

<div class="space-y-4">
    <!-- Wichtigste Bezugsperson (Primary Contact) -->
    <div class="orga-card-white p-4 space-y-2.5 border-l-4 border-l-amber-500">
        <div class="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Star class="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Wichtigste Bezugsperson
            </h4>
            <button type="button" onclick={onOpenNetworkTab} class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                Alle ({contactsCount}) &rarr;
            </button>
        </div>

        {#if primaryContactInfo}
            {@const c = primaryContactInfo.contact}
            {@const rel = primaryContactInfo.relation}
            {@const relLabel = typeof rel === 'string' ? rel : (rel?.relation || '')}
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {(c.name_first?.[0] || c.company_name?.[0] || 'K').toUpperCase()}
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {`${c.name_first || ''} ${c.name_last || ''}`.trim() || c.company_name}
                    </p>
                    {#if relLabel}
                        <div class="flex items-center gap-1 mt-0.5">
                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                {relLabel}
                            </span>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
                {#if c.phone}
                    <a href={`tel:${c.phone}`} class="flex-1 text-center py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs font-bold flex items-center justify-center gap-1 truncate">
                        <Phone class="w-3 h-3 shrink-0" /> <span class="truncate">{c.phone}</span>
                    </a>
                {/if}
                {#if c.email}
                    <a href={`mailto:${c.email}`} class="flex-1 text-center py-1.5 px-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                        <Mail class="w-3 h-3 shrink-0" /> <span>Mail</span>
                    </a>
                {/if}
            </div>
        {:else}
            <div class="text-center py-2 text-neutral-400 dark:text-slate-500">
                <p class="text-xs italic mb-1.5">Noch keine Bezugsperson verknüpft.</p>
                <button type="button" onclick={onLinkContact} class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">
                    + Bezugsperson verknüpfen
                </button>
            </div>
        {/if}

        {#if onOpenContactSignature && missingSignaturePrompts.length > 0}
            <div class="pt-2 border-t border-neutral-100 dark:border-slate-800 space-y-1.5">
                {#each missingSignaturePrompts as prompt (prompt.contact.id + '_' + prompt.role)}
                    <button
                        type="button"
                        onclick={() => onOpenContactSignature?.(prompt.contact, prompt.role)}
                        class="orga-pill-action w-full justify-center {prompt.role === 'inheritor' ? 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800' : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'} text-xs font-bold py-1.5 cursor-pointer"
                        title="Fehlende Unterschrift für diesen Kontakt erfassen"
                    >
                        <PenTool class="w-3.5 h-3.5" />
                        <span>{prompt.label}</span>
                    </button>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Klienten-Notizen Card -->
    <div class="orga-card-white p-4 space-y-2.5 border-l-4 border-l-indigo-500">
        <div class="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                <FileText class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Notizen & Aktenvermerk
            </h4>
            <div class="flex items-center gap-1.5">
                <button type="button" onclick={onOpenNotesEditor} class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/60 px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer" title="Im Vollbild-Editor öffnen">
                    <Maximize2 class="w-3 h-3" /><span>Vollbild</span>
                </button>
                <button type="button" onclick={onAiDictate} class="text-[11px] font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 px-2 py-1 rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer">
                    <Mic class="w-3 h-3" /><span>KI</span>
                </button>
            </div>
        </div>

        <ClientNotesMigrationNotice {client} bind:notes />

        <textarea use:autoGrow bind:value={notes} onclick={onOpenNotesEditor} class="auto-grow orga-input-clear resize-none overflow-hidden min-h-[80px] text-xs leading-relaxed cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors w-full" placeholder="Besondere Hinweise, Absprachen... (Klicken für Vollbild)" disabled={isNotesSaving}></textarea>

        <div class="flex justify-end pt-1">
            <button type="button" onclick={onSaveNotes} disabled={isNotesSaving || notes === (client?.notes || '')} class="orga-button-primary py-1.5 px-3 text-xs font-bold cursor-pointer disabled:opacity-50">
                {isNotesSaving ? 'Speichert...' : 'Notizen speichern'}
            </button>
        </div>
    </div>

    <!-- CC-Verteiler (Mailing-Liste) -->
    <div class="orga-card-white p-4 space-y-2.5 border-l-4 border-l-sky-500">
        <div class="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                <MailCheck class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> CC-Verteiler
            </h4>
            <span class="text-[10px] text-neutral-400 dark:text-slate-400 font-semibold">{mailingList.length} Empfänger</span>
        </div>

        {#if mailingList.length > 0}
            <div class="flex flex-wrap gap-1 p-0.5">
                {#each mailingList as email (email)}
                    <div class="flex items-center gap-1 bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-medium border border-neutral-200 dark:border-slate-700">
                        <span class="truncate max-w-[150px]">{email}</span>
                        <button type="button" onclick={() => onRemoveEmail(email)} disabled={isMailingListSaving} class="text-rose-500 hover:text-rose-700 font-bold ml-0.5 cursor-pointer">
                            <X class="w-3 h-3" />
                        </button>
                    </div>
                {/each}
            </div>
        {/if}

        <div class="flex gap-1.5">
            <input type="email" bind:value={newEmailInput} placeholder="E-Mail hinzufügen..." class="orga-input-clear flex-1 py-1 px-2 text-xs" disabled={isMailingListSaving} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitEmail(); } }} />
            <button type="button" onclick={submitEmail} disabled={isMailingListSaving || !newEmailInput.trim()} class="orga-button-primary px-2.5 py-1 text-xs font-bold cursor-pointer disabled:opacity-50">
                <Plus class="w-3.5 h-3.5" />
            </button>
        </div>
    </div>
</div>
