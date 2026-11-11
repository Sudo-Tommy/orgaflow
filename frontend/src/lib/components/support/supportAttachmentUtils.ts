// src/lib/components/support/supportAttachmentUtils.ts
import { toastStore } from '$lib/services/toastService.svelte';
import { triggerHaptic } from '$lib/services/hapticFeedback';
import type { ChatAttachment } from '$lib/services/aiLiveSupportService';

export async function processFileAttachments(
    fileList: FileList | File[],
    currentCount: number,
    maxCount = 3
): Promise<ChatAttachment[]> {
    const files = Array.from(fileList);
    if (currentCount + files.length > maxCount) {
        toastStore.warning(`Maximal ${maxCount} Anhänge pro Nachricht erlaubt.`);
    }
    const remainingSlots = maxCount - currentCount;
    const toAdd = files.slice(0, Math.max(0, remainingSlots));
    const created: ChatAttachment[] = [];

    for (const file of toAdd) {
        if (file.size > 25 * 1024 * 1024) {
            toastStore.warning(`"${file.name}" ist zu groß (max. 25 MB).`);
            continue;
        }
        const isImg = file.type.startsWith('image/');
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string) || '');
            reader.readAsDataURL(file);
        });

        let textContent: string | undefined;
        if (!isImg && (file.type.includes('text') || file.name.match(/\.(txt|csv|json|md|js|ts|html|css)$/i))) {
            try { textContent = await file.text(); } catch {}
        }

        created.push({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            base64,
            previewUrl: isImg ? base64 : undefined,
            textContent
        });
        triggerHaptic('tap');
    }

    return created;
}
