export function getRowBgClass(inv: any, isSelected: boolean, isMobile: boolean = false): string {
    if (isSelected) {
        return isMobile 
            ? 'bg-violet-50/30 dark:bg-violet-950/40 border-violet-500 ring-2 ring-violet-500' 
            : 'bg-violet-50/40 dark:bg-violet-950/30';
    }
    
    const baseBg = isMobile ? 'bg-white dark:bg-slate-900' : 'bg-transparent';
    const hover = isMobile ? 'hover:shadow-md' : '';
    const isOverdue = !['Abgeschlossen', 'Storniert', 'Abgelehnt'].includes(inv.status) && inv.due_date && new Date(inv.due_date).getTime() < new Date().setHours(0,0,0,0);

    if (isOverdue) return `${baseBg} hover:bg-rose-50/70 dark:hover:bg-rose-950/30 ${isMobile ? 'border-rose-200 dark:border-rose-800' : ''} ${hover}`;

    switch (inv.status) {
        case 'Abgeschlossen': return `${baseBg} hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 ${isMobile ? 'border-emerald-200 dark:border-emerald-800' : ''} ${hover}`;
        case 'Teilweise bezahlt': return `${baseBg} hover:bg-amber-50/60 dark:hover:bg-amber-950/20 ${isMobile ? 'border-amber-300 dark:border-amber-800' : ''} ${hover}`;
        case 'Eingereicht':
        case 'Offen': return `${baseBg} hover:bg-cyan-50/60 dark:hover:bg-cyan-950/20 ${isMobile ? 'border-cyan-200 dark:border-cyan-800' : ''} ${hover}`;
        case 'In Bearbeitung': return `${baseBg} hover:bg-cyan-50/60 dark:hover:bg-cyan-950/20 ${isMobile ? 'border-cyan-200 dark:border-cyan-800' : ''} ${hover}`;
        case 'Storniert':
        case 'Abgelehnt': return `${baseBg} hover:bg-slate-100/70 dark:hover:bg-slate-800/40 ${isMobile ? 'border-slate-200 dark:border-slate-800' : ''} ${hover}`;
        default: return `${baseBg} hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isMobile ? 'border-slate-200 dark:border-slate-800' : ''} ${hover}`;
    }
}
