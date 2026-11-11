/**
 * Bereinigt rückwirkend gesendete E-Mails in PocketBase, die noch keinen vollständigen
 * OrgaFlow-Briefbogen besitzen oder verunstaltete Textblöcke (>>>) enthalten.
 */
import { pb } from './pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { resolveCompanyData, resolveUserData, wrapOrgaFlowEmailHtml } from './emailCompanyService';
import type { MailboxMessage } from './emailServiceTypes';

export function needsSentEmailRepair(mail: MailboxMessage): boolean {
    if (mail.folder !== 'Sent') return false;
    const html = (mail.body_html || '').trim();
    if (!html) return true;
    const hasLetterhead = html.includes('Alltagshilfe • Betreuung • Organisation') && html.includes('Ihre Ansprechperson') && html.includes('background-color: #faf5ff');
    const hasGarbledArrows = />(?:\s*>){2,}/.test(html) || (!html.includes('<details') && html.includes('--- Ursprüngliche Nachricht ---'));
    return !hasLetterhead || hasGarbledArrows;
}

export function buildRepairedSentHtml(mail: MailboxMessage): string {
    const compData = resolveCompanyData(orgaStore);
    const fromEmailMatch = mail.from_address?.match(/<(.+?)>/)?.[1] || mail.from_address || undefined;
    const userData = resolveUserData(undefined, undefined, fromEmailMatch);

    const rawSource = (mail.body_text || '').trim() || (mail.body_html || '').replace(/<[^>]+>/g, ' ').trim();
    return wrapOrgaFlowEmailHtml({
        bodyContent: rawSource,
        userData,
        compData
    });
}

let repairedSessionIds = new Set<string>();

export async function repairSentEmailsInBackground(emails: MailboxMessage[]): Promise<boolean> {
    const candidates = emails.filter(e => !repairedSessionIds.has(e.id) && needsSentEmailRepair(e));
    if (candidates.length === 0) return false;

    let anyUpdated = false;
    for (const mail of candidates.slice(0, 25)) {
        repairedSessionIds.add(mail.id);
        try {
            const repairedHtml = buildRepairedSentHtml(mail);
            if (repairedHtml && repairedHtml !== mail.body_html) {
                mail.body_html = repairedHtml;
                await pb.collection('mailbox_messages').update(mail.id, {
                    body_html: repairedHtml
                }, { requestKey: null });
                anyUpdated = true;
            }
        } catch (err) {
            console.warn('[emailSentRetroRepair] Konnte Mail nicht nachformatieren:', mail.id, err);
        }
    }
    return anyUpdated;
}

