<script lang="ts">
    import { Phone } from 'lucide-svelte';

    interface Props {
        handy: string;
        tel: string;
        street: string;
        housenr: string;
        zip: string;
        city: string;
    }

    let {
        handy = $bindable(),
        tel = $bindable(),
        street = $bindable(),
        housenr = $bindable(),
        zip = $bindable(),
        city = $bindable()
    }: Props = $props();
</script>

<div class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
    <h4 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
        <Phone class="w-3.5 h-3.5" />
        <span>Erreichbarkeit & Anschrift</span>
    </h4>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1">
            <label for="emp-handy" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Mobilfunk / Diensthandy</label>
            <input 
                id="emp-handy"
                type="text"
                bind:value={handy}
                placeholder="+49 170 1234567"
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
        <div class="space-y-1">
            <label for="emp-tel" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Festnetz</label>
            <input 
                id="emp-tel"
                type="text"
                bind:value={tel}
                placeholder="0351 123456"
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
        <div class="col-span-2 space-y-1">
            <label for="emp-street" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Straße</label>
            <input 
                id="emp-street"
                type="text"
                bind:value={street}
                placeholder="Hauptstraße"
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
        <div class="space-y-1">
            <label for="emp-housenr" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Hausnr.</label>
            <input 
                id="emp-housenr"
                type="text"
                bind:value={housenr}
                placeholder="12a"
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
        <div class="space-y-1">
            <label for="emp-zip" class="block text-xs font-bold text-slate-700 dark:text-slate-300">PLZ</label>
            <input 
                id="emp-zip"
                type="text"
                bind:value={zip}
                placeholder="01067"
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
        <div class="col-span-2 space-y-1">
            <label for="emp-city" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Stadt</label>
            <input 
                id="emp-city"
                type="text"
                bind:value={city}
                placeholder="Dresden"
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
    </div>
</div>
