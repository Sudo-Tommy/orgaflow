class AppointmentModalService {
    modalRef: any = null;

    register(ref: any) {
        this.modalRef = ref;
    }

    open(id?: string) {
        if (this.modalRef?.open) {
            this.modalRef.open(id);
        }
    }

    openNew() {
        if (this.modalRef?.open) {
            this.modalRef.open();
        }
    }

    close() {
        if (this.modalRef?.close) {
            this.modalRef.close();
        }
    }
}

export const appointmentModalService = new AppointmentModalService();
