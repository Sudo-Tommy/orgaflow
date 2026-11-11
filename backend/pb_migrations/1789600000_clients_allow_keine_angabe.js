/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("clients");
        if (!collection) return;
        
        const maritalField = collection.fields.getByName("marital_status");
        if (maritalField && maritalField.values) {
            if (!maritalField.values.includes("Keine Angabe")) {
                maritalField.values.push("Keine Angabe");
                app.save(collection);
            }
        }
    } catch (e) {
        console.warn("Migration clients allow 'Keine Angabe' skipped or failed:", e);
    }
}, (app) => {
    // revert is not strictly needed
});
