const rateLimitStore = new Map();

export function createRateLimiter(maxRequests = 5, windowMs = 60_000, silentDrop = false) {
    return (req, res, next) => {
        const cfIp = req.headers['cf-connecting-ip'];
        const fwdRaw = req.headers['x-forwarded-for'];
        const fwdIp = fwdRaw ? String(fwdRaw).split(',')[0].trim() : null;
        const ip = cfIp || fwdIp || req.socket?.remoteAddress || req.ip || 'unknown';

        const key = `${ip}:${req.path}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        const timestamps = (rateLimitStore.get(key) || []).filter(t => t > windowStart);
        timestamps.push(now);
        rateLimitStore.set(key, timestamps);

        if (Math.random() < 0.002) {
            for (const [k, v] of rateLimitStore.entries()) {
                if (v.every(t => t < windowStart)) rateLimitStore.delete(k);
            }
        }

        if (timestamps.length > maxRequests) {
            console.warn(`[RATE LIMIT] IP ${ip} überschritt Limit auf ${req.path} (${timestamps.length}/${maxRequests} in ${windowMs/1000}s)`);
            if (silentDrop) {
                return res.json({ success: true, queued: true });
            }
            return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' });
        }
        next();
    };
}
