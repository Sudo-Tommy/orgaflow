export async function load(url, context, nextLoad) {
    if (url.endsWith('.svelte')) {
        return {
            format: 'module',
            shortCircuit: true,
            source: 'export default function MockSvelteComponent() {};'
        };
    }
    return nextLoad(url, context);
}
