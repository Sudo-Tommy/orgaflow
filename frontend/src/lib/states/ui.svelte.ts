// Global UI states with Svelte 5 Runes

class UiState {
    submitting = $state(false);
}

export const isSubmitting = new UiState();
