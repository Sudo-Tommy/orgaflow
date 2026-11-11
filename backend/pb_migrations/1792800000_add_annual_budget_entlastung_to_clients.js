/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8");

  let hasField = false;
  try {
    const existing = collection.fields.getByName("annual_budget_entlastung");
    if (existing) hasField = true;
  } catch (e) {
    hasField = false;
  }

  if (!hasField) {
    collection.fields.add(new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "num_client_annual_budget_entlastung",
      "max": null,
      "min": null,
      "name": "annual_budget_entlastung",
      "onlyInt": false,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }));
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("hu9womf4xnkbrk8");
  try {
    collection.fields.removeById("num_client_annual_budget_entlastung");
  } catch (e) {}
  return app.save(collection);
});
