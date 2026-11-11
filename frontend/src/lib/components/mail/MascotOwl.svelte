<script lang="ts">
  type MascotState = 'idle' | 'working' | 'flying' | 'success' | 'error';

  interface Props {
    state?: MascotState;
    message?: string;
    size?: 'sm' | 'md' | 'lg';
  }

  let { state = 'idle', message = '', size = 'md' }: Props = $props();

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };
</script>

<div class="flex flex-col items-center justify-center gap-2 select-none">
  <div class="relative {sizeClasses[size]} flex items-center justify-center">
    <!-- SVG Eule -->
    <svg 
      viewBox="0 0 100 100" 
      class="w-full h-full drop-shadow-md transition-transform duration-500 {state === 'working' || state === 'flying' ? 'animate-bounce' : state === 'success' ? 'scale-105' : ''}"
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Eulen-Körper -->
      <ellipse cx="50" cy="55" rx="32" ry="36" fill="#4f46e5" class="dark:fill-indigo-600" />
      <ellipse cx="50" cy="62" rx="22" ry="26" fill="#e0e7ff" class="dark:fill-indigo-100" />

      <!-- Ohren / Federohren -->
      <polygon points="26,24 38,36 20,40" fill="#4338ca" />
      <polygon points="74,24 62,36 80,40" fill="#4338ca" />

      <!-- Flügel links -->
      <path 
        d="M20,46 Q10,60 22,76" 
        stroke="#3730a3" 
        stroke-width="7" 
        stroke-linecap="round"
        class={state === 'working' || state === 'flying' ? 'animate-pulse' : ''}
      />
      <!-- Flügel rechts -->
      <path 
        d="M80,46 Q90,60 78,76" 
        stroke="#3730a3" 
        stroke-width="7" 
        stroke-linecap="round"
        class={state === 'working' || state === 'flying' ? 'animate-pulse' : ''}
      />

      <!-- Große Augen (Brille) -->
      <circle cx="37" cy="45" r="14" fill="#ffffff" stroke="#312e81" stroke-width="3" />
      <circle cx="63" cy="45" r="14" fill="#ffffff" stroke="#312e81" stroke-width="3" />
      <line x1="49" y1="45" x2="51" y2="45" stroke="#312e81" stroke-width="3" />

      <!-- Pupillen -->
      {#if state === 'success'}
        <!-- Fröhliche Augen (Halbbögen) -->
        <path d="M31,46 Q37,40 43,46" stroke="#1e1b4b" stroke-width="3.5" stroke-linecap="round" fill="none" />
        <path d="M57,46 Q63,40 69,46" stroke="#1e1b4b" stroke-width="3.5" stroke-linecap="round" fill="none" />
      {:else if state === 'error'}
        <!-- Besorgte Augen -->
        <circle cx="37" cy="46" r="4.5" fill="#e11d48" />
        <circle cx="63" cy="46" r="4.5" fill="#e11d48" />
      {:else}
        <!-- Neugierige Pupillen -->
        <circle cx="39" cy="45" r="5" fill="#1e1b4b" />
        <circle cx="65" cy="45" r="5" fill="#1e1b4b" />
        <circle cx="41" cy="43" r="1.5" fill="#ffffff" />
        <circle cx="67" cy="43" r="1.5" fill="#ffffff" />
      {/if}

      <!-- Schnabel -->
      <polygon points="50,51 44,59 56,59" fill="#f59e0b" />

      <!-- Füße -->
      <circle cx="40" cy="91" r="4" fill="#d97706" />
      <circle cx="60" cy="91" r="4" fill="#d97706" />

      <!-- Brief im Schnabel bei working/flying -->
      {#if state === 'working' || state === 'flying'}
        <rect x="40" y="60" width="20" height="13" rx="2" fill="#ffffff" stroke="#4f46e5" stroke-width="1.5" />
        <path d="M40,61 L50,68 L60,61" stroke="#4f46e5" stroke-width="1.5" fill="none" />
      {/if}

      <!-- Erfolgs-Sternchen -->
      {#if state === 'success'}
        <polygon points="50,15 52,21 58,21 53,25 55,31 50,27 45,31 47,25 42,21 48,21" fill="#10b981" />
      {/if}
    </svg>
  </div>

  {#if message}
    <p class="text-xs font-bold text-center px-2 py-0.5 rounded-full {state === 'success' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50' : state === 'error' ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/50' : 'text-slate-600 dark:text-slate-300'}">
      {message}
    </p>
  {/if}
</div>

