import { pb, keepPocketBaseAlive } from "./lib/services/pocketbase";

export function authManager() {
	// Svelte 5 $state für UI Reactivity
	let isLoggedIn = $state(pb.authStore.isValid);

	function setup() {
		// Hält den Svelte State absolut synchron mit PocketBase
		const unsubscribe = pb.authStore.onChange(() => {
			isLoggedIn = pb.authStore.isValid;
		});

		// Startet den Hintergrundprozess
		const cleanupAlive = keepPocketBaseAlive();

		return () => {
			unsubscribe();
			cleanupAlive();
		};
	}

	return {
		get isLoggedIn() {
			return isLoggedIn;
		},
		setup
	};
}