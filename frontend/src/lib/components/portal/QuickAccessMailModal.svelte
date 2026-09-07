<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { Check, Copy, Mail, ExternalLink, ShieldCheck } from "lucide-svelte";

    let dialog: HTMLDialogElement;
    let target = $state<any>(null);
    let portalCode = $state("");
    let portalPin = $state("");
    let isLoading = $state(false);
    let copiedSuccess = $state(false);

    let targetName = $derived.by(() => {
        if (!target) return "";
        return `${target.name_first || ''} ${target.name_last || ''}`.trim() || target.company_name || "Sehr geehrte Damen und Herren";
    });

    let targetEmail = $derived.by(() => {
        return target?.email || "";
    });

    let portalUrl = $derived.by(() => {
        if (!portalCode) return "https://ihre-seniorenassistenz.com/portal";
        return `https://ihre-seniorenassistenz.com/portal?auth=${portalCode}`;
    });

    // Formatiertes HTML für E-Mail-Clients (Inline Styles & Tabellen für Gmail/Outlook)
    let emailHtml = $derived.by(() => {
        return `
<div style="background-color: #f1f5f9; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <tr>
            <td style="background-color: #0f172a; padding: 28px 24px; text-align: center;">
                <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Seniorenassistenz Jenzsch</div>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Ihr persönlicher Direkt-Zugang zum Klienten-Portal</div>
            </td>
        </tr>

        <!-- Body -->
        <tr>
            <td style="padding: 32px 28px;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b; font-weight: 700;">Guten Tag ${targetName},</h2>
                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                    Über unser gesichertes Klienten-Portal können Sie und Ihre Angehörigen jederzeit Einsätze, geplante Termine, Abrechnungen und Betreuungsberichte transparent und unkompliziert einsehen.
                </p>

                <!-- Zugangs-Box -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; margin: 24px 0;">
                    <tr>
                        <td style="padding: 20px; text-align: center;">
                            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Ihr persönlicher Direkt-Zugang:</div>
                            
                            <!-- Call to Action Button -->
                            <div style="margin: 16px 0;">
                                <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #c66a4d; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(198, 106, 77, 0.3);">
                                    👉 Jetzt Portal direkt öffnen
                                </a>
                            </div>
                            
                            ${portalPin ? `
                            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #334155;">
                                Ihre persönliche Sicherheits-PIN: <strong style="font-family: monospace; font-size: 16px; background: #e2e8f0; padding: 2px 8px; border-radius: 6px; letter-spacing: 2px;">${portalPin}</strong>
                            </div>` : ''}
                        </td>
                    </tr>
                </table>

                <!-- 3-Schritte Anleitung -->
                <div style="margin: 28px 0 20px 0;">
                    <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">So funktioniert es in 3 einfachen Schritten:</div>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="32" valign="top" style="padding-bottom: 10px;">
                                <div style="width: 24px; height: 24px; background-color: #e2e8f0; color: #1e293b; font-weight: 700; border-radius: 12px; text-align: center; line-height: 24px; font-size: 12px;">1</div>
                            </td>
                            <td style="padding-bottom: 10px; font-size: 13px; line-height: 1.5; color: #475569;">
                                <strong>Link anklicken:</strong> Nutzen Sie den Button oben oder speichern Sie sich den Link als Lesezeichen.
                            </td>
                        </tr>
                        <tr>
                            <td width="32" valign="top" style="padding-bottom: 10px;">
                                <div style="width: 24px; height: 24px; background-color: #e2e8f0; color: #1e293b; font-weight: 700; border-radius: 12px; text-align: center; line-height: 24px; font-size: 12px;">2</div>
                            </td>
                            <td style="padding-bottom: 10px; font-size: 13px; line-height: 1.5; color: #475569;">
                                <strong>Direkt eingeloggt:</strong> Mit Ihrem personalisierten Link sind Sie sofort sicher verbunden.
                            </td>
                        </tr>
                        <tr>
                            <td width="32" valign="top;">
                                <div style="width: 24px; height: 24px; background-color: #e2e8f0; color: #1e293b; font-weight: 700; border-radius: 12px; text-align: center; line-height: 24px; font-size: 12px;">3</div>
                            </td>
                            <td style="font-size: 13px; line-height: 1.5; color: #475569;">
                                <strong>Überblick behalten:</strong> Alle Termine, Betreuer und Berichte auf einen Blick einsehen.
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Kontaktdaten -->
                <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.5;">
                    Bei Fragen oder Unterstützung stehen wir Ihnen gerne zur Verfügung:<br>
                    📞 <strong>Telefon:</strong> 0345 / 213 895 20 &nbsp;|&nbsp; ✉️ <strong>E-Mail:</strong> info@ihre-seniorenassistenz.com
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                Seniorenassistenz Jenzsch · Dreyhauptstr. 2 · 06108 Halle (Saale) · Vertrauliche Klienten-Mitteilung
            </td>
        </tr>
    </table>
</div>`.trim();
    });

    // Plaintext Version
    let emailPlainText = $derived.by(() => {
        return `Guten Tag ${targetName},

Über unser gesichertes Klienten-Portal können Sie und Ihre Angehörigen jederzeit Einsätze, geplante Termine, Abrechnungen und Betreuungsberichte transparent und unkompliziert einsehen.

👉 Ihr persönlicher Direkt-Zugang:
${portalUrl}
${portalPin ? `Ihre Sicherheits-PIN: ${portalPin}\n` : ''}
So funktioniert es in 3 einfachen Schritten:
1. Link im Browser aufrufen
2. Direkt gesichert einloggen
3. Termine, Betreuer und Berichte auf einen Blick einsehen

Bei Rückfragen erreichen Sie uns jederzeit gerne:
Telefon: 0345 / 213 895 20
E-Mail: info@ihre-seniorenassistenz.com

Herzliche Grüße,
Ihr Team der Seniorenassistenz Jenzsch
Dreyhauptstr. 2 · 06108 Halle (Saale)`.trim();
    });

    export async function open(targetData: any) {
        target = targetData;
        copiedSuccess = false;
        portalCode = targetData?.portal_code || "";
        portalPin = targetData?.portal_pin || "";

        // Falls noch kein Portal-Code hinterlegt ist, kurz anfragen
        if (!portalCode && target?.id) {
            isLoading = true;
            try {
                const isContact = target?.company_name !== undefined || target?.collectionName === 'contacts';
                const collName = isContact ? 'contacts' : 'clients';
                const rec = await pb.collection(collName).getOne(target.id);
                portalCode = rec.portal_code || "";
                portalPin = rec.portal_pin || "";
            } catch (e) {
                console.warn("[QuickAccessMailModal] Konnte Datensatz nicht abrufen:", e);
            } finally {
                isLoading = false;
            }
        }

        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function copyToClipboard() {
        try {
            if (navigator.clipboard && window.ClipboardItem) {
                const htmlBlob = new Blob([emailHtml], { type: 'text/html' });
                const textBlob = new Blob([emailPlainText], { type: 'text/plain' });
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': htmlBlob,
                        'text/plain': textBlob
                    })
                ]);
            } else {
                await navigator.clipboard.writeText(emailPlainText);
            }

            if (navigator.vibrate) navigator.vibrate(50);
            copiedSuccess = true;
            toastStore.success("Formatierte E-Mail-Vorlage kopiert! Sie können sie jetzt direkt mit Strg+V in Gmail / Outlook einfügen.");
            setTimeout(() => { copiedSuccess = false; }, 4000);
        } catch (e) {
            console.error("Kopieren fehlgeschlagen:", e);
            try {
                await navigator.clipboard.writeText(emailPlainText);
                if (navigator.vibrate) navigator.vibrate(50);
                toastStore.success("Textvorlage in Zwischenablage kopiert.");
            } catch (fallbackErr) {
                toastStore.error("Kopieren in Zwischenablage nicht möglich.");
            }
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-2xl fixed sm:relative inset-x-0 bottom-0 sm:bottom-auto sm:my-auto sm:mx-auto rounded-t-3xl sm:rounded-3xl border-none shadow-2xl z-9999 touch-pan-y"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <!-- Drag Handle für Mobile -->
    <div class="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden shrink-0"></div>

    <div class="bg-white sm:rounded-3xl w-full flex flex-col max-h-[92dvh] overflow-hidden">
        
        <!-- Header -->
        <div class="px-5 sm:px-6 py-4 sm:py-5 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg shadow-xs shrink-0">
                    <Mail class="w-5 h-5" />
                </div>
                <div>
                    <h2 class="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">Quick-Mail Vorlage: Direkt-Zugang</h2>
                    <p class="text-xs text-neutral-500 font-medium">Formatierte E-Mail-Karte zum 1-Klick-Kopieren für Gmail & Outlook</p>
                </div>
            </div>
            <button 
                type="button" 
                onclick={close} 
                class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors text-sm font-bold shrink-0"
                aria-label="Schließen"
            >
                ✕
            </button>
        </div>

        <!-- Vorschau & Inhalt -->
        <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1 bg-neutral-50">
            <div class="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
                <span>Vorschau der formatierten E-Mail-Karte:</span>
                <span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 font-semibold text-[11px]">
                    <ShieldCheck class="w-3.5 h-3.5" /> HTML & Plaintext kompatibel
                </span>
            </div>

            <!-- Visueller HTML-Container -->
            <div class="border border-neutral-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                {@html emailHtml}
            </div>
        </div>

        <!-- Footer / Action Toolbar -->
        <div class="p-4 sm:p-5 border-t border-neutral-100 bg-white shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="text-xs text-neutral-500 hidden sm:block">
                Tipp: Nach dem Kopieren im E-Mail-Programm einfach <strong>Strg + V</strong> drücken.
            </div>
            
            <div class="flex flex-col-reverse sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                {#if targetEmail}
                    <a 
                        href="mailto:{targetEmail}?subject={encodeURIComponent('Ihr persönlicher Direkt-Zugang zum Klienten-Portal - Seniorenassistenz Jenzsch')}&body={encodeURIComponent(emailPlainText)}"
                        class="orga-button-ghost py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 text-neutral-700 hover:text-indigo-600 border border-neutral-200 w-full sm:w-auto min-h-[44px]"
                        title="Im installierten E-Mail-Programm öffnen"
                    >
                        <ExternalLink class="w-4 h-4" />
                        <span>E-Mail öffnen</span>
                    </a>
                {/if}
                
                <button 
                    type="button" 
                    onclick={copyToClipboard} 
                    class="orga-button-primary py-3 px-6 w-full sm:w-auto text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 flex items-center justify-center gap-2 min-h-[44px] font-bold"
                >
                    {#if copiedSuccess}
                        <Check class="w-4 h-4 text-white" />
                        <span>Kopiert! Jetzt in Gmail einfügen</span>
                    {:else}
                        <Copy class="w-4 h-4" />
                        <span>1-Klick HTML & Text kopieren</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>
</dialog>
