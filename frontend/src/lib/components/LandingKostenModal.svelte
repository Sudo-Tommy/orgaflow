<script lang="ts">
    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;

    export function open() {
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-8 md:p-12 w-full max-h-[85vh] overflow-y-auto custom-scrollbar relative">
        <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-6 h-6 bg-linear-to-br" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div class="w-14 h-14 bg-linear-to-br from-amber-100 to-amber-200 text-amber-700 rounded-full flex items-center justify-center text-3xl mb-6 shadow-inner">💡</div>
        <h2 class="text-3xl font-bold text-brand-950 mb-6">Kostenübernahme durch die Pflegekasse</h2>
        <div class="space-y-4 text-neutral-700 leading-relaxed text-lg">
            <p><strong>Gute Neuigkeiten:</strong> In den allermeisten Fällen müssen Sie für unsere Leistungen keinen einzigen Cent aus eigener Tasche bezahlen!</p>
            <p>Sobald bei Ihnen oder Ihrem Angehörigen ein <strong>Pflegegrad (1 bis 5)</strong> festgestellt wurde, steht Ihnen monatlich der sogenannte Entlastungsbetrag in Höhe von <strong>131 Euro</strong> zu (§ 45b SGB XI).</p>
            <p>Da wir ein anerkannter Dienstleister sind, können wir unsere Leistungen direkt mit Ihrer Pflegekasse abrechnen. Sie müssen nicht in Vorkasse gehen und haben keinen lästigen Papierkram damit.</p>
            <p><strong>Volle Flexibilität:</strong> Wir arbeiten auf Auftragsbasis. Es gibt bei uns keine bindenden Langzeitverträge oder versteckten Abos! Sie buchen uns genau dann, wenn Sie uns brauchen, und wir rechnen unsere Einsätze auf Wunsch völlig transparent einzeln ab.</p>
            <p>Zusätzlich gibt es die Möglichkeit der <strong>Verhinderungspflege</strong>, falls pflegende Angehörige einmal verhindert sind oder eine Auszeit brauchen. Auch hier beraten wir Sie gerne zu Ihren Ansprüchen.</p>
            <div class="bg-amber-50 border border-amber-100 p-6 rounded-2xl mt-6 shadow-sm">
                <h3 class="font-bold text-amber-900 mb-2">Sie haben noch gar keinen Pflegegrad?</h3>
                <p class="text-amber-800 text-base">Gar kein Problem! Wir unterstützen Sie von Anfang an bei der Beantragung und begleiten Sie beim Termin mit dem Medizinischen Dienst (MDK). Gemeinsam sorgen wir dafür, dass Sie die Hilfe bekommen, die Ihnen zusteht.</p>
            </div>
        </div>
        <div class="mt-10 flex justify-end">
            <button onclick={close} class="orga-button-primary w-full sm:w-auto">Verstanden, danke!</button>
        </div>
    </div>
</dialog>