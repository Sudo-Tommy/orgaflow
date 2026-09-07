/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const existing = app.findCollectionByNameOrId("improvement_proposals");
    if (existing) return;
  } catch (e) {}

  const collection = new Collection({
    name: "improvement_proposals",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
    deleteRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
    fields: [
      {
        name: "title",
        type: "text",
        required: true,
        presentable: true
      },
      {
        name: "category",
        type: "select",
        values: [
          "UI/UX & Design",
          "Core Engine & API",
          "Haushaltsbuch & Finanzen",
          "Dokumente & Vorlagen",
          "Termine & Außendienst",
          "Sicherheit & Audit",
          "Sonstiges"
        ],
        required: false
      },
      {
        name: "priority",
        type: "select",
        values: ["low", "medium", "high", "critical"],
        required: false
      },
      {
        name: "status",
        type: "select",
        values: ["idea", "planned", "in_progress", "implemented"],
        required: false
      },
      {
        name: "description",
        type: "text",
        required: true
      },
      {
        name: "solution_concept",
        type: "text",
        required: false
      },
      {
        name: "ai_prompt",
        type: "text",
        required: false
      },
      {
        name: "team_briefing",
        type: "text",
        required: false
      },
      {
        name: "draft_reply",
        type: "text",
        required: false
      },
      {
        name: "tags",
        type: "text",
        required: false
      },
      {
        name: "source_type",
        type: "text",
        required: false
      },
      {
        name: "source_id",
        type: "text",
        required: false
      },
      {
        name: "author_name",
        type: "text",
        required: false
      }
    ]
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("improvement_proposals");
    if (collection) return app.delete(collection);
  } catch (e) {}
  return null;
});
