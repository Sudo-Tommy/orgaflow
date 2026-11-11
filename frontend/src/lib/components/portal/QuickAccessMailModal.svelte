<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { buildQuickAccessEmailHtml, buildQuickAccessPlainText } from "$lib/services/quickAccessEmailBuilder";
    import { getEmailService, type SendEmailInput } from "$lib/services/emailServiceStore.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { resolveCompanyData, resolveUserData } from "$lib/services/emailCompanyService";
    import { formatClientFullName } from "$lib/utils/formatters";
    import MailComposer from "$lib/components/MailComposer.svelte";
    import { Check, Copy, Mail, ShieldCheck, AlertCircle, Send } from "lucide-svelte";

    let dialog: HTMLDialogElement;
    let target = $state<any>(null);
    let portalCode = $state("");
    let portalPin = $state("");
    let recipientEmail = $state("");
    let saveToRecord = $state(true);
    let isLoading = $state(false);
    let copiedSuccess = $state(false);
    let showComposer = $state(false);
    let wasAutoOpened = $state(false);
    let composerData = $state<any>(null);

    let compData = $derived.by(() => resolveCompanyData(orgaStore));
    let userData = $derived.by(() => resolveUserData());
    let targetName = $derived.by(() => target ? (formatClientFullName(target) || target.company_name || "Sehr geehrte Damen und Herren") : "");
    let portalUrl = $derived.by(() => portalCode ? `https://ihre-seniorenassistenz.com/portal?auth=${portalCode}` : "https://ihre-seniorenassistenz.com/portal");
    let emailHtml = $derived.by(() => buildQuickAccessEmailHtml({ targetName, portalUrl, portalPin, compData, userData }));
    let emailPlainText = $derived.by(() => buildQuickAccessPlainText({ targetName, portalUrl, portalPin }));

    export async function open(targetData: any, options?: { autoOpenComposer?: boolean }) {
        target = targetData;
        copiedSuccess = false;
        recipientEmail = targetData?.email || "";
        portalCode = targetData?.portal_code || "";
        portalPin = targetData?.portal_pin || "";
        wasAutoOpened = !!options?.autoOpenComposer;

        if ((!portalCode || !recipientEmail) && target?.id) {
            isLoading = true;
            try {
                const isContact = target?.company_name !== undefined || target?.collectionName === 'contacts';
                const rec = await pb.collection(isContact ? 'contacts' : 'clients').getOne(target.id);
                if (!portalCode) { portalCode = rec.portal_code || ""; portalPin = rec.portal_pin || ""; }
                if (!recipientEmail && rec.email) recipientEmail = rec.email;
            } catch (err) {
                console.error("Fehler beim Nachladen der Zugangsdaten:", err);
            } finally {
                isLoading = false;
            }
        }
        if (wasAutoOpened) handleStartEmailComposer();
        else dialog?.showModal();
    }

    export function close() { dialog?.close(); }

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(emailPlainText);
            copiedSuccess = true;
            toastStore.success("E-Mail Text kopiert!");
            setTimeout(() => { copiedSuccess = false; }, 3000);
        } catch {
            toastStore.error("Fehler beim Kopieren.");
        }
    }

    async function handleStartEmailComposer() {
        if (saveToRecord && target?.id && recipientEmail && recipientEmail !== target.email) {
            try {
                const isContact = target.company_name !== undefined || target.collectionName === 'contacts';
                await pb.collection(isContact ? 'contacts' : 'clients').update(target.id, { email: recipientEmail });
                target.email = recipientEmail;
            } catch (e) {
                console.warn("[QuickAccessMailModal] E-Mail Update Warnung:", e);
            }
        }
        composerData = {
            to: recipientEmail ? [recipientEmail] : [],
            subject: `Ihr persönlicher Zugang zum Kunden- & Angehörigenportal`,
            body: emailPlainText,
            bodyHtml: emailHtml,
            relatedClient: target?.company_name ? undefined : target?.id,
            relatedContact: target?.company_name ? target?.id : undefined
        };
        showComposer = true;
        close();
    }

    async function handleComposerSend(data: SendEmailInput) {
        try {
            const res = await getEmailService().sendEmail(data);
            if (res.success) {
                toastStore.success("Zugangs-E-Mail erfolgreich versendet!");
                showComposer = false;
            } else {
                toastStore.error("Fehler beim Versenden der E-Mail.");
            }
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Versenden der E-Mail.");
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl border-none shadow-2xl z-50 outline-none"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl w-full flex flex-col border border-neutral-100 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors">
        <!-- Header Bild-3-Design -->
        <div class="p-6 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20 shrink-0">
                    <Mail class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            E-Mail-Vorlage
                        </span>
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400">
                            Direktlink & PIN
                        </span>
                    </div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                        Zugangs-Vorlage per E-Mail
                    </h3>
                </div>
            </div>
            <button 
                type="button" 
                onclick={close} 
                class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer"
                aria-label="Schließen"
            >✕</button>
        </div>

        <div class="p-6 space-y-4 flex-1">
            <div class="p-4 bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 rounded-2xl space-y-2.5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label for="quick-mail-recipient" class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Mail class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Empfänger-E-Mail-Adresse:</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                        <input type="checkbox" bind:checked={saveToRecord} class="rounded text-indigo-600 focus:ring-indigo-500" />
                        <span>Dauerhaft beim Kontakt hinterlegen</span>
                    </label>
                </div>
                <input 
                    id="quick-mail-recipient"
                    type="email" 
                    bind:value={recipientEmail} 
                    placeholder="z. B. empfaenger@beispiel.de"
                    class="w-full min-h-[42px] px-3.5 py-2 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {#if !recipientEmail}
                    <p class="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                        <span>Tipp: Sie können die E-Mail hier oder gleich im Verfassen-Fenster eingeben.</span>
                    </p>
                {/if}
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
                    <span>Vorschau der Vorlage:</span>
                    <span class="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-semibold text-[11px]">
                        <ShieldCheck class="w-3.5 h-3.5" /> HTML-Briefbogen & Plaintext
                    </span>
                </div>
                <div class="border border-neutral-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white text-slate-900">
                    {@html emailHtml}
                </div>
            </div>
        </div>

        <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button 
                type="button" 
                onclick={close} 
                class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
                Schließen
            </button>
            <div class="flex items-center gap-2">
                <button 
                    type="button" 
                    onclick={copyToClipboard} 
                    class="py-2.5 px-3.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                    {#if copiedSuccess}
                        <Check class="w-4 h-4 text-emerald-600" />
                        <span>Kopiert!</span>
                    {:else}
                        <Copy class="w-4 h-4" />
                        <span>Kopieren</span>
                    {/if}
                </button>
                <button 
                    type="button" 
                    onclick={handleStartEmailComposer} 
                    class="orga-button-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-indigo-600/20"
                >
                    <Send class="w-4 h-4" />
                    <span>Per E-Mail versenden</span>
                </button>
            </div>
        </div>
    </div>
</dialog>

{#if showComposer}
    <MailComposer 
        initialData={composerData} 
        onSend={handleComposerSend} 
        onClose={() => {
            showComposer = false;
            if (!wasAutoOpened) dialog?.showModal();
        }} 
    />
{/if}
