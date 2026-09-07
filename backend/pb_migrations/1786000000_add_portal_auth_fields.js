/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Clients Collection
  try {
    const clients = app.findCollectionByNameOrId("hu9womf4xnkbrk8");
    if (clients) {
      if (!clients.fields.getByName("portal_pin")) {
        clients.fields.addAt(clients.fields.length, new Field({
          "help": "Persönliche PIN für das Klientenportal",
          "hidden": false,
          "id": "text_client_pin",
          "max": 50,
          "min": 0,
          "name": "portal_pin",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }));
      }
      if (!clients.fields.getByName("portal_code")) {
        clients.fields.addAt(clients.fields.length, new Field({
          "help": "Dauerhafter Direktzugangs-Schlüssel für QR-Code-Login",
          "hidden": false,
          "id": "text_client_code",
          "max": 100,
          "min": 0,
          "name": "portal_code",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }));
      }
      app.save(clients);
    }
  } catch (e) {
    console.log("Migration clients portal fields skipped or error:", e);
  }

  // Contacts Collection
  try {
    const contacts = app.findCollectionByNameOrId("pbc_1930317162");
    if (contacts) {
      if (!contacts.fields.getByName("portal_pin")) {
        contacts.fields.addAt(contacts.fields.length, new Field({
          "help": "Persönliche PIN für das Klientenportal",
          "hidden": false,
          "id": "text_contact_pin",
          "max": 50,
          "min": 0,
          "name": "portal_pin",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }));
      }
      if (!contacts.fields.getByName("portal_code")) {
        contacts.fields.addAt(contacts.fields.length, new Field({
          "help": "Dauerhafter Direktzugangs-Schlüssel für QR-Code-Login",
          "hidden": false,
          "id": "text_contact_code",
          "max": 100,
          "min": 0,
          "name": "portal_code",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        }));
      }
      app.save(contacts);
    }
  } catch (e) {
    console.log("Migration contacts portal fields skipped or error:", e);
  }
}, (app) => {
  try {
    const clients = app.findCollectionByNameOrId("hu9womf4xnkbrk8");
    if (clients) {
      clients.fields.removeById("text_client_pin");
      clients.fields.removeById("text_client_code");
      app.save(clients);
    }
  } catch (e) {}

  try {
    const contacts = app.findCollectionByNameOrId("pbc_1930317162");
    if (contacts) {
      contacts.fields.removeById("text_contact_pin");
      contacts.fields.removeById("text_contact_code");
      app.save(contacts);
    }
  } catch (e) {}
});
