/**
 * omniChatService.js
 *
 * Verwaltet Server-seitige Omni-Chat-Aufgaben:
 * - Automatische Bereitstellung der PocketBase-Collection 'omni_chat_messages'
 * - Automatische Bereinigung von Nachrichten, die älter als 90 Tage sind
 */

export async function ensureOmniChatCollection(pbAdmin) {
    if (!pbAdmin) return;
    try {
        const col = await pbAdmin.collections.getOne('omni_chat_messages');
        const hasCreated = col.fields?.some(f => f.name === 'created');
        if (!hasCreated) {
            col.fields.push(
                { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
                { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
            );
            await pbAdmin.collections.update('omni_chat_messages', col);
        }
    } catch {
        try {
            await pbAdmin.collections.create({
                name: 'omni_chat_messages',
                type: 'base',
                listRule: '@request.auth.id = user || @request.auth.role = "admin" || @request.auth.role = "superadmin" || @request.auth.role = "developer" || @request.auth.role = "owner"',
                viewRule: '@request.auth.id = user || @request.auth.role = "admin" || @request.auth.role = "superadmin" || @request.auth.role = "developer" || @request.auth.role = "owner"',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id = user || @request.auth.role = "admin" || @request.auth.role = "superadmin" || @request.auth.role = "developer"',
                deleteRule: '@request.auth.id = user || @request.auth.role = "admin" || @request.auth.role = "superadmin" || @request.auth.role = "developer"',
                fields: [
                    { name: 'user', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1, required: true },
                    { name: 'role', type: 'select', values: ['user', 'assistant'], required: true },
                    { name: 'text', type: 'text' },
                    { name: 'action_link', type: 'json' },
                    { name: 'attachments', type: 'file', maxSelect: 5, maxSize: 10485760 },
                    { name: 'rating', type: 'select', values: ['up', 'down'] },
                    { name: 'is_ticket_generated', type: 'bool' },
                    { name: 'ticket_id', type: 'text' },
                    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
                    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
                ]
            });
            console.log("✅ PocketBase Collection 'omni_chat_messages' erfolgreich erstellt.");
        } catch (err) {
            console.warn("[Omni Chat] Collection-Erstellung Warnung:", err.message);
        }
    }
}

export async function cleanupOldOmniMessages(pbAdmin) {
    if (!pbAdmin) return;
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ');
        const oldRecords = await pbAdmin.collection('omni_chat_messages').getFullList({
            filter: `created < "${ninetyDaysAgo}"`,
            fields: 'id',
            requestKey: null
        });

        if (oldRecords.length > 0) {
            console.log(`[Omni Chat] Bereinige ${oldRecords.length} Nachrichten älter als 90 Tage...`);
            for (const rec of oldRecords) {
                await pbAdmin.collection('omni_chat_messages').delete(rec.id).catch(() => {});
            }
        }
    } catch (err) {
        console.warn("[Omni Chat] Cleanup alter Nachrichten übersprungen:", err.message);
    }
}
