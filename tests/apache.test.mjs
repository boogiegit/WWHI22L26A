// Native Apache route tests use synthetic files only; no PHP or production data is served.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const apache = process.env.APACHE_TEST_BINARY || '/usr/sbin/httpd';
if (!fs.existsSync(apache)) { console.log('SKIP: native Apache unavailable.'); process.exit(0); }
const temp = fs.mkdtempSync(path.join(root, 'tests/.runtime/apache-'));
const site = path.join(temp, 'site');
fs.mkdirSync(site);
const fixtures = ['data/storage.db', 'server/config.local.php', '.private/secret.json', 'tests/private.txt',
  'menu-choices.json', 'seating-plans/synthetic.pdf', 'venice-passes/index.json',
  'colosseum-tickets/index.json', 'pantheon-tickets/tickets/synthetic.pdf', 'uploads/photos/synthetic.jpg'];
for (const file of fixtures) {
  fs.mkdirSync(path.dirname(path.join(site, file)), { recursive: true });
  fs.writeFileSync(path.join(site, file), 'PRIVATE_SYNTHETIC_SENTINEL');
}
fs.copyFileSync(path.join(root, '.htaccess'), path.join(site, '.htaccess'));
fs.copyFileSync(path.join(root, 'data/.htaccess'), path.join(site, 'data/.htaccess'));
fs.writeFileSync(path.join(site, 'api.php'), 'AUTHORIZED_HANDLER_SENTINEL');
fs.writeFileSync(path.join(site, 'index.html'), 'PUBLIC_SHELL');
fs.writeFileSync(path.join(site, 'pantheon-tickets/index.html'), 'PUBLIC_VIEWER');
const probe = net.createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const config = path.join(temp, 'httpd.conf');
const modules = ['mpm_prefork', 'unixd', 'authz_core', 'authz_host', 'access_compat', 'rewrite', 'headers', 'dir', 'mime'];
fs.writeFileSync(config, `ServerRoot "${temp}"
ServerName localhost
KeepAlive Off
Timeout 5
Listen 127.0.0.1:${port}
PidFile "${temp}/httpd.pid"
ErrorLog "${temp}/error.log"
${modules.map(name => `LoadModule ${name}_module /usr/libexec/apache2/mod_${name}.so`).join('\n')}
User #${process.getuid()}
Group #${process.getgid()}
TypesConfig /etc/apache2/mime.types
DocumentRoot "${site}"
<Directory />
AllowOverride None
Require all denied
</Directory>
<Directory "${site}">
AllowOverride All
Require all granted
</Directory>
`);
const server = spawn(apache, ['-X', '-f', config], { stdio: ['ignore', 'pipe', 'pipe'] });
let diagnostics = '';
server.stderr.on('data', chunk => diagnostics += chunk.toString());
const origin = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let n = 0; n < 80; n++) {
    if (server.exitCode !== null) throw new Error('Apache startup failed: ' + diagnostics);
    try { await (await fetch(origin, { signal: AbortSignal.timeout(2000) })).text(); ready = true; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ok(ready, 'Apache starts on loopback');
  for (const file of fixtures) {
    const response = await fetch(`${origin}/${file}`, { signal: AbortSignal.timeout(5000) });
    const body = await response.text();
    assert.ok(!body.includes('PRIVATE_SYNTHETIC_SENTINEL'), `Private bytes never served: ${file}`);
    if (/^(data|server|\.private|tests)\//.test(file)) assert.ok(response.status === 403, `Forbidden direct access: ${file}`);
    else assert.ok(response.status === 200 && body === 'AUTHORIZED_HANDLER_SENTINEL', `Private file routes through API: ${file}`);
  }
  const injected = await fetch(`${origin}/seating-plans/synthetic.pdf?action=get&path=server/config.local.php`, { signal: AbortSignal.timeout(5000) });
  assert.ok((await injected.text()) === 'AUTHORIZED_HANDLER_SENTINEL', 'Query cannot bypass private-file routing');
  const viewer = await fetch(`${origin}/pantheon-tickets/index.html`, { signal: AbortSignal.timeout(5000) });
  assert.ok((await viewer.text()) === 'PUBLIC_VIEWER', 'Reusable ticket viewer preserved');
  assert.ok(viewer.headers.get('referrer-policy') === 'no-referrer', 'Referrer policy active');
  console.log('PASS: Native Apache private-path deny/rewrite rules, query routing, public viewer and response headers.');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
}
