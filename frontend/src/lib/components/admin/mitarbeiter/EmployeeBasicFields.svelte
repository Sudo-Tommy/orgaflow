<script lang="ts">
    import { User } from 'lucide-svelte';

    interface Props {
        name_first: string;
        name_last: string;
        email: string;
        password: string;
        isEditing: boolean;
    }

    let {
        name_first = $bindable(),
        name_last = $bindable(),
        email = $bindable(),
        password = $bindable(),
        isEditing
    }: Props = $props();
</script>

<div class="space-y-4">
    <h4 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
        <User class="w-3.5 h-3.5" />
        <span>Persönliche Stammdaten</span>
    </h4>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1">
            <label for="emp-firstname" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Vorname *</label>
            <input 
                id="emp-firstname"
                type="text" 
                required
                bind:value={name_first} 
                placeholder="z. B. Lisa" 
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
        <div class="space-y-1">
            <label for="emp-lastname" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Nachname *</label>
            <input 
                id="emp-lastname"
                type="text" 
                required
                bind:value={name_last} 
                placeholder="z. B. Müller" 
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1">
            <label for="emp-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">E-Mail-Adresse *</label>
            <input 
                id="emp-email"
                type="email" 
                required
                bind:value={email} 
                placeholder="lisa.mueller@ihre-seniorenassistenz.com" 
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
        <div class="space-y-1">
            <label for="emp-password" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isEditing ? 'Passwort ändern (leer lassen = unverändert)' : 'Start-Passwort (leer = auto-generiert)'}
            </label>
            <input 
                id="emp-password"
                type="password" 
                bind:value={password} 
                placeholder={isEditing ? '••••••••' : 'Sicheres Passwort eingeben'} 
                class="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 touch-manipulation"
            />
        </div>
    </div>
</div>
