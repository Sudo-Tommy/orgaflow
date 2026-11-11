import { pb } from "$lib/services/pocketbase";
import { impersonationService } from "$lib/services/impersonationService.svelte";

/**
 * Führt den regulären Login in PocketBase durch.
 * Löscht beim echten Anmelden sämtliche Imitierungs- und Rollen-Test-Reste (A3, A13).
 */
export async function loginUser(email: string, pass: string): Promise<{ success: boolean; error: string | null }> {
    impersonationService.clearSessionBackup();

    try {
        await pb.collection('users').authWithPassword(email, pass);
        impersonationService.clearSessionBackup();

        // Schutz für das primäre Entwickler-Konto (Tommy Jenzsch)
        const model = pb.authStore.model || pb.authStore.record;
        const normalizedEmail = (model?.email || email || '').toLowerCase().trim();
        if (
            (model?.id === 'ewva03ar6xzmsh1' || normalizedEmail === 'tommy.jenzsch@ihre-seniorenassistenz.com' || normalizedEmail === 't.jenzsch@ihre-seniorenassistenz.com') &&
            model?.role !== 'developer'
        ) {
            try {
                const fixRes = await fetch('/api/auth/switch-role', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${pb.authStore.token}`
                    },
                    body: JSON.stringify({ targetRole: 'developer' })
                });
                const fixData = await fixRes.json().catch(() => ({}));
                if (fixData?.record) {
                    pb.authStore.save(pb.authStore.token, fixData.record);
                }
            } catch (fixErr) {
                console.warn('[loginUser] Selbstreparatur der Entwickler-Rolle fehlgeschlagen:', fixErr);
            }
        }
        return { success: true, error: null };
    } catch {
        try {
            await pb.collection('_superusers').authWithPassword(email, pass);
            impersonationService.clearSessionBackup();
            return { success: true, error: null };
        } catch {
            return { success: false, error: "Ungültige E-Mail-Adresse oder Passwort." };
        }
    }
}
