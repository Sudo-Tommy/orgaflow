<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import { slide } from "svelte/transition";
    import { Trash2 } from "lucide-svelte";

    let { fields, selectedFieldId, onDelete } = $props<{
        fields: CanvasField[];
        selectedFieldId: string | null;
        onDelete: (id: string) => void;
    }>();

    let activeField = $derived(fields.find((f: CanvasField) => f.id === selectedFieldId) || null);
    
    // svelte-ignore non_reactive_update
    let textareaRef: HTMLTextAreaElement | null = null;

    function insertPlaceholder(placeholder: string) {
        if (!activeField || !textareaRef || !placeholder) return;
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

{#snippet toggleSwitch(label: string, checked: boolean, onToggle: (val: boolean) => void)}
    <button 
        type="button"
        role="switch" 
        aria-checked={checked}
        onclick={() => onToggle(!checked)}
        class="flex items-center justify-between gap-3 w-full p-2.5 bg-white border border-neutral-200 hover:border-brand-300 rounded-lg transition-all cursor-pointer group active:scale-[0.98] min-h-10 shadow-sm"
    >
        <span class="text-[11px] leading-tight text-left font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors flex-1">{label}</span>
        <div class="w-8 h-5 rounded-full relative transition-colors duration-300 shrink-0 shadow-inner {checked ? 'bg-brand-500' : 'bg-neutral-200'}">
            <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm {checked ? 'translate-x-3' : 'translate-x-0'}"></div>
        </div>
    </button>
{/snippet}

<aside class="w-88 bg-white border-l border-neutral-200 flex flex-col h-full shrink-0 z-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] relative">
    <div class="p-6 border-b border-neutral-100 bg-neutral-50/50">
        <h3 class="font-black text-neutral-900 text-lg">Eigenschaften</h3>
        <p class="text-[11px] uppercase tracking-widest text-neutral-400 font-bold mt-1">Element konfigurieren</p>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {#if !activeField}
            <div class="text-center text-neutral-400 py-12 flex flex-col items-center gap-3">
                <span class="text-4xl opacity-50">🖱️</span>
                <p class="text-sm font-medium">Klicke auf ein Element im Canvas,<br>um es zu bearbeiten.</p>
            </div>
        {:else}
            <div class="space-y-6 animate-enter">
                <div class="flex justify-between items-center">
                <span class="text-[10px] font-black uppercase tracking-widest text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">{activeField.type} Element</span>
                    <button onclick={() => onDelete(activeField.id)} class="text-rose-500 hover:text-white hover:bg-rose-500 p-2 rounded-xl transition-all shadow-sm border border-transparent hover:border-rose-600 active:scale-95" title="Element Löschen">
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div><label for="prop-x" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">X Pos (px)</label><input id="prop-x" type="number" bind:value={activeField.x} class="orga-input-clear py-2.5 text-sm" /></div>
                    <div><label for="prop-y" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Y Pos (px)</label><input id="prop-y" type="number" bind:value={activeField.y} class="orga-input-clear py-2.5 text-sm" /></div>
                    <div><label for="prop-w" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Breite (px)</label><input id="prop-w" type="number" bind:value={activeField.w} class="orga-input-clear py-2.5 text-sm" /></div>
                    <div><label for="prop-h" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Höhe (px)</label><input id="prop-h" type="number" bind:value={activeField.h} class="orga-input-clear py-2.5 text-sm" /></div>
                </div>

                {#if activeField.type === 'text'}
                    <div class="pt-2 border-t border-neutral-100">
                        <label for="prop-text" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Text-Inhalt</label>
                        <textarea id="prop-text" bind:this={textareaRef} bind:value={activeField.content} rows="6" class="orga-input-clear py-3 text-sm resize-none custom-scrollbar font-mono leading-relaxed"></textarea>
                        
                        <div class="mt-3">
                        <select onchange={(e) => { insertPlaceholder(e.currentTarget.value); e.currentTarget.value = ''; }} class="w-full bg-neutral-50 border border-neutral-200 hover:border-brand-400 px-4 min-h-12 rounded-xl text-xs font-bold text-brand-700 outline-none cursor-pointer transition-colors appearance-none shadow-sm text-center">
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
                        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Anzuzeigende Positionen</span>
                <div class="space-y-2.5 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                            {@render toggleSwitch("Zeiterfassungen (Stunden)", activeField.tableConfig.includeTimeRecords, v => activeField.tableConfig.includeTimeRecords = v)}
                            {@render toggleSwitch("Fahrtkosten (Kilometer)", activeField.tableConfig.includeDriveKm, v => activeField.tableConfig.includeDriveKm = v)}
                            {@render toggleSwitch("Anfahrtskosten (Pauschalen)", activeField.tableConfig.includeDriveLumpSum, v => activeField.tableConfig.includeDriveLumpSum = v)}
                            {@render toggleSwitch("Sonderausgaben / Spesen", activeField.tableConfig.includeExpenditures, v => activeField.tableConfig.includeExpenditures = v)}
                        </div>
                    </div>

                    <div class="pt-2 border-t border-neutral-100">
                        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Tabellen-Fußzeile (Summen)</span>
                <div class="space-y-2.5 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                            {@render toggleSwitch("Netto-Summe anzeigen", activeField.tableConfig.includeTotalNetto, v => activeField.tableConfig.includeTotalNetto = v)}
                            {@render toggleSwitch("MwSt-Betrag anzeigen", activeField.tableConfig.includeTotalTax, v => activeField.tableConfig.includeTotalTax = v)}
                            {@render toggleSwitch("Gesamt-Brutto anzeigen", activeField.tableConfig.includeTotalBrutto, v => activeField.tableConfig.includeTotalBrutto = v)}
                        </div>
                    </div>

                    <div class="pt-2 border-t border-neutral-100">
                        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Spalten benennen</span>
                <div class="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                            {#each activeField.tableConfig.columns as col}
                                <div><label for="prop-col-{col.id}" class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest block mb-1.5">{col.type}</label><input id="prop-col-{col.id}" type="text" bind:value={col.name} class="orga-input-clear py-2 text-xs" /></div>
                            {/each}
                        </div>
                    </div>

                    <div class="pt-2 border-t border-neutral-100">
                        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Tabellen-Linien (WYSIWYG)</span>
                <div class="flex flex-col gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                            {@render toggleSwitch("Kopfzeile-Linie", activeField.tableConfig.showBorderHeader, v => activeField.tableConfig.showBorderHeader = v)}
                            {@render toggleSwitch("Zeilen-Linien", activeField.tableConfig.showBorderRows, v => activeField.tableConfig.showBorderRows = v)}
                            <div class="grid grid-cols-2 gap-3 mt-2">
                                <div><label for="line-color" class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Linienfarbe</label><input id="line-color" type="color" bind:value={activeField.tableConfig.borderColor} class="w-full h-10 rounded-xl cursor-pointer border-2 border-neutral-200 p-0.5" /></div>
                                <div><label for="line-width" class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Linienstärke (px)</label><input id="line-width" type="number" step="0.5" bind:value={activeField.tableConfig.borderWidth} class="orga-input-clear py-2 text-sm" /></div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-neutral-100">
                        <label for="prop-static-desc" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Feste Beschreibung (Leistungen)</label>
                        <textarea id="prop-static-desc" bind:value={activeField.tableConfig.staticDescription} rows="3" placeholder="z.B. Betreuung/Entlastungsleistung nach § 45b SGB XI" class="orga-input-clear py-3 text-sm resize-none custom-scrollbar font-mono"></textarea>
                    </div>
                    <div class="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-3">
                        <div><label for="prop-head-bg" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Kopf-Hintergrund</label><input id="prop-head-bg" type="color" bind:value={activeField.tableConfig.headerBackgroundColor} class="w-full h-10 rounded-xl cursor-pointer border-2 border-neutral-200 p-0.5" /></div>
                        <div><label for="prop-head-color" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Kopf-Textfarbe</label><input id="prop-head-color" type="color" bind:value={activeField.tableConfig.headerTextColor} class="w-full h-10 rounded-xl cursor-pointer border-2 border-neutral-200 p-0.5" /></div>
                        <div><label for="prop-table-font" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Schriftgröße</label><input id="prop-table-font" type="number" bind:value={activeField.tableConfig.fontSize} class="orga-input-clear py-2.5 text-sm" /></div>
                        <div><label for="prop-table-pad" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Zellen-Abstand</label><input id="prop-table-pad" type="number" bind:value={activeField.tableConfig.cellPadding} placeholder="6" class="orga-input-clear py-2.5 text-sm" /></div>
                        <div><label for="prop-footer-width" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Breite Fußzeile</label><input id="prop-footer-width" type="number" bind:value={activeField.tableConfig.footerWidth} placeholder="200" class="orga-input-clear py-2.5 text-sm" /></div>
                        <div><label for="prop-first-limit" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Limit Seite 1</label><input id="prop-first-limit" type="number" bind:value={activeField.tableConfig.firstPageLimit} placeholder="6" class="orga-input-clear py-2.5 text-sm" /></div>
                        <div class="col-span-2"><label for="prop-next-limit" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Limit Folgeseiten</label><input id="prop-next-limit" type="number" bind:value={activeField.tableConfig.nextPageLimit} placeholder="12" class="orga-input-clear py-2.5 text-sm" /></div>
                        <div><label for="prop-head-align" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Ausrichtung (Kopf)</label><select id="prop-head-align" bind:value={activeField.tableConfig.headerTextAlign} class="orga-input-clear py-2.5 text-sm appearance-none"><option value="">Wie Spalten</option><option value="left">Links</option><option value="center">Mittig</option><option value="right">Rechts</option></select></div>
                        <div><label for="prop-foot-align" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Ausrichtung (Fuß)</label><select id="prop-foot-align" bind:value={activeField.tableConfig.footerTextAlign} class="orga-input-clear py-2.5 text-sm appearance-none"><option value="left">Links</option><option value="center">Mittig</option><option value="right">Rechts</option></select></div>
                        <div class="col-span-2"><label for="prop-row-valign" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Vertikal (Zeilen)</label><select id="prop-row-valign" bind:value={activeField.tableConfig.rowVerticalAlign} class="orga-input-clear py-2.5 text-sm appearance-none"><option value="top">Oben</option><option value="middle">Mittig</option><option value="bottom">Unten</option></select></div>
                    </div>
                {/if}

                <div class="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-3">
                    <div><label for="prop-font-size" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Schriftgröße</label><input id="prop-font-size" type="number" bind:value={activeField.style.fontSize} class="orga-input-clear py-2.5 text-sm" /></div>
                    <div><label for="prop-padding" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Innenabstand (px)</label><input id="prop-padding" type="number" bind:value={activeField.style.padding} class="orga-input-clear py-2.5 text-sm" /></div>
                    <div><label for="prop-align" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Horizontal</label><select id="prop-align" bind:value={activeField.style.textAlign} class="orga-input-clear py-2.5 text-sm appearance-none"><option value="left">Links</option><option value="center">Zentriert</option><option value="right">Rechts</option></select></div>
                    <div><label for="prop-valign" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Vertikal</label><select id="prop-valign" bind:value={activeField.style.verticalAlign} class="orga-input-clear py-2.5 text-sm appearance-none"><option value="top">Oben</option><option value="middle">Mittig</option><option value="bottom">Unten</option></select></div>
                    <div><label for="prop-weight" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Dicke</label><select id="prop-weight" bind:value={activeField.style.fontWeight} class="orga-input-clear py-2.5 text-sm appearance-none"><option value="normal">Normal</option><option value="bold">Fett</option></select></div>
                    <div><label for="prop-color" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Farbe</label><input id="prop-color" type="color" bind:value={activeField.style.color} class="w-full h-10 rounded-xl cursor-pointer border-2 border-neutral-200 p-0.5" /></div>
                </div>

                <div class="pt-2 border-t border-neutral-100">
                    <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Seiten-Verhalten (Kopf-/Fußzeile)</span>
            <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        {@render toggleSwitch("Auf jeder Seite wiederholen", activeField.style.repeatOnAllPages !== false, v => activeField.style.repeatOnAllPages = v)}
                        <p class="text-[10px] text-neutral-500 mt-2 leading-relaxed">Wenn das Element im Bereich der Kopf- oder Fußzeile platziert ist, wird es bei Aktivierung auf jeder neu generierten PDF-Seite wiederholt.</p>
                    </div>
                </div>

                {#if activeField.type === 'text'}
                    <div class="pt-2 border-t border-neutral-100">
                        <span class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Mehrseitige Texte</span>
                <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                            {@render toggleSwitch("Automatischer Seitenumbruch", activeField.style.dynamicHeight || false, v => activeField.style.dynamicHeight = v)}
                            <p class="text-[10px] text-neutral-500 mt-2 leading-relaxed">Wenn aktiviert, passt sich die Höhe beim PDF-Export automatisch an den Text an und bricht bei Bedarf auf eine neue Seite um. Die feste Höhen-Einstellung wird ignoriert.</p>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</aside>