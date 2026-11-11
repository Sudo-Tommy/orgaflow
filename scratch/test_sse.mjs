import http from 'http';
const start = Date.now();
const req = http.get('http://127.0.0.1:8090/api/realtime', (res) => {
    console.log('Connected at 0s');
    res.on('data', chunk => {
        const sec = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`[${sec}s] Received chunk (${chunk.length} bytes): ${JSON.stringify(chunk.toString())}`);
    });
    res.on('end', () => console.log('Response ended'));
    res.on('close', () => console.log('Response closed'));
});
setTimeout(() => {
    console.log('35s reached, destroying test request');
    req.destroy();
}, 35000);

