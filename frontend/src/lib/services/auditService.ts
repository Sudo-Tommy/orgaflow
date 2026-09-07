import { pb } from './pocketbase';

export interface AuditLogPayload {
    action: string;
    route?: string;
    details?: any;
    user_name?: string;
    user_role?: string;
}

/**
 * Universeller Client-Service für lückenloses Audit-Logging (GoBD & DSGVO Konformität).
 */
export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
    try {
        const user = pb.authStore.record;
        const userName = payload.user_name || (user 
            ? `${(user as any).name_first || ''} ${(user as any).name_last || ''}`.trim() || (user as any).username || (user as any).email 
            : 'Unbekannt');
        const userRole = payload.user_role || (user as any)?.role || 'user';
        const currentRoute = payload.route || (typeof window !== 'undefined' ? window.location.pathname : '');
        const detailsStr = typeof payload.details === 'object' ? JSON.stringify(payload.details) : String(payload.details || '');

        try {
            await pb.collection('audit_logs').create({
                user_name: userName,
                user_role: userRole,
                action: payload.action,
                route: currentRoute,
                details: detailsStr
            });
            return;
        } catch {
            // Fallback to PB custom hook
            await pb.send('/api/orgaflow/audit/log', {
                method: 'POST',
                body: {
                    user_name: userName,
                    user_role: userRole,
                    action: payload.action,
                    route: currentRoute,
                    details: detailsStr
                }
            });
        }
    } catch (e) {
        console.warn('[AuditService] Audit-Log konnte nicht persistiert werden:', e);
    }
}
