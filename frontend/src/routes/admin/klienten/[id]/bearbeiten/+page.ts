import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
    return {
        id: params.id,
        client: {
            vorname: '',
            nachname: '',
            email: '',
            phone: '',
            street: '',
            housenr: '',
            zip: '',
            city: '',
            level_of_care: '',
            notes: ''
        }
    };
};
