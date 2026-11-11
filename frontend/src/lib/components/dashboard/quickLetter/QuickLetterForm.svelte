<script lang="ts">
    import type { QuickLetterCompany, QuickLetterRecipient } from './quickLetterTypes';
    import QuickLetterRecipientCard from './QuickLetterRecipientCard.svelte';
    import QuickLetterSenderCard from './QuickLetterSenderCard.svelte';
    import QuickLetterContentCard from './QuickLetterContentCard.svelte';

    interface Props {
        recipient: QuickLetterRecipient;
        currentCompany: QuickLetterCompany | null;
        availableCompanies: QuickLetterCompany[];
        selectedCompanyId: string;
        effectiveLogoUrl: string | null;
        customImageUrl: string | null;
        logoScalePercent: number;
        logoBoxW: number;
        logoBoxH: number;
        letterDate: string;
        reference: string;
        subject: string;
        salutationLine: string;
        letterBody: string;
        closingLine: string;
        senderName: string;
        includeFooter: boolean;
        includeContactUnderLogo: boolean;
        onSelectRecipient: (item: any, type: string) => void;
        onUploadCustomImage: (e: Event) => void;
        onRemoveCustomImage: () => void;
        onScaleChange: () => void;
    }

    let {
        recipient = $bindable(),
        currentCompany,
        availableCompanies,
        selectedCompanyId = $bindable(),
        effectiveLogoUrl,
        customImageUrl,
        logoScalePercent = $bindable(),
        logoBoxW,
        logoBoxH,
        letterDate = $bindable(),
        reference = $bindable(),
        subject = $bindable(),
        salutationLine = $bindable(),
        letterBody = $bindable(),
        closingLine = $bindable(),
        senderName = $bindable(),
        includeFooter = $bindable(),
        includeContactUnderLogo = $bindable(),
        onSelectRecipient,
        onUploadCustomImage,
        onRemoveCustomImage,
        onScaleChange
    }: Props = $props();
</script>

<div class="space-y-5">
    <QuickLetterRecipientCard
        bind:recipient
        {onSelectRecipient}
    />

    <QuickLetterSenderCard
        {currentCompany}
        {availableCompanies}
        bind:selectedCompanyId
        {effectiveLogoUrl}
        {customImageUrl}
        bind:logoScalePercent
        {logoBoxW}
        {logoBoxH}
        bind:letterDate
        bind:reference
        {onUploadCustomImage}
        {onRemoveCustomImage}
        {onScaleChange}
    />

    <QuickLetterContentCard
        bind:subject
        bind:salutationLine
        bind:letterBody
        bind:closingLine
        bind:senderName
        bind:includeFooter
        bind:includeContactUnderLogo
    />
</div>
