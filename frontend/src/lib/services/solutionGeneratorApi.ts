import { pb } from '$lib/services/pocketbase';

export async function requestSolutionConcept(params: {
    title: string;
    description: string;
    category: string;
    context: string;
}): Promise<string> {
    const isLocal = typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const microserviceUrl = isLocal ? `http://${window.location.hostname}:3000` : '';

    let response = await fetch(`${microserviceUrl}/api/emails/admin/generate-solution`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
        },
        body: JSON.stringify(params)
    });

    if (response.status === 404) {
        response = await fetch(`${microserviceUrl}/api/v1/generate-solution`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
            },
            body: JSON.stringify(params)
        });
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Fehler bei der automatisierten Generierung.');
    }

    return data.solutionConcept || '';
}
