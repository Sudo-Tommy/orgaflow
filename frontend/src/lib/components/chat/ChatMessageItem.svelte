<script lang="ts">
    import { pb } from '$lib/services/pocketbase';

    interface Props {
        msg: any;
        chat: any;
        formatMessageTime: (dateStr: string) => string;
        onFeedbackPrompt: (msg: any) => void;
        onDelete: (id: string) => void;
    }

    let { msg, chat, formatMessageTime, onFeedbackPrompt, onDelete }: Props = $props();

    const rawUser = $derived(typeof msg.user === 'string' && msg.user.startsWith('[') ? JSON.parse(msg.user) : msg.user);
    const senderId = $derived(Array.isArray(rawUser) ? rawUser[0] : rawUser);
    const isMe = $derived(senderId === chat.currentUserId);
    const isBugReport = $derived(msg.text ? msg.text.includes('🚨 [BUG REPORT]') : false);

    const rawWhisper = $derived(typeof msg.whispered_user === 'string' && msg.whispered_user.startsWith('[') ? JSON.parse(msg.whispered_user) : msg.whispered_user);
    const whisperId = $derived(Array.isArray(rawWhisper) ? rawWhisper[0] : rawWhisper);

    const expandUser = $derived((Array.isArray(msg.expand?.user) ? msg.expand.user[0] : msg.expand?.user) || chat.users.find((u: any) => u.id === senderId) || { name_first: 'System/Support' });
    const expandWhisper = $derived((Array.isArray(msg.expand?.whispered_user) ? msg.expand.whispered_user[0] : msg.expand?.whispered_user) || chat.users.find((u: any) => u.id === whisperId));
</script>

<div class="flex flex-col {isMe ? 'items-end' : 'items-start'} animate-enter relative group/msg">
    {#if msg.whispered}
        <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-full mb-1">
            🤫 Geflüstert {isMe ? `an ${expandWhisper?.name_first || 'Support'}` : 'an dich'}
        </span>
    {/if}
    
    <div class="max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-xs relative
                {isMe ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-none'}
                {isBugReport ? 'bg-rose-50! dark:bg-rose-950/40! border! border-rose-300! dark:border-rose-800! text-rose-950! dark:text-rose-100!' : ''}">
        
        <div class="absolute {isMe ? '-left-8' : '-right-8'} top-1 flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-all z-10">
            {#if chat.isAdmin}
                <button 
                    type="button"
                    onclick={() => onFeedbackPrompt(msg)} 
                    class="p-1.5 text-indigo-600 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-full hover:bg-indigo-600 hover:text-white shadow-sm transition-colors cursor-pointer" 
                    title="🎯 Prompt aus dieser Nachricht erstellen"
                >
                    <span class="text-xs leading-none">🎯</span>
                </button>
            {/if}

            {#if isMe || chat.isAdmin}
                <button 
                    type="button"
                    onclick={() => onDelete(msg.id)} 
                    class="p-1.5 text-rose-400 bg-white dark:bg-slate-800 border border-rose-200 dark:border-slate-700 rounded-full hover:bg-rose-500 hover:text-white shadow-sm transition-colors cursor-pointer" 
                    title="Nachricht löschen"
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            {/if}
        </div>

        {#if !isMe}
            <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">{expandUser?.name_first || 'System/Support'}</div>
        {/if}

        {#if msg.file && msg.file.length > 0}
            {@const fileName = Array.isArray(msg.file) ? msg.file[0] : msg.file}
            {#if fileName.match(/\.(webm|mp3|wav|ogg|m4a)$/i)}
                <div class="mb-2 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 min-w-50">
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <audio controls src={pb.files.getURL(msg, fileName)} class="w-full max-w-60 h-10"></audio>
                </div>
            {:else}
                <div class="mb-2 p-2 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2">
                    <span class="text-xl">📎</span>
                    <a href={pb.files.getURL(msg, fileName)} target="_blank" class="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline truncate">Anhang ansehen</a>
                </div>
            {/if}
        {/if}

        {#if msg.text}
            <div class="text-sm leading-relaxed whitespace-pre-wrap word-break">{msg.text.replace('🚨 [BUG REPORT]\n\n', '')}</div>
        {/if}
        
        <div class="text-[10px] {isMe ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'} text-right mt-1.5 font-medium select-none flex items-center justify-end gap-1">
            {formatMessageTime(msg.created)}
            {#if isMe}
                <svg class="w-4 h-4 text-indigo-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L7 17l-5-5"/><path d="M22 10l-7.5 7.5L13 16"/>
                </svg>
            {/if}
        </div>
    </div>
</div>
