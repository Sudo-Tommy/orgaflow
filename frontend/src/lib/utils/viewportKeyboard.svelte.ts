/**
 * Reusable Svelte 5 Rune helper for tracking mobile keyboard height via visualViewport
 */
export function createKeyboardViewport() {
    let keyboardHeight = $state(0);

    $effect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const handleResize = () => {
            const vv = window.visualViewport;
            if (vv) {
                const diff = window.innerHeight - vv.height;
                keyboardHeight = diff > 60 ? diff : 0;
            }
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    });

    return {
        get keyboardHeight() {
            return keyboardHeight;
        }
    };
}
