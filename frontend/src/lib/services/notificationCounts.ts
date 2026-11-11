import { pb } from './pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { rbacService } from './rbacService.svelte';

export function countPendingAdmissions(): number {
    const isGodMode = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || rbacService.isOwner;
    const isAdmin = isGodMode || pb.authStore.model?.role === 'admin';
    const currentUserId = pb.authStore.model?.id;
    if (!currentUserId) return 0;

    let list = (orgaStore.clients?.data || []).filter((c: any) => {
        if (c.status === 'Aktiv' || c.status === 'Verstorben') return false;
        const n = (c.notes || '').toUpperCase();
        return n.includes('NEUAUFNAHME') || n.includes('AUFNAHME') || (c.status === 'Inaktiv' && n.includes('EINGEREICHT'));
    });

    if (!isGodMode) {
        const userCompanyId = pb.authStore.model?.company;
        list = list.filter((c: any) => {
            if (userCompanyId) {
                const comp = c.company;
                const matchesCompany = !comp || (Array.isArray(comp) ? (comp.length === 0 || comp.includes(userCompanyId)) : (comp === userCompanyId || comp.includes(userCompanyId)));
                if (!matchesCompany) return false;
            }
            const assigned = Array.isArray(c.assigned_employee) ? c.assigned_employee[0] : c.assigned_employee;
            return assigned ? assigned === currentUserId : isAdmin;
        });
    }
    return list.length;
}

export function countPendingChanges(): number {
    const isGodMode = pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || rbacService.isOwner;
    const isAdmin = isGodMode || pb.authStore.model?.role === 'admin';
    const currentUserId = pb.authStore.model?.id;
    if (!currentUserId) return 0;

    let list = (orgaStore.appointments?.data || []).filter((a: any) => a.requestet_changes?.status === 'pending');
    if (!isGodMode) {
        const userCompanyId = pb.authStore.model?.company;
        if (isAdmin && userCompanyId) {
            list = list.filter((a: any) => a.expand?.user?.company === userCompanyId);
        } else {
            list = list.filter((a: any) => (Array.isArray(a.user) ? a.user[0] : a.user) === currentUserId);
        }
    }
    return list.length;
}
