<script lang="ts">
    import AppointmentDetailModal from '../AppointmentDetailModal.svelte';
    import BulkBlockModal from '../BulkBlockModal.svelte';
    import BulkVisibilityModal from '../BulkVisibilityModal.svelte';
    import GoogleCalendarModal from '../GoogleCalendarModal.svelte';
    import GoogleEventDetailModal from '../GoogleEventDetailModal.svelte';

    let detailModal: ReturnType<typeof AppointmentDetailModal>;
    let bulkBlockModal: ReturnType<typeof BulkBlockModal>;
    let bulkVisibilityModal: ReturnType<typeof BulkVisibilityModal>;
    let googleModal: ReturnType<typeof GoogleCalendarModal>;
    let googleDetailModal: ReturnType<typeof GoogleEventDetailModal>;

    export function openDetail(id: string) { detailModal?.open(id); }
    export function openGoogleDetail(evt: any) { googleDetailModal?.open(evt); }
    export function openBulkBlock() { bulkBlockModal?.open(); }
    export function openBulkVisibility(apps: any[]) { bulkVisibilityModal?.open(apps); }
    export function openGoogle() { googleModal?.open(); }
</script>

<AppointmentDetailModal bind:this={detailModal} />
<BulkBlockModal bind:this={bulkBlockModal} />
<BulkVisibilityModal bind:this={bulkVisibilityModal} />
<GoogleCalendarModal bind:this={googleModal} />
<GoogleEventDetailModal bind:this={googleDetailModal} />
