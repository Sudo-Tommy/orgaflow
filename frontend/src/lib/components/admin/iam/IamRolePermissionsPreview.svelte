<script lang="ts">
    interface Props {
        selectedRole: string;
    }

    let { selectedRole }: Props = $props();
</script>

<div class="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        Effektive Berechtigungen (Vorschau)
    </h4>
    <div class="grid grid-cols-2 gap-2 text-[11px]">
        <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-400 font-medium">System-Admin</span>
            <span class="font-bold {selectedRole === 'developer' || selectedRole === 'superadmin' || selectedRole === 'admin' ? 'text-emerald-600' : 'text-slate-400'}">
                {selectedRole === 'developer' || selectedRole === 'superadmin' || selectedRole === 'admin' ? '✓ Erlaubt' : '✗ Gesperrt'}
            </span>
        </div>
        <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-400 font-medium">God Mode (Live Logs)</span>
            <span class="font-bold {selectedRole === 'developer' || selectedRole === 'superadmin' ? 'text-emerald-600' : 'text-slate-400'}">
                {selectedRole === 'developer' || selectedRole === 'superadmin' ? '✓ Erlaubt' : '✗ Gesperrt'}
            </span>
        </div>
        <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-400 font-medium">BWA & Finanzen</span>
            <span class="font-bold {selectedRole === 'developer' || selectedRole === 'superadmin' || selectedRole === 'admin' ? 'text-emerald-600' : 'text-slate-400'}">
                {selectedRole === 'developer' || selectedRole === 'superadmin' || selectedRole === 'admin' ? '✓ Erlaubt' : '✗ Gesperrt'}
            </span>
        </div>
        <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-400 font-medium">Klientenstammdaten</span>
            <span class="font-bold {selectedRole !== 'guest' ? 'text-emerald-600' : 'text-slate-400'}">
                {selectedRole !== 'guest' ? (selectedRole === 'user' ? '✓ Zugeordnet' : '✓ Vollzugriff') : '✗ Gesperrt'}
            </span>
        </div>
    </div>
</div>
