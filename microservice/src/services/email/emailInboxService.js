import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

async function getImapConfig(userId, pbAdmin) {
    let imapUser = null;
    let imapPass = null;
    let imapHost = process.env.IMAP_HOST || 'imap.ionos.de';
    let imapPort = parseInt(process.env.IMAP_PORT) || 993;

    try {
        if (userId && pbAdmin) {
            const userConfigs = await pbAdmin.collection('userMailConfigs').getFullList({
                filter: `user = "${userId}"`,
                requestKey: null
            });
            if (userConfigs[0]) {
                imapUser = userConfigs[0].imap_user || userConfigs[0].smtp_user;
                imapPass = userConfigs[0].imap_password || userConfigs[0].smtp_password;
                imapHost = userConfigs[0].imap_host || imapHost;
                imapPort = parseInt(userConfigs[0].imap_port) || imapPort;
            } else {
                const userRecord = await pbAdmin.collection('users').getOne(userId).catch(() => null);
                const comp = userRecord?.company ? (Array.isArray(userRecord.company) ? userRecord.company[0] : userRecord.company) : null;
                if (comp) {
                    const compConfigs = await pbAdmin.collection('userMailConfigs').getFullList({
                        filter: `company = "${comp}"`,
                        requestKey: null
                    });
                    if (compConfigs[0]) {
                        imapUser = compConfigs[0].imap_user || compConfigs[0].smtp_user;
                        imapPass = compConfigs[0].imap_password || compConfigs[0].smtp_password;
                        imapHost = compConfigs[0].imap_host || imapHost;
                        imapPort = parseInt(compConfigs[0].imap_port) || imapPort;
                    }
                }
            }
        }
    } catch {}

    if (!imapUser || !imapPass) {
        imapUser = process.env.IMAP_USER || process.env.EMAIL_USER || process.env.SMTP_USER;
        imapPass = process.env.IMAP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;
    }

    if (!imapUser || !imapPass) return null;
    return { imapUser, imapPass, imapHost, imapPort };
}

function createClient(cfg) {
    return new ImapFlow({
        host: cfg.imapHost,
        port: cfg.imapPort,
        secure: cfg.imapPort === 993,
        auth: { user: cfg.imapUser, pass: cfg.imapPass },
        logger: false,
        emitLogs: false
    });
}

export async function fetchImapInbox(userId, pbAdmin) {
    const cfg = await getImapConfig(userId, pbAdmin);
    if (!cfg) return [];

    const client = createClient(cfg);
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const emails = [];

    try {
        const status = await client.status('INBOX', { messages: true });
        const total = status.messages || 0;
        if (total > 0) {
            const range = `${Math.max(1, total - 29)}:*`;
            for await (let msg of client.fetch(range, { envelope: true, source: true, flags: true })) {
                if (msg.flags && msg.flags.has('\\Deleted')) continue;
                let parsed = null;
                try { if (msg.source) parsed = await simpleParser(msg.source); } catch {}
                const attachments = (parsed?.attachments || []).filter(a => a.content && a.size < 5 * 1024 * 1024).map(a => ({
                    filename: a.filename || 'anhang',
                    content: a.content.toString('base64'),
                    contentType: a.contentType || 'application/octet-stream'
                }));
                emails.push({
                    uid: String(msg.uid),
                    subject: parsed?.subject || msg.envelope?.subject || '(Kein Betreff)',
                    from: parsed?.from?.text || msg.envelope?.from?.[0]?.address || '',
                    to: parsed?.to?.text || msg.envelope?.to?.[0]?.address || '',
                    date: parsed?.date ? parsed.date.toISOString() : (msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : new Date().toISOString()),
                    text: parsed?.text || '',
                    html: parsed?.html || '',
                    is_read: msg.flags ? msg.flags.has('\\Seen') : false,
                    attachments
                });
            }
        }
    } finally {
        lock.release();
        await client.logout().catch(() => {});
    }

    return emails;
}

export async function setImapMessageRead(userId, uid, isRead, pbAdmin) {
    const cfg = await getImapConfig(userId, pbAdmin);
    if (!cfg || !uid) return false;

    const client = createClient(cfg);
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
        if (isRead) {
            await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        } else {
            await client.messageFlagsRemove(String(uid), ['\\Seen'], { uid: true });
        }
        return true;
    } catch (e) {
        console.warn('[IMAP] Fehler beim Setzen von Seen für UID ' + uid + ':', e.message);
        return false;
    } finally {
        lock.release();
        await client.logout().catch(() => {});
    }
}

export async function deleteImapMessage(userId, uid, pbAdmin) {
    const cfg = await getImapConfig(userId, pbAdmin);
    if (!cfg || !uid) return false;

    const client = createClient(cfg);
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
        await client.messageFlagsAdd(String(uid), ['\\Deleted'], { uid: true }).catch(() => {});
        await client.messageDelete(String(uid), { uid: true }).catch(() => {});
        return true;
    } catch (e) {
        console.warn('[IMAP] Fehler beim Löschen von UID ' + uid + ':', e.message);
        return false;
    } finally {
        lock.release();
        await client.logout().catch(() => {});
    }
}
