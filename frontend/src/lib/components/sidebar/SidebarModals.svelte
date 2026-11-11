<script lang="ts">
	import ChatWidget from "$lib/components/ChatWidget.svelte";
	import NotificationSettingsModal from "$lib/components/NotificationSettingsModal.svelte";
	import AppointmentRequestsModal from "$lib/components/AppointmentRequestsModal.svelte";
	import ImprovementProposalModal from "$lib/components/admin/ImprovementProposalModal.svelte";
	import MailModal from "$lib/components/MailModal.svelte";
	import EingangszentraleModal from "$lib/components/eingangszentrale/EingangszentraleModal.svelte";

	let {
		supportModal = $bindable(),
		notificationModal = $bindable(),
		requestsModal = $bindable(),
		proposalModal = $bindable(),
		mailModal = $bindable(),
		eingangszentraleModal = $bindable()
	}: {
		supportModal?: HTMLDialogElement;
		notificationModal?: any;
		requestsModal?: any;
		proposalModal?: any;
		mailModal?: any;
		eingangszentraleModal?: any;
	} = $props();
</script>

<dialog bind:this={supportModal} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === supportModal) supportModal?.close(); }}>
	<div class="bg-white dark:bg-slate-900 rounded-3xl w-full relative overflow-hidden shadow-2xl">
		<button aria-label="Schließen" onclick={() => supportModal?.close()} class="absolute top-4 right-4 w-8 h-8 bg-slate-100 hover:bg-slate-200 dark:bg-white/20 dark:hover:bg-white/40 text-slate-700 dark:text-white rounded-full flex items-center justify-center transition-colors z-20 shadow-xs cursor-pointer">
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
		<ChatWidget />
	</div>
</dialog>

<NotificationSettingsModal bind:this={notificationModal} />
<AppointmentRequestsModal bind:this={requestsModal} />
<ImprovementProposalModal bind:this={proposalModal} />
<MailModal bind:this={mailModal} />
<EingangszentraleModal bind:this={eingangszentraleModal} />
