/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq");

  try {
    const field = collection.fields.getByName("billing_type");
    if (field && Array.isArray(field.values)) {
      if (!field.values.includes("45a")) {
        field.values = [...field.values, "45a"];
        app.save(collection);
      }
    }
  } catch (e) {
    console.error("Fehler beim Aktualisieren von billing_type:", e);
  }

  try {
    const ticket = app.findRecordById("pbc_2269083802", "b0eyrzeblxyxauf");
    if (ticket) {
      ticket.set("status", "Gelöst");
      app.save(ticket);
    }
  } catch (e) {
    console.error("Fehler beim Aktualisieren des Tickets:", e);
  }

  return null;
}, (app) => {
  const collection = app.findCollectionByNameOrId("oxbqk37n877m8bq");
  try {
    const field = collection.fields.getByName("billing_type");
    if (field && Array.isArray(field.values)) {
      field.values = field.values.filter(v => v !== "45a");
      app.save(collection);
    }
  } catch (e) {}
  return null;
});
