// Synthetic checks only: no account, payment, customer, database or email.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import worker from './worker.js';
export const TEST_SECRET = 'public-test-placeholder';
const encoder = new TextEncoder();
const valid = { eventType: 'checkout.completed', object: { order: { id: 'ord_demo', status: 'paid' } } };
const sign = raw => createHmac('sha256', TEST_SECRET).update(raw).digest('hex');

export async function runChecks(send, { configurationCases = true, streamCases = true } = {}) {
  let count = 0;
  async function check(label, body, status, text, options = {}) {
    if (options.offlineOnly && !streamCases) return;
    const raw = body === undefined ? new Uint8Array() : typeof body === 'string' ? encoder.encode(body) : body;
    const headers = { 'creem-signature': sign(raw), ...options.headers };
    if (options.noSignature) delete headers['creem-signature'];
    const response = await send({ body: raw, method: 'POST', path: '/webhooks/creem', ...options, headers });
    assert.equal(response.status, status, label);
    assert.equal(await response.text(), text, label);
    if (status === 405) assert.equal(response.headers.get('allow'), 'POST', label);
    console.log('PASS', label); count++;
  }
  const json = JSON.stringify(valid);
  await check('paid checkout', json, 200, 'ok');
  await check('uppercase hex', json, 200, 'ok', { headers: { 'creem-signature': sign(json).toUpperCase() } });
  await check('missing signature', json, 401, 'bad signature', { noSignature: true });
  for (const signature of ['0'.repeat(64), 'z'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), '']) {
    await check('invalid signature ' + signature.length + ':' + signature.slice(0, 1), json, 401, 'bad signature', { headers: { 'creem-signature': signature } });
  }
  await check('body changed after signing', json + ' ', 401, 'bad signature', { headers: { 'creem-signature': sign(json) } });
  await check('signed malformed JSON', '{', 400, 'bad json');
  await check('signed empty body', '', 400, 'bad json');
  for (const body of ['null', '[]', '"text"', 'true', '1', '{}', '{"eventType":[]}', '{"eventType":" "}']) {
    await check('signed invalid event ' + body, body, 400, 'bad event');
  }
  await check('other event acknowledged', '{"eventType":"subscription.paid"}', 200, 'ignored');
  await check('unpaid checkout', json.replace('paid', 'pending'), 200, 'ignored');
  for (const object of [null, [], {}, { order: null }, { order: [] }, { order: { status: 'paid' } }, { order: { id: 1, status: 'paid' } }, { order: { id: ' ', status: 'paid' } }, { order: { id: 'ord_demo', status: {} } }]) {
    await check('invalid checkout shape ' + JSON.stringify(object), JSON.stringify({ eventType: 'checkout.completed', object }), 400, 'bad event');
  }
  await check('signed UTF-8 BOM', '\ufeff' + json, 200, 'ok');
  await check('BOM is part of signed bytes', '\ufeff' + json, 401, 'bad signature', { headers: { 'creem-signature': sign(json) } });
  await check('replacement-text signature cannot authenticate invalid bytes', new Uint8Array([0x7b, 0xff, 0x7d]), 401, 'bad signature', { headers: { 'creem-signature': sign('{�}') } });
  const unicode = JSON.stringify({ ...valid, note: '你好 🟡 café' });
  await check('UTF-8 bytes preserved', unicode, 200, 'ok');
  await check('invalid UTF-8 authenticated then rejected', new Uint8Array([0x7b, 0xff, 0x7d]), 400, 'bad json');
  await check('exact byte limit', json + ' '.repeat(65536 - encoder.encode(json).length), 200, 'ok');
  await check('over byte limit', json + ' '.repeat(65537 - encoder.encode(json).length), 413, 'body too large');
  await check('declared length does not replace stream bound', json, 200, 'ok', { headers: { 'content-length': '999999' }, offlineOnly: true });
  await check('wrong method', undefined, 405, 'method not allowed', { method: 'GET', body: undefined });
  await check('wrong path', json, 404, 'not found', { path: '/wrong' });
  if (configurationCases) {
    for (const secret of [undefined, '', ' ', 1, {}]) {
      await check('missing or invalid configuration ' + typeof secret + ':' + String(secret), json, 503, 'not configured', { secret });
    }
  }
  if (streamCases) {
    await check('multi-chunk UTF-8', unicode, 200, 'ok', { chunked: true });
    await check('read failure', json, 400, 'bad body', { readFailure: true });
    await check('oversize cancellation rejection handled', 'a'.repeat(65537), 413, 'body too large', { cancelRejects: true });
  }
  return count;
}

async function offline(input) {
  let body = input.body;
  if (input.chunked) {
    const bytes = body; let index = 0;
    body = new ReadableStream({ pull(controller) { if (index === bytes.length) controller.close(); else controller.enqueue(bytes.slice(index, ++index)); } });
  }
  if (input.readFailure) body = new ReadableStream({ pull(controller) { controller.error(new Error('synthetic read failure')); } });
  if (input.cancelRejects) body = new ReadableStream({ start(controller) { controller.enqueue(body); }, cancel() { return Promise.reject(new Error('synthetic cancellation failure')); } });
  const request = new Request('https://example.com' + input.path, { method: input.method, headers: input.headers, body, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}) });
  const secret = Object.hasOwn(input, 'secret') ? input.secret : TEST_SECRET;
  return worker.fetch(request, { CREEM_WEBHOOK_SECRET: secret });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let send = offline, options;
  if (process.argv.length > 2) {
    assert.equal(process.argv[2], '--http', 'Usage: node test.mjs [--http http://127.0.0.1:8787]');
    const base = new URL(process.argv[3]);
    assert.ok(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) && !base.username && !base.password && base.pathname === '/' && !base.search && !base.hash, 'HTTP checks are restricted to a local synthetic-only Worker');
    send = async input => {
      // Fetch enforces Content-Length; the synthetic misleading-header test is offline only.
      return fetch(new URL(input.path, base), { method: input.method, headers: input.headers, body: input.body, signal: AbortSignal.timeout(10000) });
    };
    options = { configurationCases: false, streamCases: false };
  }
  const logged = []; const originalLog = console.log;
  console.log = (...args) => { if (args[0] === 'PASS') originalLog(...args); else logged.push(args); };
  let count;
  try { count = await runChecks(send, options); } finally { console.log = originalLog; }
  assert.deepEqual(logged, [], 'handler emits no application logs');
  originalLog('PASS no request-data application logs'); count++;
  console.log(`${count} checks passed (${send === offline ? 'offline logic' : 'local HTTP; configuration/stream-fault cases excluded'}).`);
}
