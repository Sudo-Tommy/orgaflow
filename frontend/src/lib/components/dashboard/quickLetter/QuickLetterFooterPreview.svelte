<script lang="ts">
    import type { QuickLetterCompany } from './quickLetterTypes';

    interface Props {
        company: QuickLetterCompany | null;
        scale: number;
    }

    let { company, scale }: Props = $props();

    let fontSizePx = $derived(Math.max(6, 7 * scale * 1.25));
    let phone = $derived(company?.number_telephone || company?.number_mobile || '');
    let email = $derived(company?.email || '');
    let website = $derived(company?.website || '');
</script>

<div
    class="absolute bottom-4 inset-x-8 border-t border-neutral-300 pt-2 grid grid-cols-3 gap-2 text-neutral-600 pointer-events-none select-none leading-tight"
    style="font-size: {fontSizePx}px;"
>
    <!-- Spalte 1: Anschrift / Inhaber -->
    <div class="truncate">
        <div class="font-bold text-neutral-900 truncate">{company?.name || 'Seniorenassistenz'}</div>
        <div class="truncate">{[company?.street, company?.housenr].filter(Boolean).join(' ')}</div>
        <div class="truncate">{[company?.zip, company?.city].filter(Boolean).join(' ')}</div>
    </div>

    <!-- Spalte 2: Kontakt -->
    <div class="truncate">
        {#if phone}
            <div class="truncate">Tel: {phone}</div>
        {/if}
        {#if email}
            <div class="truncate">E-Mail: {email}</div>
        {/if}
        {#if website}
            <div class="truncate">Web: {website}</div>
        {/if}
    </div>

    <!-- Spalte 3: Bank & Steuern -->
    <div class="text-right truncate">
        {#if company?.bank_name}
            <div class="font-semibold text-neutral-800 truncate">{company.bank_name}</div>
        {/if}
        {#if company?.bank_iban}
            <div class="truncate">IBAN: {company.bank_iban}</div>
        {/if}
        <div class="truncate">
            {#if company?.vatcode}St.-Nr.: {company.vatcode}{/if}
            {#if company?.ik_number && company.ik_number !== '-'} • IK: {company.ik_number}{/if}
        </div>
    </div>
</div>
