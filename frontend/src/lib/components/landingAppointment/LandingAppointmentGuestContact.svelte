<script lang="ts">
    let { modalState } = $props<{ modalState: any }>();
</script>

<div class="space-y-4 mb-4">
    <div>
        <label for="req-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Ihr Vor- und Nachname *
        </label>
        <input
            id="req-name"
            type="text"
            bind:value={modalState.sender_name}
            class="orga-input-clear bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]"
            placeholder="Max Mustermann"
            required
            disabled={modalState.isLoading}
        />
    </div>

    <div>
        <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Bevorzugter Kontaktweg *
        </span>
        <div class="flex flex-col sm:flex-row gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
                type="button"
                onclick={() => (modalState.preferredContact = "phone")}
                class="flex-1 py-2 min-h-[44px] text-xs font-bold rounded-lg transition-colors cursor-pointer {modalState.preferredContact === 'phone'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}"
            >📞 Telefon</button>
            <button
                type="button"
                onclick={() => (modalState.preferredContact = "email")}
                class="flex-1 py-2 min-h-[44px] text-xs font-bold rounded-lg transition-colors cursor-pointer {modalState.preferredContact === 'email'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}"
            >✉️ E-Mail</button>
            <button
                type="button"
                onclick={() => (modalState.preferredContact = "mail")}
                class="flex-1 py-2 min-h-[44px] text-xs font-bold rounded-lg transition-colors cursor-pointer {modalState.preferredContact === 'mail'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}"
            >📮 Postweg</button>
        </div>
    </div>

    <div class="p-3.5 bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700 rounded-xl">
        {#if modalState.preferredContact === "email"}
            <div>
                <label for="req-email" class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Ihre E-Mail-Adresse *
                </label>
                <input
                    id="req-email"
                    type="email"
                    inputmode="email"
                    bind:value={modalState.email}
                    class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]"
                    placeholder="beispiel@email.de"
                    required
                    disabled={modalState.isLoading}
                />
            </div>
        {:else if modalState.preferredContact === "phone"}
            <div>
                <label for="req-phone" class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Ihre Telefon- oder Handynummer *
                </label>
                <input
                    id="req-phone"
                    type="tel"
                    inputmode="tel"
                    bind:value={modalState.phone}
                    class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]"
                    placeholder="0151..."
                    required
                    disabled={modalState.isLoading}
                />
            </div>
        {:else if modalState.preferredContact === "mail"}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label for="req-street" class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Straße & Hausnr. *
                    </label>
                    <input
                        id="req-street"
                        type="text"
                        bind:value={modalState.street}
                        class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]"
                        placeholder="Musterstr. 1"
                        required
                        disabled={modalState.isLoading}
                    />
                </div>
                <div>
                    <label for="req-zip" class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        PLZ & Ort *
                    </label>
                    <input
                        id="req-zip"
                        type="text"
                        bind:value={modalState.zip_city}
                        class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base min-h-[44px]"
                        placeholder="06108 Halle"
                        required
                        disabled={modalState.isLoading}
                    />
                </div>
            </div>
        {/if}
    </div>
</div>
