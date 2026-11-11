import { Type } from '@google/genai';

export function getSchemaForFormat(format: string) {
    if (format === 'poster' || format === 'flyer') {
        return {
            type: Type.OBJECT,
            properties: {
                headline: { type: Type.STRING },
                subheadline: { type: Type.STRING },
                bulletpoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                highlight_box: { type: Type.STRING },
                cta: { type: Type.STRING },
                contacts: { type: Type.STRING }
            },
            required: ['headline', 'subheadline', 'bulletpoints', 'highlight_box', 'cta', 'contacts']
        };
    }

    if (format === 'social_sheet') {
        return {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    platform: { type: Type.STRING },
                    hook: { type: Type.STRING },
                    text: { type: Type.STRING },
                    cta: { type: Type.STRING },
                    hashtags: { type: Type.STRING }
                },
                required: ['platform', 'hook', 'text', 'cta', 'hashtags']
            }
        };
    }

    if (format === 'insert') {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                benefits: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                footer: { type: Type.STRING }
            },
            required: ['title', 'subtitle', 'benefits', 'footer']
        };
    }

    if (format === 'factsheet') {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                section1_title: { type: Type.STRING },
                section1_text: { type: Type.STRING },
                section2_title: { type: Type.STRING },
                section2_items: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                section3_title: { type: Type.STRING },
                section3_text: { type: Type.STRING }
            },
            required: ['title', 'section1_title', 'section1_text', 'section2_title', 'section2_items', 'section3_title', 'section3_text']
        };
    }

    if (format === 'voucher') {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                value: { type: Type.STRING },
                description: { type: Type.STRING },
                code: { type: Type.STRING },
                validity: { type: Type.STRING }
            },
            required: ['title', 'value', 'description', 'code', 'validity']
        };
    }

    // Default object fallback
    return {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            body: { type: Type.STRING },
            cta: { type: Type.STRING }
        },
        required: ['title', 'body', 'cta']
    };
}
