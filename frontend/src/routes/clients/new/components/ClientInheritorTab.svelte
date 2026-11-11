<script lang="ts">
    import type { ClientFormData } from "../types";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { sortPersons } from "$lib/utils/sortHelper";
    import ContactModal from "$lib/components/contacts/ContactModal.svelte";
    import { Users, ShieldCheck, Search, Plus } from "lucide-svelte";

    interface Props {
        formData: ClientFormData;
        inheritorMode?: "contact" | "direct";
        isLoading: boolean;
    }

    let {
        formData = $bindable(),
        inheritorMode = $bindable("contact"),
        isLoading
    }: Props = $props();

    let contactModal = $state<ReturnType<typeof ContactModal>>();
    let searchQuery = $state("");

    const RELATION_OPTIONS = [
        "Angehörige/r", "Bevollmächtigte/r", "Ehepartner/in", "Enkel/in",
        "Facharzt / Fachärztin", "Freund/in", "Gesetzliche/r Betreuer/in", "Geschwister",
        "Hausarzt / Hausärztin", "Mutter", "Nachbar/in", "Pflegedienst", "Pflegeperson",
        "Schwiegersohn", "Schwiegertochter", "Sohn", "Sonstiges", "Tochter", "Vater"
    ];

    let filteredContacts = $derived.by(() => {
        const sorted = sortPersons(orgaStore.contacts?.data || []);
        if (!searchQuery.trim()) return sorted;
        const q = searchQuery.toLowerCase();
        return sorted.filter((c: any) =>
            (c.name_first && c.name_first.toLowerCase().includes(q)) ||
            (c.name_last && c.name_last.toLowerCase().includes(q)) ||
            (c.company_name && c.company_name.toLowerCase().includes(q))
        );
    });

    let hasAnyCarepersonSelected = $derived(
        formData.contacts.some((cid) => Boolean(formData.contact_relations?.[cid]?.is_careperson))
    );

    function ensureRelationEntry(id: string, defaultRel = "Angehörige/r") {
        if (!formData.contact_relations) formData.contact_relations = {};
        if (!formData.contact_relations[id]) {
            formData.contact_relations[id] = {
                relation: defaultRel,
                is_primary: formData.contacts.length === 1,
                is_careperson: defaultRel === "Pflegeperson",
                has_power_of_attorney: defaultRel === "Bevollmächtigte/r" || defaultRel === "Gesetzliche/r Betreuer/in",
                notes: ""
            };
        }
    }

    function toggleContact(id: string, companyName?: string) {
        if (formData.contacts.includes(id)) {
            formData.contacts = formData.contacts.filter((cId) => cId !== id);
        } else {
            formData.contacts = [...formData.contacts, id];
            const validRel = companyName && RELATION_OPTIONS.includes(companyName) ? companyName : "Angehörige/r";
            ensureRelationEntry(id, validRel);
        }
    }

    function openCreateNewContact() {
        contactModal?.open(null, {
            onSaved: (saved: any) => {
                if (saved?.id && !formData.contacts.includes(saved.id)) {
                    formData.contacts = [...formData.contacts, saved.id];
                    ensureRelationEntry(saved.id, "Angehörige/r");
                }
            }
        });
    }
</script>

<div class="space-y-6 animate-enter">
    <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
                <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Users class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Bezugspersonen, Pflegeperson & Vertretung verknüpfen</span>
                </h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Wählen Sie Kontakte aus dem Adressbuch und weisen Sie direkt deren Funktion (Hauptkontakt, Pflegeperson, Vollmacht) zu.
                </p>
            </div>
            <button
                type="button"
                onclick={openCreateNewContact}
                class="orga-button-primary px-3 py-2 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                disabled={isLoading}
            >
                <Plus class="w-3.5 h-3.5" />
                <span>Neuen Kontakt anlegen</span>
            </button>
        </div>

        <div class="relative mb-3">
            <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Kontakt im Adressbuch suchen..."
                class="orga-input-clear pl-10 text-xs sm:text-sm"
                disabled={isLoading}
            />
        </div>

        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            {#each filteredContacts as c (c.id)}
                {@const isChecked = formData.contacts.includes(c.id)}
                <div class="p-3 rounded-xl border transition-all {isChecked ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-2xs' : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'}">
                    <label class="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onchange={() => toggleContact(c.id, c.company_name)}
                            class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            disabled={isLoading}
                        />
                        <div class="min-w-0 flex-1">
                            <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {c.name_first} {c.name_last} {c.company_name ? `(${c.company_name})` : ""}
                            </p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {c.phone || c.email || c.city || "Keine Kontaktdaten hinterlegt"}
                            </p>
                        </div>
                    </label>

                    {#if isChecked && formData.contact_relations?.[c.id]}
                        <div class="mt-2.5 pl-7 space-y-2">
                            <div class="flex items-center gap-2">
                                <label for="wiz-rel-{c.id}" class="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 shrink-0">Beziehung:</label>
                                <select
                                    id="wiz-rel-{c.id}"
                                    bind:value={formData.contact_relations[c.id].relation}
                                    class="text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-indigo-900 dark:text-indigo-200 font-bold w-full cursor-pointer"
                                >
                                    {#each RELATION_OPTIONS as opt}
                                        <option value={opt}>{opt}</option>
                                    {/each}
                                </select>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <label class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 cursor-pointer">
                                    <input type="checkbox" bind:checked={formData.contact_relations[c.id].is_primary} class="w-3.5 h-3.5 rounded text-amber-600" />
                                    <span>⭐ Hauptkontakt</span>
                                </label>
                                <label class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 cursor-pointer">
                                    <input type="checkbox" bind:checked={formData.contact_relations[c.id].is_careperson} class="w-3.5 h-3.5 rounded text-indigo-600" />
                                    <span>🤝 Pflegeperson (§ 39)</span>
                                </label>
                                <label class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 cursor-pointer">
                                    <input type="checkbox" bind:checked={formData.contact_relations[c.id].has_power_of_attorney} class="w-3.5 h-3.5 rounded text-emerald-600" />
                                    <span>📜 Vollmacht / Vertretung</span>
                                </label>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
            {#if filteredContacts.length === 0}
                <div class="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    Kein Kontakt gefunden. Klicken Sie oben auf „Neuen Kontakt anlegen“.
                </div>
            {/if}
        </div>
    </div>

    {#if hasAnyCarepersonSelected}
        <div class="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Angaben zur Verhinderungspflege (§ 39 SGB XI)</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="new-cp-reason" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Verhinderungsgrund</label>
                    <select id="new-cp-reason" bind:value={formData.careperson_reason} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                        <option value="Erholungsurlaub">Erholungsurlaub</option>
                        <option value="Krankheit">Krankheit</option>
                        <option value="Sonstiges">Sonstiges</option>
                    </select>
                </div>
                <div>
                    <label for="new-cp-type" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Art der Verhinderung</label>
                    <select id="new-cp-type" bind:value={formData.careperson_care_type} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                        <option value="stundenweise">Stundenweise (&lt; 8 Std.)</option>
                        <option value="tageweise">Tageweise (&gt;= 8 Std.)</option>
                    </select>
                </div>
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" bind:checked={formData.careperson_pre_care} class="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                    <span>Vorpflegezeit erfüllt (mindestens 6 Monate)</span>
                </label>
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" bind:checked={formData.careperson_care_allowance} class="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                    <span>Pflegegeldbezug liegt vor</span>
                </label>
            </div>
        </div>
    {/if}
</div>

<ContactModal bind:this={contactModal} />
