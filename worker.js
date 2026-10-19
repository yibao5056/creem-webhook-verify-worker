// Verification only. No order storage, delivery, customer logging or deduplication.
const MAX_BYTES = 65536; // Example policy, not a Creem platform limit.
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const reply = (body, status = 200) => new Response(body, { status });

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        // Do not await cancellation: a stalled sender must not block the 413.
        reader.cancel().catch(() => {});
        return null;
      }
      if (value.byteLength) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/webhooks/creem') return reply('not found', 404);
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405, headers: { Allow: 'POST' } });
    if (!nonempty(env?.CREEM_WEBHOOK_SECRET)) return reply('not configured', 503);
    const signature = request.headers.get('creem-signature');
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return reply('bad signature', 401);
    let raw;
    try { raw = await readBody(request); } catch { return reply('bad body', 400); }
    if (raw === null) return reply('body too large', 413);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.CREEM_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const supplied = Uint8Array.from(signature.match(/../g), byte => parseInt(byte, 16));
    // Authenticate untouched bytes, before UTF-8 decoding or JSON parsing.
    if (!await crypto.subtle.verify('HMAC', key, supplied, raw)) return reply('bad signature', 401);
    let event;
    try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); }
    catch { return reply('bad json', 400); }
    if (!record(event) || !nonempty(event.eventType)) return reply('bad event', 400);
    if (event.eventType !== 'checkout.completed') return reply('ignored');
    const order = record(event.object) && event.object.order;
    if (!record(order) || !nonempty(order.id) || !nonempty(order.status)) return reply('bad event', 400);
    if (order.status !== 'paid') return reply('ignored');
    // This is deliberately not a fulfillment hook. See README before adding one.
    return reply('ok');
  }
};
