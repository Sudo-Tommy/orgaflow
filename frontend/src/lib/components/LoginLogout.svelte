<script lang="ts">
	import { pb } from '$lib/services/pocketbase';
	import { goto } from '$app/navigation';

	let { subtle = false, iconOnly = false } = $props<{ subtle?: boolean, iconOnly?: boolean }>();

	// svelte-ignore non_reactive_update
	let logoutDialog: HTMLDialogElement;

	let isLoggedIn = $state(pb.authStore.isValid);
	let userEmail = $state(pb.authStore.model?.email || '');
	
	// Sichere Formatierung des Vor- und Nachnamens
	function getFullName(record: any) {
		return record ? `${record.name_first || ''} ${record.name_last || ''}`.trim() : '';
	}
	let userName = $state(getFullName(pb.authStore.model));
	let showLogoutModal = $state(false);

	// Synchronisiere den State mit PocketBase
	$effect(() => {
		const unsubscribe = pb.authStore.onChange(() => {
			isLoggedIn = pb.authStore.isValid;
			userEmail = pb.authStore.model?.email || '';
			userName = getFullName(pb.authStore.model);
		});

		return unsubscribe;
	});

	$effect(() => {
		if (showLogoutModal) {
			logoutDialog?.showModal();
		} else {
			logoutDialog?.close();
		}
	});

	export function handleLogout() {
		// Beendet alle laufenden Realtime-Verbindungen, BEVOR der AuthStore geleert wird!
		pb.realtime.unsubscribe();
		pb.authStore.clear();
		showLogoutModal = false;
		goto('/portal');
	}

	export function openLoginModal() {
		goto('/portal?mode=employee');
	}

	export function openLogoutModal() {
		showLogoutModal = true;
	}

	export function closeModals() {
		showLogoutModal = false;
	}
</script>

{#if isLoggedIn}
	<div class="flex items-center {subtle ? 'gap-2' : 'gap-4'}">
		{#if iconOnly}
			<button onclick={openLogoutModal} class="text-brand-400 hover:text-white transition-colors flex items-center justify-center" title="Abmelden ({userName})">
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
			</button>
		{:else}
			<span class="text-sm {subtle ? 'text-neutral-500' : 'text-neutral-700 hidden md:inline'}">Eingeloggt als: {userName}</span>
			<button onclick={openLogoutModal} class="{subtle ? 'text-sm font-semibold hover:text-white transition-colors' : 'orga-button-ghost py-2.5 px-4 text-sm font-semibold'}">
				Abmelden
			</button>
		{/if}
	</div>
{:else}
	{#if iconOnly}
		<button onclick={openLoginModal} class="text-brand-400 hover:text-white transition-colors flex items-center justify-center" title="Mitarbeiter-Login">
			<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
		</button>
	{:else}
		<button onclick={openLoginModal} class="{subtle ? 'text-sm font-medium text-neutral-500 hover:text-white transition-colors' : 'orga-button-primary'}">
			{subtle ? 'Mitarbeiter-Login' : 'Anmelden'}
		</button>
	{/if}
{/if}

<!-- Logout Modal -->
<dialog bind:this={logoutDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === logoutDialog) closeModals(); }}>
	<div class="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full relative border border-neutral-200 dark:border-slate-800 shadow-xl">
		<h2 class="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Abmelden</h2>
		<p class="mb-6 text-neutral-600 dark:text-slate-300">Sind Sie sicher, dass Sie sich abmelden möchten?</p>
		<div class="flex gap-4 justify-end">
			<button onclick={closeModals} class="orga-button-ghost">Abbrechen</button>
			<button onclick={handleLogout} class="orga-button-primary">Abmelden</button>
		</div>
	</div>
</dialog>