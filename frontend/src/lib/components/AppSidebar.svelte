<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import ChatWidget from "$lib/components/ChatWidget.svelte";
	import { updateStore } from "$lib/services/updateService.svelte";

	let { items } = $props<{
		items: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
	}>();

	let currentPath = $derived($page.url.pathname);
	// svelte-ignore non_reactive_update
	let supportModal: HTMLDialogElement;
	
	// Zieht sich die Versionsnummer nun live und fehlerfrei direkt aus dem Update-Log!
	let appVersion = $derived(updateStore.updates?.length > 0 ? `v${updateStore.updates[0].number}` : "v1.0.0");
</script>

<aside class="w-64 bg-neutral-950 text-neutral-400 flex-col border-r border-neutral-900 hidden md:flex h-full shadow-2xl relative overflow-hidden">
	<!-- Subtiler Hintergrund-Glow für mehr Tiefe -->
	<div class="absolute top-0 left-0 w-full h-32 bg-indigo-500/5 blur-3xl pointer-events-none"></div>

	<!-- Header / Logo -->
	<div class="p-6 mb-2 relative">
		<h2 class="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-400 to-cyan-400 drop-shadow-sm">OrgaFlow</h2>
		<p class="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest font-bold flex items-center gap-2">
			Seniorenassistenz
			<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
		</p>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-6 z-10">
		{#each items as item}
			{@const isActive = currentPath.startsWith(item.href) && (item.href !== '/' || currentPath === '/')}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium group {isActive ? 'bg-indigo-500/10 text-indigo-300 shadow-[inset_0_1px_0_0_rgba(99,102,241,0.1)] ring-1 ring-indigo-500/20' : 'text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-100'}"
			>
				<span class="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 {isActive ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-300'}">
					{@render item.icon()}
				</span>
				<span class="transition-transform duration-200 {isActive ? '' : 'group-hover:translate-x-0.5'}">
					{item.label}
				</span>
			</a>
		{/each}
	</nav>

	<!-- Footer Bereich -->
	<div class="p-4 border-t border-neutral-900/80 bg-neutral-950/50 z-10">
		<div class="flex items-center justify-between px-2 py-2 text-xs text-neutral-500 font-medium">
			<button type="button" onclick={() => updateStore.open()} class="hover:text-amber-400 font-bold cursor-pointer transition-colors" title="Update-Verlauf anzeigen">{appVersion}</button>
			<button type="button" onclick={() => supportModal?.showModal()} class="hover:text-indigo-400 cursor-pointer transition-colors">Hilfe & Support</button>
		</div>
	</div>
</aside>

<!-- Support / Bug-Report Modal -->
<dialog bind:this={supportModal} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === supportModal) supportModal?.close(); }}>
	<div class="bg-white rounded-3xl w-full relative overflow-hidden shadow-2xl">
		<!-- Schließen-Button mit halbtransparentem hellem Design für den dunklen Chat-Header -->
		<button aria-label="Schließen" onclick={() => supportModal?.close()} class="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors z-20 shadow-sm">
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
		<!-- Unser fertiges ChatWidget wird hier direkt eingebettet -->
		<ChatWidget />
	</div>
</dialog>