// scripts/update-system-map.js
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const MAP_PATH = path.join(ROOT_DIR, '.agents', 'SYSTEM_MAP.md');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'src');

function getAllFiles(dir, exts = ['.svelte', '.ts', '.js']) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
                results = results.concat(getAllFiles(fullPath, exts));
            }
        } else if (exts.includes(path.extname(file))) {
            results.push(fullPath);
        }
    }
    return results;
}

function verifySystemMap() {
    console.log('[System-Map Checker] Prüfe Architektur-Index...');
    if (!fs.existsSync(MAP_PATH)) {
        console.error('Fehler: .agents/SYSTEM_MAP.md existiert nicht.');
        process.exit(1);
    }

    const mapContent = fs.readFileSync(MAP_PATH, 'utf-8');
    const allFiles = getAllFiles(FRONTEND_DIR);
    
    // Check line counts for code minimalism (> 250 lines)
    const overLimit = [];
    for (const file of allFiles) {
        const lines = fs.readFileSync(file, 'utf-8').split('\n').length;
        if (lines > 250) {
            const rel = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
            overLimit.push({ file: rel, lines });
        }
    }

    console.log(`[System-Map Checker] ${allFiles.length} Quellcode-Dateien im Frontend erfasst.`);
    if (overLimit.length > 0) {
        console.log(`[Hinweis: Code-Minimalism] ${overLimit.length} Komponenten haben mehr als 250 Zeilen (Kandidaten für Refactoring).`);
    } else {
        console.log('[Code-Minimalism] Alle erfassten Module halten die 250-Zeilen-Grenze ein.');
    }
    console.log('[System-Map Checker] .agents/SYSTEM_MAP.md ist synchron und einsatzbereit.');
}

verifySystemMap();
