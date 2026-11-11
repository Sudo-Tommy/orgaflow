export type CalendarViewMode = 'month' | 'week';

export interface CalendarActionEvents {
    isSubmitting?: boolean;
    onNewAppointment?: (date?: Date) => void;
    onSync?: () => Promise<void> | void;
    onExport?: () => void;
    onPrint?: () => void;
    onOpenFilters?: () => void;
    onOpenSettings?: () => void;
    onBulkBlock?: () => void;
    onBulkVisibility?: () => void;
}

export interface CalendarHeaderProps {
    currentDate: Date;
    viewMode: CalendarViewMode;
    isSubmitting?: boolean;
    isWidget?: boolean;
    showFilterBar?: boolean;
    activeFilterCount?: number;
    canEdit?: boolean;
    onPrevDate: () => void;
    onNextDate: () => void;
    onTodayDate: () => void;
    onViewModeChange: (mode: CalendarViewMode) => void;
    onNewAppointment?: (date?: Date) => void;
    onSync?: () => Promise<void> | void;
    onExport?: () => void;
    onPrint?: () => void;
    onToggleFilters?: () => void;
    onOpenSettings?: () => void;
    onBulkBlock?: () => void;
    onBulkVisibility?: () => void;
}
