/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Facilities Collection (Mandanten / Betriebsstätten)
    let facilitiesCollection;
    try {
        facilitiesCollection = app.findCollectionByNameOrId("facilities");
    } catch {
        facilitiesCollection = new Collection({
            name: "facilities",
            type: "base",
            listRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && id = @request.auth.facility)',
            viewRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && id = @request.auth.facility)',
            createRule: '@request.auth.role = "owner"',
            updateRule: '@request.auth.role = "owner"',
            deleteRule: '@request.auth.role = "owner"',
            fields: [
                { name: "name", type: "text", required: true },
                { name: "code", type: "text" },
                { name: "address", type: "text" },
                { name: "phone", type: "text" },
                { name: "email", type: "text" }
            ]
        });
        app.save(facilitiesCollection);
    }

    const facilityTargetId = facilitiesCollection.id;

    // 2. Kollektion 'users' mit HRBAC Feldern & Rules ausstatten
    let usersCollection;
    try {
        usersCollection = app.findCollectionByNameOrId("users");
    } catch {
        usersCollection = app.findCollectionByNameOrId("_pb_users_auth_");
    }

    if (usersCollection) {
        // Rollen-Optionen erweitern um owner, caregiver, client
        const roleField = usersCollection.fields.find(f => f.name === 'role');
        if (roleField) {
            const currentVals = new Set(roleField.values || []);
            ['owner', 'admin', 'caregiver', 'user', 'client', 'guest', 'superadmin'].forEach(r => currentVals.add(r));
            roleField.values = Array.from(currentVals);
        }

        // Feld 'facility' sicherstellen
        if (!usersCollection.fields.find(f => f.name === 'facility')) {
            usersCollection.fields.add(new Field({
                name: 'facility',
                type: 'relation',
                collectionId: facilityTargetId,
                maxSelect: 1,
                required: false
            }));
        }

        // Feld 'assigned_clients' sicherstellen
        let clientsCollectionId;
        try {
            clientsCollectionId = app.findCollectionByNameOrId("clients").id;
        } catch {
            clientsCollectionId = "hu9womf4xnkbrk8";
        }

        if (!usersCollection.fields.find(f => f.name === 'assigned_clients')) {
            usersCollection.fields.add(new Field({
                name: 'assigned_clients',
                type: 'relation',
                collectionId: clientsCollectionId,
                maxSelect: 100,
                required: false
            }));
        }

        // Feld 'client_profile_id' sicherstellen
        if (!usersCollection.fields.find(f => f.name === 'client_profile_id')) {
            usersCollection.fields.add(new Field({
                name: 'client_profile_id',
                type: 'text',
                required: false
            }));
        }

        // HRBAC Rules für 'users'
        usersCollection.listRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || id = @request.auth.id';
        usersCollection.viewRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || id = @request.auth.id';
        usersCollection.createRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility && role != "owner")';
        usersCollection.updateRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility && role != "owner")';
        usersCollection.deleteRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility && role != "owner")';

        app.save(usersCollection);
    }

    // 3. Kollektion 'clients' mit HRBAC Rules und Facility-Feld ausstatten
    try {
        const clientsCollection = app.findCollectionByNameOrId("clients");
        if (clientsCollection) {
            if (!clientsCollection.fields.find(f => f.name === 'facility')) {
                clientsCollection.fields.add(new Field({
                    name: 'facility',
                    type: 'relation',
                    collectionId: facilityTargetId,
                    maxSelect: 1,
                    required: false
                }));
            }

            clientsCollection.listRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || (@request.auth.role = "caregiver" && id ?= @request.auth.assigned_clients.id) || (@request.auth.role = "client" && id = @request.auth.client_profile_id)';
            clientsCollection.viewRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || (@request.auth.role = "caregiver" && id ?= @request.auth.assigned_clients.id) || (@request.auth.role = "client" && id = @request.auth.client_profile_id)';
            clientsCollection.createRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)';
            clientsCollection.updateRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)';
            clientsCollection.deleteRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)';

            app.save(clientsCollection);
        }
    } catch (e) {
        console.warn("Could not update clients rules in migration:", e);
    }

    // 4. Hilfsrelation 'caregiver_clients'
    try {
        app.findCollectionByNameOrId("caregiver_clients");
    } catch {
        const caregiverClients = new Collection({
            name: "caregiver_clients",
            type: "base",
            listRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
            viewRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
            createRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
            updateRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
            deleteRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
            fields: [
                {
                    name: "caregiver",
                    type: "relation",
                    collectionId: usersCollection ? usersCollection.id : "_pb_users_auth_",
                    maxSelect: 1,
                    required: true
                },
                {
                    name: "client",
                    type: "relation",
                    collectionId: app.findCollectionByNameOrId("clients").id,
                    maxSelect: 1,
                    required: true
                },
                {
                    name: "facility",
                    type: "relation",
                    collectionId: facilityTargetId,
                    maxSelect: 1,
                    required: false
                }
            ]
        });
        app.save(caregiverClients);
    }

    // 5. Kollektion 'reports' (Pflege- und Tätigkeitsberichte)
    try {
        app.findCollectionByNameOrId("reports");
    } catch {
        const reports = new Collection({
            name: "reports",
            type: "base",
            listRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || (@request.auth.role = "caregiver" && caregiver = @request.auth.id)',
            viewRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || (@request.auth.role = "caregiver" && caregiver = @request.auth.id)',
            createRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
            updateRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
            deleteRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
            fields: [
                { name: "title", type: "text", required: true },
                { name: "content", type: "text" },
                {
                    name: "caregiver",
                    type: "relation",
                    collectionId: usersCollection ? usersCollection.id : "_pb_users_auth_",
                    maxSelect: 1
                },
                {
                    name: "client",
                    type: "relation",
                    collectionId: app.findCollectionByNameOrId("clients").id,
                    maxSelect: 1
                },
                {
                    name: "facility",
                    type: "relation",
                    collectionId: facilityTargetId,
                    maxSelect: 1
                }
            ]
        });
        app.save(reports);
    }

    return null;
}, (app) => {
    return null;
});
