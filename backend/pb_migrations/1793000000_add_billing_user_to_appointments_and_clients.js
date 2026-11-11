/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("_pb_users_auth_");
  const appointmentsCollection = app.findCollectionByNameOrId("oxbqk37n877m8bq");
  const clientsCollection = app.findCollectionByNameOrId("hu9womf4xnkbrk8");

  // 1. Add billing_user to appointments
  let hasAppBillingUser = false;
  try {
    const existing = appointmentsCollection.fields.getByName("billing_user");
    if (existing) hasAppBillingUser = true;
  } catch (e) {
    hasAppBillingUser = false;
  }

  if (!hasAppBillingUser) {
    appointmentsCollection.fields.add(new Field({
      "cascadeDelete": false,
      "collectionId": usersCollection.id,
      "hidden": false,
      "id": "rel_app_billing_user",
      "maxSelect": 1,
      "minSelect": 0,
      "name": "billing_user",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    }));
    app.save(appointmentsCollection);
  }

  // 2. Add billing_user to clients
  let hasClientBillingUser = false;
  try {
    const existing = clientsCollection.fields.getByName("billing_user");
    if (existing) hasClientBillingUser = true;
  } catch (e) {
    hasClientBillingUser = false;
  }

  if (!hasClientBillingUser) {
    clientsCollection.fields.add(new Field({
      "cascadeDelete": false,
      "collectionId": usersCollection.id,
      "hidden": false,
      "id": "rel_client_billing_user",
      "maxSelect": 1,
      "minSelect": 0,
      "name": "billing_user",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    }));
    app.save(clientsCollection);
  }

  // 3. Initial data migration for open appointments (A10: Kasse -> Doreen, Privat -> Tommy)
  try {
    let doreenId = "";
    let tommyId = "";
    try {
      const users = app.findRecordsByFilter("users", "name_first != ''", "name_first", 100);
      for (const u of users) {
        const fn = (u.get("name_first") || "").toLowerCase();
        if (fn.includes("doreen")) doreenId = u.id;
        if (fn.includes("tommy")) tommyId = u.id;
      }
    } catch (e) {}

    const openApps = app.findRecordsByFilter("appointments", "settled = false", "", 500);
    for (const rec of openApps) {
      if (rec.get("billing_user")) continue;
      const bType = rec.get("billing_type") || "";
      if (bType === "Privat") {
        if (tommyId) rec.set("billing_user", tommyId);
        else if (rec.get("user")) rec.set("billing_user", rec.get("user"));
      } else if (["EL", "VHP", "Kombi", "45a"].includes(bType)) {
        if (doreenId) rec.set("billing_user", doreenId);
        else if (rec.get("user")) rec.set("billing_user", rec.get("user"));
      } else {
        if (doreenId) rec.set("billing_user", doreenId);
        else if (rec.get("user")) rec.set("billing_user", rec.get("user"));
      }
      try {
        app.save(rec);
      } catch (err) {}
    }
  } catch (err) {
    console.error("[Migration 1793000000] Error assigning initial billing_user:", err);
  }

  return null;
}, (app) => {
  const appointmentsCollection = app.findCollectionByNameOrId("oxbqk37n877m8bq");
  const clientsCollection = app.findCollectionByNameOrId("hu9womf4xnkbrk8");

  try { appointmentsCollection.fields.removeById("rel_app_billing_user"); app.save(appointmentsCollection); } catch(e) {}
  try { clientsCollection.fields.removeById("rel_client_billing_user"); app.save(clientsCollection); } catch(e) {}
  return null;
});
