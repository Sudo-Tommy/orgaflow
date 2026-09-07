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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 w-full max-h-[88vh] overflow-y-auto custom-scrollbar relative shadow-2xl dark:shadow-black/60 border border-transparent dark:border-slate-800 transition-colors">
        <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-11 h-11 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 bg-linear-to-br from-amber-100 to-amber-200 dark:from-amber-950/60 dark:to-amber-900/40 text-amber-700 dark:text-amber-300 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0">💡</div>
            <div>
                <span class="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Gesetzliche Pflegekassen & Privat</span>
                <h2 class="text-2xl sm:text-3xl font-black text-brand-950 dark:text-white leading-tight">Kostenübernahme durch die Pflegekasse</h2>
            </div>
        </div>

        <p class="text-base sm:text-lg text-neutral-700 dark:text-slate-300 font-medium leading-relaxed mb-6">
            <strong class="text-neutral-900 dark:text-white">Entlastung, die Ihnen zusteht – meist ohne eigene Zuzahlung!</strong><br />
            Die Kosten für unsere Seniorenassistenz und Alltagsbegleitung können in den allermeisten Fällen vollständig von Ihrer Pflegekasse übernommen werden. Als landesrechtlich anerkannter Dienstleister rechnen wir auf Wunsch <strong class="text-neutral-900 dark:text-white">direkt mit allen gesetzlichen und privaten Kassen</strong> ab – für Sie bedeutet das: <strong class="text-neutral-900 dark:text-white">keine lästige Vorkasse und kein bürokratischer Aufwand</strong>.
        </p>

        <div class="space-y-4">
            <!-- 1. Entlastungsbetrag -->
            <div class="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl p-5">
                <div class="flex items-start gap-3.5">
                    <span class="text-2xl">💶</span>
                    <div>
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                            <h3 class="font-bold text-neutral-900 dark:text-slate-100 text-base">1. Monatlicher Entlastungsbetrag (§ 45b SGB XI)</h3>
                            <span class="text-[11px] font-extrabold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">131 € / Monat</span>
                        </div>
                        <p class="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                            Bereits <strong class="text-neutral-900 dark:text-slate-100">ab Pflegegrad 1</strong> haben Sie gesetzlichen Anspruch auf 131 € monatlich (1.572 € pro Jahr) für anerkannte Alltags- und Betreuungsleistungen. Ungenutzte Beträge verfallen nicht zum Monatsende, sondern können flexibel bis zum <strong class="text-neutral-900 dark:text-slate-100">30. Juni des Folgejahres</strong> angespart und eingesetzt werden.
                        </p>
                    </div>
                </div>
            </div>

            <!-- 2. Verhinderungspflege -->
            <div class="bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/40 rounded-2xl p-5">
                <div class="flex items-start gap-3.5">
                    <span class="text-2xl">🤝</span>
                    <div>
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                            <h3 class="font-bold text-neutral-900 dark:text-slate-100 text-base">2. Verhinderungspflege (§ 39 SGB XI)</h3>
                            <span class="text-[11px] font-extrabold bg-teal-200/80 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 px-2 py-0.5 rounded-full">Bis zu 1.612 € / Jahr</span>
                        </div>
                        <p class="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                            <strong class="text-neutral-900 dark:text-slate-100">Ab Pflegegrad 2</strong> steht Ihnen zusätzlich ein jährliches Budget zur Verfügung, wenn Ihre private Hauptpflegeperson (z. B. durch Urlaub, Krankheit, Beruf oder eigene Termine) verhindert ist. Bei <strong class="text-neutral-900 dark:text-slate-100">stundenweiser Begleitung</strong> (unter 8 Stunden pro Tag) bleibt das reguläre Pflegegeld zu 100 % in voller Höhe erhalten!
                        </p>
                    </div>
                </div>
            </div>

            <!-- 3. Flexibilität & Transparenz -->
            <div class="bg-neutral-50 dark:bg-slate-800/50 border border-neutral-200/80 dark:border-slate-700/60 rounded-2xl p-5">
                <div class="flex items-start gap-3.5">
                    <span class="text-2xl">✨</span>
                    <div>
                        <h3 class="font-bold text-neutral-900 dark:text-slate-100 text-base mb-1">3. Volle Flexibilität ohne Vertragsbindung</h3>
                        <p class="text-sm text-neutral-700 dark:text-slate-300 leading-relaxed">
                            Bei uns gibt es keine starren Abos oder Mindestlaufzeiten. Sie bestimmen Art, Häufigkeit und Umfang unserer Einsätze – transparent, stundengenau und partnerschaftlich.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Noch kein Pflegegrad -->
            <div class="bg-linear-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/40 p-5 sm:p-6 rounded-2xl mt-4 shadow-sm">
                <div class="flex items-start gap-3">
                    <span class="text-2xl">🩺</span>
                    <div>
                        <h3 class="font-bold text-amber-950 dark:text-amber-200 text-base mb-1">Sie haben noch gar keinen Pflegegrad oder sind unsicher?</h3>
                        <p class="text-sm text-amber-900 dark:text-amber-300/90 leading-relaxed">
                            Kein Problem! Wir lassen Sie im Paragraphendschungel nicht allein. Wir unterstützen Sie und Ihre Angehörigen kostenfrei bei der Vorbereitung des Erstantrags und begleiten Sie auf Wunsch persönlich beim Begutachtungstermin durch den Medizinischen Dienst (MD / Medicproof).
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-8 pt-4 border-t border-neutral-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p class="text-xs text-neutral-500 dark:text-slate-400 text-center sm:text-left">
                Abrechnung mit allen Kassen: AOK, Barmer, TK, DAK, IKK, Knappschaft u. a.
            </p>
            <button onclick={close} class="orga-button-primary w-full sm:w-auto px-8 py-3 text-sm font-bold shadow-md min-h-[44px] cursor-pointer">
                Verstanden, danke!
            </button>
        </div>
    </div>
</dialog>