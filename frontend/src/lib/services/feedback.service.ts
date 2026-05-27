import { pb } from "$lib/services/pocketbase";

export interface FeedbackInput {
    client?: string;
    appointment?: string;
    submitted_by?: string;
    name_first?: string;
    name_last?: string;
    rating: number; // 1-10
    message?: string; // max 1000
    status?: "Neu" | "Gelesen" | "Archieviert";
    read_by?: string[];
    is_testimonial?: boolean;
}

export async function submitFeedback(payload: FeedbackInput) {
    // Setze Standard-Status für neue Feedbacks, falls nicht explizit übergeben
    const data = {
        ...payload,
        status: payload.status || "Neu",
    };
    
    return await pb.collection('feedbacks').create(data);
}