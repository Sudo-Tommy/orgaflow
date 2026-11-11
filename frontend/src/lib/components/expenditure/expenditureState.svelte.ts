import { pb } from "$lib/services/pocketbase";
import { confirmStore } from "$lib/services/confirmService.svelte";

export class ExpenditureState {
    isLoading = $state(false);
    isScanningReceipt = $state(false);
    errorMsg = $state("");
    isCameraScannerOpen = $state(false);
    isCapturingFrame = $state(false);

    editId = $state<string | null>(null);
    titel = $state("");
    sum = $state<number | "">("");
    receiptFile = $state<File | null>(null);
    existingReceiptUrl = $state<string | null>(null);
    existingReceiptName = $state<string | null>(null);
    localPreviewUrl = $state<string | null>(null);
    removeReceipt = $state(false);
    initialDataHash = $state("");

    open(record?: any) {
        this.isLoading = false;
        this.isScanningReceipt = false;
        this.errorMsg = "";
        this.removeReceipt = false;
        this.receiptFile = null;
        if (this.localPreviewUrl) {
            URL.revokeObjectURL(this.localPreviewUrl);
            this.localPreviewUrl = null;
        }

        if (record) {
            this.editId = record.id;
            this.titel = record.titel || "";
            this.sum = record.sum ?? "";
            if (record.receipt) {
                this.existingReceiptName = record.receipt;
                this.existingReceiptUrl = pb.files.getURL(record, record.receipt);
            } else {
                this.existingReceiptName = null;
                this.existingReceiptUrl = null;
            }
        } else {
            this.editId = null;
            this.titel = "";
            this.sum = "";
            this.existingReceiptName = null;
            this.existingReceiptUrl = null;
        }

        this.initialDataHash = JSON.stringify({ titel: this.titel, sum: this.sum, existingReceiptName: this.existingReceiptName });
    }

    cleanupPreview() {
        if (this.localPreviewUrl) {
            URL.revokeObjectURL(this.localPreviewUrl);
            this.localPreviewUrl = null;
        }
    }

    async canClose(): Promise<boolean> {
        if (this.isCameraScannerOpen) {
            this.isCameraScannerOpen = false;
            return false;
        }
        const currentHash = JSON.stringify({ 
            titel: this.titel, 
            sum: this.sum, 
            existingReceiptName: this.removeReceipt ? null : (this.receiptFile ? this.receiptFile.name : this.existingReceiptName) 
        });
        if (currentHash !== this.initialDataHash) {
            return await confirmStore.ask(
                "Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?",
                "Änderungen verwerfen?",
                "Verwerfen",
                "Abbrechen",
                true
            );
        }
        return true;
    }

    removeCurrentReceipt() {
        this.receiptFile = null;
        this.cleanupPreview();
        this.removeReceipt = true;
    }
}
