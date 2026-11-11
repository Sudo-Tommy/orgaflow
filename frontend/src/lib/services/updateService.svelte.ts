import { pb } from './pocketbase';

const EMAIL_OVERHAUL_MARKER = 'Übersichtliche Liste (wie bei Gmail)';
const RELEASE_202_MARKER = 'Rechnungsversand mit Auto-Status';
const RELEASE_202_TEXT = `✨ Rechnungsversand mit Auto-Status: Rechnungen wechseln beim E-Mail-Versand jetzt direkt automatisch auf „Gesendet“ und werden protokolliert\n📅 Terminstatus „Beendet“ & Prüf-Plaketten: Abgeschlossene Termine erhalten einen grünen Haken; bei unvollständigen Angaben zeigt ein Hinweissymbol genau, was noch fehlt\n⏰ Klare Terminerstellung: Beim Anlegen neuer Termine genügt jetzt eine genaue Terminzeit, ohne erzwungene Endzeit\n⏱️ Reiner Arbeitszeitnachweis: Im Arbeitszeitnachweis werden Anfahrten und Kilometer ab sofort sauber herausgefiltert\n👤 Korrekte Portal-Begrüßung: Begrüßungen im Klienten-Portal erscheinen jetzt überall fehlerfrei und ohne störende Rollenbezeichnungen`;

class UpdateService {
    isOpen = $state(false);
    hasUnread = $state(false);
    updates = $state<any[]>([]);
    private seededThisSession = false;

    async check() {
        if (!pb.authStore.isValid) return;
        try {
            const res = await pb.collection('updates').getList(1, 20, { sort: '-created', requestKey: null });
            this.updates = res.items;

            await this.ensureRelease202Notice();

            if (this.updates.length > 0) {
                const latestNum = this.updates[0].number || 0;
                const lastSeen = localStorage.getItem('orga_last_seen_update') || '0';
                if (latestNum.toString() !== lastSeen.toString()) {
                    this.hasUnread = true;
                }
            }
        } catch {
            console.warn("Konnte Updates nicht laden.");
        }
    }

    private async ensureRelease202Notice() {
        if (this.seededThisSession) return;
        this.seededThisSession = true;

        const user = pb.authStore.model;
        const isSuperAdmin = pb.authStore.isSuperuser || user?.role === 'superadmin' || user?.role === 'developer';
        if (!isSuperAdmin) return;

        const alreadyExists = this.updates.some((u: any) => (u.text || '').includes(RELEASE_202_MARKER));
        if (alreadyExists) return;

        try {
            const nextNum = '2.0.2';
            const created = await pb.collection('updates').create({
                number: nextNum,
                date: new Date().toISOString(),
                text: RELEASE_202_TEXT,
                read_by: user?.id ? [user.id] : []
            }, { requestKey: null });

            this.updates = [created, ...this.updates];

            const existingDialogs = await pb.collection('system_dialogs').getList(1, 5, {
                filter: `title ~ "Update 2.0.2"`,
                requestKey: null
            }).catch(() => null);

            if (!existingDialogs || existingDialogs.items.length === 0) {
                const payload = {
                    sender: user?.id || 'ewva03ar6xzmsh1',
                    title: `✨ Neues Update (Update ${nextNum}) – Kurz & Einfach`,
                    message: RELEASE_202_TEXT,
                    priority: 'info',
                    is_broadcast: true,
                    status: 'open'
                };
                await pb.collection('system_dialogs').create(payload, { requestKey: null }).catch(() => {});
            }
        } catch {}
    }

    open() {
        this.isOpen = true;
        this.hasUnread = false;
        if (this.updates.length > 0) {
            localStorage.setItem('orga_last_seen_update', (this.updates[0].number || 0).toString());
        }
    }

    close() { this.isOpen = false; }
}
export const updateStore = new UpdateService();
