/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. inquiries
    try {
        const existing = app.findCollectionByNameOrId("inquiries");
    } catch {
        const inquiries = new Collection({
            name: "inquiries",
            type: "base",
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: "",
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            fields: [
                { name: "sender_name", type: "text" },
                { name: "sender_email", type: "text" },
                { name: "sender_phone", type: "text" },
                { name: "sender_address", type: "text" },
                { name: "raw_text", type: "text", required: true },
                { name: "content_hash", type: "text" },
                { name: "ai_processed", type: "bool" },
                { name: "ai_result_cache", type: "json" },
                { name: "urgency", type: "select", values: ["low", "medium", "high"] },
                { name: "summary", type: "text" },
                { name: "draft_reply", type: "text" },
                { name: "status", type: "select", values: ["new", "in_progress", "converted", "rejected"] }
            ]
        });
        app.save(inquiries);
    }

    // 2. marketing_assets
    try {
        const existing = app.findCollectionByNameOrId("marketing_assets");
    } catch {
        const marketing = new Collection({
            name: "marketing_assets",
            type: "base",
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            fields: [
                { name: "format", type: "select", values: ["flyer", "poster", "social_sheet", "insert", "factsheet", "voucher"], required: true },
                { name: "title", type: "text", required: true },
                { name: "content_json", type: "json" },
                { name: "source_hash", type: "text" }
            ]
        });
        app.save(marketing);
    }

    // 3. landing_page_content
    try {
        const existing = app.findCollectionByNameOrId("landing_page_content");
    } catch {
        const cms = new Collection({
            name: "landing_page_content",
            type: "base",
            listRule: "",
            viewRule: "",
            createRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
            updateRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
            deleteRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
            fields: [
                { name: "section_key", type: "text", required: true },
                { name: "content_json", type: "json", required: true }
            ]
        });
        app.save(cms);
    }

    return null;
}, (app) => {
    return null;
});
