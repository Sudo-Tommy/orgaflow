# Modal- und Popup-Architektur

## Grundsatz
**Modale und Popups scrollen als Ganzes durch (`overflow-y-auto overflow-x-hidden`). Kein künstlich abgetrennter Inhalts-Scrollbalken.**
- **Große Header & KPI-Kacheln:** Wandern beim Scrollen natürlich nach oben weg, um maximalen vertikalen Platz für Terminkarten freizugeben.
- **Schlanke Sticky-Filterleiste:** Essenzielle Kontrollen (Suchfeld, Status-Filterchips und ggf. Sammelaktionen) docken sich per `sticky top-0 z-20 bg-white/95 backdrop-blur-md` oben an. Dadurch bleiben Suche, Filter und Zähler auch beim tiefen Scrollen durch viele ausgeklappte Karten stets griffbereit.
- **Footer:** Steht am natürlichen Ende der Liste und schließt den Inhalt ab.
- **Kein horizontales Scrollen:** Absolut verboten (`overflow-x-hidden`, `min-w-0`, `flex-wrap`, `break-words`).

## Vorgeschriebenes Layout-Muster
1. **`<dialog>` Element**:
   - Dient als reiner rahmenloser Begrenzer:
     `class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-3xl m-0 sm:m-auto max-h-dvh sm:max-h-[90dvh] rounded-none sm:rounded-3xl outline-none border-none overflow-hidden"`
2. **Innerer Modal-Container (Einziger Scrollbereich)**:
   - Der gesamte Modal-Inhalt scrollt als Einheit:
     `class="bg-neutral-50 sm:rounded-3xl w-full max-h-dvh sm:max-h-[90dvh] overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col shadow-2xl border border-neutral-200"`
3. **Kopfbereich (Titel, Icons & große KPI-Kacheln)**:
   - Scrollt nach oben weg:
     `class="bg-white border-b border-neutral-200 shadow-xs w-full"`
4. **Schlanke Sticky-Filterleiste (Suche & Filterchips & Sammelaktionen)**:
   - Bleibt beim Scrollen an `top-0` angeheftet:
     `class="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs"`
5. **Inhaltsbereich (Karten, Listen)**:
   - Fließt direkt darunter ohne eigenen Scrollbalken:
     `class="p-3 sm:p-6 bg-neutral-50/60 w-full flex-1 min-w-0"`
6. **Footer (Aktionen, Summen)**:
   - Steht am natürlichen Ende des Inhalts:
     `class="p-3.5 sm:p-5 bg-white border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] w-full mt-auto shrink-0"`
7. **Horizontales Scrollen**:
   - Bleibt strikt verboten (`overflow-x-hidden w-full max-w-full`).
   - Alle Kindelemente (Chips, Buttons, Adressen, Notizen) nutzen `flex-wrap`, `min-w-0` und `break-words`.
