import { pb } from '$lib/services/pocketbase';

let cachedResolvedUserId: string | null = null;

export async function resolveEffectiveUserId(preferredId?: string): Promise<string> {
    if (preferredId && preferredId !== pb.authStore.model?.id) {
        return preferredId;
    }

    if (pb.authStore.model?.collectionName === 'users' && pb.authStore.model.id) {
        return pb.authStore.model.id;
    }

    if (cachedResolvedUserId) {
        return cachedResolvedUserId;
    }

    try {
        const adminEmail = pb.authStore.model?.email?.toLowerCase() || '';
        const emailPrefix = adminEmail.split('@')[0].replace(/[^a-z]/g, '');

        const allUsers = await pb.collection('users').getFullList({ sort: 'created', requestKey: null });
        if (allUsers.length === 0) return '';

        // 1. Direkte E-Mail-Übereinstimmung
        const exactMatch = allUsers.find(u => u.email?.toLowerCase() === adminEmail);
        if (exactMatch) {
            cachedResolvedUserId = exactMatch.id;
            return exactMatch.id;
        }

        // 2. Ähnliche E-Mail / Namens-Übereinstimmung (z.B. t.jenzsch vs tommy.jenzsch)
        const similarMatch = allUsers.find(u => {
            const uPrefix = (u.email || '').toLowerCase().split('@')[0].replace(/[^a-z]/g, '');
            return (emailPrefix.length > 3 && uPrefix.includes(emailPrefix)) || 
                   (uPrefix.length > 3 && emailPrefix.includes(uPrefix)) ||
                   (u.name_first && adminEmail.includes(u.name_first.toLowerCase())) ||
                   (u.name_last && adminEmail.includes(u.name_last.toLowerCase()));
        });
        if (similarMatch) {
            cachedResolvedUserId = similarMatch.id;
            return similarMatch.id;
        }

        // 3. Superadmin in der users-Collection
        const superadminUser = allUsers.find(u => u.role === 'superadmin');
        if (superadminUser) {
            cachedResolvedUserId = superadminUser.id;
            return superadminUser.id;
        }

        // 4. Fallback auf den ersten Benutzer
        cachedResolvedUserId = allUsers[0].id;
        return allUsers[0].id;
    } catch (err) {
        console.warn('[personalFinanceService] Konnte effektive Nutzer-ID nicht auflösen:', err);
        return pb.authStore.model?.id || '';
    }
}
