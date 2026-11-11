/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Fix clients rules so expand: 'client' and orgaStore.clients work for all active roles
    try {
        const clientsCollection = app.findCollectionByNameOrId("clients");
        if (clientsCollection) {
            const clientRule = '@request.auth.id != "" && (' +
                '@request.auth.role = "superadmin" || ' +
                '@request.auth.role = "owner" || ' +
                '@request.auth.role = "admin" || ' +
                '@request.auth.role = "user" || ' +
                '@request.auth.role = "caregiver" || ' +
                'company.users.id ?= @request.auth.id || ' +
                'caregiver = @request.auth.id || ' +
                'id ?= @request.auth.assigned_clients.id || ' +
                '(facility != "" && facility = @request.auth.facility) || ' +
                '(@request.auth.role = "client" && id = @request.auth.client_profile_id)' +
            ')';

            clientsCollection.listRule = clientRule;
            clientsCollection.viewRule = clientRule;
            app.save(clientsCollection);
            console.log("Successfully updated clients listRule and viewRule.");
        }
    } catch (e) {
        console.warn("Could not update clients rules:", e);
    }

    // 2. Fix users rules so expand: 'user' works for all authenticated staff
    try {
        let usersCollection;
        try {
            usersCollection = app.findCollectionByNameOrId("users");
        } catch {
            usersCollection = app.findCollectionByNameOrId("_pb_users_auth_");
        }
        if (usersCollection) {
            const userViewRule = '@request.auth.id != "" && (' +
                '@request.auth.role = "superadmin" || ' +
                '@request.auth.role = "owner" || ' +
                '@request.auth.role = "admin" || ' +
                'id = @request.auth.id || ' +
                'company = @request.auth.company || ' +
                'company.users.id ?= @request.auth.id || ' +
                '(facility != "" && facility = @request.auth.facility)' +
            ')';

            usersCollection.listRule = userViewRule;
            usersCollection.viewRule = userViewRule;
            app.save(usersCollection);
            console.log("Successfully updated users listRule and viewRule.");
        }
    } catch (e) {
        console.warn("Could not update users rules:", e);
    }
}, (app) => {
    // Revert
});
