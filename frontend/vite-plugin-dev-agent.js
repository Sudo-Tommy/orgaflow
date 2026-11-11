import { runDevAgentChat } from './src/lib/server/devAgentRunner.ts';
import { rollbackCheckpoint, openAntigravityChat } from './src/lib/server/devAgentTools.ts';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

export function devAgentPlugin() {
    return {
        name: 'vite-plugin-dev-agent',
        apply: 'serve', // Nur im DEV-Server aktiv (npm run dev)
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = new URL(req.url, `http://${req.headers.host}`);

                if (req.method === 'POST' && url.pathname === '/api/dev/agent/chat') {
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    });

                    try {
                        const body = await parseJsonBody(req);
                        await runDevAgentChat({
                            ...body,
                            onEvent(event, data) {
                                res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
                            }
                        });
                    } catch (err) {
                        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
                    } finally {
                        res.end();
                    }
                    return;
                }

                if (req.method === 'POST' && url.pathname === '/api/dev/agent/rollback') {
                    res.setHeader('Content-Type', 'application/json');
                    try {
                        const { checkpointId } = await parseJsonBody(req);
                        const result = await rollbackCheckpoint(checkpointId);

                        // Aktualisiere Status in PocketBase
                        try {
                            const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');
                            await pb.collection('_superusers').authWithPassword(
                                process.env.PB_ADMIN_EMAIL,
                                process.env.PB_ADMIN_PASSWORD
                            );
                            const record = await pb.collection('dev_prompts').getFirstListItem(`checkpoint_id="${checkpointId}"`);
                            if (record) {
                                await pb.collection('dev_prompts').update(record.id, { status: 'rolled_back' });
                            }
                        } catch {}

                        res.end(JSON.stringify(result));
                    } catch (err) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: err.message }));
                    }
                    return;
                }

                if (req.method === 'GET' && url.pathname === '/api/dev/agent/history') {
                    res.setHeader('Content-Type', 'application/json');
                    try {
                        const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');
                        await pb.collection('_superusers').authWithPassword(
                            process.env.PB_ADMIN_EMAIL,
                            process.env.PB_ADMIN_PASSWORD
                        );
                        const records = await pb.collection('dev_prompts').getList(1, 20, {
                            sort: '-created'
                        });
                        res.end(JSON.stringify(records.items));
                    } catch (err) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err.message }));
                    }
                    return;
                }

                if (req.method === 'POST' && url.pathname === '/api/dev/agent/ide') {
                    res.setHeader('Content-Type', 'application/json');
                    try {
                        const { prompt, file, route } = await parseJsonBody(req);
                        const result = await openAntigravityChat({ prompt, file });
                        try {
                            const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');
                            await pb.collection('_superusers').authWithPassword(
                                process.env.PB_ADMIN_EMAIL,
                                process.env.PB_ADMIN_PASSWORD
                            );
                            await pb.collection('dev_prompts').create({
                                prompt,
                                response: 'An Antigravity IDE übergeben.',
                                route: route || '/',
                                active_component: file || '',
                                status: 'success'
                            });
                        } catch {}
                        res.end(JSON.stringify(result));
                    } catch (err) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err.message }));
                    }
                    return;
                }

                next();
            });
        }
    };
}
