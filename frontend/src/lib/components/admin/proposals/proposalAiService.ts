import { pb } from '$lib/services/pocketbase';

export async function generateAiSolution(title: string, description: string, category: string): Promise<string> {
    const isLocal = typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const microserviceUrl = isLocal ? `http://${window.location.hostname}:3000` : '';

    let res = await fetch(`${microserviceUrl}/api/emails/admin/generate-solution`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
        },
        body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            category
        })
    });

    if (res.status === 404) {
        res = await fetch(`${microserviceUrl}/api/v1/generate-solution`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
            },
            body: JSON.stringify({
                title: title.trim(),
                description: description.trim(),
                category
            })
        });
    }

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'KI-Service antwortete mit Fehlercode ' + res.status);
    }

    const data = await res.json();
    if (data && data.solution) {
        return data.solution;
    }
    throw new Error('Keine verwertbare Antwort von der KI erhalten.');
}
