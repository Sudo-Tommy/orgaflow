import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';

export function usePersonalFinanceService() {
    let transactions = $state<any[]>([]);
    let contracts = $state<any[]>([]);
    let isLoading = $state(false);
    let error = $state<string | null>(null);

    const userId = pb.authStore.model?.id;

    async function loadData() {
        if (!userId) return;
        isLoading = true;
        error = null;
        try {
            const [transRes, contRes] = await Promise.all([
                pb.collection('personal_transactions').getFullList({ filter: `user = "${userId}"`, sort: '-date' }),
                pb.collection('personal_contracts').getFullList({ filter: `user = "${userId}"`, sort: 'title' })
            ]);
            transactions = transRes;
            contracts = contRes;
        } catch (e: any) {
            error = "Fehler beim Laden der Finanzdaten. Existieren die Tabellen 'personal_transactions' und 'personal_contracts'?";
            console.error(error, e);
            transactions = [];
            contracts = [];
        } finally {
            isLoading = false;
        }
    }

    async function addTransaction(payload: FormData) {
        if (!userId) return;
        payload.append('user', userId);
        await pb.collection('personal_transactions').create(payload);
        await loadData();
    }

    async function updateTransaction(id: string, payload: FormData) {
        await pb.collection('personal_transactions').update(id, payload);
        await loadData();
    }

    async function deleteTransaction(id: string) {
        await pb.collection('personal_transactions').delete(id);
        await loadData();
    }
    
    async function addContract(payload: FormData) {
        if (!userId) return;
        payload.append('user', userId);
        await pb.collection('personal_contracts').create(payload);
        await loadData();
    }

    async function updateContract(id: string, payload: FormData) {
        await pb.collection('personal_contracts').update(id, payload);
        await loadData();
    }

    async function deleteContract(id: string) {
        await pb.collection('personal_contracts').delete(id);
        await loadData();
    }

    async function bookDueContracts() {
        if (!userId) return;
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Ende des heutigen Tages

        const dueContracts = contracts.filter(c => c.next_due_date && new Date(c.next_due_date) <= today);

        if (dueContracts.length === 0) {
            toastStore.info("Keine fälligen Verträge für die automatische Buchung gefunden.");
            return;
        }

        isLoading = true;
        try {
            for (const contract of dueContracts) {
                const transactionPayload = new FormData();
                transactionPayload.append('user', userId);
                transactionPayload.append('title', `Vertrag: ${contract.title}`);
                transactionPayload.append('amount', contract.amount);
                transactionPayload.append('type', contract.type || 'expense');
                transactionPayload.append('category', 'Vertrag');
                transactionPayload.append('date', new Date(contract.next_due_date).toISOString());

                await pb.collection('personal_transactions').create(transactionPayload);

                const currentDueDate = new Date(contract.next_due_date);
                let nextDueDate: Date;
                if (contract.interval === 'monthly') nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
                else if (contract.interval === 'quarterly') nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 3));
                else nextDueDate = new Date(currentDueDate.setFullYear(currentDueDate.getFullYear() + 1));
                await pb.collection('personal_contracts').update(contract.id, { next_due_date: nextDueDate.toISOString() });
            }
            toastStore.success(`${dueContracts.length} Vertragsposten wurden automatisch gebucht.`);
            await loadData();
        } catch (e) { console.error("Fehler beim Buchen der Verträge:", e); toastStore.error("Fehler beim Buchen der Verträge."); } finally { isLoading = false; }
    }

    let stats = $derived.by(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalIncome = 0;
        let totalExpense = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        let upcomingExpenses = 0;

        for (const t of transactions) {
            const amount = t.amount || 0;
            if (t.type === 'income') {
                totalIncome += amount;
            } else {
                totalExpense += amount;
            }

            const tDate = new Date(t.date);
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                if (t.type === 'income') {
                    monthlyIncome += amount;
                } else {
                    monthlyExpense += amount;
                }
            }
        }
        
        for (const c of contracts) {
            const amount = c.amount || 0;
            // simple calculation for now
            if (c.interval === 'monthly') {
                upcomingExpenses += amount;
            }
        }

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            monthlyIncome,
            monthlyExpense,
            monthlyBalance: monthlyIncome - monthlyExpense,
            upcomingExpenses
        };
    });

    let forecast = $derived.by(() => {
        const months = [];
        const now = new Date();
        let currentBalance = stats.balance;

        for (let i = 0; i < 12; i++) {
            const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthName = forecastDate.toLocaleString('de-DE', { month: 'short', year: '2-digit' });
            
            let monthlyContractIncome = 0;
            let monthlyContractExpense = 0;

            contracts.forEach(c => {
                if (c.interval === 'monthly') {
                    if (c.type === 'income') monthlyContractIncome += c.amount;
                    else monthlyContractExpense += c.amount;
                }
                // Vereinfacht: Momentan werden nur monatliche Verträge für die Prognose berücksichtigt.
            });
            
            const monthlyNet = monthlyContractIncome - monthlyContractExpense;
            currentBalance += monthlyNet;

            months.push({
                name: monthName,
                net: monthlyNet,
                projectedBalance: currentBalance
            });
        }
        return months;
    });

    return {
        get transactions() { return transactions; },
        get contracts() { return contracts; },
        get isLoading() { return isLoading; },
        get error() { return error; },
        get stats() { return stats; },
        loadData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addContract,
        updateContract,
        deleteContract,
        bookDueContracts,
        get forecast() { return forecast; }
    };
}