<script lang="ts">
    import { getLegalContent } from "$lib/services/landingContentService";
    import { ArrowLeft, Building2 } from "lucide-svelte";

    const legal = getLegalContent();
</script>

<svelte:head>
    <title>Impressum | Ihre Seniorenassistenz</title>
    <meta name="description" content="Impressum und gesetzliche Anbieterkennzeichnung gemäß § 5 TMG / DDG für Ihre Seniorenassistenz." />
    <meta name="robots" content="index, follow" />
</svelte:head>

<div class="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans">
    <!-- Header -->
    <header class="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <a href="/" class="inline-flex items-center gap-2 text-sm font-bold text-neutral-700 hover:text-indigo-600 transition-colors">
                <ArrowLeft class="w-4 h-4" />
                Zurück zur Startseite
            </a>
            <div class="flex items-center gap-4 text-xs font-semibold">
                <a href="/datenschutz" class="text-neutral-500 hover:text-neutral-900 transition-colors">Datenschutz</a>
                <span class="text-neutral-300">|</span>
                <a href="/portal" class="text-indigo-600 hover:text-indigo-700 transition-colors">Klienten-Portal 🔐</a>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div class="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm space-y-8">
            <div class="border-b border-neutral-100 pb-6">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold mb-3 border border-blue-100">
                    <Building2 class="w-3.5 h-3.5" /> Rechtliche Angaben &amp; Impressum
                </div>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">Impressum</h1>
                <p class="text-sm text-neutral-500 mt-2">
                    Gesetzliche Anbieterkennzeichnung nach § 5 DDG (ehem. TMG).
                </p>
            </div>

            <div class="prose prose-neutral max-w-none text-sm leading-relaxed text-neutral-700 space-y-6">
                {@html legal.impressum}
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-neutral-200 py-6 mt-12">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-3">
            <p>&copy; {new Date().getFullYear()} Ihre Seniorenassistenz. Alle Rechte vorbehalten.</p>
            <div class="flex gap-4 font-medium">
                <a href="/datenschutz" class="hover:text-neutral-800 transition-colors">Datenschutzerklärung</a>
                <a href="/" class="hover:text-neutral-800 transition-colors">Startseite</a>
            </div>
        </div>
    </footer>
</div>
