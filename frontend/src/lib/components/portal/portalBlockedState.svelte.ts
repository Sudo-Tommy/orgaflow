class PortalBlockedStateManager {
    isBlocked = $state(false);
    blockedReason = $state("Ihr Portal-Zugang ist derzeit noch nicht freigeschaltet. Bitte wenden Sie sich an Ihre persönliche Seniorenassistenz.");

    show(reason?: string) {
        if (reason) this.blockedReason = reason;
        this.isBlocked = true;
    }

    reset() {
        this.isBlocked = false;
        this.blockedReason = "Ihr Portal-Zugang ist derzeit noch nicht freigeschaltet. Bitte wenden Sie sich an Ihre persönliche Seniorenassistenz.";
    }
}

export const portalBlockedState = new PortalBlockedStateManager();
