<script lang="ts">
    export interface ProfileFormData {
        name_first: string;
        name_last: string;
        email: string;
        phone: string;
        street: string;
        housenr: string;
        zip: string;
        city: string;
    }

    interface Props {
        formData: ProfileFormData;
        isLoading: boolean;
    }

    let { formData = $bindable(), isLoading }: Props = $props();
</script>

<div class="space-y-4">
    <!-- Vorname & Nachname -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <label for="prof-first" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Vorname
            </label>
            <input 
                id="prof-first" 
                type="text" 
                bind:value={formData.name_first} 
                class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
                disabled={isLoading} 
                required 
            />
        </div>
        <div>
            <label for="prof-last" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Nachname
            </label>
            <input 
                id="prof-last" 
                type="text" 
                bind:value={formData.name_last} 
                class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
                disabled={isLoading} 
                required 
            />
        </div>
    </div>

    <!-- E-Mail & Telefon -->
    <div>
        <label for="prof-email" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
            E-Mail
        </label>
        <input 
            id="prof-email" 
            type="email" 
            bind:value={formData.email} 
            class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
            disabled={isLoading} 
            required 
        />
    </div>

    <div>
        <label for="prof-phone" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
            Telefon / Mobil
        </label>
        <input 
            id="prof-phone" 
            type="text" 
            bind:value={formData.phone} 
            class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
            disabled={isLoading} 
        />
    </div>
    
    <!-- Adresse -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100 dark:border-slate-800">
        <div class="sm:col-span-3">
            <label for="prof-street" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Straße
            </label>
            <input 
                id="prof-street" 
                type="text" 
                bind:value={formData.street} 
                class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
                disabled={isLoading} 
            />
        </div>
        <div>
            <label for="prof-housenr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Hausnr.
            </label>
            <input 
                id="prof-housenr" 
                type="text" 
                bind:value={formData.housenr} 
                class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
                disabled={isLoading} 
            />
        </div>
        <div>
            <label for="prof-zip" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                PLZ
            </label>
            <input 
                id="prof-zip" 
                type="text" 
                bind:value={formData.zip} 
                class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
                disabled={isLoading} 
            />
        </div>
        <div class="sm:col-span-3">
            <label for="prof-city" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Stadt
            </label>
            <input 
                id="prof-city" 
                type="text" 
                bind:value={formData.city} 
                class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px] touch-manipulation" 
                disabled={isLoading} 
            />
        </div>
    </div>
</div>
