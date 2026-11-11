<script lang="ts">
    import { pb, withMutationTimeout } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { X, Building2, AlertCircle } from "lucide-svelte";

    let { onCreated } = $props<{ onCreated?: (newHome: any) => void; }>();

    let dialog: HTMLDialogElement | undefined = $state();
    let isSubmitting = $state(false);
    let errorMessage = $state("");

    let formData = $state({
        name: "",
        street: "",
        zip: "",
        city: "",
        phone: ""
    });

    export function open() {
        errorMessage = "";
        formData = { name: "", street: "", zip: "", city: "", phone: "" };
        dialog?.showModal();
    }

    export function close() {
        if (isSubmitting) return;
        dialog?.close();
    }

    async function checkForDuplicate(name: string, zip: string): Promise<boolean> {
        const cleanName = name.trim().toLowerCase();
        const cleanZip = zip.trim().toLowerCase();

        const localMatches = (orgaStore.retirement_homes?.data || []).some((h: any) => {
            const hName = (h.name || '').trim().toLowerCase();
            const hZip = (h.zip || '').trim().toLowerCase();
            return hName === cleanName && (!cleanZip || hZip === cleanZip);
        });
        if (localMatches) return true;

        try {
            let filter = `name ~ "${name.trim()}"`;
            if (cleanZip) filter += ` && (zip = "${cleanZip}" || address ~ "${cleanZip}")`;
            const existing = await pb.collection('retirement_homes').getList(1, 1, { filter, requestKey: null });
            return existing.totalItems > 0;
        } catch {
            return false;
        }
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        if (isSubmitting) return;

        if (!formData.name.trim()) {
            errorMessage = "Bitte geben Sie den vollständigen Namen des Pflegeheims an.";
            return;
        }

        isSubmitting = true;
        errorMessage = "";

        try {
            const isDuplicate = await checkForDuplicate(formData.name, formData.zip);
            if (isDuplicate) {
                errorMessage = "Ein Pflegeheim mit diesem Namen und dieser Postleitzahl ist bereits im System hinterlegt.";
                toastStore.warning("Dieses Pflegeheim existiert bereits.");
                isSubmitting = false;
                return;
            }

            const street = formData.street.trim();
            const zip = formData.zip.trim();
            const city = formData.city.trim();
            const fullAddress = [street, [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

            const payload = {
                name: formData.name.trim(),
                street,
                zip,
                city,
                address: fullAddress,
                phone: formData.phone.trim(),
                source: "portal",
                is_verified: false
            };

            const created = await withMutationTimeout(pb.collection('retirement_homes').create(payload));

            try {
                await pb.collection('nursing_homes').create({
                    name: formData.name.trim(),
                    street,
                    zip,
                    city,
                    phone: formData.phone.trim(),
                    status: "preliminary"
                });
            } catch {}

            if (orgaStore.retirement_homes) await orgaStore.retirement_homes.init();
            if (orgaStore.nursing_homes) await orgaStore.nursing_homes.init();

            toastStore.success(`Pflegeheim „${created.name}“ erfolgreich erfasst.`);
            onCreated?.(created);
            close();
        } catch (err: any) {
            errorMessage = err.message || "Fehler beim Anlegen des Pflegeheims.";
            toastStore.error(errorMessage);
        } finally {
            isSubmitting = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    aria-modal="true"
    aria-labelledby="nursing-home-modal-title"
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm w-full max-w-xl mx-auto my-6 sm:my-10 rounded-3xl"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-neutral-100 dark:border-slate-800 rounded-3xl w-full flex flex-col relative shadow-2xl">
        <div class="px-6 py-5 border-b border-neutral-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex justify-between items-center rounded-t-3xl">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center shrink-0 shadow-inner">
                    <Building2 class="w-5 h-5" />
                </div>
                <div>
                    <h2 id="nursing-home-modal-title" class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">Neues Pflegeheim erfassen</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Geben Sie die Adresse Ihres Pflegeheims ein.</p>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={close}
                disabled={isSubmitting}
                class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <div class="flex-1 p-6 space-y-5">
            {#if errorMessage}
                <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5">
                    <AlertCircle class="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{errorMessage}</span>
                </div>
            {/if}

            <form id="nursingHomeForm" onsubmit={handleSubmit} class="space-y-4">
                <div>
                    <label for="nh-name" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Name des Pflegeheims / der Einrichtung *</label>
                    <input
                        id="nh-name"
                        type="text"
                        bind:value={formData.name}
                        placeholder="z. B. Seniorenresidenz Sonnengarten"
                        required
                        disabled={isSubmitting}
                        class="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-xs touch-manipulation"
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="sm:col-span-2">
                        <label for="nh-street" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Straße</label>
                        <input
                            id="nh-street"
                            type="text"
                            bind:value={formData.street}
                            placeholder="Musterstraße"
                            disabled={isSubmitting}
                            class="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-xs touch-manipulation"
                        />
                    </div>
                    <div>
                        <label for="nh-zip" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Postleitzahl</label>
                        <input
                            id="nh-zip"
                            type="text"
                            bind:value={formData.zip}
                            placeholder="12345"
                            disabled={isSubmitting}
                            class="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-xs touch-manipulation"
                        />
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="nh-city" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Stadt / Ort</label>
                        <input
                            id="nh-city"
                            type="text"
                            bind:value={formData.city}
                            placeholder="Musterstadt"
                            disabled={isSubmitting}
                            class="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-xs touch-manipulation"
                        />
                    </div>
                    <div>
                        <label for="nh-phone" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Telefonnummer</label>
                        <input
                            id="nh-phone"
                            type="tel"
                            bind:value={formData.phone}
                            placeholder="0123 456789"
                            disabled={isSubmitting}
                            class="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-xs touch-manipulation"
                        />
                    </div>
                </div>
            </form>
        </div>

        <div class="p-4 sm:p-5 border-t border-neutral-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 rounded-b-3xl">
            <button
                type="button"
                onclick={close}
                disabled={isSubmitting}
                class="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors cursor-pointer touch-manipulation"
            >
                Abbrechen
            </button>
            <button
                type="submit"
                form="nursingHomeForm"
                disabled={isSubmitting}
                class="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 touch-manipulation"
            >
                {isSubmitting ? "Wird gespeichert..." : "Pflegeheim speichern"}
            </button>
        </div>
    </div>
</dialog>
