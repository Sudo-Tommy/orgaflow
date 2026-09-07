/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ij5c2dvndh6ol26",
    "created": "2026-04-26 19:41:23.234Z",
    "updated": "2026-04-26 19:41:23.234Z",
    "name": "work_activities",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "3ztrpi4h",
        "name": "title",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "4feqvvwr",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ij5c2dvndh6ol26");

  return dao.deleteCollection(collection);
})
