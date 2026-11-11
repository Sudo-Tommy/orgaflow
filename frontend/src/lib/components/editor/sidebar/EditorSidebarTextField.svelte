<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";

    let { activeField = $bindable() }: { activeField: CanvasField } = $props();

    // svelte-ignore non_reactive_update
    let textareaRef: HTMLTextAreaElement | null = null;

    function insertPlaceholder(placeholder: string) {
        if (!activeField || !textareaRef || !placeholder) return;
        const start = textareaRef.selectionStart;
        const end = textareaRef.selectionEnd;
        const current = activeField.content || '';
        activeField.content = current.substring(0, start) + placeholder + current.substring(end);
        
        setTimeout(() => {
            textareaRef?.focus();
            textareaRef?.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 10);
    }

    function applyFormat(startTag: string, endTag: string) {
        if (!activeField || !textareaRef) return;
        const start = textareaRef.selectionStart;
        const end = textareaRef.selectionEnd;
        const current = activeField.content || '';
        const selectedText = current.substring(start, end);
        
        activeField.content = current.substring(0, start) + startTag + selectedText + endTag + current.substring(end);
        
        setTimeout(() => {
            textareaRef?.focus();
            textareaRef?.setSelectionRange(start + startTag.length, end + startTag.length);
        }, 10);
    }
</script>

<div class="pt-2 border-t border-neutral-100 dark:border-slate-800 space-y-3">
    <div class="flex justify-between items-center mb-1">
        <label for="prop-text" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Text-Inhalt</label>
        <div class="flex items-center gap-1">
            <button type="button" onclick={() => applyFormat('<b>', '</b>')} class="w-7 h-7 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-bold transition-colors shadow-xs active:scale-95 touch-manipulation cursor-pointer" title="Fett (Bold)">B</button>
            <button type="button" onclick={() => applyFormat('<i>', '</i>')} class="w-7 h-7 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs italic transition-colors shadow-xs active:scale-95 font-serif touch-manipulation cursor-pointer" title="Kursiv (Italic)">I</button>
            <button type="button" onclick={() => applyFormat('<u>', '</u>')} class="w-7 h-7 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs underline transition-colors shadow-xs active:scale-95 touch-manipulation cursor-pointer" title="Unterstrichen (Underline)">U</button>
        </div>
    </div>
    <textarea id="prop-text" bind:this={textareaRef} bind:value={activeField.content} rows="6" class="orga-input-clear py-3 text-sm resize-none font-mono leading-relaxed w-full"></textarea>
    
    <div>
        <select onchange={(e) => { insertPlaceholder(e.currentTarget.value); e.currentTarget.value = ''; }} class="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 hover:border-brand-400 px-4 min-h-12 rounded-xl text-xs font-bold text-brand-700 dark:text-brand-300 outline-none cursor-pointer transition-colors appearance-none shadow-xs text-center touch-manipulation">
            <option value="" selected disabled>+ Datenfeld (Variable) einfügen</option>
            <optgroup label="Antrag Verhinderungspflege (Pflegeperson)">
                <option value={"{{careperson.care_type}}"}>Art (stundenweise/tageweise)</option>
                <option value={"{{careperson.birthdate}}"}>Geburtsdatum</option>
                <option value={"{{inheritor.name_first}} {{inheritor.name_last}}"}>Name (vormals Erbe)</option>
                <option value={"{{careperson.name}}"}>Name der Pflegeperson</option>
                <option value={"{{careperson.zip}} {{careperson.city}}"}>PLZ & Stadt</option>
                <option value={"{{careperson.street}} {{careperson.housenr}}"}>Straße & Hausnr.</option>
                <option value={"{{careperson.phone}}"}>Telefon</option>
                <option value={"{{careperson.email}}"}>E-Mail</option>
                <option value={"{{careperson.signature}}"}>Unterschrift (Pflegeperson)</option>
                <option value={"{{inheritor.signature}}"}>Unterschrift (vormals Erbe)</option>
                <option value={"{{careperson.reason}}"}>Verhinderungsgrund (Urlaub/Krankheit)</option>
                <option value={"{{careperson.relation}}"}>Verwandtschaftsverhältnis</option>
                <option value={"{{careperson.pre_care}}"}>Vorpflegezeit (≥ 6 Monate)</option>
                <option value={"{{verhinderung.bis}}"}>Zeitraum Bis (Verhinderung)</option>
                <option value={"{{verhinderung.von}}"}>Zeitraum Von (Verhinderung)</option>
            </optgroup>
            <optgroup label="Bankverbindung">
                <option value={"{{company.bank_name}}"}>Bank Name</option>
                <option value={"{{company.bank_bic}}"}>BIC</option>
                <option value={"{{company.bank_iban}}"}>IBAN</option>
            </optgroup>
            <optgroup label="Benutzer (Mitarbeiter/Ersteller)">
                <option value={"{{user.email}}"}>E-Mail</option>
                <option value={"{{user.handy}}"}>Mobil (Handy)</option>
                <option value={"{{user.name_last}}"}>Nachname</option>
                <option value={"{{user.zip}} {{user.city}}"}>PLZ & Stadt</option>
                <option value={"{{user.street}} {{user.housenr}}"}>Straße & Hausnr.</option>
                <option value={"{{user.tel}}"}>Telefon</option>
                <option value={"{{user.signature}}"}>Unterschrift (Mitarbeiter)</option>
                <option value={"{{user.name_first}}"}>Vorname</option>
            </optgroup>
            <optgroup label="Betreuer (Klient)">
                <option value={"{{caregiver.salutation}}"}>Anrede</option>
                <option value={"{{caregiver.email}}"}>E-Mail</option>
                <option value={"{{caregiver.company_name}}"}>Firmenname</option>
                <option value={"{{caregiver.name_last}}"}>Nachname</option>
                <option value={"{{caregiver.zip}} {{caregiver.city}}"}>PLZ & Stadt</option>
                <option value={"{{caregiver.street}} {{caregiver.housenr}}"}>Straße & Hausnr.</option>
                <option value={"{{caregiver.phone}}"}>Telefon</option>
                <option value={"{{caregiver.signature}}"}>Unterschrift (Betreuer)</option>
                <option value={"{{caregiver.name_first}}"}>Vorname</option>
            </optgroup>
            <optgroup label="Firma (Absender)">
                <option value={"{{company.return_address_line}}"}>DIN 5008 Rücksendezeile</option>
                <option value={"{{company.email}}"}>E-Mail</option>
                <option value={"{{company.name}}"}>Firmenname</option>
                <option value={"{{company.ik_number}}"}>IK-Nummer</option>
                <option value={"{{company.number_mobile}}"}>Mobil</option>
                <option value={"{{company.zip}} {{company.city}}"}>PLZ & Stadt</option>
                <option value={"{{company.vatcode}}"}>Steuernummer</option>
                <option value={"{{company.street}} {{company.housenr}}"}>Straße & Hausnr.</option>
                <option value={"{{company.number_telephone}}"}>Telefon</option>
                <option value={"{{company.website}}"}>Webseite</option>
            </optgroup>
            <optgroup label="Klient (Empfänger)">
                <option value={"{{client.salutation}}"}>Anrede (Herr/Frau)</option>
                <option value={"{{client.salutation_formal}}"}>Formelle Anrede</option>
                <option value={"{{client.birthdate}}"}>Geburtsdatum</option>
                <option value={"{{client.km_rate}}"}>Kilometerpauschale (Klient)</option>
                <option value={"{{client.handy}}"}>Mobil (Handy)</option>
                <option value={"{{client.name_last}}"}>Nachname</option>
                <option value={"{{client.level_of_care}}"}>Pflegegrad</option>
                <option value={"{{client.zip}} {{client.city}}"}>PLZ & Stadt</option>
                <option value={"{{client.tax_rate}}"}>Steuersatz (Klient)</option>
                <option value={"{{client.street}} {{client.housenr}}"}>Straße & Hausnr.</option>
                <option value={"{{client.hourly_wage}}"}>Stundensatz (Klient)</option>
                <option value={"{{client.phone}}"}>Telefon</option>
                <option value={"{{client.signature}}"}>Unterschrift (Klient)</option>
                <option value={"{{client.insurance_nr}}"}>Versicherungsnummer</option>
                <option value={"{{client.name_first}}"}>Vorname</option>
            </optgroup>
            <optgroup label="Kontakt (Adressat)">
                <option value={"{{contact.name_last}}"}>Nachname</option>
                <option value={"{{contact.signature}}"}>Unterschrift (Kontakt)</option>
                <option value={"{{contact.name_first}}"}>Vorname</option>
            </optgroup>
            <optgroup label="Krankenkasse (Klient)">
                <option value={"{{insurance.email}}"}>E-Mail</option>
                <option value={"{{insurance.name}}"}>Name der Kasse</option>
                <option value={"{{insurance.zip}} {{insurance.city}}"}>PLZ & Stadt</option>
                <option value={"{{insurance.street}}"}>Straße</option>
                <option value={"{{insurance.phone}}"}>Telefon</option>
                <option value={"{{insurance.type}}"}>Versicherungsart</option>
            </optgroup>
            <optgroup label="Pflegegrade & Budgets (§ 39 & § 45b SGB XI)">
                <option value={"{{careperson.budget_39}}"}>Budget Verhinderungspflege (1.612,00 €)</option>
                <option value={"{{client.budget_45b}}"}>Budget Entlastungsbetrag (125,00 €/Monat)</option>
                <option value={"{{paragraph.39}}"}>§ 39 SGB XI Verhinderungspflege (Bezeichnung)</option>
                <option value={"{{paragraph.45b}}"}>§ 45b SGB XI Entlastungsbetrag (Bezeichnung)</option>
            </optgroup>
            <optgroup label="Rechnung & Datum">
                <option value={"{{current_year}}"}>Aktuelles Jahr (YYYY)</option>
                <option value={"{{invoice.due_date}}"}>Fälligkeitsdatum</option>
                <option value={"{{date.today_+1y}}"}>Heute + 1 Jahr</option>
                <option value={"{{date.today}}"}>Heutiges Datum</option>
                <option value={"{{invoice.service_period}}"}>Leistungszeitraum (Monat Jahr)</option>
                <option value={"{{leistungszeitraum}}"}>Leistungszeitraum (Alt)</option>
                <option value={"{{invoice.issue_date}}"}>Rechnungsdatum</option>
                <option value={"{{invoice.number}}"}>Rechnungsnummer</option>
            </optgroup>
            <optgroup label="Zuständiger Assistent (Pflegekraft)">
                <option value={"{{assistant.email}}"}>E-Mail</option>
                <option value={"{{assistant.date_birth}}"}>Geburtsdatum</option>
                <option value={"{{assistant.handy}}"}>Mobil (Handy)</option>
                <option value={"{{assistant.name_last}}"}>Nachname</option>
                <option value={"{{assistant.zip}} {{assistant.city}}"}>PLZ & Stadt</option>
                <option value={"{{assistant.qualifications}}"}>Qualifikationen</option>
                <option value={"{{assistant.role}}"}>Rolle / Funktion</option>
                <option value={"{{assistant.street}} {{assistant.housenr}}"}>Straße & Hausnr.</option>
                <option value={"{{assistant.tel}}"}>Telefon</option>
                <option value={"{{assistant.signature}}"}>Unterschrift (Assistent)</option>
                <option value={"{{assistant.name}}"}>Vollständiger Name</option>
                <option value={"{{assistant.name_first}}"}>Vorname</option>
            </optgroup>
        </select>
    </div>
</div>
