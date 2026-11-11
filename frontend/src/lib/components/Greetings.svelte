<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from 'svelte';
    import { generateGreetingInfo } from "./greetings/greetingsGenerator";

    let userName = $state('');
    let greeting = $state('');
    let subGreeting = $state('');
    let emoji = $state('👋');

    onMount(() => {
        const user = pb.authStore.record || pb.authStore.model;
        userName = user?.name_first || user?.name || 'Chef';
        const info = generateGreetingInfo();
        greeting = info.greeting;
        subGreeting = info.subGreeting;
        emoji = info.emoji;
    });
</script>

<div class="mt-3 inline-flex items-center gap-4 bg-linear-to-r from-white to-brand-50/50 dark:from-slate-900 dark:to-indigo-950/40 border border-brand-100/60 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow w-full">
    <div class="text-3xl md:text-4xl animate-waving-hand origin-bottom-right drop-shadow-sm select-none">
        {emoji}
    </div>
    <div class="flex flex-col">
        <span class="text-lg md:text-xl font-black text-neutral-800 dark:text-white tracking-tight">
            {greeting}, <span class="text-brand-600 dark:text-indigo-400">{userName}</span>!
        </span>
        <span class="text-sm font-bold text-neutral-500 dark:text-slate-400 mt-0.5 max-w-sm leading-tight">
            {subGreeting}
        </span>
    </div>
</div>

<style>
    .animate-waving-hand {
        animation: wave 2.5s infinite;
    }

    @keyframes wave {
        0% { transform: rotate(0deg); }
        10% { transform: rotate(14deg); }
        20% { transform: rotate(-8deg); }
        30% { transform: rotate(14deg); }
        40% { transform: rotate(-4deg); }
        50% { transform: rotate(10deg); }
        60%, 100% { transform: rotate(0deg); }
    }
</style>