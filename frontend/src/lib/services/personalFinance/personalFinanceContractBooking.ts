import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';

export async function bookDueContracts(
    contracts: any[],
    activeUserId: string,
    onReload: () => Promise<void>
): Promise<void> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueContracts = contracts.filter(c => c.next_due_date && new Date(c.next_due_date) <= today);
    if (dueContracts.length === 0) {
        toastStore.info("Keine fälligen Verträge für die automatische Buchung gefunden.");
        return;
    }

    try {
        for (const contract of dueContracts) {
            const transactionPayload = new FormData();
            transactionPayload.set('user', activeUserId);
            transactionPayload.append('title', `Vertrag: ${contract.title}`);
            transactionPayload.append('amount', contract.amount);
            transactionPayload.append('type', contract.type || 'expense');
            transactionPayload.append('category', 'Vertrag');
            transactionPayload.append('date', new Date(contract.next_due_date).toISOString());

            await pb.collection('personal_transactions').create(transactionPayload);

            const currentDueDate = new Date(contract.next_due_date);
            let nextDueDate: Date;
            if (contract.interval === 'monthly') {
                nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
            } else if (contract.interval === 'quarterly') {
                nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 3));
            } else {
                nextDueDate = new Date(currentDueDate.setFullYear(currentDueDate.getFullYear() + 1));
            }
            await pb.collection('personal_contracts').update(contract.id, { next_due_date: nextDueDate.toISOString() });
        }
        toastStore.success(`${dueContracts.length} Vertragsposten wurden automatisch gebucht.`);
        await onReload();
    } catch (e) {
        console.error("Fehler beim Buchen der Verträge:", e);
        toastStore.error("Fehler beim Buchen der Verträge.");
    }
}
