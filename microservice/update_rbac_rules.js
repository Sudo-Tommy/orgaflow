import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);

async function updateRbacRules() {
    try {
        console.log(`[RBAC] Verbinde mit PocketBase an ${PB_URL}...`);
        await pb.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL,
            process.env.PB_ADMIN_PASSWORD
        );
        console.log("[RBAC] Erfolgreich als Superuser authentifiziert.");

        const collections = await pb.collections.getFullList();
        console.log(`[RBAC] ${collections.length} Collections gefunden.`);

        // 1. system_prompts Collection Absicherung (Nur Inhaber/Superadmin)
        const spColl = collections.find(c => c.name === 'system_prompts');
        if (spColl) {
            console.log("[RBAC] Sichere 'system_prompts' exklusiv für Inhaber/Superadmin ab...");
            await pb.collections.update(spColl.id, {
                listRule: '@request.auth.role = "superadmin" || @request.auth.role = "owner"',
                viewRule: '@request.auth.role = "superadmin" || @request.auth.role = "owner"',
                createRule: '@request.auth.role = "superadmin" || @request.auth.role = "owner"',
                updateRule: '@request.auth.role = "superadmin" || @request.auth.role = "owner"',
                deleteRule: '@request.auth.role = "superadmin" || @request.auth.role = "owner"'
            });
            console.log("[RBAC] 'system_prompts' Regeln erfolgreich aktualisiert.");
        }

        // 2. improvement_proposals Collection Absicherung
        const propColl = collections.find(c => c.name === 'improvement_proposals');
        if (propColl) {
            console.log("[RBAC] Sichere 'improvement_proposals' für Superadmin/Inhaber und Admins ab...");
            await pb.collections.update(propColl.id, {
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.role = "superadmin" || @request.auth.role = "owner" || @request.auth.role = "admin"',
                deleteRule: '@request.auth.role = "superadmin" || @request.auth.role = "owner"'
            });
            console.log("[RBAC] 'improvement_proposals' Regeln erfolgreich aktualisiert.");
        }

        console.log("[RBAC] Alle API-Rules wurden erfolgreich auf das neue Rollenmodell angewendet! ✅");
    } catch (err) {
        console.error("[RBAC Error]:", err);
    }
}

updateRbacRules();
