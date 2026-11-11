<script lang="ts">
    let { user } = $props<{ user: any }>();
</script>

<div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3">
    <div class="flex items-center justify-between text-xs">
        <span class="text-slate-500 uppercase tracking-wider font-bold">PocketBase Principal ID</span>
        <span class="font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 select-all font-semibold">
            {user.id}
        </span>
    </div>
    <div class="flex items-center justify-between text-xs">
        <span class="text-slate-500 uppercase tracking-wider font-bold">Benutzername</span>
        <span class="font-mono text-slate-700 dark:text-slate-300">@{user.username || 'unbekannt'}</span>
    </div>
    <div class="flex items-center justify-between text-xs">
        <span class="text-slate-500 uppercase tracking-wider font-bold">Erstellt am</span>
        <span class="text-slate-700 dark:text-slate-300">{user.created ? new Date(user.created).toLocaleString('de-DE') : '-'}</span>
    </div>
</div>
