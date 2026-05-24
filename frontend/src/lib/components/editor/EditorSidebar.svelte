<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";

    let { fields, selectedFieldId, onDelete } = $props<{
        fields: CanvasField[];
        selectedFieldId: string | null;
        onDelete: (id: string) => void;
    }>();

    let activeField = $derived(fields.find((f: CanvasField) => f.id === selectedFieldId) || null);
    
    // svelte-ignore non_reactive_update
    let textareaRef: HTMLTextAreaElement | null = null;

    function insertPlaceholder(placeholder: string) {
        if (!activeField || !textareaRef) return;
        const start = textareaRef.selectionStart;
        const end = textareaRef.selectionEnd;
        const current = activeField.content;
        activeField.content = current.substring(0, start) + placeholder + current.substring(end);
        
        setTimeout(() => {
            textareaRef?.focus();
            textareaRef?.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 10);
    }
</script>

<aside class="w-80 bg-white border-l border-neutral-200 flex flex-col h-full shrink-0 z-10 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)]">
    <div class="p-4 border-b border-neutral-100 bg-neutral-50/50">
        <h3 class="font-bold text-neutral-900">Eigenschaften</h3>
        <p class="text-xs text-neutral-500">Wähle ein Element auf dem Canvas aus.</p>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {#if !activeField}
            <div class="text-center text-neutral-400 py-10 italic text-sm">Kein Element ausgewählt</div>
        {:else}
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                <span class="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-1 rounded-md">{activeField.type} Element</span>
                    <button onclick={() => onDelete(activeField.id)} class="text-rose-500 hover:text-white hover:bg-rose-500 p-1.5 rounded-md transition-colors" title="Löschen"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div><label for="prop-x" class="block text-xs font-semibold text-neutral-600 mb-1">X Pos (px)</label><input id="prop-x" type="number" bind:value={activeField.x} class="orga-input-clear py-1.5 text-sm" /></div>
                    <div><label for="prop-y" class="block text-xs font-semibold text-neutral-600 mb-1">Y Pos (px)</label><input id="prop-y" type="number" bind:value={activeField.y} class="orga-input-clear py-1.5 text-sm" /></div>
                    <div><label for="prop-w" class="block text-xs font-semibold text-neutral-600 mb-1">Breite (px)</label><input id="prop-w" type="number" bind:value={activeField.w} class="orga-input-clear py-1.5 text-sm" /></div>
                    <div><label for="prop-h" class="block text-xs font-semibold text-neutral-600 mb-1">Höhe (px)</label><input id="prop-h" type="number" bind:value={activeField.h} class="orga-input-clear py-1.5 text-sm" /></div>
                </div>

                {#if activeField.type === 'text'}
                    <div class="pt-2 border-t border-neutral-100">
                        <label for="prop-text" class="block text-xs font-semibold text-neutral-600 mb-1">Text-Inhalt</label>
                        <textarea id="prop-text" bind:this={textareaRef} bind:value={activeField.content} rows="5" class="orga-input-clear py-2 text-sm resize-none custom-scrollbar font-mono"></textarea>
                        
                        <div class="mt-2">
                        <select onchange={(e) => { insertPlaceholder(e.currentTarget.value); e.currentTarget.value = ''; }} class="w-full bg-neutral-100 border border-neutral-200 hover:border-brand-300 px-2 py-1.5 rounded text-xs font-bold text-brand-700 outline-none cursor-pointer">
                                <option value="" selected disabled>+ Datenfeld (Variable) einfügen</option>
                                <optgroup label="Klient (Empfänger)">
                                    <option value={"{{client.salutation}}"}>Anrede (Herr/Frau)</option>
                                    <option value={"{{client.salutation_formal}}"}>Formelle Anrede</option>
                                    <option value={"{{client.name_first}}"}>Vorname</option>
                                    <option value={"{{client.name_last}}"}>Nachname</option>
                                    <option value={"{{client.street}} {{client.housenr}}"}>Straße & Hausnr.</option>
                                    <option value={"{{client.zip}} {{client.city}}"}>PLZ & Stadt</option>
                                    <option value={"{{client.phone}}"}>Telefon</option>
                                    <option value={"{{client.handy}}"}>Mobil (Handy)</option>
                                    <option value={"{{client.insurance_nr}}"}>Versicherungsnummer</option>
                                    <option value={"{{client.birthdate}}"}>Geburtsdatum</option>
                                    <option value={"{{client.level_of_care}}"}>Pflegegrad</option>
                                    <option value={"{{client.hourly_wage}}"}>Stundensatz (Klient)</option>
                                    <option value={"{{client.km_rate}}"}>Kilometerpauschale (Klient)</option>
                                    <option value={"{{client.tax_rate}}"}>Steuersatz (Klient)</option>
                                    <option value={"{{client.signature}}"}>Unterschrift (Klient)</option>
                                </optgroup>
                                <optgroup label="Krankenkasse (Klient)">
                                    <option value={"{{insurance.name}}"}>Name der Kasse</option>
                                    <option value={"{{insurance.type}}"}>Versicherungsart</option>
                                    <option value={"{{insurance.street}}"}>Straße</option>
                                    <option value={"{{insurance.zip}} {{insurance.city}}"}>PLZ & Stadt</option>
                                    <option value={"{{insurance.phone}}"}>Telefon</option>
                                    <option value={"{{insurance.email}}"}>E-Mail</option>
                                </optgroup>
                                <optgroup label="Kontakt (Adressat)">
                                    <option value={"{{contact.name_first}}"}>Vorname</option>
                                    <option value={"{{contact.name_last}}"}>Nachname</option>
                                    <option value={"{{contact.signature}}"}>Unterschrift (Kontakt)</option>
                                </optgroup>
                                <optgroup label="Benutzer (Mitarbeiter/Ersteller)">
                                    <option value={"{{user.name_first}}"}>Vorname</option>
                                    <option value={"{{user.name_last}}"}>Nachname</option>
                                    <option value={"{{user.street}} {{user.housenr}}"}>Straße & Hausnr.</option>
                                    <option value={"{{user.zip}} {{user.city}}"}>PLZ & Stadt</option>
                                    <option value={"{{user.tel}}"}>Telefon</option>
                                    <option value={"{{user.handy}}"}>Mobil (Handy)</option>
                                    <option value={"{{user.email}}"}>E-Mail</option>
                                    <option value={"{{user.signature}}"}>Unterschrift (Mitarbeiter)</option>
                                </optgroup>
                                <optgroup label="Firma (Absender)">
                                    <option value={"{{company.name}}"}>Firmenname</option>
                                    <option value={"{{company.street}} {{company.housenr}}"}>Straße & Hausnr.</option>
                                    <option value={"{{company.zip}} {{company.city}}"}>PLZ & Stadt</option>
                                    <option value={"{{company.number_telephone}}"}>Telefon</option>
                                    <option value={"{{company.number_mobile}}"}>Mobil</option>
                                    <option value={"{{company.email}}"}>E-Mail</option>
                                    <option value={"{{company.website}}"}>Webseite</option>
                                    <option value={"{{company.vatcode}}"}>Steuernummer</option>
                                    <option value={"{{company.ik_number}}"}>IK-Nummer</option>
                                </optgroup>
                                <optgroup label="Bankverbindung">
                                    <option value={"{{company.bank_name}}"}>Bank Name</option>
                                    <option value={"{{company.bank_iban}}"}>IBAN</option>
                                    <option value={"{{company.bank_bic}}"}>BIC</option>
                                </optgroup>
                                <optgroup label="Rechnung & Datum">
                                    <option value={"{{invoice.number}}"}>Rechnungsnummer</option>
                                    <option value={"{{date.today}}"}>Heutiges Datum</option>
                                    <option value={"{{invoice.issue_date}}"}>Rechnungsdatum</option>
                                    <option value={"{{invoice.due_date}}"}>Fälligkeitsdatum</option>
                                    <option value={"{{invoice.service_period}}"}>Leistungszeitraum (Monat Jahr)</option>
                                    <option value={"{{leistungszeitraum}}"}>Leistungszeitraum (Alt)</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>
                {/if}
                
                {#if activeField.type === 'table'}
                    <div class="pt-2 border-t border-neutral-100">
                        <span class="block text-xs font-semibold text-neutral-600 mb-2">Anzuzeigende Positionen</span>
                        <div class="space-y-1.5 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer"><input type="checkbox" bind:checked={activeField.tableConfig.includeTimeRecords} class="text-brand-600 rounded border-neutral-300"> Zeiterfassungen (Stunden)</label>
                        <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer"><input type="checkbox" bind:checked={activeField.tableConfig.includeDriveKm} class="text-brand-600 rounded border-neutral-300"> Fahrtkosten (Kilometer)</label>
                        <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer"><input type="checkbox" bind:checked={activeField.tableConfig.includeDriveLumpSum} class="text-brand-600 rounded border-neutral-300"> Anfahrtskosten (Pauschalen)</label>
                        <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer"><input type="checkbox" bind:checked={activeField.tableConfig.includeExpenditures} class="text-brand-600 rounded border-neutral-300"> Sonderausgaben / Spesen</label>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-neutral-100">
                        <span class="block text-xs font-semibold text-neutral-600 mb-2">Tabellen-Fußzeile (Summen)</span>
                        <div class="space-y-1.5 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer"><input type="checkbox" bind:checked={activeField.tableConfig.includeTotalNetto} class="text-brand-600 rounded border-neutral-300"> Netto-Summe anzeigen</label>
                        <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer"><input type="checkbox" bind:checked={activeField.tableConfig.includeTotalTax} class="text-brand-600 rounded border-neutral-300"> MwSt-Betrag anzeigen</label>
                        <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer"><input type="checkbox" bind:checked={activeField.tableConfig.includeTotalBrutto} class="text-brand-600 rounded border-neutral-300"> Gesamt-Brutto anzeigen</label>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-neutral-100">
                        <span class="block text-xs font-semibold text-neutral-600 mb-2">Spalten benennen</span>
                        <div class="grid grid-cols-2 gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                            {#each activeField.tableConfig.columns as col}
                                <div><label for="prop-col-{col.id}" class="text-[10px] text-neutral-500 uppercase tracking-wider block mb-0.5">{col.type}</label><input id="prop-col-{col.id}" type="text" bind:value={col.name} class="orga-input-clear py-1 text-xs px-2" /></div>
                            {/each}
                        </div>
                    </div>

                    <div class="pt-2 border-t border-neutral-100">
                        <label for="prop-static-desc" class="block text-xs font-semibold text-neutral-600 mb-1">Feste Beschreibung für alle Posten (Optional)</label>
                        <textarea id="prop-static-desc" bind:value={activeField.tableConfig.staticDescription} rows="3" placeholder="z.B. Monatliche Betreuung nach § 45b SGB XI" class="orga-input-clear py-2 text-sm resize-none custom-scrollbar font-mono"></textarea>
                    </div>
                    <div class="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-3">
                        <div><label for="prop-head-bg" class="block text-xs font-semibold text-neutral-600 mb-1">Kopf-Hintergrund</label><input id="prop-head-bg" type="color" bind:value={activeField.tableConfig.headerBackgroundColor} class="w-full h-8 rounded cursor-pointer border border-neutral-200" /></div>
                        <div><label for="prop-head-color" class="block text-xs font-semibold text-neutral-600 mb-1">Kopf-Textfarbe</label><input id="prop-head-color" type="color" bind:value={activeField.tableConfig.headerTextColor} class="w-full h-8 rounded cursor-pointer border border-neutral-200" /></div>
                        <div><label for="prop-table-font" class="block text-xs font-semibold text-neutral-600 mb-1">Schriftgröße (Tabelle)</label><input id="prop-table-font" type="number" bind:value={activeField.tableConfig.fontSize} class="orga-input-clear py-1.5 text-sm" /></div>
                        <div><label for="prop-table-pad" class="block text-xs font-semibold text-neutral-600 mb-1">Zellen-Abstand (Y)</label><input id="prop-table-pad" type="number" bind:value={activeField.tableConfig.cellPadding} placeholder="6" class="orga-input-clear py-1.5 text-sm" /></div>
                        <div><label for="prop-head-align" class="block text-xs font-semibold text-neutral-600 mb-1">Ausrichtung (Kopf)</label><select id="prop-head-align" bind:value={activeField.tableConfig.headerTextAlign} class="orga-input-clear py-1.5 text-sm px-2"><option value="">Wie Spalten</option><option value="left">Links</option><option value="center">Mittig</option><option value="right">Rechts</option></select></div>
                        <div><label for="prop-foot-align" class="block text-xs font-semibold text-neutral-600 mb-1">Ausrichtung (Fuß)</label><select id="prop-foot-align" bind:value={activeField.tableConfig.footerTextAlign} class="orga-input-clear py-1.5 text-sm px-2"><option value="left">Links</option><option value="center">Mittig</option><option value="right">Rechts</option></select></div>
                        <div class="col-span-2"><label for="prop-row-valign" class="block text-xs font-semibold text-neutral-600 mb-1">Vertikal (Zeilen)</label><select id="prop-row-valign" bind:value={activeField.tableConfig.rowVerticalAlign} class="orga-input-clear py-1.5 text-sm px-2"><option value="top">Oben</option><option value="middle">Mittig</option><option value="bottom">Unten</option></select></div>
                    </div>
                {/if}

                <div class="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-3">
                    <div><label for="prop-font-size" class="block text-xs font-semibold text-neutral-600 mb-1">Schriftgröße</label><input id="prop-font-size" type="number" bind:value={activeField.style.fontSize} class="orga-input-clear py-1.5 text-sm" /></div>
                    <div><label for="prop-align" class="block text-xs font-semibold text-neutral-600 mb-1">Horizontal</label><select id="prop-align" bind:value={activeField.style.textAlign} class="orga-input-clear py-1.5 text-sm px-2"><option value="left">Links</option><option value="center">Zentriert</option><option value="right">Rechts</option></select></div>
                    <div><label for="prop-valign" class="block text-xs font-semibold text-neutral-600 mb-1">Vertikal</label><select id="prop-valign" bind:value={activeField.style.verticalAlign} class="orga-input-clear py-1.5 text-sm px-2"><option value="top">Oben</option><option value="middle">Mittig</option><option value="bottom">Unten</option></select></div>
                    <div><label for="prop-weight" class="block text-xs font-semibold text-neutral-600 mb-1">Dicke</label><select id="prop-weight" bind:value={activeField.style.fontWeight} class="orga-input-clear py-1.5 text-sm px-2"><option value="normal">Normal</option><option value="bold">Fett</option></select></div>
                    <div><label for="prop-color" class="block text-xs font-semibold text-neutral-600 mb-1">Farbe</label><input id="prop-color" type="color" bind:value={activeField.style.color} class="w-full h-8 rounded cursor-pointer border border-neutral-200" /></div>
                    <div><label for="prop-padding" class="block text-xs font-semibold text-neutral-600 mb-1">Innenabstand (px)</label><input id="prop-padding" type="number" bind:value={activeField.style.padding} class="orga-input-clear py-1.5 text-sm" /></div>
                </div>
            </div>
        {/if}
    </div>
</aside>