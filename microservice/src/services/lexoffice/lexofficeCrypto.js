import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getMasterKey() {
    const rawSecret =
        process.env.LEXOFFICE_MASTER_KEY ||
        process.env.FORM_TOKEN_SECRET ||
        process.env.JWT_SECRET ||
        process.env.PB_ADMIN_PASSWORD ||
        'ORGAFLOW_LEXOFFICE_DEFAULT_FALLBACK_KEY_2026';
    return crypto.scryptSync(rawSecret, 'orgaflow_lexoffice_salt_v1', 32);
}

export function encryptApiKey(plainApiKey) {
    if (!plainApiKey || typeof plainApiKey !== 'string') {
        throw new Error('Ungültiger LexOffice API-Schlüssel.');
    }
    const cleanKey = plainApiKey.trim();
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(cleanKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
        encrypted_api_key: encrypted,
        iv: iv.toString('hex'),
        auth_tag: authTag,
        key_hint: maskApiKey(cleanKey)
    };
}

export function decryptApiKey(configRecord) {
    if (!configRecord?.encrypted_api_key || !configRecord?.iv || !configRecord?.auth_tag) {
        throw new Error('Keine gültigen verschlüsselten Zugangsdaten vorhanden.');
    }
    const key = getMasterKey();
    const iv = Buffer.from(configRecord.iv, 'hex');
    const authTag = Buffer.from(configRecord.auth_tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(configRecord.encrypted_api_key, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted.trim();
}

export function maskApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 8) return '****';
    const trimmed = apiKey.trim();
    return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export function generateWebhookSecret() {
    return crypto.randomBytes(24).toString('hex');
}

export function verifyWebhookToken(providedToken, expectedSecret) {
    if (!providedToken || !expectedSecret) return false;
    try {
        const bufA = Buffer.from(String(providedToken));
        const bufB = Buffer.from(String(expectedSecret));
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
}

