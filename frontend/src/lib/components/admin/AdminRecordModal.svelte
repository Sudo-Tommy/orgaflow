<script lang="ts">
    import { pb } from "$lib/services/pocketbase";

    let { onSave } = $props<{ onSave: (col: string, id: string | null, data: any) => Promise<void> }>();

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let collection = $state("");
    let editId = $state<string | null>(null);
    let jsonContent = $state("");

    export function open(col: string, record?: any) {
        collection = col;
        if (record) {
            editId = record.id;
            const editable = { ...record };
            delete editable.collectionId;
            delete editable.collectionName;
            delete editable.expand;
            jsonContent = JSON.stringify(editable, null, 4);
        } else {
            editId = null;
            
            let defaultData: any = {};
            // Automatisch die Firma des erstellenden Users übernehmen
            if (['clients', 'contacts', 'retirement_homes'].includes(col)) {
                const userCompany = pb.authStore.model?.company;
                if (userCompany) {
                    defaultData.company = Array.isArray(userCompany) ? userCompany[0] : userCompany;
                }
            }
            
            jsonContent = JSON.stringify(defaultData, null, 4);
        }
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        let parsed = null;
        try {
            parsed = JSON.parse(jsonContent);
        } catch (e) {
            errorMsg = "Ungültiges JSON-Format. Bitte überprüfen Sie die Syntax (Klammern, Anführungszeichen).";
            isLoading = false;
            return;
        }

        try {
            await onSave(collection, editId, parsed);
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern an PocketBase.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-5 sm:p-6 w-full h-auto flex flex-col relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors z-10"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-1">Datensatz {editId ? 'bearbeiten' : 'anlegen'}</h2>
        <p class="text-sm text-neutral-500 mb-6">Tabelle: <span class="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{collection}</span></p>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100 shrink-0">{errorMsg}</div>{/if}
        
        <form onsubmit={onSubmit} class="flex-1 flex flex-col min-h-0 overflow-hidden">
            <label for="json-editor" class="text-sm font-semibold text-neutral-700 mb-2 flex justify-between items-end"><span>Raw JSON Data <span class="text-red-500">*</span></span> <span class="text-xs text-neutral-400 font-normal">IDs, Arrays oder Strings eintragen</span></label>
            <textarea id="json-editor" bind:value={jsonContent} rows="10" class="w-full font-mono text-xs leading-relaxed p-4 rounded-2xl bg-neutral-950 text-emerald-400 border-2 border-neutral-800 shadow-inner focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" spellcheck="false"></textarea>
            <div class="pt-5 mt-4 border-t border-neutral-100 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0"><button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button><button type="submit" class="orga-button-primary bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20 w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Direkt in DB schreiben"}</button></div>
        </form>
    </div>
</dialog>