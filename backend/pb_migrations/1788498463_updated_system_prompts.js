/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4176908797")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_system_prompts_calendar_week ON system_prompts (calendar_week) WHERE calendar_week != ''"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4176908797")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
