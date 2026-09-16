/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        let usersCollection;
        try {
            usersCollection = app.findCollectionByNameOrId("users");
        } catch {
            usersCollection = app.findCollectionByNameOrId("_pb_users_auth_");
        }

        if (usersCollection) {
            // Erlaube Authentifizierung für alle aktiven Benutzer (nicht inaktiv geschaltet)
            // oder verifizierte Konten
            usersCollection.authRule = 'status != "Inaktiv"';

            // Erlaube Anlage und Bearbeitung von Accounts durch Administratoren und Superadmins
            usersCollection.createRule = '@request.auth.role = "superadmin" || @request.auth.role = "owner" || @request.auth.role = "admin"';
            usersCollection.updateRule = '@request.auth.role = "superadmin" || @request.auth.role = "owner" || @request.auth.role = "admin" || id = @request.auth.id';

            app.save(usersCollection);
            console.log("Successfully updated users authRule, createRule and updateRule.");
        }
    } catch (e) {
        console.warn("Could not update users collection rules:", e);
    }
}, (app) => {
    // Revert
});
