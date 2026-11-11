/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("retirement_homes");

  const fieldsToAdd = [
    { name: "source", type: "text" },
    { name: "is_verified", type: "bool" },
    { name: "street", type: "text" },
    { name: "zip", type: "text" },
    { name: "city", type: "text" }
  ];

  for (const f of fieldsToAdd) {
    let exists = false;
    try {
      if (collection.fields.getByName(f.name)) exists = true;
    } catch (e) {
      exists = false;
    }
    if (!exists) {
      collection.fields.add(new Field({
        hidden: false,
        name: f.name,
        presentable: false,
        required: false,
        system: false,
        type: f.type
      }));
    }
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("retirement_homes");
  const fieldNames = ["source", "is_verified", "street", "zip", "city"];
  for (const name of fieldNames) {
    try {
      collection.fields.removeById(collection.fields.getByName(name).id);
    } catch (e) {}
  }
  return app.save(collection);
});
