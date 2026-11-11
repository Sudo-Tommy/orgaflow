import type { AppointmentRecord, ClientRecord, UserRecord } from './orgaTypes';

export type { AppointmentRecord };

export interface AppointmentWithClient extends AppointmentRecord {
    type?: 'internal' | 'client' | 'car_booking' | 'block' | string;
    userId?: string;
    vehicleId?: string;
    vehicleName?: string;
    isOccupied?: boolean;
    location_address?: string;
    expand?: {
        client?: ClientRecord | ClientRecord[];
        address?: any;
        user?: UserRecord;
        appointment_at?: any[];
        drive_record?: any[];
        time_record?: any[];
        tasks?: any[];
        expenditures?: any[];
        [key: string]: any;
    };
}

export interface NextAppointmentProps {
    appointment: AppointmentWithClient | AppointmentRecord | any | null;
    clientName?: string;
    userType?: 'client' | 'contact' | 'admin' | string;
    onSelectDetails?: (app: any) => void;
    onRequestAppointment?: () => void;
}

