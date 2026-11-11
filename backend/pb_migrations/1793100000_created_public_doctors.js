/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Erstelle die öffentliche View public_doctors für Landingpage / Portal
  const publicDocs = new Collection({
    "id": "pbc_pub_doctors",
    "name": "public_doctors",
    "type": "view",
    "system": false,
    "listRule": "",
    "viewRule": "",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "viewQuery": `SELECT 
      contacts.id,
      contacts.salutation,
      contacts.company_name,
      contacts.name_first,
      contacts.name_last,
      contacts.street,
      contacts.housenr,
      contacts.zip,
      contacts.city,
      contacts.phone,
      contacts.email,
      contacts.notes
    FROM contacts
    WHERE (
      contacts.notes NOT LIKE '%"contact_type":"relative"%'
      AND contacts.notes NOT LIKE '%"contact_type":"caregiver"%'
      AND contacts.notes NOT LIKE '%Sohn%'
      AND contacts.notes NOT LIKE '%Tochter%'
      AND contacts.notes NOT LIKE '%Ehefrau%'
      AND contacts.notes NOT LIKE '%Neffe%'
      AND contacts.notes NOT LIKE '%Nichte%'
      AND contacts.notes NOT LIKE '%Erbe%'
    )`
  });
  app.save(publicDocs);

  // 2. Erlaube unauthentifizierten Gästen das Anlegen von Kontakten ohne Portal-PIN/Code (z.B. neue Praxis via Google)
  try {
    const contacts = app.findCollectionByNameOrId("contacts");
    if (contacts) {
      contacts.createRule = "@request.auth.id != '' || (portal_pin = '' && portal_code = '')";
      app.save(contacts);
    }
  } catch (err) {
    console.warn("Could not update contacts createRule:", err);
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("public_doctors");
    if (collection) {
      app.delete(collection);
    }
  } catch {}

  try {
    const contacts = app.findCollectionByNameOrId("contacts");
    if (contacts) {
      contacts.createRule = "@request.auth.id != ''";
      app.save(contacts);
    }
  } catch {}
});
