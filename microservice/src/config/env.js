import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Beide .env Dateien laden (lokale und root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

export const ALLOWED_ORIGINS = [
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    'https://www.ihre-seniorenassistenz.com',
    'https://ihre-seniorenassistenz.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];

export const LARGE_BODY_ROUTES = [
    '/api/emails/generate-pdf', '/api/generate-pdf', '/generate-pdf',
    '/api/emails/portal/documents/upload', '/portal/documents/upload',
    '/api/emails/ai/transcribe',
    '/api/emails/ai/receipt',
    '/api/emails/send',
    '/api/send',
    '/api/ai/live-support/chat',
    '/api/emails/ai/live-support/chat',
    '/api/ai/live-support/finalize',
    '/api/emails/ai/live-support/finalize',
    '/api/emails/onboarding/submit',
    '/api/onboarding/submit',
    '/onboarding/submit'
];
