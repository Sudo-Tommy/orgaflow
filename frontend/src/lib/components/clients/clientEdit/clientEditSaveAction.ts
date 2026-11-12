import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { employeeService } from "$lib/services/employeeService.svelte";
import { geocodeAddressOnce } from "$lib/services/trips/geoUtils";

export async function saveClientEdit(
    client: any, 
    editState: any, 
    closeCallback: () => void
): Promise<boolean> {
    editState.isLoading = true;
    editState.errorMsg = "";

    try {
        const pbFormData = new FormData();
        const data = editState.formData;

        for (const [key, value] of Object.entries(data)) {
            if (
                key.startsWith('careperson_') ||
                key.startsWith('inheritor') ||
                key === 'caregiver' ||
                key === 'default_template' ||
                key === 'hourly_wage'
            ) continue;

            if (key === 'tax_rate') {
                pbFormData.append(key, (value != null && value !== "") ? value.toString() : "0");
            } else if (key === 'km_rate') {
                pbFormData.append(key, (value != null && value !== "") ? value.toString() : "0.3");
            } else if (key === 'marital_status') {
                pbFormData.append(key, (value === 'Keine Angabe' || !value) ? '' : value.toString());
            } else if (key === 'birthdate') {
                const cleanVal = (value as string || '').trim();
                pbFormData.append(key, cleanVal ? `${cleanVal} 12:00:00.000Z` : "");
            } else if (key === 'email') {
                const em = (value as string || '').trim();
                pbFormData.append(key, (em.includes('@') && em.includes('.')) ? em : '');
            } else if (['insurance', 'retirement_homes', 'company', 'templates', 'facility'].includes(key)) {
                if (typeof value === 'string' && value.trim().length > 0 && value !== 'none' && value !== 'other') {
                    pbFormData.append(key, value.trim());
                }
            } else {
                pbFormData.append(key, (value ?? '').toString());
            }
        }

        const hourlyRate = Number(data.hourly_wage ?? (data as any).hourly_rate ?? 40);
        pbFormData.append('hourly_rate', isNaN(hourlyRate) ? '40' : hourlyRate.toString());
        pbFormData.append('templates', data.default_template || '');
        pbFormData.append('billing_type', data.billing_type || '');

        const addressChanged = data.street !== client?.street || data.zip !== client?.zip || data.city !== client?.city || typeof client?.geo_lat !== 'number';
        if (addressChanged && (data.street || data.city)) {
            const coords = await geocodeAddressOnce(data.street, data.housenr, data.zip, data.city);
            if (coords) {
                pbFormData.append('geo_lat', String(coords.lat));
                pbFormData.append('geo_lng', String(coords.lng));
            }
        }

        if (editState.signatureMode === "upload" && editState.uploadedFile) {
            pbFormData.append("sign", editState.uploadedFile);
        } else if (editState.signatureMode === "draw" && editState.hasDrawnSignature && editState.canvas) {
            const blob = await new Promise<Blob | null>(resolve => editState.canvas!.toBlob(resolve, "image/png"));
            if (blob) pbFormData.append("sign", blob, "signature.png");
        } else if (editState.deleteExistingSignature) {
            pbFormData.append("sign", "");
        }

        await pb.collection('clients').update(client.id, pbFormData);

        if (data.assigned_employee !== editState.initialAssignedEmployee) {
            await employeeService.assignEmployeeToClient(client.id, data.assigned_employee || null, true);
        }

        setTimeout(async () => {
            const updatedClient = await pb.collection('clients').getOne(client.id, { expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', requestKey: null }) as any;
            const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
            if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
        }, 300);

        toastStore.success(`Klientendaten für ${data.name_first} ${data.name_last} wurden erfolgreich aktualisiert.`);
        closeCallback();
        return true;
    } catch (err: any) {
        console.error(err);
        editState.errorMsg = err.message || "Fehler beim Speichern.";
        if (err.response?.data) {
            const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
            if (details) editState.errorMsg += ` (${details})`;
        }
        toastStore.error(`Fehler beim Speichern: ${editState.errorMsg}`);
        return false;
    } finally {
        editState.isLoading = false;
    }
}
