import type { AppointmentRecord } from './orgaTypes';

export type { AppointmentRecord };

export interface NextAppointmentProps {
    appointment: AppointmentRecord | any | null;
    clientName?: string;
    userType?: 'client' | 'contact' | 'admin' | string;
    onSelectDetails?: (app: any) => void;
    onRequestAppointment?: () => void;
}
