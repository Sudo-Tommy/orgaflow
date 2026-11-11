import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
export const WORKSPACE_ROOT = path.resolve(process.cwd(), '..');

interface CheckpointFile {
    originalContent: string | null;
    isNew: boolean;
}

interface Checkpoint {
    id: string;
    timestamp: string;
    files: Map<string, CheckpointFile>;
    appliedChanges: string[];
}

const checkpoints = new Map<string, Checkpoint>();

export function resolveSafePath(userPath: string): string {
    const raw = String(userPath || '').trim().replace(/^file:\/\/\/?/, '');
    const fullPath = path.isAbsolute(raw)
        ? path.normalize(raw)
        : path.resolve(WORKSPACE_ROOT, raw);
    
    if (!fullPath.toLowerCase().startsWith(WORKSPACE_ROOT.toLowerCase())) {
        throw new Error(`Zugriff verweigert: Pfad liegt außerhalb des Projekts (${fullPath})`);
    }
    return fullPath;
}

export function startCheckpoint(): string {
    const id = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    checkpoints.set(id, {
        id,
        timestamp: new Date().toISOString(),
        files: new Map<string, CheckpointFile>(),
        appliedChanges: []
    });
    return id;
}

export async function recordBeforeModify(checkpointId: string | null | undefined, fullPath: string): Promise<void> {
    if (!checkpointId || !checkpoints.has(checkpointId)) return;
    const cp = checkpoints.get(checkpointId)!;
    if (cp.files.has(fullPath)) return;

    try {
        const content = await fs.readFile(fullPath, 'utf-8');
        cp.files.set(fullPath, { originalContent: content, isNew: false });
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            cp.files.set(fullPath, { originalContent: null, isNew: true });
        }
    }
}

export async function rollbackCheckpoint(checkpointId: string) {
    const cp = checkpoints.get(checkpointId);
    if (!cp) throw new Error(`Checkpoint ${checkpointId} wurde nicht gefunden.`);

    const restored: Array<{ path: string; action: string }> = [];
    for (const [fullPath, meta] of cp.files.entries()) {
        if (meta.isNew) {
            try {
                await fs.unlink(fullPath);
                restored.push({ path: path.relative(WORKSPACE_ROOT, fullPath), action: 'deleted' });
            } catch (err) {
                console.warn('Rollback delete failed:', err);
            }
        } else if (meta.originalContent !== null) {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, meta.originalContent, 'utf-8');
            restored.push({ path: path.relative(WORKSPACE_ROOT, fullPath), action: 'restored' });
        }
    }
    return { success: true, checkpointId, restored };
}

export async function toolReadFile({ path: relPath, start_line, end_line }: { path: string; start_line?: number; end_line?: number }) {
    const fullPath = resolveSafePath(relPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const rel = path.relative(WORKSPACE_ROOT, fullPath);
    if (!start_line && !end_line) return { path: rel, content };
    const lines = content.split('\n');
    const s = Math.max(1, start_line || 1);
    const e = Math.min(lines.length, end_line || lines.length);
    const slice = lines.slice(s - 1, e).map((l, i) => `${s + i}: ${l}`).join('\n');
    return { path: rel, totalLines: lines.length, content: slice };
}

export async function toolReplaceInFile(
    { path: relPath, old_text, new_text }: { path: string; old_text: string; new_text: string },
    checkpointId?: string
) {
    const fullPath = resolveSafePath(relPath);
    const original = await fs.readFile(fullPath, 'utf-8');
    const norm = original.replace(/\r\n/g, '\n');
    const count = norm.split(old_text.replace(/\r\n/g, '\n')).length - 1;
    if (count === 0) throw new Error('old_text wurde nicht gefunden. Lies die Datei erneut und kopiere den Text exakt.');
    if (count > 1) throw new Error(`old_text kommt ${count}x vor. Gib mehr Umgebungstext an, damit er eindeutig ist.`);
    const updated = norm.replace(old_text.replace(/\r\n/g, '\n'), () => new_text);
    return toolWriteFile({ path: relPath, content: original.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated }, checkpointId);
}

export async function toolWriteFile({ path: relPath, content }: { path: string; content: string }, checkpointId?: string) {
    const fullPath = resolveSafePath(relPath);
    await recordBeforeModify(checkpointId, fullPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');

    if (checkpointId && checkpoints.has(checkpointId)) {
        checkpoints.get(checkpointId)!.appliedChanges.push(path.relative(WORKSPACE_ROOT, fullPath));
    }
    return { success: true, path: path.relative(WORKSPACE_ROOT, fullPath), bytes: Buffer.byteLength(content, 'utf-8') };
}

export async function toolListDir({ path: relPath = '.' }: { path?: string }) {
    const fullPath = resolveSafePath(relPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.relative(WORKSPACE_ROOT, path.join(fullPath, e.name))
    })).slice(0, 80);
}

export async function toolSearchCode({ query, path: relPath = '.' }: { query: string; path?: string }) {
    const fullPath = resolveSafePath(relPath);
    const results: Array<{ file: string; line: number; snippet: string }> = [];
    
    async function searchDir(dir: string) {
        if (results.length >= 25) return;
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
            const sub = path.join(dir, e.name);
            if (e.isDirectory()) {
                await searchDir(sub);
            } else if (/\.(svelte|ts|js|css|json)$/.test(e.name)) {
                try {
                    const text = await fs.readFile(sub, 'utf-8');
                    const lines = text.split('\n');
                    lines.forEach((line, idx) => {
                        if (line.toLowerCase().includes(query.toLowerCase()) && results.length < 25) {
                            results.push({
                                file: path.relative(WORKSPACE_ROOT, sub),
                                line: idx + 1,
                                snippet: line.trim()
                            });
                        }
                    });
                } catch {}
            }
        }
    }
    await searchDir(fullPath);
    return results;
}

export async function toolRunCommand({ command }: { command: string }) {
    const forbidden = ['rm -rf', 'format', 'mkfs', 'del /s /q c:', ':(){ :|:& };:'];
    if (forbidden.some(f => command.toLowerCase().includes(f))) {
        throw new Error(`Befehl aus Sicherheitsgründen blockiert: ${command}`);
    }
    try {
        const { stdout, stderr } = await execAsync(command, { cwd: WORKSPACE_ROOT, timeout: 60000 });
        return { stdout: stdout.slice(0, 3000), stderr: stderr.slice(0, 1000) };
    } catch (err: any) {
        return { error: err.message, stdout: err.stdout?.slice(0, 2000), stderr: err.stderr?.slice(0, 2000) };
    }
}

export async function openAntigravityChat({ prompt, file }: { prompt: string; file?: string }) {
    const binPath = 'C:\\Users\\tjenz\\AppData\\Local\\Programs\\Antigravity IDE\\bin\\antigravity-ide.cmd';
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
    let cmd = `"${binPath}" chat -r -m agent "${escapedPrompt}"`;
    if (file) {
        cmd += ` -a "${file.replace(/"/g, '\\"')}"`;
    }
    const { stdout, stderr } = await execAsync(cmd, { cwd: WORKSPACE_ROOT });
    return { success: true, stdout, stderr };
}
