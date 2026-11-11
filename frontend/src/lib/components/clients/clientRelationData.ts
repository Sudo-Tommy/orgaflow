export interface RelationGroup {
    group: string;
    items: string[];
}

export const COMMON_RELATIONS: RelationGroup[] = [
    {
        group: "Familie",
        items: ["Ehepartner/in", "Enkel/in", "Geschwister", "Mutter", "Schwiegersohn", "Schwiegertochter", "Sohn", "Tochter", "Vater"]
    },
    {
        group: "Medizin & Pflege",
        items: ["Facharzt / Fachärztin", "Hausarzt / Hausärztin", "Pflegedienst"]
    },
    {
        group: "Recht & Betreuung",
        items: ["Bevollmächtigte/r", "Gesetzliche/r Betreuer/in"]
    },
    {
        group: "Umfeld",
        items: ["Bekannte/r", "Freund/in", "Nachbar/in", "Pflegeperson"]
    }
].sort((a, b) => a.group.localeCompare(b.group, 'de', { sensitivity: 'base' }));
