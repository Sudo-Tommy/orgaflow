/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const existing = app.findCollectionByNameOrId("nursing_homes");
    if (existing) return;
  } catch (e) {}

  const collection = new Collection({
    name: "nursing_homes",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
    deleteRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        presentable: true
      },
      {
        name: "street",
        type: "text",
        required: false
      },
      {
        name: "zip",
        type: "text",
        required: false
      },
      {
        name: "city",
        type: "text",
        required: false
      },
      {
        name: "phone",
        type: "text",
        required: false
      },
      {
        name: "status",
        type: "select",
        values: ["preliminary", "verified"],
        required: false
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_nursing_homes_name_zip` ON `nursing_homes` (`name`, `zip`)"
    ]
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("nursing_homes");
    if (collection) return app.delete(collection);
  } catch (e) {}
  return null;
});
