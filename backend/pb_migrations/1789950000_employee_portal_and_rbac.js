/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Hole Referenzen auf bestehende Collections
    let usersCollection;
    try {
        usersCollection = app.findCollectionByNameOrId("users");
    } catch {
        usersCollection = app.findCollectionByNameOrId("_pb_users_auth_");
    }
    const usersCollId = usersCollection.id;

    const clientsCollection = app.findCollectionByNameOrId("clients");
    const clientsCollId = clientsCollection.id;

    const contactsCollection = app.findCollectionByNameOrId("contacts");
    const contactsCollId = contactsCollection.id;

    const appointmentsCollection = app.findCollectionByNameOrId("appointments");

    // 2. Erweitere 'users' Collection um Mitarbeiter-Felder & Rolle 'employee'
    if (usersCollection) {
        // Rollen-Optionen erweitern um 'employee'
        const roleField = usersCollection.fields.find(f => f.name === 'role');
        if (roleField) {
            const currentVals = new Set(roleField.values || []);
            ['owner', 'admin', 'caregiver', 'employee', 'user', 'client', 'guest', 'superadmin'].forEach(r => currentVals.add(r));
            roleField.values = Array.from(currentVals);
        }

        // Feld 'qualifications' (Text/Zertifikate)
        if (!usersCollection.fields.find(f => f.name === 'qualifications')) {
            usersCollection.fields.add(new Field({
                name: 'qualifications',
                type: 'text',
                required: false
            }));
        }

        // Feld 'emergency_contacts' (Notfallkontakte für Außendienst)
        if (!usersCollection.fields.find(f => f.name === 'emergency_contacts')) {
            usersCollection.fields.add(new Field({
                name: 'emergency_contacts',
                type: 'text',
                required: false
            }));
        }

        // Feld 'employment_type' (Anstellungsverhältnis)
        if (!usersCollection.fields.find(f => f.name === 'employment_type')) {
            usersCollection.fields.add(new Field({
                name: 'employment_type',
                type: 'select',
                values: ['Vollzeit', 'Teilzeit', 'Minijob', 'Freiberuflich', 'Praktikum', 'Werkstudent'],
                maxSelect: 1,
                required: false
            }));
        }

        // Feld 'status' (Mitarbeiterstatus)
        if (!usersCollection.fields.find(f => f.name === 'status')) {
            usersCollection.fields.add(new Field({
                name: 'status',
                type: 'select',
                values: ['Aktiv', 'Inaktiv', 'Urlaub', 'Krank'],
                maxSelect: 1,
                required: false
            }));
        }

        // Feld 'quick_access_token' (Kryptografisches Schnellzugangs-Token)
        if (!usersCollection.fields.find(f => f.name === 'quick_access_token')) {
            usersCollection.fields.add(new Field({
                name: 'quick_access_token',
                type: 'text',
                required: false
            }));
        }

        // Feld 'token_expires_at' (Ablaufdatum des Tokens)
        if (!usersCollection.fields.find(f => f.name === 'token_expires_at')) {
            usersCollection.fields.add(new Field({
                name: 'token_expires_at',
                type: 'date',
                required: false
            }));
        }

        // Feld 'assigned_contacts' (Relation zu Kontakten)
        if (!usersCollection.fields.find(f => f.name === 'assigned_contacts')) {
            usersCollection.fields.add(new Field({
                name: 'assigned_contacts',
                type: 'relation',
                collectionId: contactsCollId,
                maxSelect: 100,
                required: false
            }));
        }

        app.save(usersCollection);
        console.log("Successfully updated users collection with employee fields.");
    }

    // 3. Erweitere 'appointments' Collection um 'assigned_to'
    if (appointmentsCollection) {
        if (!appointmentsCollection.fields.find(f => f.name === 'assigned_to')) {
            appointmentsCollection.fields.add(new Field({
                name: 'assigned_to',
                type: 'relation',
                collectionId: usersCollId,
                maxSelect: 1,
                required: false
            }));
        }

        // Appointments list/view rule absichern, damit auch zugewiesene Termine eingesehen werden können
        appointmentsCollection.listRule = '@request.auth.id != "" && (' +
            '@request.auth.role = "superadmin" || ' +
            '@request.auth.role = "owner" || ' +
            '@request.auth.role = "admin" || ' +
            'user = @request.auth.id || ' +
            'assigned_to = @request.auth.id || ' +
            'client.caregiver = @request.auth.id || ' +
            'client.id ?= @request.auth.assigned_clients.id' +
        ')';
        appointmentsCollection.viewRule = appointmentsCollection.listRule;

        app.save(appointmentsCollection);
        console.log("Successfully updated appointments collection with assigned_to field and rules.");
    }

    // 4. Erweitere 'contacts' Collection um 'created_by' und 'assigned_employees' & strikte API Rules
    if (contactsCollection) {
        if (!contactsCollection.fields.find(f => f.name === 'created_by')) {
            contactsCollection.fields.add(new Field({
                name: 'created_by',
                type: 'relation',
                collectionId: usersCollId,
                maxSelect: 1,
                required: false
            }));
        }

        if (!contactsCollection.fields.find(f => f.name === 'assigned_employees')) {
            contactsCollection.fields.add(new Field({
                name: 'assigned_employees',
                type: 'relation',
                collectionId: usersCollId,
                maxSelect: 100,
                required: false
            }));
        }

        // API Rules für Kontakte:
        // Lesen: Authentifizierte Benutzer (Mitarbeiter/Admins)
        // Erstellen: Authentifizierte Benutzer
        // Bearbeiten / Löschen: Nur Superadmin, Owner, Admin ODER der Ersteller (created_by)
        contactsCollection.listRule = '@request.auth.id != ""';
        contactsCollection.viewRule = '@request.auth.id != ""';
        contactsCollection.createRule = '@request.auth.id != ""';
        contactsCollection.updateRule = '@request.auth.role = "superadmin" || @request.auth.role = "owner" || @request.auth.role = "admin" || (created_by != "" && created_by = @request.auth.id)';
        contactsCollection.deleteRule = '@request.auth.role = "superadmin" || @request.auth.role = "owner" || @request.auth.role = "admin" || (created_by != "" && created_by = @request.auth.id)';

        app.save(contactsCollection);
        console.log("Successfully updated contacts collection with created_by, assigned_employees and secure rules.");
    }

    // 5. Verknüpfungstabelle 'employee_clients'
    try {
        app.findCollectionByNameOrId("employee_clients");
    } catch {
        const employeeClients = new Collection({
            name: "employee_clients",
            type: "base",
            listRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin" || employee = @request.auth.id',
            viewRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin" || employee = @request.auth.id',
            createRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin"',
            updateRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin"',
            deleteRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin"',
            fields: [
                {
                    name: "employee",
                    type: "relation",
                    collectionId: usersCollId,
                    maxSelect: 1,
                    required: true
                },
                {
                    name: "client",
                    type: "relation",
                    collectionId: clientsCollId,
                    maxSelect: 1,
                    required: true
                },
                {
                    name: "notes",
                    type: "text",
                    required: false
                }
            ]
        });
        app.save(employeeClients);
        console.log("Successfully created employee_clients junction collection.");
    }

    // 6. Verknüpfungstabelle 'employee_contacts'
    try {
        app.findCollectionByNameOrId("employee_contacts");
    } catch {
        const employeeContacts = new Collection({
            name: "employee_contacts",
            type: "base",
            listRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin" || employee = @request.auth.id',
            viewRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin" || employee = @request.auth.id',
            createRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin"',
            updateRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin"',
            deleteRule: '@request.auth.role = "owner" || @request.auth.role = "superadmin" || @request.auth.role = "admin"',
            fields: [
                {
                    name: "employee",
                    type: "relation",
                    collectionId: usersCollId,
                    maxSelect: 1,
                    required: true
                },
                {
                    name: "contact",
                    type: "relation",
                    collectionId: contactsCollId,
                    maxSelect: 1,
                    required: true
                },
                {
                    name: "access_type",
                    type: "select",
                    values: ["read_only", "full"],
                    maxSelect: 1,
                    required: false
                }
            ]
        });
        app.save(employeeContacts);
        console.log("Successfully created employee_contacts junction collection.");
    }

    return null;
}, (app) => {
    return null;
});
