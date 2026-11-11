/**
 * liveSupportTicketService.js
 * Ausgelagerte Ticket-Finalisierung und Kategorie-/Prioritäts-Inferenz für Omni Live-Support.
 */

import { generateSingleFeedbackPrompt } from '../../../singleFeedbackPromptService.js';

export function inferTicketCategoryAndPriority(conversationText = '') {
    const lower = String(conversationText || '').toLowerCase();

    let suggestedCategory = 'Technik / Fehler';
    if (
        lower.includes('layout') ||
        lower.includes('optik') ||
        lower.includes('design') ||
        lower.includes('verschoben') ||
        lower.includes('überlappt') ||
        lower.includes('farbe') ||
        lower.includes('darstellung') ||
        lower.includes('querformat')
    ) {
        suggestedCategory = 'Optik & Layout';
    } else if (
        lower.includes('wunsch') ||
        lower.includes('idee') ||
        lower.includes('vorschlag') ||
        lower.includes('wäre schön') ||
        lower.includes('könnte man') ||
        lower.includes('neues feature') ||
        lower.includes('erweiterung')
    ) {
        suggestedCategory = 'Idee & Wunsch';
    }

    let suggestedPriority = 'normal';
    if (
        lower.includes('dringend') ||
        lower.includes('absturz') ||
        lower.includes('nichts geht') ||
        lower.includes('blockiert') ||
        lower.includes('datenverlust') ||
        lower.includes('kritisch')
    ) {
        suggestedPriority = 'urgent';
    } else if (
        suggestedCategory === 'Idee & Wunsch' ||
        lower.includes('kleinigkeit') ||
        lower.includes('nicht eilig')
    ) {
        suggestedPriority = 'low';
    }

    return { suggestedCategory, suggestedPriority };
}

export function buildSynthesizedProblemSummary(messages = [], aiReply = '') {
    const cleanedAi = String(aiReply || '')
        .replace(/\[TICKET_BEREIT\]/gi, '')
        .replace(/^(Zusammenfassung|Ticket-Zusammenfassung|Problemzusammenfassung)\s*:\s*/i, '')
        .trim();

    if (cleanedAi && !cleanedAi.endsWith('?') && cleanedAi.length >= 20) {
        return cleanedAi;
    }

    const genericTrigger = 'ich habe ein technisches problem oder einen fehler';
    const userTexts = (Array.isArray(messages) ? messages : [])
        .filter(m => m.role === 'user')
        .map(m => String(m.text || m.content || '').trim())
        .filter(t => t.length > 0 && t.toLowerCase() !== genericTrigger);

    if (userTexts.length === 0) return cleanedAi || 'Support-Anfrage aus dem Omni-Chat';
    return userTexts.slice(-3).join(' — ');
}

export async function finalizeLiveSupportTicket({
    chatTranscript = [],
    problemSummary = '',
    category = 'Technik / Fehler',
    priority = 'normal',
    context = {},
    attachments = [],
    user = null,
    pbAdmin
}) {
    if (!pbAdmin) throw new Error('PocketBase Admin-Instanz erforderlich.');
    const senderName = user?.name_first
        ? `${user.name_first} ${user.name_last || ''}`.trim()
        : (user?.email || 'Mitarbeiter');
    const isDevOrAdmin = ['developer', 'superadmin', 'owner', 'admin'].includes(
        String(user?.role || '').toLowerCase()
    );
    const compactTranscript = (Array.isArray(chatTranscript) ? chatTranscript : [])
        .slice(-12)
        .map(m => ({
            role: m?.role || 'user',
            text: String(m?.text || '').slice(0, 500)
        }));

    let antigravityPrompt = '';
    let affectedModules = [];

    try {
        const attInfo = (attachments || []).map(a => `- Datei: ${a.name} (${a.type || 'Datei'})`).join('\n');
        const promptResult = await generateSingleFeedbackPrompt({
            source: 'support_message',
            sender: senderName,
            message: `${problemSummary || 'Benutzer meldet ein Problem'}\n${attInfo}`,
            context: JSON.stringify({
                url: context?.url || context?.route || '',
                chatTranscript: compactTranscript
            }),
            adminInstruction: 'Erstelle einen konkreten AntiGravity-Prompt zur Behebung.'
        });
        antigravityPrompt = promptResult?.antigravityFixPrompt || promptResult?.prompt || '';
        affectedModules = promptResult?.affectedModules || [];
    } catch {
        antigravityPrompt = `### AntiGravity Ticket\n**Problem:** ${problemSummary}\n**Kontext:** ${context?.url || context?.route || ''}`;
    }

    const basePayload = {
        category: String(category || 'Technik / Fehler').slice(0, 120),
        status: 'Neu',
        comment: String(problemSummary || `Support-Anfrage (${category})`).slice(0, 4000),
        url: String(context?.url || context?.route || '').slice(0, 500),
        userAgent: String(context?.userAgent || 'OrgaFlow Omni Live-Support').slice(0, 400),
        resolution: `${Number(context?.viewportWidth) || 1280}x${Number(context?.viewportHeight) || 800}`
    };

    const fullAnnotations = JSON.stringify({
        summary: problemSummary,
        category,
        priority,
        transcript: compactTranscript,
        antigravityPrompt,
        affectedModules,
        createdAt: new Date().toISOString()
    });
    const compactAnnotations = JSON.stringify({
        summary: String(problemSummary || '').slice(0, 400),
        category,
        priority,
        transcript: compactTranscript.slice(-4),
        antigravityPrompt: String(antigravityPrompt || '').slice(0, 2800),
        createdAt: new Date().toISOString()
    });

    let ticketRecord;
    try {
        ticketRecord = await pbAdmin.collection('support_tickets').create({
            ...basePayload,
            annotations_data: fullAnnotations,
            ...(user?.id ? { user: user.id } : {})
        });
    } catch {
        ticketRecord = await pbAdmin.collection('support_tickets').create({
            ...basePayload,
            annotations_data: compactAnnotations
        });
    }

    return {
        success: true,
        ticketId: ticketRecord.id,
        antigravityPrompt: isDevOrAdmin ? antigravityPrompt : '',
        summary: problemSummary
    };
}

