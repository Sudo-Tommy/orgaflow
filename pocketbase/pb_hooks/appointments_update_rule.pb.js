// pb_hooks/appointments_update_rule.pb.js

/**
 * Stellt sicher, dass die appointments-Collection eine korrekte updateRule hat.
 * Beim Start von PocketBase wird geprüft ob die Regel fehlt und ggf. gesetzt.
 *
 * Hintergrund: Eine leere updateRule ("") bedeutet in PocketBase "nur Superuser".
 * Die korrekten Regeln spiegeln die list/viewRule wider: Betreuer, Zugewiesene
 * und Admins dürfen Termine (inkl. Sprachnotizen) bearbeiten.
 */

onBootstrap((e) => {
    e.next();

    try {
        const collection = $app.findCollectionByNameOrId("appointments");
        const expectedRule =
            '@request.auth.id != "" && (' +
            '@request.auth.role = "superadmin" || ' +
            '@request.auth.role = "owner" || ' +
            '@request.auth.role = "admin" || ' +
            'user = @request.auth.id || ' +
            'assigned_to = @request.auth.id || ' +
            'client.caregiver = @request.auth.id || ' +
            'client.id ?= @request.auth.assigned_clients.id' +
            ')';

        if (collection.updateRule !== expectedRule) {
            collection.updateRule = expectedRule;
            $app.save(collection);
            console.log("[Bootstrap] appointments updateRule wurde korrigiert.");
        }
    } catch (err) {
        console.error("[Bootstrap] Fehler beim Setzen der appointments updateRule:", err);
    }
});
