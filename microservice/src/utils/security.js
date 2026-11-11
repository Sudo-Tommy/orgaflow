import crypto from 'crypto';

export function sanitizeHeaderValue(val) {
    if (typeof val !== 'string') return '';
    return val.replace(/[\r\n\0]/g, '').trim();
}

export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;
    return re.test(email.trim()) && email.length < 320;
}

export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export function generateFormToken() {
    const secret = process.env.FORM_TOKEN_SECRET || process.env.JWT_SECRET || 'MISSING_SECRET_PLEASE_SET';
    const timestamp = Date.now().toString();
    const hmac = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
    return `${timestamp}.${hmac}`;
}

export function verifyFormToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [timestamp, hmac] = parts;
    const secret = process.env.FORM_TOKEN_SECRET || process.env.JWT_SECRET || 'MISSING_SECRET_PLEASE_SET';
    const expectedHmac = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex').slice(0, 32), Buffer.from(expectedHmac, 'hex').slice(0, 32))) return null;
    const elapsed = (Date.now() - parseInt(timestamp, 10)) / 1000;
    if (isNaN(elapsed) || elapsed < 0) return null;
    return elapsed;
}
