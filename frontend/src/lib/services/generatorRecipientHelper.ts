export function getRecipientEmailFromService(service: any): string {
    let emails: string[] = [];
    if (service.recipientType === 'caregiver') emails.push(service.client?.expand?.caregiver?.email || "");
    else if (service.recipientType === 'client') emails.push(service.client?.expand?.caregiver?.email || service.client?.email || "");
    else if (service.recipientType === 'contact') {
        const contact = service.client?.expand?.contacts?.find((c: any) => c.id === service.recipientId);
        emails.push(contact?.email || "");
    }
    else if (service.recipientType === 'insurance') emails.push(service.client?.expand?.insurance?.email || "");
    else if (service.recipientType === 'home') {
        const home = service.client?.expand?.retirement_homes?.find((h: any) => h.id === service.recipientId);
        emails.push(home?.email || "");
    }
    else if (service.recipientType === 'inheritor') {
        const inheritors = Array.isArray(service.client?.expand?.inheritor) ? service.client.expand.inheritor : (service.client?.expand?.inheritor ? [service.client.expand.inheritor] : []);
        const inheritor = inheritors.find((i: any) => i.id === service.recipientId) || inheritors[0] || {};
        emails.push(inheritor?.email || "");
    }
    
    if ((service.recipientType === 'client' || service.recipientType === 'caregiver') && service.client?.mailing_list && Array.isArray(service.client.mailing_list)) {
        emails = [...emails, ...service.client.mailing_list];
    }
    
    return [...new Set(emails)].filter(Boolean).join(", ");
}

export function getInitialEmailSalutation(selectedContactRefs: any[], service: any): string {
    if (selectedContactRefs.length > 0) return selectedContactRefs[0].salutation;
    if (service?.client?.expand?.caregiver) {
        const cg = service.client.expand.caregiver;
        return cg.salutation === 'Herr' ? `Sehr geehrter Herr ${cg.name_last},` : `Sehr geehrte Frau ${cg.name_last},`;
    }
    if (service?.client) {
        return service.client.salutation === 'Herr' ? `Sehr geehrter Herr ${service.client.name_last},` : `Sehr geehrte Frau ${service.client.name_last},`;
    }
    return "Guten Tag,";
}

export function buildDefaultEmailMessage(selectedContactRefs: any[], service: any): string {
    if (selectedContactRefs.length === 0) return "";
    let newSalutation = selectedContactRefs.length === 1 ? selectedContactRefs[0].salutation : "Sehr geehrte Damen und Herren,";
    const isClientOnly = selectedContactRefs.every((c: any) => c.isClient);
    const clientName = service.client ? `${service.client.name_first} ${service.client.name_last}`.trim() : '';
    
    if (service.isInvoice) {
        const bodyText = isClientOnly 
            ? `anbei erhalten Sie Ihre Rechnung sowie ggf. zugehörige Arbeitszeitnachweise als PDF-Dokument.\n\nIhre Rechnungen und Dokumente können Sie ab sofort auch jederzeit sicher in unserem neuen Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`
            : `anbei erhalten Sie die Rechnung sowie ggf. zugehörige Arbeitszeitnachweise für ${clientName} als PDF-Dokument.\n\nDie Rechnungen und Dokumente können ab sofort auch jederzeit sicher im neuen Klienten-Portal eingesehen werden:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        return `${newSalutation}\n\n${bodyText}`;
    } else {
        const bodyText = isClientOnly 
            ? `anbei erhalten Sie die gewünschten Dokumente.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`
            : `anbei erhalten Sie die gewünschten Dokumente für ${clientName}.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        return `${newSalutation}\n\n${bodyText}`;
    }
}
