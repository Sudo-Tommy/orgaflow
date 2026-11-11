/**
 * browserPool.js
 * Manages a reusable headless Chromium/Edge instance via puppeteer-core
 * for fast, pixel-perfect HTML-to-PDF rendering without coordinate math.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

let browserInstance = null;
let isLaunching = false;

function findSystemBrowser() {
    if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
        return process.env.CHROME_BIN;
    }
    const candidates = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium"
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

export async function getBrowser() {
    if (browserInstance && browserInstance.connected) {
        return browserInstance;
    }

    if (isLaunching) {
        // Wait briefly if another request is launching the browser
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 100));
            if (browserInstance && browserInstance.connected) return browserInstance;
        }
    }

    isLaunching = true;
    try {
        const executablePath = findSystemBrowser();
        if (!executablePath) {
            throw new Error("Kein Chromium/Chrome/Edge Browser gefunden. Bitte CHROME_BIN setzen.");
        }

        browserInstance = await puppeteer.launch({
            executablePath,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=medium',
                '--no-first-run',
                '--no-zygote'
            ]
        });

        browserInstance.on('disconnected', () => {
            browserInstance = null;
        });

        return browserInstance;
    } finally {
        isLaunching = false;
    }
}

export async function printHtmlToPdf(html, options = {}) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        const isLandscape = options.landscape ?? false;

        // Set HTML content and wait for fonts and assets
        await page.setContent(html, {
            waitUntil: 'load',
            timeout: 15000
        });

        // Ensure webfonts are fully painted
        await page.evaluateHandle('document.fonts.ready').catch(() => {});

        const defaultMargins = {
            top: '20mm',
            right: '20mm',
            bottom: options.footerTemplate ? '24mm' : '20mm',
            left: isLandscape ? '20mm' : '25mm'
        };

        const pdfOptions = {
            format: 'A4',
            landscape: isLandscape,
            printBackground: true,
            preferCSSPageSize: true,
            margin: options.margin || defaultMargins
        };

        if (options.footerTemplate) {
            pdfOptions.displayHeaderFooter = true;
            pdfOptions.headerTemplate = options.headerTemplate || '<div></div>';
            pdfOptions.footerTemplate = options.footerTemplate;
        }

        const pdfBuffer = await page.pdf(pdfOptions);

        return pdfBuffer;
    } finally {
        await page.close().catch(() => {});
    }
}
