import { wysiwygToHtml } from "$lib/components/editor/wordVariables";
import type { PlaceholderContext } from "./documentPlaceholderTypes";
import { safeFormatDate } from "./documentPlaceholderTypes";
import { buildDocumentTokenMap } from "./documentPlaceholderTokens";

export { type PlaceholderContext, safeFormatDate };

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyReplacement(src: string, key: string, value: string): string {
    if (src.includes(key)) src = src.split(key).join(value);
    const inner = escapeRegex(key.replace(/^\{\{/, '').replace(/\}\}$/, ''));
    return src.replace(new RegExp('\\{\\{?\\s*' + inner + '\\s*\\}\\}?', 'g'), value);
}

export function replaceDocumentPlaceholders(
    text: string,
    ctx: PlaceholderContext
): string {
    if (!text) return "";

    // 1. WYSIWYG Chips & Chevrons in {{token}} Format umwandeln
    let res = wysiwygToHtml(text).replace(/\n/g, '<br/>');

    // 2. Mappings für alle Token-Kategorien abrufen und anwenden
    const map = buildDocumentTokenMap(ctx);
    for (const [key, val] of map) {
        res = applyReplacement(res, key, val);
    }

    // 3. Unbelegte oder unbekannte Tokens restlos leeren (keine {{...}} im PDF)
    res = res.replace(/\{\{\s*[a-zA-Z0-9_.]+\s*\}\}/g, '');

    return res;
}
