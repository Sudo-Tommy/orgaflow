let schemaChecked = false;

export async function ensureLexOfficeSchema(pb) {
    if (schemaChecked) return;
    try {
        const collections = await pb.collections.getFullList({ requestKey: null });
        const hasConfigCol = collections.some((c) => c.name === 'lexoffice_configs');
        const usersCol = collections.find((c) => c.name === 'users');

        if (!hasConfigCol) {
            const companyCol = collections.find((c) => c.name === 'company');
            await pb.collections.create({
                name: 'lexoffice_configs',
                type: 'base',
                listRule: null,
                viewRule: null,
                createRule: null,
                updateRule: null,
                deleteRule: null,
                fields: [
                    {
                        name: 'company',
                        type: 'relation',
                        required: true,
                        collectionId: companyCol?.id || 'company',
                        cascadeDelete: false,
                        maxSelect: 1
                    },
                    { name: 'encrypted_api_key', type: 'text', required: true },
                    { name: 'iv', type: 'text', required: true },
                    { name: 'auth_tag', type: 'text', required: true },
                    { name: 'key_hint', type: 'text', required: false },
                    { name: 'webhook_secret', type: 'text', required: false },
                    { name: 'lexoffice_org_id', type: 'text', required: false },
                    { name: 'lexoffice_company_name', type: 'text', required: false },
                    { name: 'lexoffice_email', type: 'text', required: false },
                    {
                        name: 'status',
                        type: 'select',
                        required: false,
                        maxSelect: 1,
                        values: ['connected', 'error', 'disconnected']
                    },
                    { name: 'last_error', type: 'text', required: false },
                    { name: 'last_sync', type: 'date', required: false },
                    { name: 'last_sync_stats', type: 'json', required: false }
                ]
            }, { requestKey: null });
        }

        const ensureFieldsOn = async (colName, desiredFields) => {
            const col = collections.find((c) => c.name === colName);
            if (!col) return;
            const existingNames = new Set((col.fields || []).map((f) => f.name));
            const toAdd = desiredFields.filter((f) => !existingNames.has(f.name));
            if (toAdd.length > 0) {
                await pb.collections.update(col.id, {
                    fields: [...(col.fields || []), ...toAdd]
                }, { requestKey: null });
            }
        };

        await ensureFieldsOn('invoices', [
            { name: 'lexoffice_id', type: 'text', required: false },
            { name: 'lexoffice_voucher_status', type: 'text', required: false },
            { name: 'lexoffice_synced_at', type: 'date', required: false }
        ]);

        await ensureFieldsOn('clients', [
            { name: 'lexoffice_contact_id', type: 'text', required: false },
            {
                name: 'assigned_employee',
                type: 'relation',
                required: false,
                collectionId: usersCol?.id || '_pb_users_auth_',
                cascadeDelete: false,
                maxSelect: 1
            }
        ]);

        await ensureFieldsOn('company_expenses', [
            { name: 'lexoffice_id', type: 'text', required: false },
            { name: 'lexoffice_status', type: 'text', required: false }
        ]);

        await ensureFieldsOn('accounting', [
            { name: 'lexoffice_id', type: 'text', required: false }
        ]);

        await ensureFieldsOn('mailbox_messages', [
            { name: 'is_starred', type: 'bool', required: false }
        ]);

        schemaChecked = true;
    } catch (err) {
        console.warn('[LexOffice Schema] Hinweis bei Schema-Prüfung:', err.message);
    }
}

export async function writeLexOfficeAuditLog(pb, { userName = 'System', userRole = 'system', action, details }) {
    try {
        await pb.collection('audit_logs').create({
            user_id: 'lexoffice-sync',
            user_name: userName,
            user_role: userRole,
            action: action || 'LEXOFFICE_SYNC',
            target_collection: 'invoices',
            target_id: '-',
            details: typeof details === 'string' ? details : JSON.stringify(details),
            ip_address: '127.0.0.1'
        }, { requestKey: null });
    } catch {}
}
