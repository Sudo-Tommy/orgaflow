<script lang="ts">
	import { themeService, type SunPhase } from "$lib/services/themeService.svelte";
	import { Sun, Moon, Sunrise, Sunset, Clock, RotateCcw, X, Sparkles } from "lucide-svelte";

	let dialogEl: HTMLDialogElement | null = $state(null);
	let simulatedSliderValue = $state<number>(
		themeService.simulatedMinutes ?? (new Date().getHours() * 60 + new Date().getMinutes())
	);

	export function open() {
		simulatedSliderValue = themeService.simulatedMinutes ?? (new Date().getHours() * 60 + new Date().getMinutes());
		dialogEl?.showModal();
	}

	export function close() {
		dialogEl?.close();
	}

	function handleSliderInput(e: Event) {
		const val = Number((e.target as HTMLInputElement).value);
		simulatedSliderValue = val;
		const hours = Math.floor(val / 60);
		const mins = val % 60;
		themeService.simulateTime(hours, mins);
	}

	function setQuickTime(hours: number, minutes: number) {
		const total = hours * 60 + minutes;
		simulatedSliderValue = total;
		themeService.simulateTime(hours, minutes);
	}

	function resetToRealTime() {
		themeService.clearSimulation();
		simulatedSliderValue = new Date().getHours() * 60 + new Date().getMinutes();
	}

	// Berechnete Vorschau-Werte für die Anzeige
	let currentCycle = $derived(themeService.calculateSunCycle(simulatedSliderValue));
	let hoursStr = $derived(String(Math.floor(simulatedSliderValue / 60)).padStart(2, '0'));
	let minsStr = $derived(String(simulatedSliderValue % 60).padStart(2, '0'));
</script>

<dialog
	bind:this={dialogEl}
	class="p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-xl mx-auto my-auto rounded-3xl border-0 shadow-2xl overflow-hidden"
	onclick={(e) => { if (e.target === dialogEl) close(); }}
>
	<div class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 text-slate-800 dark:text-slate-100 shadow-2xl relative">
		<!-- Header -->
		<div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
					{currentCycle.icon}
				</div>
				<div>
					<h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
						Tag- & Nachtverlauf (Sonnenstand)
						{#if themeService.isSimulating}
							<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
								Simulation
							</span>
						{/if}
					</h3>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
						Fließender Übergang von Sonnenaufgang über klares Weiß zu Sonnenuntergang
					</p>
				</div>
			</div>
			<button
				type="button"
				onclick={close}
				class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Schließen"
			>
				<X class="w-4 h-4" />
			</button>
		</div>

		<!-- Live Phasen-Karte -->
		<div class="my-5 p-4 rounded-2xl bg-linear-to-br from-slate-50 to-amber-50/30 dark:from-slate-800/60 dark:to-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
			<div>
				<span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aktuelle Phase</span>
				<div class="flex items-center gap-2 mt-0.5">
					<span class="text-2xl">{currentCycle.icon}</span>
					<span class="text-lg font-extrabold text-slate-900 dark:text-white">{currentCycle.label}</span>
					<span class="text-xs px-2 py-0.5 rounded-md font-semibold {currentCycle.isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}">
						{currentCycle.isDark ? 'Dunkel-Modus' : 'Hell-Modus'}
					</span>
				</div>
				<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
					{currentCycle.description}
				</p>
			</div>

			<div class="text-right">
				<span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Uhrzeit</span>
				<p class="text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 font-mono">
					{hoursStr}:{minsStr}
				</p>
			</div>
		</div>

		<!-- 24-Stunden Zeitleiste / Slider -->
		<div class="space-y-2 mb-6">
			<div class="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
				<span>00:00 (Nacht)</span>
				<span>07:00 (Aufgang)</span>
				<span>12:00 (Mittag)</span>
				<span>19:00 (Untergang)</span>
				<span>23:59</span>
			</div>
			
			<div class="relative py-2">
				<input
					type="range"
					min="0"
					max="1439"
					step="5"
					value={simulatedSliderValue}
					oninput={handleSliderInput}
					class="w-full h-3 rounded-lg appearance-none cursor-pointer bg-linear-to-r from-indigo-950 via-amber-400 via-50% via-sky-100 to-indigo-950 shadow-inner accent-amber-500"
				/>
			</div>

			<!-- Farblegende der Phasen -->
			<div class="grid grid-cols-4 gap-1.5 text-[10px] font-medium text-center pt-1 text-slate-500 dark:text-slate-400">
				<div class="p-1 rounded-md bg-indigo-950/40 text-indigo-300 border border-indigo-800/40">
					🌙 Nacht
				</div>
				<div class="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
					🌅 Sonnenaufgang
				</div>
				<div class="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
					☀️ Tag / Weiß
				</div>
				<div class="p-1 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
					🌄 Sonnenuntergang
				</div>
			</div>
		</div>

		<!-- Schnellauswahl der Stimmungen -->
		<div class="space-y-2">
			<span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
				Schnellansicht testen:
			</span>
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<button
					type="button"
					onclick={() => setQuickTime(7, 15)}
					class="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-left transition-colors cursor-pointer group"
				>
					<div class="text-base group-hover:scale-110 transition-transform">🌅</div>
					<div class="text-xs font-bold mt-1">Sonnenaufgang</div>
					<div class="text-[10px] text-amber-700/80 dark:text-amber-400/80">07:15 Uhr • Warm</div>
				</button>

				<button
					type="button"
					onclick={() => setQuickTime(12, 0)}
					class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-left transition-colors cursor-pointer group"
				>
					<div class="text-base group-hover:scale-110 transition-transform">☀️</div>
					<div class="text-xs font-bold mt-1">Mittag / Tag</div>
					<div class="text-[10px] text-slate-500 dark:text-slate-400">12:00 Uhr • Reines Weiß</div>
				</button>

				<button
					type="button"
					onclick={() => setQuickTime(18, 50)}
					class="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-900 dark:text-rose-200 text-left transition-colors cursor-pointer group"
				>
					<div class="text-base group-hover:scale-110 transition-transform">🌄</div>
					<div class="text-xs font-bold mt-1">Sonnenuntergang</div>
					<div class="text-[10px] text-rose-700/80 dark:text-rose-400/80">18:50 Uhr • Abendrot</div>
				</button>

				<button
					type="button"
					onclick={() => setQuickTime(23, 0)}
					class="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-left transition-colors cursor-pointer group"
				>
					<div class="text-base group-hover:scale-110 transition-transform">🌙</div>
					<div class="text-xs font-bold mt-1">Tiefe Nacht</div>
					<div class="text-[10px] text-indigo-700/80 dark:text-indigo-400/80">23:00 Uhr • Dunkel</div>
				</button>
			</div>
		</div>

		<!-- Footer mit Zurücksetzen-Button -->
		<div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
			{#if themeService.isSimulating}
				<button
					type="button"
					onclick={resetToRealTime}
					class="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center gap-1.5 transition-colors cursor-pointer"
				>
					<RotateCcw class="w-3.5 h-3.5" />
					Zur echten Uhrzeit zurückkehren
				</button>
			{:else}
				<span class="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
					<Clock class="w-3.5 h-3.5" />
					Läuft mit lokaler Echtzeit-Automatik
				</span>
			{/if}

			<button
				type="button"
				onclick={close}
				class="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
			>
				Fertig
			</button>
		</div>
	</div>
</dialog>
