import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);

async function main() {
    try {
        console.log(`Connecting to PocketBase at ${PB_URL}...`);
        await pb.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL,
            process.env.PB_ADMIN_PASSWORD
        );
        console.log("Authenticated as superuser.");

        const collections = await pb.collections.getFullList();
        const existingNames = new Set(collections.map(c => c.name));
        console.log("Existing collections:", Array.from(existingNames).join(', '));

        // 1. inquiries Collection
        if (!existingNames.has('inquiries')) {
            console.log("Creating 'inquiries' collection...");
            await pb.collections.create({
                name: 'inquiries',
                type: 'base',
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""',
                fields: [
                    { name: 'sender_name', type: 'text' },
                    { name: 'sender_email', type: 'text' },
                    { name: 'sender_phone', type: 'text' },
                    { name: 'sender_address', type: 'text' },
                    { name: 'raw_text', type: 'text', required: true },
                    { name: 'content_hash', type: 'text', index: true },
                    { name: 'ai_processed', type: 'bool' },
                    { name: 'ai_result_cache', type: 'json' },
                    { name: 'urgency', type: 'select', values: ['low', 'medium', 'high'] },
                    { name: 'summary', type: 'text' },
                    { name: 'draft_reply', type: 'text' },
                    { name: 'status', type: 'select', values: ['new', 'in_progress', 'converted', 'rejected'] },
                    { name: 'appointment_id', type: 'relation', collectionId: collections.find(c => c.name === 'appointments')?.id, maxSelect: 1 },
                    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
                    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
                ]
            });
            console.log("Collection 'inquiries' created successfully.");
        } else {
            console.log("Collection 'inquiries' already exists.");
        }

        // 2. marketing_assets Collection
        if (!existingNames.has('marketing_assets')) {
            console.log("Creating 'marketing_assets' collection...");
            await pb.collections.create({
                name: 'marketing_assets',
                type: 'base',
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""',
                fields: [
                    { name: 'format', type: 'select', values: ['flyer', 'poster', 'social_sheet', 'insert', 'factsheet', 'voucher'], required: true },
                    { name: 'title', type: 'text', required: true },
                    { name: 'content_json', type: 'json' },
                    { name: 'source_hash', type: 'text', index: true },
                    { name: 'pdf_file', type: 'file' }
                ]
            });
            console.log("Collection 'marketing_assets' created successfully.");
        } else {
            console.log("Collection 'marketing_assets' already exists.");
        }

        // 3. landing_page_content Collection
        if (!existingNames.has('landing_page_content')) {
            console.log("Creating 'landing_page_content' collection...");
            await pb.collections.create({
                name: 'landing_page_content',
                type: 'base',
                listRule: '',
                viewRule: '',
                createRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
                updateRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
                deleteRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin"',
                fields: [
                    { name: 'section_key', type: 'text', required: true, unique: true },
                    { name: 'content_json', type: 'json', required: true }
                ]
            });
            console.log("Collection 'landing_page_content' created successfully.");
        } else {
            console.log("Collection 'landing_page_content' already exists.");
        }

        // 4. Update 'invoices' collection for GoBD Stornorechnungen
        const invoicesColl = collections.find(c => c.name === 'invoices');
        if (invoicesColl) {
            const fieldNames = new Set(invoicesColl.fields.map(f => f.name));
            let needsUpdate = false;
            const updatedFields = [...invoicesColl.fields];

            if (!fieldNames.has('reference_invoice_id')) {
                updatedFields.push({
                    name: 'reference_invoice_id',
                    type: 'relation',
                    collectionId: invoicesColl.id,
                    maxSelect: 1
                });
                needsUpdate = true;
            }
            if (!fieldNames.has('is_cancellation')) {
                updatedFields.push({
                    name: 'is_cancellation',
                    type: 'bool'
                });
                needsUpdate = true;
            }
            if (!fieldNames.has('cancellation_reason')) {
                updatedFields.push({
                    name: 'cancellation_reason',
                    type: 'text'
                });
                needsUpdate = true;
            }
            if (!fieldNames.has('cancellation_nr')) {
                updatedFields.push({
                    name: 'cancellation_nr',
                    type: 'text'
                });
                needsUpdate = true;
            }

            if (needsUpdate) {
                console.log("Updating 'invoices' collection with Storno fields...");
                invoicesColl.fields = updatedFields;
                await pb.collections.update(invoicesColl.id, invoicesColl);
                console.log("'invoices' collection updated.");
            } else {
                console.log("'invoices' collection already has Storno fields.");
            }
        }

        // 5. Update 'clients' collection for Inheritor fields
        const clientsColl = collections.find(c => c.name === 'clients');
        if (clientsColl) {
            const fieldNames = new Set(clientsColl.fields.map(f => f.name));
            let needsUpdate = false;
            const updatedFields = [...clientsColl.fields];

            if (!fieldNames.has('inheritor')) {
                const contactsColl = collections.find(c => c.name === 'contacts');
                updatedFields.push({
                    name: 'inheritor',
                    type: 'relation',
                    collectionId: contactsColl?.id,
                    maxSelect: 10
                });
                needsUpdate = true;
            }
            if (!fieldNames.has('inheritor_info')) {
                updatedFields.push({
                    name: 'inheritor_info',
                    type: 'json'
                });
                needsUpdate = true;
            }

            if (needsUpdate) {
                console.log("Updating 'clients' collection with inheritor fields...");
                clientsColl.fields = updatedFields;
                await pb.collections.update(clientsColl.id, clientsColl);
                console.log("'clients' collection updated.");
            } else {
                console.log("'clients' collection already has inheritor fields.");
            }
        }

        // 6. system_prompts Collection
        if (!existingNames.has('system_prompts')) {
            console.log("Creating 'system_prompts' collection...");
            await pb.collections.create({
                name: 'system_prompts',
                type: 'base',
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""',
                fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'prompt_content', type: 'text', required: true, max: 500000 },
                    { name: 'feedback_count', type: 'number' },
                    { name: 'source_period_start', type: 'text' },
                    { name: 'source_period_end', type: 'text' },
                    { name: 'status', type: 'select', values: ['open', 'applied', 'archived'] },
                    { name: 'raw_summary', type: 'text', max: 100000 },
                    { name: 'metadata', type: 'json' },
                    { name: 'calendar_week', type: 'text' },
                    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
                    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
                ]
            });
            console.log("Collection 'system_prompts' created successfully.");
        } else {
            console.log("Collection 'system_prompts' already exists.");
            const spColl = collections.find(c => c.name === 'system_prompts');
            if (spColl) {
                const spFieldNames = new Set(spColl.fields.map(f => f.name));
                let spNeedsUpdate = false;
                const spUpdatedFields = [...spColl.fields];
                if (!spFieldNames.has('calendar_week')) {
                    spUpdatedFields.push({ name: 'calendar_week', type: 'text' });
                    spNeedsUpdate = true;
                }
                if (!spFieldNames.has('created')) {
                    spUpdatedFields.push({ name: 'created', type: 'autodate', onCreate: true, onUpdate: false });
                    spNeedsUpdate = true;
                }
                if (!spFieldNames.has('updated')) {
                    spUpdatedFields.push({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true });
                    spNeedsUpdate = true;
                }
                const hasKwIndex = (spColl.indexes || []).some(idx => idx.includes('idx_system_prompts_calendar_week'));
                const spUpdatedIndexes = spColl.indexes || [];
                if (!hasKwIndex) {
                    spUpdatedIndexes.push('CREATE UNIQUE INDEX idx_system_prompts_calendar_week ON system_prompts (calendar_week) WHERE calendar_week != \'\'');
                    spNeedsUpdate = true;
                }
                if (spNeedsUpdate) {
                    await pb.collections.update(spColl.id, { fields: spUpdatedFields, indexes: spUpdatedIndexes });
                    console.log("'system_prompts' updated with calendar_week, autodate fields, and unique index.");
                }
            }
        }

        // 7. live_chat Collection
        const chatColl = collections.find(c => c.name === 'live_chat');
        if (chatColl) {
            const chatFieldNames = new Set(chatColl.fields.map(f => f.name));
            let chatNeedsUpdate = false;
            const chatUpdatedFields = [...chatColl.fields];
            if (!chatFieldNames.has('status')) {
                chatUpdatedFields.push({
                    name: 'status',
                    type: 'select',
                    maxSelect: 1,
                    values: ['Neu', 'In Bearbeitung', 'Gelöst', 'Archiviert']
                });
                chatNeedsUpdate = true;
            }
            const expectedRule = "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'superadmin'";
            const ruleNeedsUpdate = chatColl.updateRule !== expectedRule;

            if (chatNeedsUpdate || ruleNeedsUpdate) {
                console.log("Updating 'live_chat' with status field and updateRule...");
                await pb.collections.update(chatColl.id, {
                    fields: chatUpdatedFields,
                    updateRule: expectedRule
                });
                console.log("'live_chat' collection updated successfully.");
            } else {
                console.log("'live_chat' already has status field and correct updateRule.");
            }
        }

        // 8. improvement_proposals Collection
        const propColl = collections.find(c => c.name === 'improvement_proposals' || c.name === 'proposals');
        if (propColl) {
            const propFieldNames = new Set(propColl.fields.map(f => f.name));
            let propNeedsUpdate = false;
            const propUpdatedFields = [...propColl.fields];
            if (!propFieldNames.has('solution_concept')) {
                propUpdatedFields.push({ name: 'solution_concept', type: 'text' });
                propNeedsUpdate = true;
            }
            if (!propFieldNames.has('expected_behavior')) {
                propUpdatedFields.push({ name: 'expected_behavior', type: 'text' });
                propNeedsUpdate = true;
            }
            if (!propFieldNames.has('ai_prompt')) {
                propUpdatedFields.push({ name: 'ai_prompt', type: 'text' });
                propNeedsUpdate = true;
            }
            if (!propFieldNames.has('team_briefing')) {
                propUpdatedFields.push({ name: 'team_briefing', type: 'text' });
                propNeedsUpdate = true;
            }
            if (propNeedsUpdate) {
                console.log(`Updating '${propColl.name}' fields (including expected_behavior)...`);
                await pb.collections.update(propColl.id, { fields: propUpdatedFields });
                console.log(`'${propColl.name}' collection updated successfully.`);
            } else {
                console.log(`'${propColl.name}' already has all required fields including expected_behavior.`);
            }
        } else if (!existingNames.has('improvement_proposals')) {
            console.log("Creating 'improvement_proposals' collection...");
            await pb.collections.create({
                name: 'improvement_proposals',
                type: 'base',
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""',
                fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'category', type: 'select', values: ['UI/UX & Design', 'Core Engine & API', 'Haushaltsbuch & Finanzen', 'Dokumente & Vorlagen', 'Termine & Außendienst', 'Sicherheit & Audit', 'Sonstiges'] },
                    { name: 'priority', type: 'select', values: ['low', 'medium', 'high', 'critical'] },
                    { name: 'status', type: 'select', values: ['idea', 'planned', 'in_progress', 'implemented'] },
                    { name: 'description', type: 'text', required: true },
                    { name: 'solution_concept', type: 'text' },
                    { name: 'expected_behavior', type: 'text' },
                    { name: 'ai_prompt', type: 'text' },
                    { name: 'team_briefing', type: 'text' },
                    { name: 'tags', type: 'text' },
                    { name: 'source_type', type: 'text' },
                    { name: 'source_id', type: 'text' },
                    { name: 'author_name', type: 'text' }
                ]
            });
            console.log("Collection 'improvement_proposals' created successfully.");
        }

        // support_feedbacks Collection
        if (!existingNames.has('support_feedbacks')) {
            console.log("Creating 'support_feedbacks' collection...");
            await pb.collections.create({
                name: 'support_feedbacks',
                type: 'base',
                listRule: '',
                viewRule: '',
                createRule: '',
                updateRule: '',
                deleteRule: '',
                fields: [
                    { name: 'sender', type: 'text', required: true },
                    { name: 'priority', type: 'select', values: ['low', 'medium', 'high'] },
                    { name: 'category', type: 'text' },
                    { name: 'status', type: 'select', values: ['neu', 'in_progress', 'resolved'] },
                    { name: 'subject', type: 'text' },
                    { name: 'message', type: 'text' }
                ]
            });
            console.log("Collection 'support_feedbacks' created successfully.");
        } else {
            console.log("Collection 'support_feedbacks' already exists.");
        }

        // Seed support_feedbacks if empty
        try {
            const existingFeedbacks = await pb.collection('support_feedbacks').getList(1, 1);
            if (existingFeedbacks.totalItems === 0) {
                console.log("Seeding sample support_feedbacks...");
                await pb.collection('support_feedbacks').create({
                    sender: 'Tommy Jenzsch',
                    priority: 'high',
                    category: 'Admin UI',
                    status: 'neu',
                    subject: 'Mobiles Master-Detail-Layout im Feedback-Bereich',
                    message: 'Auf Smartphones kollabiert die zweispaltige Desktop-Ansicht. Wir benötigen ein reaktives Master-Detail-Umschaltkonzept, damit Pflegedienstleitungen Support-Tickets unterwegs barrierefrei bearbeiten können.'
                });
                await pb.collection('support_feedbacks').create({
                    sender: 'Sabine Schmidt (PDL)',
                    priority: 'medium',
                    category: 'Tourenplanung',
                    status: 'in_progress',
                    subject: 'Routenoptimierung für Nachmittagstour',
                    message: 'Bei der Tourenübernahme werden manche Adressen im Außenbezirk nicht optimal gruppiert. Bitte prüfen, ob die Wegstreckenberechnung priorisiert werden kann.'
                });
                await pb.collection('support_feedbacks').create({
                    sender: 'Michael Weber (Außendienst)',
                    priority: 'low',
                    category: 'Dokumentation',
                    status: 'resolved',
                    subject: 'Schriftgröße im Leistungsnachweis',
                    message: 'Klienten haben angemerkt, dass die Unterschriftenzeile auf dem Tablet etwas größer dargestellt werden könnte. Wurde bereits optimiert.'
                });
                console.log("Sample support_feedbacks created successfully.");
            }
        } catch (seedErr) {
            console.warn("Could not check/seed support_feedbacks:", seedErr.message);
        }

        // 13. HRBAC Collections: facilities, caregiver_clients, reports & rules
        let facilitiesColl = collections.find(c => c.name === 'facilities');
        if (!facilitiesColl) {
            console.log("Creating 'facilities' collection...");
            facilitiesColl = await pb.collections.create({
                name: 'facilities',
                type: 'base',
                listRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && id = @request.auth.facility)',
                viewRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && id = @request.auth.facility)',
                createRule: '@request.auth.role = "owner"',
                updateRule: '@request.auth.role = "owner"',
                deleteRule: '@request.auth.role = "owner"',
                fields: [
                    { name: 'name', type: 'text', required: true },
                    { name: 'code', type: 'text' },
                    { name: 'address', type: 'text' },
                    { name: 'phone', type: 'text' },
                    { name: 'email', type: 'text' }
                ]
            });
            console.log("Collection 'facilities' created.");
        }

        const usersColl = collections.find(c => c.name === 'users');
        if (usersColl) {
            const uFields = new Set(usersColl.fields.map(f => f.name));
            let uNeedsUpdate = false;
            const updatedUFields = [...usersColl.fields];

            // Ensure role select values
            const roleField = updatedUFields.find(f => f.name === 'role');
            if (roleField) {
                const values = new Set(roleField.values || []);
                ['owner', 'admin', 'caregiver', 'user', 'client', 'guest', 'superadmin'].forEach(r => values.add(r));
                roleField.values = Array.from(values);
                uNeedsUpdate = true;
            }

            if (!uFields.has('facility')) {
                updatedUFields.push({
                    name: 'facility',
                    type: 'relation',
                    collectionId: facilitiesColl.id,
                    maxSelect: 1
                });
                uNeedsUpdate = true;
            }
            if (!uFields.has('assigned_clients')) {
                const clId = collections.find(c => c.name === 'clients')?.id;
                if (clId) {
                    updatedUFields.push({
                        name: 'assigned_clients',
                        type: 'relation',
                        collectionId: clId,
                        maxSelect: 100
                    });
                    uNeedsUpdate = true;
                }
            }
            if (!uFields.has('client_profile_id')) {
                updatedUFields.push({
                    name: 'client_profile_id',
                    type: 'text'
                });
                uNeedsUpdate = true;
            }

            usersColl.fields = updatedUFields;
            usersColl.listRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || id = @request.auth.id';
            usersColl.viewRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || id = @request.auth.id';
            usersColl.createRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility && role != "owner")';
            usersColl.updateRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility && role != "owner")';
            usersColl.deleteRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility && role != "owner")';
            await pb.collections.update(usersColl.id, usersColl);
            console.log("'users' collection updated with HRBAC rules and fields.");
        }

        if (clientsColl) {
            const clFields = new Set(clientsColl.fields.map(f => f.name));
            let clNeedsUpdate = false;
            const updatedClFields = [...clientsColl.fields];
            if (!clFields.has('facility')) {
                updatedClFields.push({
                    name: 'facility',
                    type: 'relation',
                    collectionId: facilitiesColl.id,
                    maxSelect: 1
                });
                clNeedsUpdate = true;
            }
            clientsColl.fields = updatedClFields;
            clientsColl.listRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || (@request.auth.role = "caregiver" && id ?= @request.auth.assigned_clients.id) || (@request.auth.role = "client" && id = @request.auth.client_profile_id)';
            clientsColl.viewRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || (@request.auth.role = "caregiver" && id ?= @request.auth.assigned_clients.id) || (@request.auth.role = "client" && id = @request.auth.client_profile_id)';
            clientsColl.createRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)';
            clientsColl.updateRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)';
            clientsColl.deleteRule = '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)';
            await pb.collections.update(clientsColl.id, clientsColl);
            console.log("'clients' collection updated with HRBAC rules.");
        }

        if (!collections.some(c => c.name === 'caregiver_clients')) {
            console.log("Creating 'caregiver_clients' collection...");
            await pb.collections.create({
                name: 'caregiver_clients',
                type: 'base',
                listRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
                viewRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
                createRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
                updateRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
                deleteRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
                fields: [
                    { name: 'caregiver', type: 'relation', collectionId: usersColl?.id, maxSelect: 1, required: true },
                    { name: 'client', type: 'relation', collectionId: clientsColl?.id, maxSelect: 1, required: true },
                    { name: 'facility', type: 'relation', collectionId: facilitiesColl?.id, maxSelect: 1 }
                ]
            });
            console.log("Collection 'caregiver_clients' created.");
        }

        if (!collections.some(c => c.name === 'reports')) {
            console.log("Creating 'reports' collection...");
            await pb.collections.create({
                name: 'reports',
                type: 'base',
                listRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || (@request.auth.role = "caregiver" && caregiver = @request.auth.id)',
                viewRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility) || (@request.auth.role = "caregiver" && caregiver = @request.auth.id)',
                createRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
                updateRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
                deleteRule: '@request.auth.role = "owner" || (@request.auth.role = "admin" && facility = @request.auth.facility)',
                fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'content', type: 'text' },
                    { name: 'caregiver', type: 'relation', collectionId: usersColl?.id, maxSelect: 1 },
                    { name: 'client', type: 'relation', collectionId: clientsColl?.id, maxSelect: 1 },
                    { name: 'facility', type: 'relation', collectionId: facilitiesColl?.id, maxSelect: 1 }
                ]
            });
            console.log("Collection 'reports' created.");
        }

        console.log("All collections verified successfully!");
    } catch (e) {
        console.error("Error ensuring collections:", e);
    }
}

main();
