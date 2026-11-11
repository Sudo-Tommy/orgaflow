/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3098068891");
  const invoiceField = collection.fields.getByName("invoice");
  if (invoiceField) {
    invoiceField.cascadeDelete = true;
    invoiceField.required = false;
    invoiceField.minSelect = 0;
  }
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3098068891");
  const invoiceField = collection.fields.getByName("invoice");
  if (invoiceField) {
    invoiceField.cascadeDelete = false;
    invoiceField.required = true;
    invoiceField.minSelect = 1;
  }
  return app.save(collection);
});
